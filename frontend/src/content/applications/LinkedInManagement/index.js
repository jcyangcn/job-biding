import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
  useTheme
} from '@mui/material';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import TableListFilters from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { useDetailDialog } from 'src/components/DetailDialog';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import useTableListFilters from 'src/hooks/useTableListFilters';
import useTablePagination from 'src/hooks/useTablePagination';
import useTableSort from 'src/hooks/useTableSort';
import {
  LINKEDIN_NEED_ACTIONS,
  LINKEDIN_PROVIDERS,
  LINKEDIN_STATUSES
} from 'src/data/linkedinOptions';
import {
  createLinkedInAccount,
  deleteLinkedInAccount,
  deleteLinkedInImage,
  listLinkedInAccounts,
  updateLinkedInAccount,
  uploadLinkedInImage
} from 'src/services/linkedinApi';
import { formatDate, formatDateTime } from 'src/utils/dateFormat';
import LinkedInDetailDialog from './LinkedInDetailDialog';
import LinkedInFormFields, {
  buildLinkedInPayload,
  createEmptyLinkedInForm,
  linkedInRecordToForm
} from './LinkedInFormFields';
import LinkedInStatusLabel from './LinkedInStatusLabel';

const LINKEDIN_SELECT_FILTERS = [
  { id: 'status', field: 'status' },
  { id: 'provider', field: 'provider', emptyValue: '' },
  { id: 'need_action', field: 'need_action' }
];

const LINKEDIN_SEARCH_FIELDS = [
  'id',
  'email',
  'email_recovery_email',
  'recovery_email',
  'linkedin_email',
  'linkedin_link',
  'second_email',
  'browser',
  'order_id',
  'proxy_info',
  'purchased_from',
  'renting_to',
  'logs'
];

function LinkedInManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const imageInputRef = useRef(null);
  useSetPageHeader('LinkedIn Management', 'Manage LinkedIn accounts, proxies, and sales records');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [form, setForm] = useState(createEmptyLinkedInForm);
  const [pendingFile, setPendingFile] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    open: detailOpen,
    selected: selectedAccount,
    openDetail,
    closeDetail,
    stopPropagation
  } = useDetailDialog();

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
    searchFields: LINKEDIN_SEARCH_FIELDS,
    dateField: 'created_at',
    selects: LINKEDIN_SELECT_FILTERS
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

  const filterSelects = useMemo(
    () => [
      {
        id: 'status',
        label: 'Status',
        value: selectValues.status,
        onChange: (value) => setSelectValue('status', value),
        options: LINKEDIN_STATUSES
      },
      {
        id: 'provider',
        label: 'Provider',
        value: selectValues.provider,
        onChange: (value) => setSelectValue('provider', value),
        options: LINKEDIN_PROVIDERS
      },
      {
        id: 'need_action',
        label: 'Need action',
        value: selectValues.need_action,
        onChange: (value) => setSelectValue('need_action', value),
        options: LINKEDIN_NEED_ACTIONS
      }
    ],
    [selectValues.status, selectValues.provider, selectValues.need_action, setSelectValue]
  );

  const summary = useMemo(() => {
    const counts = {
      total: rows.length,
      actionRequired: 0,
      renting: 0,
      secured: 0
    };
    rows.forEach((row) => {
      if (row.need_action === 'Need Reverify') {
        counts.actionRequired += 1;
      }
      if (row.status === 'Renting') {
        counts.renting += 1;
      }
      if (row.email_secured || row.linkedin_secured) {
        counts.secured += 1;
      }
    });
    return counts;
  }, [rows]);

  const dialogTitle = useMemo(
    () => (editingRecord ? 'Edit LinkedIn' : 'Add LinkedIn'),
    [editingRecord]
  );

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listLinkedInAccounts());
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load LinkedIn accounts', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const resetFormState = () => {
    setForm(createEmptyLinkedInForm());
    setPendingFile(null);
    setRemoveExistingImage(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const openCreateDialog = () => {
    closeDetail();
    setEditingRecord(null);
    resetFormState();
    setDialogOpen(true);
  };

  const openEditDialog = (record) => {
    closeDetail();
    setEditingRecord(record);
    setForm(linkedInRecordToForm(record));
    setPendingFile(null);
    setRemoveExistingImage(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingRecord(null);
    resetFormState();
  };

  const applyPendingFile = (file) => {
    if (file && file.size > 10 * 1024 * 1024) {
      enqueueSnackbar('Maximum file size is 10MB', { variant: 'warning' });
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      return;
    }
    setPendingFile(file || null);
    if (file) {
      setRemoveExistingImage(false);
    }
  };

  const handlePendingFileChange = (event) => {
    applyPendingFile(event.target.files?.[0] || null);
  };

  const handleRemoveExistingImage = () => {
    setRemoveExistingImage(true);
    setPendingFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.email.trim()) {
      enqueueSnackbar('Email is required', { variant: 'warning' });
      return;
    }
    if (!editingRecord && !form.email_password.trim()) {
      enqueueSnackbar('Email password is required', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = buildLinkedInPayload(form, { isEdit: Boolean(editingRecord) });
      let saved = editingRecord
        ? await updateLinkedInAccount(editingRecord.id, payload)
        : await createLinkedInAccount(payload);

      if (removeExistingImage && saved.image) {
        saved = await deleteLinkedInImage(saved.id);
      }
      if (pendingFile) {
        saved = await uploadLinkedInImage(saved.id, pendingFile);
      }

      enqueueSnackbar(editingRecord ? 'LinkedIn account updated' : 'LinkedIn account created', {
        variant: 'success'
      });
      closeDialog();
      await loadAccounts();
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (record) => {
    closeDetail();
    setDeletingRecord(record);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setSaving(true);
    try {
      await deleteLinkedInAccount(deletingRecord.id);
      enqueueSnackbar('LinkedIn account deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingRecord(null);
      await loadAccounts();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const existingImage =
    editingRecord?.image && !removeExistingImage ? editingRecord.image : null;

  return (
    <>
      <Helmet>
        <title>LinkedIn Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip label={`${summary.total} accounts`} color="primary" variant="outlined" />
          <Chip label={`${summary.actionRequired} need action`} color="warning" variant="outlined" />
          <Chip label={`${summary.renting} renting`} color="info" variant="outlined" />
          <Chip label={`${summary.secured} secured`} color="success" variant="outlined" />
        </Stack>

        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search email, LinkedIn, proxy, sales…"
            showDateRange={showDateRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            dateFromLabel="Created from"
            dateToLabel="Created to"
            selects={filterSelects}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
            actions={
              <>
                <Button
                  variant="outlined"
                  startIcon={<RefreshTwoToneIcon />}
                  onClick={loadAccounts}
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
                  Add LinkedIn
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
                      label="Account"
                      sortKey="email"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="LinkedIn"
                      sortKey="linkedin_email"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Browser / profile"
                      sortKey="browser"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Provider"
                      sortKey="provider"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Status"
                      sortKey="status"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Action"
                      sortKey="need_action"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Proxy expires"
                      sortKey="proxy_expired_by"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Updated"
                      sortKey="updated_at"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9}>Loading…</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>No LinkedIn accounts yet.</TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>No LinkedIn accounts match your filters.</TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          ...(row.need_action === 'Need Reverify'
                            ? { bgcolor: alpha(theme.palette.warning.main, 0.08) }
                            : undefined)
                        }}
                        onClick={() => openDetail(row)}
                      >
                        <TableCell>{row.id}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {row.email}
                          </Typography>
                          {row.renting_to ? (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Renting to {row.renting_to}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell onClick={stopPropagation}>
                          <Typography variant="body2">{row.linkedin_email || '—'}</Typography>
                          {row.linkedin_link ? (
                            <Link
                              href={row.linkedin_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 12 }}
                            >
                              Profile
                              <OpenInNewTwoToneIcon sx={{ fontSize: 14 }} />
                            </Link>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.browser || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.profile_no != null ? `#${row.profile_no}` : 'No profile no.'}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.provider || '—'}</TableCell>
                        <TableCell>
                          <LinkedInStatusLabel status={row.status} />
                        </TableCell>
                        <TableCell>
                          {row.need_action === 'Need Reverify' ? (
                            <Chip size="small" label={row.need_action} color="warning" />
                          ) : (
                            'None'
                          )}
                        </TableCell>
                        <TableCell>
                          {row.proxy_expired_by ? formatDate(row.proxy_expired_by) : '—'}
                        </TableCell>
                        <TableCell>{formatDateTime(row.updated_at || row.created_at)}</TableCell>
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

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="lg"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { minHeight: '70vh' } }}
      >
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography variant="h4">{dialogTitle}</Typography>
            <Typography variant="body2" color="text.secondary">
              Organize credentials, proxy setup, and account status in one place.
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
          <LinkedInFormFields
            form={form}
            setForm={setForm}
            createdAt={editingRecord?.created_at}
            editingRecordId={editingRecord?.id}
            storedValues={
              editingRecord
                ? {
                    email_password: editingRecord.email_password,
                    recovery_email_password: editingRecord.recovery_email_password,
                    linkedin_password: editingRecord.linkedin_password
                  }
                : null
            }
            pendingFile={pendingFile}
            onPendingFileChange={handlePendingFileChange}
            onPendingFileSelect={applyPendingFile}
            existingImage={existingImage}
            onRemoveExistingImage={handleRemoveExistingImage}
            imageInputRef={imageInputRef}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.paper' }}>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveTwoToneIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : editingRecord ? 'Save changes' : 'Create account'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)}>
        <DialogTitle>Delete LinkedIn account</DialogTitle>
        <DialogContent>
          <Typography>
            Delete LinkedIn account #{deletingRecord?.id}
            {deletingRecord?.email ? ` (${deletingRecord.email})` : ''}? This cannot be undone.
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

      <LinkedInDetailDialog
        open={detailOpen}
        account={selectedAccount}
        onClose={closeDetail}
      />
    </>
  );
}

export default LinkedInManagement;
