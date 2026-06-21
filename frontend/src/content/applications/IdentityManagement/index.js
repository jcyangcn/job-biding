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
  Grid,
  IconButton,
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
import BadgeTwoToneIcon from '@mui/icons-material/BadgeTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import COUNTRIES from 'src/data/countries';
import {
  createIdentity,
  deleteIdentity,
  listIdentities,
  updateIdentity
} from 'src/services/identityApi';

const emptyForm = {
  name: '',
  country: '',
  address: '',
  city_state: '',
  zipcode: '',
  linkedin: '',
  github: '',
  dob: '',
  ssn: ''
};

function formatDate(value) {
  if (!value) return '—';
  return value.slice(0, 10);
}

function IdentityManagement() {
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const dialogTitle = useMemo(
    () => (editingRecord ? 'Edit identity' : 'Add identity'),
    [editingRecord]
  );

  const loadIdentities = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listIdentities());
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load identities', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setForm({
      name: record.name,
      country: record.country,
      address: record.address,
      city_state: record.city_state || '',
      zipcode: record.zipcode || '',
      linkedin: record.linkedin || '',
      github: record.github || '',
      dob: record.dob ? record.dob.slice(0, 10) : '',
      ssn: record.ssn || ''
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
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleCountryChange = (_, value) => {
    setForm((current) => ({ ...current, country: value || '' }));
  };

  const countryOptions = useMemo(() => {
    if (form.country && !COUNTRIES.includes(form.country)) {
      return [form.country, ...COUNTRIES];
    }
    return COUNTRIES;
  }, [form.country]);

  const buildPayload = () => ({
    name: form.name.trim(),
    country: form.country,
    address: form.address.trim(),
    city_state: form.city_state.trim() || null,
    zipcode: form.zipcode.trim() || null,
    linkedin: form.linkedin.trim() || null,
    github: form.github.trim() || null,
    dob: form.dob || null,
    ssn: form.ssn.trim() || null
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.country || !form.address.trim()) {
      enqueueSnackbar('Name, country, and address are required', { variant: 'warning' });
      return;
    }
    if (!COUNTRIES.includes(form.country)) {
      enqueueSnackbar('Please select a country from the list', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingRecord) {
        await updateIdentity(editingRecord.id, payload);
        enqueueSnackbar('Identity updated', { variant: 'success' });
      } else {
        await createIdentity(payload);
        enqueueSnackbar('Identity created', { variant: 'success' });
      }
      closeDialog();
      await loadIdentities();
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
      await deleteIdentity(deletingRecord.id);
      enqueueSnackbar('Identity deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingRecord(null);
      await loadIdentities();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Identity Management - {PROJECT_NAME}</title>
      </Helmet>
      <PageTitleWrapper>
        <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
          <Grid item>
            <Typography component="h1" variant="h3" gutterBottom>
              Identity Management
            </Typography>
            <Typography variant="subtitle2">
              Manage job application identities stored in the database.
            </Typography>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshTwoToneIcon />}
                onClick={loadIdentities}
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
                Add identity
              </Button>
            </Box>
          </Grid>
        </Grid>
      </PageTitleWrapper>
      <Container maxWidth="lg">
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <BadgeTwoToneIcon color="primary" />
              <Typography variant="h4">Job identities</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>City/State</TableCell>
                    <TableCell>Zipcode</TableCell>
                    <TableCell>LinkedIn</TableCell>
                    <TableCell>GitHub</TableCell>
                    <TableCell>DOB</TableCell>
                    <TableCell>SSN</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11}>
                        {loading ? 'Loading…' : 'No identities found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.country}</TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography noWrap title={row.address}>
                            {row.address}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.city_state || '—'}</TableCell>
                        <TableCell>{row.zipcode || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 160 }}>
                          <Typography noWrap title={row.linkedin || ''}>
                            {row.linkedin || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 160 }}>
                          <Typography noWrap title={row.github || ''}>
                            {row.github || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(row.dob)}</TableCell>
                        <TableCell>{row.ssn || '—'}</TableCell>
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Name"
            value={form.name}
            onChange={handleFormChange('name')}
            required
          />
          <Autocomplete
            fullWidth
            options={countryOptions}
            value={form.country || null}
            onChange={handleCountryChange}
            autoHighlight
            openOnFocus
            disablePortal
            renderInput={(params) => (
              <TextField
                {...params}
                margin="normal"
                label="Country"
                placeholder="Search country..."
                required
              />
            )}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Address"
            multiline
            minRows={2}
            value={form.address}
            onChange={handleFormChange('address')}
            required
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                margin="normal"
                label="City/State"
                value={form.city_state}
                onChange={handleFormChange('city_state')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                margin="normal"
                label="Zipcode"
                value={form.zipcode}
                onChange={handleFormChange('zipcode')}
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            margin="normal"
            label="LinkedIn"
            value={form.linkedin}
            onChange={handleFormChange('linkedin')}
          />
          <TextField
            fullWidth
            margin="normal"
            label="GitHub"
            value={form.github}
            onChange={handleFormChange('github')}
          />
          <TextField
            fullWidth
            margin="normal"
            label="DOB"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={form.dob}
            onChange={handleFormChange('dob')}
          />
          <TextField
            fullWidth
            margin="normal"
            label="SSN"
            value={form.ssn}
            onChange={handleFormChange('ssn')}
          />
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
        <DialogTitle>Delete identity</DialogTitle>
        <DialogContent>
          <Typography>
            Delete identity for <b>{deletingRecord?.name}</b>? This cannot be undone.
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

export default IdentityManagement;
