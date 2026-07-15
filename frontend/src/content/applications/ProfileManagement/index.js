import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import Label from 'src/components/Label';
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
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import ProfileDetailDialog from './ProfileDetailDialog';
import ProfileDefaultResumeUpload from './ProfileDefaultResumeUpload';
import TableListFilters, { compactButtonSx } from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { useDetailDialog } from 'src/components/DetailDialog';
import useServerTable from 'src/hooks/useServerTable';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { uniqueFieldValues } from 'src/utils/tableListFilters';
import { formatIdentityLabel } from 'src/data/countryCodes';
import { listAllIdentities } from 'src/services/identityApi';
import {
  createProfile,
  deleteProfile,
  listProfiles,
  updateProfile,
  uploadProfileDefaultResume
} from 'src/services/profileApi';
import { listAllUsers } from 'src/services/usersApi';
import ResumeDetailForm from './ResumeDetailForm';
import {
  emptyResumeDetail,
  normalizeResumeDetail,
  serializeResumeDetailForApi
} from 'src/data/profileResumeDetail';

const emptyForm = {
  identity_id: '',
  bidder_user_ids: [],
  caller_user_id: '',
  roles: '',
  reference_tag: '',
  email: '',
  email_password: '',
  phone: '',
  email_detail: '',
  phone_detail: '',
  cover_letter: '',
  proxy: '',
  proxy_detail: '',
  resume_fromAI: true,
  is_active: true,
  resume_detail: emptyResumeDetail()
};

const PROFILE_EMPTY_ROLE = '__empty__';

const ACTIVE_FILTER_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' }
];

function ProfileManagement() {
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader(
    'Profile Management',
    'Manage job profiles linked to identities, bidders, and callers'
  );
  const [identities, setIdentities] = useState([]);
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingResumeFile, setPendingResumeFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const { open: detailOpen, selected: selectedProfile, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();

  const fetchProfiles = useCallback((opts) => listProfiles(opts), []);

  const {
    rows,
    total,
    loading,
    page,
    limit,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectValues,
    setSelectValue,
    clearFilters,
    hasActiveFilters,
    showDateRange,
    sortField,
    sortDirection,
    handleSort,
    handlePageChange,
    handleLimitChange,
    rowsPerPageOptions,
    refresh,
    paginatedRows
  } = useServerTable({
    fetcher: fetchProfiles,
    selectIds: ['role', 'active'],
    dateField: 'created_at'
  });

  const selectedIdentity = useMemo(
    () => identities.find((item) => item.id === form.identity_id) || null,
    [identities, form.identity_id]
  );

  const selectedBidders = useMemo(
    () => users.filter((user) => form.bidder_user_ids.includes(user.id)),
    [users, form.bidder_user_ids]
  );
  const selectedCaller = useMemo(
    () => users.find((user) => user.id === form.caller_user_id) || null,
    [users, form.caller_user_id]
  );

  const dialogTitle = useMemo(
    () => (editingRecord ? 'Edit profile' : 'Add profile'),
    [editingRecord]
  );

  const loadDialogOptions = useCallback(async () => {
    try {
      const [identityRows, userRows, profileResult] = await Promise.all([
        listAllIdentities(),
        listAllUsers(),
        listProfiles({ page: 1, pageSize: 200 })
      ]);
      setIdentities(identityRows);
      setUsers(userRows);
      setRoleOptions(
        uniqueFieldValues(profileResult.items || [], 'roles', {
          emptyValue: PROFILE_EMPTY_ROLE
        }).map((value) => ({
          value,
          label: value === PROFILE_EMPTY_ROLE ? '(No role)' : value
        }))
      );
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load form options', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadDialogOptions();
  }, [loadDialogOptions]);

  const notifyRefresh = useCallback(async () => {
    refresh();
    await loadDialogOptions();
  }, [refresh, loadDialogOptions]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setPendingResumeFile(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (record) => {
    closeDetail();
    setEditingRecord(record);
    setPendingResumeFile(null);
    setForm({
      identity_id: record.identity_id,
      bidder_user_ids: record.bidder_user_ids?.length
        ? record.bidder_user_ids
        : record.bidder_user_id
          ? [record.bidder_user_id]
          : [],
      caller_user_id: record.caller_user_id || '',
      roles: record.roles,
      reference_tag: record.reference_tag || '',
      email: record.email,
      email_password: record.email_password,
      phone: record.phone,
      email_detail: record.email_detail || '',
      phone_detail: record.phone_detail || '',
      cover_letter: record.cover_letter || '',
      proxy: record.proxy || '',
      proxy_detail: record.proxy_detail || '',
      resume_fromAI: record.resume_fromAI !== false,
      is_active: record.is_active,
      resume_detail: normalizeResumeDetail(record.resume_detail)
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!saving) {
      setDialogOpen(false);
      setEditingRecord(null);
      setPendingResumeFile(null);
      setForm(emptyForm);
    }
  };

  const handleFormChange = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleDefaultResumeUploaded = async (updatedProfile) => {
    setEditingRecord(updatedProfile);
    await notifyRefresh();
  };

  const buildPayload = () => ({
    identity_id: form.identity_id,
    bidder_user_ids: form.bidder_user_ids,
    caller_user_id: form.caller_user_id || null,
    roles: form.roles.trim(),
    reference_tag: form.reference_tag.trim() || null,
    email: form.email.trim(),
    email_password: form.email_password,
    phone: form.phone.trim(),
    email_detail: form.email_detail.trim(),
    phone_detail: form.phone_detail.trim(),
    cover_letter: form.cover_letter.trim(),
    proxy: form.proxy.trim() || null,
    proxy_detail: form.proxy_detail.trim(),
    resume_fromAI: Boolean(form.resume_fromAI),
    is_active: form.is_active,
    resume_detail: serializeResumeDetailForApi(form.resume_detail)
  });

  const handleSave = async () => {
    if (
      !form.identity_id ||
      !form.bidder_user_ids?.length ||
      !form.email.trim() ||
      !form.email_password
    ) {
      enqueueSnackbar('Identity, at least one bidder, email, and email password are required', {
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
        const created = await createProfile(payload);
        if (pendingResumeFile) {
          try {
            await uploadProfileDefaultResume(created.id, pendingResumeFile);
            enqueueSnackbar('Profile created and default resume uploaded', {
              variant: 'success'
            });
          } catch (uploadErr) {
            enqueueSnackbar(
              uploadErr.message ||
                'Profile created, but default resume upload failed. Edit the profile to retry.',
              { variant: 'warning' }
            );
          }
        } else {
          enqueueSnackbar('Profile created', { variant: 'success' });
        }
      }
      setDialogOpen(false);
      setEditingRecord(null);
      setPendingResumeFile(null);
      setForm(emptyForm);
      await notifyRefresh();
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
      await notifyRefresh();
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
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TableListFilters
            singleLine
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search identity, bidder, email, roles…"
            showDateRange={showDateRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            dateFromLabel="Created from"
            dateToLabel="Created to"
            selects={[
              {
                id: 'role',
                label: 'Role',
                value: selectValues.role,
                onChange: (value) => setSelectValue('role', value),
                options: roleOptions
              },
              {
                id: 'active',
                label: 'Active',
                value: selectValues.active,
                onChange: (value) => setSelectValue('active', value),
                options: ACTIVE_FILTER_OPTIONS
              }
            ]}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={total}
            totalCount={total}
            actions={
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshTwoToneIcon />}
                  onClick={() => notifyRefresh()}
                  disabled={loading || saving}
                  sx={compactButtonSx}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddTwoToneIcon />}
                  onClick={openCreateDialog}
                  disabled={saving}
                  sx={compactButtonSx}
                >
                  Add profile
                </Button>
              </>
            }
          />
        </Box>
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <SortableTableCell
                      label="ID"
                      sortKey="id"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Identity"
                      sortKey="identity_name"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Bidder"
                      sortKey="bidder_name"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Caller"
                      sortKey="caller_name"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Roles"
                      sortKey="roles"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Reference tag"
                      sortKey="reference_tag"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Email"
                      sortKey="email"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Phone"
                      sortKey="phone"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Resumes"
                      sortKey="resume_count"
                      align="right"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Active"
                      sortKey="is_active"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11}>Loading…</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11}>
                        {hasActiveFilters
                          ? 'No profiles match your filters.'
                          : 'No profiles found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => openDetail(row)}
                      >
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.identity_name}</TableCell>
                        <TableCell>{row.bidder_name}</TableCell>
                        <TableCell>{row.caller_name || '—'}</TableCell>
                        <TableCell>{row.roles}</TableCell>
                        <TableCell>{row.reference_tag || '—'}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell align="right">{row.resume_count ?? 0}</TableCell>
                        <TableCell>
                          <Label color={row.is_active ? 'success' : 'error'}>
                            {row.is_active ? 'Active' : 'Inactive'}
                          </Label>
                        </TableCell>
                        <TableCell align="right" onClick={stopPropagation}>
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
            <TablePaginationFooter
              count={total}
              page={page}
              rowsPerPage={limit}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleLimitChange}
              rowsPerPageOptions={rowsPerPageOptions}
            />
          </CardContent>
        </Card>
      </Container>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="lg">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '75vh' }}>
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
            multiple
            fullWidth
            options={users}
            value={selectedBidders}
            onChange={(_, value) =>
              setForm((current) => ({
                ...current,
                bidder_user_ids: value.map((user) => user.id)
              }))
            }
            getOptionLabel={(option) => option.full_name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            autoHighlight
            openOnFocus
            disablePortal
            renderInput={(params) => (
              <TextField {...params} margin="normal" label="Bidders" required />
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
              <TextField {...params} margin="normal" label="Caller" />
            )}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Roles"
            value={form.roles}
            onChange={handleFormChange('roles')}
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
          />
          <TextField
            fullWidth
            margin="normal"
            label="Email detail"
            value={form.email_detail}
            onChange={handleFormChange('email_detail')}
            multiline
            minRows={3}
            placeholder="Additional email notes (admin only)"
          />
          <TextField
            fullWidth
            margin="normal"
            label="Phone detail"
            value={form.phone_detail}
            onChange={handleFormChange('phone_detail')}
            multiline
            minRows={3}
            placeholder="Additional phone notes (admin only)"
          />
          <TextField
            fullWidth
            margin="normal"
            label="Cover letter"
            value={form.cover_letter}
            onChange={handleFormChange('cover_letter')}
            multiline
            minRows={6}
            placeholder="Cover letter text shown to bidders and callers"
          />
          <ProfileDefaultResumeUpload
            editingRecord={editingRecord}
            pendingFile={pendingResumeFile}
            saving={saving}
            onUploaded={handleDefaultResumeUploaded}
            onPendingFileChange={setPendingResumeFile}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Proxy"
            value={form.proxy}
            onChange={handleFormChange('proxy')}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Proxy detail"
            value={form.proxy_detail}
            onChange={handleFormChange('proxy_detail')}
            multiline
            minRows={3}
            placeholder="Additional proxy notes (admin only)"
          />
          <FormControlLabel
            sx={{ mt: 1, mb: 0.5, display: 'block' }}
            control={
              <Switch
                checked={form.resume_fromAI}
                onChange={handleFormChange('resume_fromAI')}
                color="primary"
              />
            }
            label="Resume from AI"
          />
          <FormControlLabel
            sx={{ mt: 1, mb: 0.5, display: 'block' }}
            control={
              <Switch
                checked={form.is_active}
                onChange={handleFormChange('is_active')}
                color="primary"
              />
            }
            label="Active"
          />
          <ResumeDetailForm
            value={form.resume_detail}
            onChange={(resumeDetail) =>
              setForm((current) => ({ ...current, resume_detail: resumeDetail }))
            }
            disabled={saving}
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

      <ProfileDetailDialog
        open={detailOpen}
        profile={selectedProfile}
        onClose={closeDetail}
      />
    </>
  );
}

export default ProfileManagement;
