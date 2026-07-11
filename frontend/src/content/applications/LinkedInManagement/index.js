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
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import FileUploadTwoToneIcon from '@mui/icons-material/FileUploadTwoTone';
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
import useServerTable from 'src/hooks/useServerTable';
import { LINKEDIN_NEED_ACTIONS, LINKEDIN_STATUSES, getLinkedInNeedActionColor, isLinkedInNeedActionActive } from 'src/data/linkedinOptions';
import COUNTRIES from 'src/data/countries';
import { getCountryCode } from 'src/data/countryCodes';
import {
  createLinkedInAccount,
  deleteLinkedInAccount,
  deleteLinkedInImage,
  exportLinkedInAccountsCsv,
  fetchLinkedInAccountsSummary,
  getLinkedInAccount,
  importLinkedInAccountsCsv,
  listLinkedInAccounts,
  updateLinkedInAccount,
  uploadLinkedInImage
} from 'src/services/linkedinApi';
import LinkedInDetailDialog from './LinkedInDetailDialog';
import LinkedInAccountTile from './LinkedInAccountTile';
import LinkedInViewModeMenu from './LinkedInViewModeMenu';
import LinkedInFormFields, {
  buildLinkedInPayload,
  createEmptyLinkedInForm,
  linkedInRecordToForm
} from './LinkedInFormFields';
import LinkedInStatusLabel from './LinkedInStatusLabel';
import LinkedInImageThumb from './LinkedInImageThumb';
import {
  ProxyExpiryDate,
  RentingByDate,
  SecuredStatusCell
} from './LinkedInRowParts';

const TILE_ROWS_PER_PAGE = 12;
const TILE_ROWS_PER_PAGE_OPTIONS = [12, 24, 36];
const TABLE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const EMPTY_SUMMARY = {
  total: 0,
  created: 0,
  createdExpiring: 0,
  renting: 0,
  rentingExpired: 0,
  emailNotSecured: 0,
  actionRequired: 0
};

function LinkedInManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const imageInputRef = useRef(null);
  const csvInputRef = useRef(null);
  useSetPageHeader('LinkedIn Management', 'Manage LinkedIn accounts, emails, proxies, and sales records');

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
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
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logRecord, setLogRecord] = useState(null);
  const [logValue, setLogValue] = useState('');
  const [logStatus, setLogStatus] = useState('idle');
  const logSaveTimer = useRef(null);
  const logDirtyRef = useRef(false);

  const {
    open: detailOpen,
    selected: selectedAccount,
    openDetail,
    closeDetail,
    stopPropagation
  } = useDetailDialog();

  const fetchAccounts = useCallback((opts) => listLinkedInAccounts(opts), []);

  const {
    rows,
    setRows,
    total,
    loading,
    page,
    limit,
    search,
    setSearch,
    selectValues,
    setSelectValue,
    clearFilters,
    hasActiveFilters,
    sortField,
    sortDirection,
    handleSort,
    handlePageChange,
    handleLimitChange,
    rowsPerPageOptions,
    refresh,
    paginatedRows
  } = useServerTable({
    fetcher: fetchAccounts,
    selectIds: [
      'status',
      'need_action',
      'need_action_active',
      'renting_expired',
      'created_expiring',
      'email_not_secured'
    ],
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

  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchLinkedInAccountsSummary();
      setSummary({
        total: data.total || 0,
        created: data.created || 0,
        createdExpiring: data.created_expiring || 0,
        renting: data.renting || 0,
        rentingExpired: data.renting_expired || 0,
        emailNotSecured: data.email_not_secured || 0,
        actionRequired: data.action_required || 0
      });
    } catch {
      /* keep previous summary */
    }
  }, []);

  const notifyRefresh = useCallback(() => {
    refresh();
    loadSummary();
  }, [refresh, loadSummary]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

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

  const showAllAccounts = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const showCreatedAccounts = useCallback(() => {
    clearFilters();
    setSelectValue('status', 'Created');
  }, [clearFilters, setSelectValue]);

  const showCreatedExpiringAccounts = useCallback(() => {
    clearFilters();
    setSelectValue('created_expiring', 'expiring');
  }, [clearFilters, setSelectValue]);

  const showRentingAccounts = useCallback(() => {
    clearFilters();
    setSelectValue('status', 'Renting');
  }, [clearFilters, setSelectValue]);

  const showRentingExpiredAccounts = useCallback(() => {
    clearFilters();
    setSelectValue('renting_expired', 'expired');
  }, [clearFilters, setSelectValue]);

  const showEmailNotSecuredAccounts = useCallback(() => {
    clearFilters();
    setSelectValue('email_not_secured', 'yes');
  }, [clearFilters, setSelectValue]);

  const showNeedActionAccounts = useCallback(() => {
    clearFilters();
    setSelectValue('need_action_active', 'active');
  }, [clearFilters, setSelectValue]);

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
      await notifyRefresh();
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
      await notifyRefresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      if (!summary.total && !total) {
        enqueueSnackbar('No LinkedIn accounts to export', { variant: 'info' });
        return;
      }

      await exportLinkedInAccountsCsv();
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
        await notifyRefresh();
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

  const persistLog = useCallback(
    async (recordId, value) => {
      logDirtyRef.current = false;
      setLogStatus('saving');
      try {
        const saved = await updateLinkedInAccount(recordId, { logs: value });
        setRows((current) =>
          current.map((r) =>
            r.id === recordId ? { ...r, logs: saved.logs, updated_at: saved.updated_at } : r
          )
        );
        setLogStatus('saved');
      } catch (err) {
        logDirtyRef.current = true;
        setLogStatus('error');
        enqueueSnackbar(err.message || 'Failed to save log', { variant: 'error' });
      }
    },
    [enqueueSnackbar]
  );

  const openLogDialog = (row) => {
    if (logSaveTimer.current) {
      clearTimeout(logSaveTimer.current);
      logSaveTimer.current = null;
    }
    setLogRecord(row);
    setLogValue(row.logs || '');
    setLogStatus('idle');
    logDirtyRef.current = false;
    setLogDialogOpen(true);
  };

  const handleLogChange = (event) => {
    const value = event.target.value;
    const recordId = logRecord?.id;
    setLogValue(value);
    logDirtyRef.current = true;
    setLogStatus('idle');
    if (logSaveTimer.current) {
      clearTimeout(logSaveTimer.current);
    }
    logSaveTimer.current = setTimeout(() => {
      if (recordId != null) {
        persistLog(recordId, value);
      }
    }, 700);
  };

  const closeLogDialog = () => {
    if (logSaveTimer.current) {
      clearTimeout(logSaveTimer.current);
      logSaveTimer.current = null;
    }
    if (logDirtyRef.current && logRecord) {
      persistLog(logRecord.id, logValue);
    }
    setLogDialogOpen(false);
    setLogRecord(null);
  };

  useEffect(
    () => () => {
      if (logSaveTimer.current) {
        clearTimeout(logSaveTimer.current);
      }
    },
    []
  );

  const existingImage =
    editingRecord?.image && !removeExistingImage ? editingRecord.image : null;

  return (
    <>
      <Helmet>
        <title>LinkedIn Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip
            label={`${summary.total} accounts`}
            color="primary"
            variant={!hasActiveFilters ? 'filled' : 'outlined'}
            onClick={showAllAccounts}
            clickable
          />
          <Chip
            label={`${summary.created} created`}
            color="info"
            variant={selectValues.status === 'Created' ? 'filled' : 'outlined'}
            onClick={showCreatedAccounts}
            clickable
          />
          <Chip
            label={`${summary.createdExpiring} created expiring`}
            color="warning"
            variant={selectValues.created_expiring === 'expiring' ? 'filled' : 'outlined'}
            onClick={showCreatedExpiringAccounts}
            clickable
          />
          <Chip
            label={`${summary.renting} renting`}
            color="success"
            variant={selectValues.status === 'Renting' ? 'filled' : 'outlined'}
            onClick={showRentingAccounts}
            clickable
          />
          <Chip
            label={`${summary.rentingExpired} renting expired`}
            color="error"
            variant={selectValues.renting_expired === 'expired' ? 'filled' : 'outlined'}
            onClick={showRentingExpiredAccounts}
            clickable
          />
          <Chip
            label={`${summary.emailNotSecured} email not secured`}
            color="error"
            variant={selectValues.email_not_secured === 'yes' ? 'filled' : 'outlined'}
            onClick={showEmailNotSecuredAccounts}
            clickable
          />
          <Chip
            label={`${summary.actionRequired} need action`}
            color="warning"
            variant={selectValues.need_action_active === 'active' ? 'filled' : 'outlined'}
            onClick={showNeedActionAccounts}
            clickable
          />
        </Stack>

        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search title, email, LinkedIn, proxy, sales…"
            selects={filterSelects}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={total}
            totalCount={summary.total || total}
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
                  onClick={() => notifyRefresh()}
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
                    <TableCell>Screenshot</TableCell>
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
                    <TableCell sx={{ minWidth: 200 }}>Log</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 150 }}>Secured</TableCell>
                    <SortableTableCell
                      label="Status"
                      sortKey="status"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Due date"
                      sortKey={(row) =>
                        row.status === 'Renting'
                          ? row.renting_by
                          : row.status === 'Created'
                            ? row.proxy_expired_by
                            : null
                      }
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
                          ? 'No LinkedIn accounts match your filters.'
                          : 'No LinkedIn accounts yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          ...(() => {
                            const needActionColor = getLinkedInNeedActionColor(row.need_action);
                            if (needActionColor === 'error' || needActionColor === 'warning') {
                              return { bgcolor: alpha(theme.palette[needActionColor].main, 0.08) };
                            }
                            return undefined;
                          })()
                        }}
                        onClick={() => openDetail(row)}
                      >
                        <TableCell>{row.id}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          {row.image ? (
                            <Box
                              sx={{
                                width: 128,
                                height: 72,
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: `1px solid ${theme.palette.divider}`
                              }}
                            >
                              <LinkedInImageThumb
                                accountId={row.id}
                                image={row.image}
                                fill
                                fillMode="cover"
                                alt={row.title}
                              />
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                width: 128,
                                height: 72,
                                borderRadius: 1,
                                border: `1px dashed ${theme.palette.divider}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'text.disabled'
                              }}
                            >
                              <ImageOutlinedIcon sx={{ fontSize: 28 }} />
                            </Box>
                          )}
                        </TableCell>
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
                        </TableCell>
                        <TableCell sx={{ maxWidth: 240 }} onClick={stopPropagation}>
                          <Box
                            onClick={() => openLogDialog(row)}
                            sx={{
                              cursor: 'pointer',
                              borderRadius: 1,
                              px: 1,
                              py: 0.5,
                              minHeight: 34,
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'background-color 0.15s ease',
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.06)
                              }
                            }}
                          >
                            <Typography
                              variant="caption"
                              color={row.logs?.trim() ? 'text.primary' : 'text.disabled'}
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                textTransform: 'none',
                                fontSize: '0.72rem',
                                lineHeight: 1.35
                              }}
                            >
                              {row.logs?.trim() || 'Add log…'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <SecuredStatusCell
                            emailSecured={row.email_secured}
                            linkedinSecured={row.linkedin_secured}
                          />
                        </TableCell>
                        <TableCell>
                          <LinkedInStatusLabel status={row.status} />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {row.status === 'Renting' ? (
                            <RentingByDate rentingBy={row.renting_by} />
                          ) : row.status === 'Created' ? (
                            <ProxyExpiryDate proxyExpiredBy={row.proxy_expired_by} />
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {isLinkedInNeedActionActive(row.need_action) ? (
                            <Chip
                              size="small"
                              label={row.need_action}
                              color={getLinkedInNeedActionColor(row.need_action)}
                            />
                          ) : (
                            'None'
                          )}
                        </TableCell>
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
            ) : loading && rows.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Loading…
              </Typography>
            ) : rows.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                {hasActiveFilters
                  ? 'No LinkedIn accounts match your filters.'
                  : 'No LinkedIn accounts yet.'}
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {paginatedRows.map((row) => (
                  <Grid item xs={12} sm={6} md={3} key={row.id}>
                    <LinkedInAccountTile
                      account={row}
                      onView={openDetail}
                      onEditLog={openLogDialog}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
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

      <Dialog open={logDialogOpen} onClose={closeLogDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Box minWidth={0}>
              <Typography variant="h4">Log</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                #{logRecord?.id}
                {logRecord?.title ? ` · ${logRecord.title}` : ''}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
              color={
                logStatus === 'error'
                  ? 'error.main'
                  : logStatus === 'saved'
                    ? 'success.main'
                    : 'text.secondary'
              }
            >
              {logStatus === 'saving'
                ? 'Saving…'
                : logStatus === 'saved'
                  ? 'Saved'
                  : logStatus === 'error'
                    ? 'Save failed'
                    : 'Auto-saves'}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={12}
            value={logValue}
            onChange={handleLogChange}
            placeholder="Activity logs, verification notes, handoff details…"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLogDialog}>Close</Button>
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
