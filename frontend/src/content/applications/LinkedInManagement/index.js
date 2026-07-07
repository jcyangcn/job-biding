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
  Grid,
  IconButton,
  Link,
  Stack,
  TextField,
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
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import FileUploadTwoToneIcon from '@mui/icons-material/FileUploadTwoTone';
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import CountrySelectField from 'src/components/CountrySelectField';
import { CountryFlag } from 'src/components/CountryLabel';
import TableListFilters from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { useDetailDialog } from 'src/components/DetailDialog';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import useTableListFilters from 'src/hooks/useTableListFilters';
import useTablePagination from 'src/hooks/useTablePagination';
import useTableSort from 'src/hooks/useTableSort';
import { LINKEDIN_NEED_ACTIONS, LINKEDIN_STATUSES } from 'src/data/linkedinOptions';
import COUNTRIES from 'src/data/countries';
import { getCountryCode } from 'src/data/countryCodes';
import {
  createLinkedInAccount,
  deleteLinkedInAccount,
  deleteLinkedInImage,
  getLinkedInAccount,
  importLinkedInAccountsCsv,
  listLinkedInAccounts,
  updateLinkedInAccount,
  uploadLinkedInImage
} from 'src/services/linkedinApi';
import { formatDate, formatDateTime } from 'src/utils/dateFormat';
import { downloadCsv, sanitizeCsvFilename } from 'src/utils/exportCsv';
import {
  LINKEDIN_CSV_HEADERS,
  buildLinkedInExportRows
} from 'src/utils/linkedinCsvExport';
import LinkedInDetailDialog from './LinkedInDetailDialog';
import LinkedInAccountTile from './LinkedInAccountTile';
import LinkedInViewModeMenu from './LinkedInViewModeMenu';
import LinkedInFormFields, {
  buildLinkedInPayload,
  createEmptyLinkedInForm,
  linkedInRecordToForm
} from './LinkedInFormFields';
import LinkedInStatusLabel from './LinkedInStatusLabel';

const LINKEDIN_SELECT_FILTERS = [
  { id: 'status', field: 'status' },
  { id: 'need_action', field: 'need_action' }
];

const LINKEDIN_SEARCH_FIELDS = [
  'id',
  'title',
  'country',
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

const TILE_ROWS_PER_PAGE = 12;
const TILE_ROWS_PER_PAGE_OPTIONS = [12, 24, 36];
const TABLE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

function LinkedInManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const imageInputRef = useRef(null);
  const csvInputRef = useRef(null);
  useSetPageHeader('LinkedIn Management', 'Manage LinkedIn accounts, proxies, and sales records');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [form, setForm] = useState(createEmptyLinkedInForm);
  const [pendingFile, setPendingFile] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('table');

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
    selectValues,
    setSelectValue,
    filteredRows,
    clearFilters,
    hasActiveFilters
  } = useTableListFilters(rows, {
    searchFields: LINKEDIN_SEARCH_FIELDS,
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
  } = useTablePagination(sortedRows, {
    defaultLimit: viewMode === 'tile' ? TILE_ROWS_PER_PAGE : 10,
    rowsPerPageOptions: viewMode === 'tile' ? TILE_ROWS_PER_PAGE_OPTIONS : TABLE_ROWS_PER_PAGE_OPTIONS
  });

  useEffect(() => {
    handleLimitChange({
      target: { value: String(viewMode === 'tile' ? TILE_ROWS_PER_PAGE : 10) }
    });
  }, [viewMode, handleLimitChange]);

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
        id: 'need_action',
        label: 'Need action',
        value: selectValues.need_action,
        onChange: (value) => setSelectValue('need_action', value),
        options: LINKEDIN_NEED_ACTIONS
      }
    ],
    [selectValues.status, selectValues.need_action, setSelectValue]
  );

  const summary = useMemo(() => {
    const counts = {
      total: rows.length,
      actionRequired: 0,
      secured: 0
    };
    rows.forEach((row) => {
      if (row.need_action === 'Need Reverify') {
        counts.actionRequired += 1;
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

  const countryOptions = useMemo(() => {
    if (form.country && !COUNTRIES.includes(form.country)) {
      return [form.country, ...COUNTRIES];
    }
    return COUNTRIES;
  }, [form.country]);

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

  const openEditDialog = async (record) => {
    closeDetail();
    setLoadingEdit(true);
    try {
      const latest = await getLinkedInAccount(record.id);
      setEditingRecord(latest);
      setForm(linkedInRecordToForm(latest));
      setPendingFile(null);
      setRemoveExistingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      setDialogOpen(true);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load LinkedIn account', { variant: 'error' });
    } finally {
      setLoadingEdit(false);
    }
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
    if (!form.title.trim()) {
      enqueueSnackbar('Title is required', { variant: 'warning' });
      return;
    }
    if (!form.country?.trim()) {
      enqueueSnackbar('Country is required', { variant: 'warning' });
      return;
    }
    if (!COUNTRIES.includes(form.country)) {
      enqueueSnackbar('Please select a country from the list', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = buildLinkedInPayload(form, {
        isEdit: Boolean(editingRecord),
        storedValues: editingRecord
          ? {
              email_password: editingRecord.email_password,
              recovery_email_password: editingRecord.recovery_email_password,
              linkedin_password: editingRecord.linkedin_password
            }
          : null
      });
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

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const exportRows = await listLinkedInAccounts();
      if (!exportRows.length) {
        enqueueSnackbar('No LinkedIn accounts to export', { variant: 'info' });
        return;
      }

      const datePart = new Date().toISOString().slice(0, 10);
      downloadCsv(
        sanitizeCsvFilename(`linkedin-accounts-${datePart}.csv`),
        LINKEDIN_CSV_HEADERS,
        buildLinkedInExportRows(exportRows)
      );
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to export CSV', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    csvInputRef.current?.click();
  };

  const handleImportFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const result = await importLinkedInAccountsCsv(file);
      const { created = 0, updated = 0, failed = 0, errors = [] } = result || {};

      if (created || updated) {
        await loadAccounts();
      }

      if ((created || updated) && failed) {
        enqueueSnackbar(
          `Imported ${created} new and updated ${updated}; ${failed} failed${
            errors[0] ? `: ${errors[0]}` : ''
          }`,
          { variant: 'warning' }
        );
      } else if (failed) {
        enqueueSnackbar(errors[0] || 'Import failed', { variant: 'error' });
      } else {
        enqueueSnackbar(`Imported ${created} new and updated ${updated} account(s)`, {
          variant: 'success'
        });
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to import CSV', { variant: 'error' });
    } finally {
      setImporting(false);
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
          <Chip label={`${summary.secured} secured`} color="success" variant="outlined" />
        </Stack>

        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search title, email, LinkedIn, proxy, sales…"
            selects={filterSelects}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
            actions={
              <>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={handleImportFileSelected}
                />
                <LinkedInViewModeMenu
                  value={viewMode}
                  onChange={setViewMode}
                  disabled={loading || saving || importing || exporting}
                />
                <Button
                  variant="outlined"
                  startIcon={<FileUploadTwoToneIcon />}
                  onClick={handleImportClick}
                  disabled={loading || saving || importing || exporting}
                >
                  {importing ? 'Importing…' : 'Import'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadTwoToneIcon />}
                  onClick={handleExportCsv}
                  disabled={loading || saving || importing || exporting}
                >
                  {exporting ? 'Exporting…' : 'Export'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshTwoToneIcon />}
                  onClick={loadAccounts}
                  disabled={loading || saving || importing || exporting}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddTwoToneIcon />}
                  onClick={openCreateDialog}
                  disabled={saving || importing || exporting}
                >
                  Add LinkedIn
                </Button>
              </>
            }
          />
        </Box>

        <Card>
          <CardContent>
            {viewMode === 'table' ? (
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
                      label="Country"
                      sortKey="country"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Title"
                      sortKey="title"
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
                      <TableCell colSpan={12}>Loading…</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12}>No LinkedIn accounts yet.</TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12}>No LinkedIn accounts match your filters.</TableCell>
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
                          {row.country ? (
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.75}
                              title={row.country}
                            >
                              <CountryFlag country={row.country} height={12} />
                              <Typography variant="caption" fontWeight={700} color="text.secondary">
                                {getCountryCode(row.country)}
                              </Typography>
                            </Stack>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} noWrap title={row.title || '—'}>
                            {row.title || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap title={row.email || '—'}>
                            {row.email || '—'}
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
                              disabled={saving || loadingEdit}
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
            ) : loading ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Loading…
              </Typography>
            ) : rows.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No LinkedIn accounts yet.
              </Typography>
            ) : filteredRows.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No LinkedIn accounts match your filters.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {paginatedRows.map((row) => (
                  <Grid item xs={12} sm={6} md={3} key={row.id}>
                    <LinkedInAccountTile account={row} onView={openDetail} />
                  </Grid>
                ))}
              </Grid>
            )}
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
          <Stack spacing={1.5}>
            <Stack spacing={0.5}>
              <Typography variant="h4">{dialogTitle}</Typography>
              <Typography variant="body2" color="text.secondary">
                Organize credentials, proxy setup, and account status in one place.
              </Typography>
            </Stack>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={4} md={3}>
                <CountrySelectField
                  options={countryOptions}
                  value={form.country}
                  onChange={(value) => setForm((current) => ({ ...current, country: value }))}
                  margin="none"
                  size="small"
                  required
                  disabled={saving || loadingEdit}
                />
              </Grid>
              <Grid item xs={12} sm={8} md={9}>
                <TextField
                  label="Title"
                  required
                  fullWidth
                  size="small"
                  margin="none"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Account name or reference"
                  disabled={saving || loadingEdit}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
          {loadingEdit ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Loading account…
            </Typography>
          ) : (
          <LinkedInFormFields
            key={editingRecord?.id ?? 'new'}
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
          )}
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
            {deletingRecord?.title || deletingRecord?.email
              ? ` (${deletingRecord.title || deletingRecord.email})`
              : ''}? This cannot be undone.
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
        onEdit={openEditDialog}
        onDelete={confirmDelete}
        disabled={saving || loadingEdit}
      />
    </>
  );
}

export default LinkedInManagement;
