import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import PageTitleWrapper from 'src/components/PageTitleWrapper';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import PersonPinTwoToneIcon from '@mui/icons-material/PersonPinTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import { formatIdentityLabel } from 'src/data/countryCodes';
import PROFILE_ANSWER_FIELDS, { buildEmptyAnswers } from 'src/data/profileAnswerFields';
import { listIdentities } from 'src/services/identityApi';
import {
  createProfile,
  deleteProfile,
  listProfiles,
  updateProfile
} from 'src/services/profileApi';
import { listUsers } from 'src/services/usersApi';

const emptyForm = {
  identity_id: '',
  bidder_user_id: '',
  caller_user_id: '',
  roles: '',
  reference_tag: '',
  email: '',
  email_password: '',
  phone: '',
  proxy: '',
  is_active: true,
  answers: buildEmptyAnswers()
};

function ProfileManagement() {
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const selectedIdentity = useMemo(
    () => identities.find((item) => item.id === form.identity_id) || null,
    [identities, form.identity_id]
  );

  const selectedBidder = useMemo(
    () => users.find((user) => user.id === form.bidder_user_id) || null,
    [users, form.bidder_user_id]
  );
  const selectedCaller = useMemo(
    () => users.find((user) => user.id === form.caller_user_id) || null,
    [users, form.caller_user_id]
  );

  const dialogTitle = useMemo(
    () => (editingRecord ? 'Edit profile' : 'Add profile'),
    [editingRecord]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRows, identityRows, userRows] = await Promise.all([
        listProfiles(),
        listIdentities(),
        listUsers()
      ]);
      setRows(profileRows);
      setIdentities(identityRows);
      setUsers(userRows);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load profiles', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setForm({
      identity_id: record.identity_id,
      bidder_user_id: record.bidder_user_id,
      caller_user_id: record.caller_user_id,
      roles: record.roles,
      reference_tag: record.reference_tag || '',
      email: record.email,
      email_password: record.email_password,
      phone: record.phone,
      proxy: record.proxy || '',
      is_active: record.is_active,
      answers: { ...buildEmptyAnswers(), ...(record.answers || {}) }
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!saving) {
      setDialogOpen(false);
      setEditingRecord(null);
      setForm(emptyForm);
    }
  };

  const handleFormChange = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleAnswerChange = (key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({
      ...current,
      answers: { ...current.answers, [key]: value }
    }));
  };

  const buildPayload = () => ({
    identity_id: form.identity_id,
    bidder_user_id: form.bidder_user_id,
    caller_user_id: form.caller_user_id,
    roles: form.roles.trim(),
    reference_tag: form.reference_tag.trim() || null,
    email: form.email.trim(),
    email_password: form.email_password,
    phone: form.phone.trim(),
    proxy: form.proxy.trim() || null,
    is_active: form.is_active,
    answers: form.answers
  });

  const handleSave = async () => {
    if (
      !form.identity_id ||
      !form.bidder_user_id ||
      !form.caller_user_id ||
      !form.roles.trim() ||
      !form.email.trim() ||
      !form.email_password ||
      !form.phone.trim()
    ) {
      enqueueSnackbar('Identity, users, roles, email, email password, and phone are required', {
        variant: 'warning'
      });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingRecord) {
        await updateProfile(editingRecord.id, payload);
        enqueueSnackbar('Profile updated', { variant: 'success' });
      } else {
        await createProfile(payload);
        enqueueSnackbar('Profile created', { variant: 'success' });
      }
      closeDialog();
      await loadData();
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (record) => {
    setDeletingRecord(record);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setSaving(true);
    try {
      await deleteProfile(deletingRecord.id);
      enqueueSnackbar('Profile deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingRecord(null);
      await loadData();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Profile Management - {PROJECT_NAME}</title>
      </Helmet>
      <PageTitleWrapper>
        <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
          <Grid item>
            <Typography component="h1" variant="h3" gutterBottom>
              Profile Management
            </Typography>
            <Typography variant="subtitle2">
              Manage job profiles linked to identities, bidders, and callers.
            </Typography>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshTwoToneIcon />}
                onClick={loadData}
                disabled={loading || saving}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddTwoToneIcon />}
                onClick={openCreateDialog}
                disabled={saving}
              >
                Add profile
              </Button>
            </Box>
          </Grid>
        </Grid>
      </PageTitleWrapper>
      <Container maxWidth="lg">
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PersonPinTwoToneIcon color="primary" />
              <Typography variant="h4">Job profiles</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Identity</TableCell>
                    <TableCell>Bidder</TableCell>
                    <TableCell>Caller</TableCell>
                    <TableCell>Roles</TableCell>
                    <TableCell>Reference tag</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10}>
                        {loading ? 'Loading…' : 'No profiles found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.identity_name}</TableCell>
                        <TableCell>{row.bidder_name}</TableCell>
                        <TableCell>{row.caller_name}</TableCell>
                        <TableCell>{row.roles}</TableCell>
                        <TableCell>{row.reference_tag || '—'}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.is_active ? 'Yes' : 'No'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton
                              color="primary"
                              onClick={() => openEditDialog(row)}
                              disabled={saving}
                            >
                              <EditTwoToneIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              color="error"
                              onClick={() => confirmDelete(row)}
                              disabled={saving}
                            >
                              <DeleteTwoToneIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Autocomplete
            fullWidth
            options={identities}
            value={selectedIdentity}
            onChange={(_, value) =>
              setForm((current) => ({ ...current, identity_id: value?.id || '' }))
            }
            getOptionLabel={formatIdentityLabel}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            autoHighlight
            openOnFocus
            disablePortal
            renderInput={(params) => (
              <TextField {...params} margin="normal" label="Identity" required />
            )}
          />
          <Autocomplete
            fullWidth
            options={users}
            value={selectedBidder}
            onChange={(_, value) =>
              setForm((current) => ({ ...current, bidder_user_id: value?.id || '' }))
            }
            getOptionLabel={(option) => option.full_name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            autoHighlight
            openOnFocus
            disablePortal
            renderInput={(params) => (
              <TextField {...params} margin="normal" label="Bidder" required />
            )}
          />
          <Autocomplete
            fullWidth
            options={users}
            value={selectedCaller}
            onChange={(_, value) =>
              setForm((current) => ({ ...current, caller_user_id: value?.id || '' }))
            }
            getOptionLabel={(option) => option.full_name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            autoHighlight
            openOnFocus
            disablePortal
            renderInput={(params) => (
              <TextField {...params} margin="normal" label="Caller" required />
            )}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Roles"
            value={form.roles}
            onChange={handleFormChange('roles')}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Reference tag"
            placeholder="Short tag to identify this profile"
            value={form.reference_tag}
            onChange={handleFormChange('reference_tag')}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            type="email"
            value={form.email}
            onChange={handleFormChange('email')}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Email password"
            type="password"
            value={form.email_password}
            onChange={handleFormChange('email_password')}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Phone"
            value={form.phone}
            onChange={handleFormChange('phone')}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Proxy"
            value={form.proxy}
            onChange={handleFormChange('proxy')}
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Switch
                checked={form.is_active}
                onChange={handleFormChange('is_active')}
                color="primary"
              />
            }
            label="Active"
          />

          <Typography variant="h5" sx={{ mt: 3, mb: 1 }}>
            Answers
          </Typography>
          <Grid container spacing={2}>
            {PROFILE_ANSWER_FIELDS.map((field) => (
              <Grid item xs={12} key={field.key}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <Typography variant="body1">{field.label}</Typography>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={field.placeholder}
                      value={form.answers[field.key] || ''}
                      onChange={handleAnswerChange(field.key)}
                    />
                  </Grid>
                </Grid>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)}>
        <DialogTitle>Delete profile</DialogTitle>
        <DialogContent>
          <Typography>
            Delete profile for <b>{deletingRecord?.identity_name}</b>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ProfileManagement;
