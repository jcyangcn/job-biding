import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import FileUploadTwoToneIcon from '@mui/icons-material/FileUploadTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Typography
} from '@mui/material';
import ApplicationCreateDialog from './ApplicationCreateDialog';
import ApplicationDetailDialog from './ApplicationDetailDialog';
import ApplicationEditDialog from './ApplicationEditDialog';
import ApplicationResumeCell from './ApplicationResumeCell';
import TableListFilters from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { useDetailDialog } from 'src/components/DetailDialog';
import useTableListFilters from 'src/hooks/useTableListFilters';
import useTablePagination from 'src/hooks/useTablePagination';
import useTableSort from 'src/hooks/useTableSort';
import { formatIdentityLabel } from 'src/data/countryCodes';
import { importJobApplicationsSequentially, parseApplicationCsv } from 'src/utils/applicationCsvImport';
import {
  APPLICATION_CSV_HEADERS,
  buildApplicationExportRows
} from 'src/utils/applicationCsvExport';
import { createJobApplication, deleteJobApplication, listJobApplications } from 'src/services/jobApplicationApi';
import { formatDateTime } from 'src/utils/dateFormat';
import { downloadCsv, sanitizeCsvFilename } from 'src/utils/exportCsv';

function formatResumeSource(row) {
  if (row.resume_generation_status === 'generating') {
    return 'Generating';
  }
  if (row.resume_generation_status === 'failed') {
    return 'Failed';
  }
  if (row.resume_pdf_filename) {
    return row.resume_pdf_filename;
  }
  if (row.resume_generated_id) {
    return `Generated #${row.resume_generated_id}`;
  }
  if (row.resume_online_link) {
    return 'Online link';
  }
  return '—';
}


function formatBidderLabel(row) {
  return row.bidder_name || row.bidder_username || '';
}

function formatLinkPreview(link, maxLength = 42) {
  const value = String(link || '').trim();
  if (!value) return '';
  const withoutProtocol = value.replace(/^https?:\/\//i, '');
  if (withoutProtocol.length <= maxLength) {
    return withoutProtocol;
  }
  return `${withoutProtocol.slice(0, maxLength)}…`;
}

/** Percent widths for table-layout: fixed (without Profile column). */
const COLUMN_WIDTHS = {
  no: '4%',
  profile: '9%',
  bidder: '10%',
  role: '18%',
  company: '12%',
  link: '14%',
  resume: '16%',
  applied: '14%',
  actions: '12%'
};

/** When Profile is shown, slightly shrink neighboring columns. */
const COLUMN_WIDTHS_WITH_PROFILE = {
  no: '4%',
  profile: '9%',
  bidder: '8%',
  role: '15%',
  company: '10%',
  link: '12%',
  resume: '14%',
  applied: '12%',
  actions: '16%'
};

function colSx(width) {
  return {
    width,
    maxWidth: width,
    overflow: 'hidden'
  };
}

const ellipsisSx = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '100%'
};

const BASE_SEARCH_FIELDS = [
  'id',
  'bidder_name',
  'bidder_username',
  'role',
  'company',
  'link',
  'job_description',
  (row) => formatResumeSource(row)
];

const APPLICATION_SELECT_FILTERS = [
  {
    id: 'bidder_username',
    getValue: formatBidderLabel,
    emptyValue: ''
  }
];

function ApplicationsTableView({
  rows,
  loading,
  onRefresh,
  profile,
  exportProfileId,
  profiles = [],
  identities = [],
  showProfileColumn = false,
  tableCardHeight,
  renderLayout
}) {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSessionKey, setCreateSessionKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { open: detailOpen, selected: selectedApplication, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();

  const searchFields = useMemo(
    () => (showProfileColumn ? ['profile_label', ...BASE_SEARCH_FIELDS] : BASE_SEARCH_FIELDS),
    [showProfileColumn]
  );

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
    searchFields,
    dateField: 'applied_at',
    selects: APPLICATION_SELECT_FILTERS
  });

  const hasGeneratingResumes = useMemo(
    () => rows.some((row) => row.resume_generation_status === 'generating'),
    [rows]
  );

  useEffect(() => {
    if (!hasGeneratingResumes) return undefined;

    const intervalId = window.setInterval(() => {
      onRefresh({ silent: true });
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [hasGeneratingResumes, onRefresh]);

  const bidderOptions = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      const label = formatBidderLabel(row);
      values.add(label?.trim() ? label.trim() : '');
    });
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        value,
        label: value === '' ? '(Unknown)' : value
      }));
  }, [rows]);

  const filterSelects = useMemo(
    () => [
      {
        id: 'bidder_username',
        label: 'Bidder',
        value: selectValues.bidder_username,
        onChange: (value) => setSelectValue('bidder_username', value),
        options: bidderOptions
      }
    ],
    [bidderOptions, selectValues.bidder_username, setSelectValue]
  );

  const { sortedRows, sortField, sortDirection, handleSort } = useTableSort(filteredRows);

  const {
    page,
    limit,
    paginatedRows,
    handlePageChange,
    handleLimitChange,
    rowsPerPageOptions,
    rowOffset
  } = useTablePagination(sortedRows);

  const profileLabelToId = useMemo(() => {
    const map = {};

    if (profiles.length && identities.length) {
      const identityById = Object.fromEntries(identities.map((identity) => [identity.id, identity]));
      profiles.forEach((item) => {
        const identity = identityById[item.identity_id];
        const label = formatIdentityLabel(identity);
        if (label) {
          map[label] = item.id;
        }
        if (item.identity_name) {
          map[item.identity_name] = item.id;
        }
      });
    }

    rows.forEach((row) => {
      if (row.profile_label && row.profile_id) {
        map[row.profile_label] = row.profile_id;
      }
    });

    return map;
  }, [profiles, identities, rows]);

  const openEditDialog = (row) => {
    closeDetail();
    setEditingRecord(row);
    setEditOpen(true);
  };

  const confirmDelete = (row) => {
    closeDetail();
    setDeletingRecord(row);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setSaving(true);
    try {
      await deleteJobApplication(deletingRecord.id);
      enqueueSnackbar('Application deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingRecord(null);
      await onRefresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const resolvedExportProfileId =
        exportProfileId !== undefined ? exportProfileId : profile?.id ?? null;
      const exportRows = await listJobApplications(
        resolvedExportProfileId == null ? undefined : resolvedExportProfileId
      );
      if (!exportRows.length) {
        enqueueSnackbar('No applications to export', { variant: 'info' });
        return;
      }

      const csvRows = buildApplicationExportRows(exportRows);
      const namePart =
        resolvedExportProfileId == null
          ? 'all-profiles'
          : profile?.identity_name || `profile-${resolvedExportProfileId}`;
      const datePart = new Date().toISOString().slice(0, 10);
      downloadCsv(
        sanitizeCsvFilename(`job-applications-${namePart}-${datePart}.csv`),
        APPLICATION_CSV_HEADERS,
        csvRows
      );
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to export CSV', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsedRows = parseApplicationCsv(text, {
        defaultProfileId: profile?.id ?? null,
        profileLabelToId,
        hasProfileColumn: showProfileColumn && !profile
      }).filter((row) => row.error !== 'Empty row');

      if (!parsedRows.length) {
        enqueueSnackbar('No rows found in CSV', { variant: 'warning' });
        return;
      }

      const { created, failed, firstError } = await importJobApplicationsSequentially(
        parsedRows,
        createJobApplication
      );

      if (created) {
        await onRefresh();
      }

      if (created && failed) {
        enqueueSnackbar(`Imported ${created} application(s); ${failed} failed`, {
          variant: 'warning'
        });
      } else if (failed) {
        enqueueSnackbar(firstError || 'Import failed', { variant: 'error' });
      } else {
        enqueueSnackbar(`Imported ${created} application(s)`, { variant: 'success' });
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to import CSV', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const columnCount = showProfileColumn ? 9 : 8;
  const fixedTableCard = Boolean(tableCardHeight);
  const widths = showProfileColumn ? COLUMN_WIDTHS_WITH_PROFILE : COLUMN_WIDTHS;

  const toolbar = (
    <TableListFilters
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search role, company, link, description…"
      showDateRange={showDateRange}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      dateFromLabel="Applied from"
      dateToLabel="Applied to"
      selects={filterSelects}
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
      filteredCount={filteredRows.length}
      totalCount={rows.length}
      actions={
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={handleImportFileSelected}
          />
          <Button
            variant="outlined"
            startIcon={<FileUploadTwoToneIcon />}
            onClick={handleImportClick}
            disabled={loading || importing}
          >
            {importing ? 'Importing…' : 'Import'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadTwoToneIcon />}
            onClick={handleExportCsv}
            disabled={loading || exporting}
          >
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshTwoToneIcon />}
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          {profile ? (
            <Button
              variant="contained"
              startIcon={<AddTwoToneIcon />}
              onClick={() => {
                setCreateSessionKey((key) => key + 1);
                setCreateOpen(true);
              }}
            >
              Add application
            </Button>
          ) : null}
        </>
      }
    />
  );

  const table = (
    <Card
      sx={
        fixedTableCard
          ? {
              height: tableCardHeight,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }
          : undefined
      }
    >
      <CardContent
        sx={
          fixedTableCard
            ? {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                '&:last-child': { pb: 2 }
              }
            : undefined
        }
      >
        <TableContainer sx={fixedTableCard ? { flex: 1, overflow: 'auto' } : undefined}>
          <Table stickyHeader={fixedTableCard} sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={colSx(widths.no)}>No</TableCell>
                  {showProfileColumn ? (
                    <SortableTableCell
                      label="Profile"
                      sortKey="profile_label"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      sx={colSx(widths.profile)}
                    />
                  ) : null}
                  <SortableTableCell
                    label="Bidder"
                    sortKey={(row) => formatBidderLabel(row)}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.bidder)}
                  />
                  <SortableTableCell
                    label="Role"
                    sortKey="role"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.role)}
                  />
                  <SortableTableCell
                    label="Company"
                    sortKey="company"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.company)}
                  />
                  <SortableTableCell
                    label="Link"
                    sortKey="link"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.link)}
                  />
                  <SortableTableCell
                    label="Resume"
                    sortKey={(row) => formatResumeSource(row)}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.resume)}
                  />
                  <SortableTableCell
                    label="Applied"
                    sortKey={(row) => row.applied_at || ''}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.applied)}
                  />
                  <TableCell align="right" sx={colSx(widths.actions)} />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columnCount}>Loading…</TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnCount}>No applications yet.</TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnCount}>No applications match your filters.</TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openEditDialog(row)}
                    >
                      <TableCell sx={colSx(widths.no)}>{rowOffset + index + 1}</TableCell>
                      {showProfileColumn ? (
                        <TableCell sx={colSx(widths.profile)}>
                          <Typography variant="body2" sx={ellipsisSx}>
                            {row.profile_label || '—'}
                          </Typography>
                        </TableCell>
                      ) : null}
                      <TableCell sx={colSx(widths.bidder)}>
                        <Typography variant="body2" sx={ellipsisSx}>
                          {formatBidderLabel(row) || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={colSx(widths.role)}>
                        {row.role ? (
                          <Tooltip title={row.role}>
                            <Typography variant="body2" sx={ellipsisSx}>
                              {row.role}
                            </Typography>
                          </Tooltip>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell sx={colSx(widths.company)}>
                        <Typography variant="body2" sx={ellipsisSx}>
                          {row.company || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={colSx(widths.link)} onClick={stopPropagation}>
                        {row.link ? (
                          <Tooltip title={row.link}>
                            <Link
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              sx={ellipsisSx}
                            >
                              {formatLinkPreview(row.link)}
                            </Link>
                          </Tooltip>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell sx={colSx(widths.resume)} onClick={stopPropagation}>
                        <ApplicationResumeCell row={row} />
                      </TableCell>
                      <TableCell sx={colSx(widths.applied)}>
                        {row.applied ? (
                          <Typography variant="body2" sx={ellipsisSx}>
                            {formatDateTime(row.applied_at)}
                          </Typography>
                        ) : (
                          <Tooltip title="Not applied">
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                              <CancelTwoToneIcon
                                sx={{ fontSize: 20, color: 'error.main', flexShrink: 0 }}
                                aria-label="Not applied"
                              />
                              <Typography variant="body2" color="error.main" noWrap>
                                Not applied
                              </Typography>
                            </Stack>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={colSx(widths.actions)} onClick={stopPropagation}>
                        <Tooltip title="View details">
                          <IconButton
                            color="primary"
                            onClick={() => openDetail(row)}
                            disabled={saving}
                          >
                            <VisibilityTwoToneIcon />
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
  );

  const dialogs = (
    <>
      {createOpen ? (
        <ApplicationCreateDialog
          key={createSessionKey}
          open
          profile={profile}
          onClose={() => setCreateOpen(false)}
          onSaved={onRefresh}
        />
      ) : null}

      <ApplicationDetailDialog
        open={detailOpen}
        application={selectedApplication}
        onClose={closeDetail}
      />

      {editOpen && editingRecord ? (
        <ApplicationEditDialog
          open
          application={editingRecord}
          onClose={() => !saving && setEditOpen(false)}
          onSaved={onRefresh}
        />
      ) : null}

      <Dialog open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)}>
        <DialogTitle>Delete application</DialogTitle>
        <DialogContent>
          <Typography>
            Delete application #{deletingRecord?.id}
            {deletingRecord?.company ? ` for ${deletingRecord.company}` : ''}? This cannot be undone.
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

  if (renderLayout) {
    return renderLayout({ toolbar, table, dialogs });
  }

  return (
    <>
      <Box sx={{ mb: 2 }}>{toolbar}</Box>
      {table}
      {dialogs}
    </>
  );
}

ApplicationsTableView.propTypes = {
  rows: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  profile: PropTypes.object,
  exportProfileId: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  profiles: PropTypes.array,
  identities: PropTypes.array,
  showProfileColumn: PropTypes.bool,
  tableCardHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
  renderLayout: PropTypes.func
};

export default ApplicationsTableView;
