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
import useTableListFilters from 'src/hooks/useTableListFilters';
import useTablePagination from 'src/hooks/useTablePagination';
import useTableSort from 'src/hooks/useTableSort';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { uniqueFieldValues } from 'src/utils/tableListFilters';
import { formatIdentityLabel } from 'src/data/countryCodes';
import { listIdentities } from 'src/services/identityApi';
import {
  createProfile,
  deleteProfile,
  listProfiles,
  updateProfile
} from 'src/services/profileApi';
import { listUsers } from 'src/services/usersApi';
import ResumeDetailForm from './ResumeDetailForm';
import {
  emptyResumeDetail,
  normalizeResumeDetail,
  serializeResumeDetailForApi
} from 'src/data/profileResumeDetail';

const emptyForm = {
  identity_id: '',
  bidder_user_id: '',
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
  is_active: true,
  resume_detail: emptyResumeDetail()
};

const PROFILE_SEARCH_FIELDS = [
  'id',
  'identity_name',
  'bidder_name',
  'caller_name',
  'roles',
  'reference_tag',
  'email',
  'phone',
  'proxy',
  (row) => (row.is_active ? 'active' : 'inactive')
];

const PROFILE_EMPTY_ROLE = '__empty__';

const PROFILE_SELECT_FILTERS = [
  {
    id: 'role',
    getValue: (row) => row.roles?.trim() || PROFILE_EMPTY_ROLE,
    emptyValue: PROFILE_EMPTY_ROLE
  },
  { id: 'active', getValue: (row) => String(row.is_active) }
];

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
  const { open: detailOpen, selected: selectedProfile, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();
  const {
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectValues,
    setSelectValue,
    filteredRows,
    clearFilters,
    hasActiveFilters,
    showDateRange
  } = useTableListFilters(rows, {
    searchFields: PROFILE_SEARCH_FIELDS,
    dateField: 'created_at',
    selects: PROFILE_SELECT_FILTERS
  });

  const { sortedRows, sortField, sortDirection, handleSort } = useTableSort(filteredRows);

  const {
    page,
    limit,
    paginatedRows,
    handlePageChange,
    handleLimitChange,
    rowsPerPageOptions
  } = useTablePagination(sortedRows);

  const roleOptions = useMemo(
    () =>
      uniqueFieldValues(rows, 'roles', { emptyValue: PROFILE_EMPTY_ROLE }).map((value) => ({
        value,
        label: value === PROFILE_EMPTY_ROLE ? '(No role)' : value
      })),
    [rows]
  );

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
    closeDetail();
    setEditingRecord(record);
    setForm({
      identity_id: record.identity_id,
      bidder_user_id: record.bidder_user_id,
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
      is_active: record.is_active,
      resume_detail: normalizeResumeDetail(record.resume_detail)
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

  const handleDefaultResumeUploaded = async (updatedProfile) => {
    setEditingRecord(updatedProfile);
    await loadData();
  };

  const buildPayload = () => ({
    identity_id: form.identity_id,
    bidder_user_id: form.bidder_user_id,
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
    is_active: form.is_active,
    resume_detail: serializeResumeDetailForApi(form.resume_detail)
  });

  const handleSave = async () => {
    if (
      !form.identity_id ||
      !form.bidder_user_id ||
      !form.email.trim() ||
      !form.email_password
    ) {
      enqueueSnackbar('Identity, bidder, email, and email password are required', {
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
            filteredCount={filteredRows.length}
            totalCount={rows.length}
            actions={
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshTwoToneIcon />}
                  onClick={loadData}
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
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10}>
                        {loading ? 'Loading…' : 'No profiles found.'}
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10}>No profiles match your filters.</TableCell>
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
              count={filteredRows.length}
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
            saving={saving}
            onUploaded={handleDefaultResumeUploaded}
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
