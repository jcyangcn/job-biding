import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import FileUploadTwoToneIcon from '@mui/icons-material/FileUploadTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import EmailLinkInfo from 'src/components/EmailLinkInfo';
import EmailIdentityLabel from 'src/components/IdentityLabel';
import ImportExportPasswordDialog from 'src/components/ImportExportPasswordDialog';
import TableListFilters, { compactButtonSx } from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { useDetailDialog } from 'src/components/DetailDialog';
import useServerTable from 'src/hooks/useServerTable';
import useImportExportPassword from 'src/hooks/useImportExportPassword';
import ProgressionEmailDetailDialog from './ProgressionEmailDetailDialog';
import ProgressionEmailEditDialog from './ProgressionEmailEditDialog';
import ProgressionEmailStatusLabel from './ProgressionEmailStatusLabel';
import ProgressionEmailTypeLabel from './ProgressionEmailTypeLabel';
import {
  isHumanInterviewType,
  PROGRESSION_EMAIL_STATUSES,
  PROGRESSION_EMAIL_TYPES
} from 'src/data/progressionEmailOptions';
import { formatIdentityLabel } from 'src/data/countryCodes';
import { createProgressionEmail, deleteProgressionEmail, listAllProgressionEmails, listProgressionEmails } from 'src/services/progressionEmailApi';
import { formatDateTime } from 'src/utils/dateFormat';
import { downloadCsv, sanitizeCsvFilename } from 'src/utils/exportCsv';
import {
  importProgressionEmailsSequentially,
  parseProgressionEmailCsv
} from 'src/utils/progressionEmailCsvImport';
import {
  PROGRESSION_EMAIL_CSV_HEADERS,
  buildProgressionEmailExportRows
} from 'src/utils/progressionEmailCsvExport';

async function fetchAllProgressionEmailItems(profileId, options = {}) {
  return listAllProgressionEmails(profileId, options);
}

function ProgressionEmailsTableView({
  listProfileId,
  onRefresh,
  onTotalChange,
  profile,
  exportProfileId,
  profiles = [],
  identities = [],
  showProfileColumn = false,
  tableCardHeight,
  renderLayout,
  singleLine = false
}) {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const {
    requestImportExportConfirmation,
    importExportPasswordDialogProps
  } = useImportExportPassword();
  const { open: detailOpen, selected: selectedEmail, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();

  const fetchEmails = useCallback(
    (opts) => listProgressionEmails(listProfileId ?? undefined, { ...opts }),
    [listProfileId]
  );

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
    fetcher: fetchEmails,
    selectIds: ['type', 'status'],
    dateField: 'email_date'
  });

  const prevListProfileIdRef = useRef(listProfileId);
  useEffect(() => {
    if (prevListProfileIdRef.current !== listProfileId) {
      prevListProfileIdRef.current = listProfileId;
      refresh();
    }
  }, [listProfileId, refresh]);

  useEffect(() => {
    onTotalChange?.(total);
  }, [total, onTotalChange]);

  const notifyRefresh = useCallback(async () => {
    refresh();
    if (onRefresh) {
      await onRefresh();
    }
  }, [refresh, onRefresh]);

  const profileLookup = useMemo(
    () => new Map(profiles.map((item) => [item.id, item])),
    [profiles]
  );

  const identityLookup = useMemo(
    () => new Map(identities.map((item) => [item.id, item])),
    [identities]
  );

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

  const filterSelects = useMemo(
    () => [
      {
        id: 'type',
        label: 'Type',
        value: selectValues.type,
        onChange: (value) => setSelectValue('type', value),
        options: PROGRESSION_EMAIL_TYPES
      },
      {
        id: 'status',
        label: 'Status',
        value: selectValues.status,
        onChange: (value) => setSelectValue('status', value),
        options: PROGRESSION_EMAIL_STATUSES
      }
    ],
    [selectValues.type, selectValues.status, setSelectValue]
  );

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
      await deleteProgressionEmail(deletingRecord.id);
      enqueueSnackbar('Progression email deleted', { variant: 'success' });
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
      const resolvedExportProfileId =
        exportProfileId !== undefined
          ? exportProfileId
          : listProfileId !== undefined
            ? listProfileId
            : profile?.id ?? null;
      const exportRows = await fetchAllProgressionEmailItems(
        resolvedExportProfileId == null ? undefined : resolvedExportProfileId
      );
      if (!exportRows.length) {
        enqueueSnackbar('No progression emails to export', { variant: 'info' });
        return;
      }

      const csvRows = buildProgressionEmailExportRows(exportRows);
      const namePart =
        resolvedExportProfileId == null
          ? 'all-profiles'
          : profile?.identity_name || `profile-${resolvedExportProfileId}`;
      const datePart = new Date().toISOString().slice(0, 10);
      downloadCsv(
        sanitizeCsvFilename(`job-progression-emails-${namePart}-${datePart}.csv`),
        PROGRESSION_EMAIL_CSV_HEADERS,
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
      const parsedRows = parseProgressionEmailCsv(text, {
        defaultProfileId: profile?.id ?? null,
        profileLabelToId,
        hasProfileColumn: showProfileColumn && !profile
      }).filter((row) => row.error !== 'Empty row');

      if (!parsedRows.length) {
        enqueueSnackbar('No rows found in CSV', { variant: 'warning' });
        return;
      }

      const { created, failed, firstError } = await importProgressionEmailsSequentially(
        parsedRows,
        createProgressionEmail
      );

      if (created) {
        await notifyRefresh();
      }

      if (created && failed) {
        enqueueSnackbar(`Imported ${created} email(s); ${failed} failed`, {
          variant: 'warning'
        });
      } else if (failed) {
        enqueueSnackbar(firstError || 'Import failed', { variant: 'error' });
      } else {
        enqueueSnackbar(`Imported ${created} email(s)`, { variant: 'success' });
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to import CSV', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const columnCount = showProfileColumn ? 9 : 8;
  const fixedTableCard = Boolean(tableCardHeight);

  const toolbar = (
    <TableListFilters
      singleLine={singleLine}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search reference, company, email…"
      showDateRange={showDateRange}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      dateFromLabel="Email from"
      dateToLabel="Email to"
      selects={filterSelects}
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
      filteredCount={total}
      totalCount={total}
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
            size={singleLine ? 'small' : 'medium'}
            startIcon={<FileUploadTwoToneIcon />}
            onClick={() =>
              requestImportExportConfirmation('Import', handleImportClick)
            }
            disabled={loading || importing}
            sx={singleLine ? compactButtonSx : undefined}
          >
            {importing ? 'Importing…' : 'Import'}
          </Button>
          <Button
            variant="outlined"
            size={singleLine ? 'small' : 'medium'}
            startIcon={<FileDownloadTwoToneIcon />}
            onClick={() =>
              requestImportExportConfirmation('Export', handleExportCsv)
            }
            disabled={loading || exporting}
            sx={singleLine ? compactButtonSx : undefined}
          >
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
          <Button
            variant="outlined"
            size={singleLine ? 'small' : 'medium'}
            startIcon={<RefreshTwoToneIcon />}
            onClick={notifyRefresh}
            disabled={loading}
            sx={singleLine ? compactButtonSx : undefined}
          >
            Refresh
          </Button>
          {profile ? (
            <Button
              variant="contained"
              size={singleLine ? 'small' : 'medium'}
              startIcon={<AddTwoToneIcon />}
              component={RouterLink}
              to={`/applications/progression-emails/${profile.id}/new`}
              sx={singleLine ? compactButtonSx : undefined}
            >
              Add email
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
          <Table stickyHeader={fixedTableCard}>
            <TableHead>
              <TableRow>
                <SortableTableCell
                  label="Reference no"
                  sortKey="reference_no"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                {showProfileColumn ? (
                  <SortableTableCell
                    label="Profile"
                    sortKey="profile_label"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                ) : null}
                <SortableTableCell
                  label="Company"
                  sortKey="company"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableCell
                  label="Type"
                  sortKey="type"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableCell
                  label="Email Link"
                  sortKey="email_link"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableCell
                  label="Email date"
                  sortKey="email_date"
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
                <TableCell>Log</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columnCount}>Loading…</TableCell>
                </TableRow>
              ) : total === 0 && !hasActiveFilters ? (
                <TableRow>
                  <TableCell colSpan={columnCount}>No progression emails yet.</TableCell>
                </TableRow>
              ) : total === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount}>No progression emails match your filters.</TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={(theme) => ({
                      cursor: 'pointer',
                      ...(isHumanInterviewType(row.type) && {
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                        boxShadow: `inset 3px 0 0 ${theme.palette.error.main}`
                      })
                    })}
                    onClick={() => openDetail(row)}
                  >
                    <TableCell>{row.reference_no}</TableCell>
                    {showProfileColumn ? (
                      <TableCell>
                        <EmailIdentityLabel
                          identityId={profileLookup.get(row.profile_id)?.identity_id}
                          label={row.profile_label}
                          identityById={identityLookup}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell>{row.company}</TableCell>
                    <TableCell>
                      <ProgressionEmailTypeLabel type={row.type} />
                    </TableCell>
                    <TableCell onClick={stopPropagation}>
                      <EmailLinkInfo value={row.email_link} maxWidth={180} />
                    </TableCell>
                    <TableCell>{formatDateTime(row.email_date)}</TableCell>
                    <TableCell>
                      <ProgressionEmailStatusLabel status={row.status} />
                    </TableCell>
                    <TableCell
                      sx={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {row.log || '—'}
                    </TableCell>
                    <TableCell align="right" onClick={stopPropagation}>
                      <Tooltip title="Edit">
                        <IconButton color="primary" onClick={() => openEditDialog(row)} disabled={saving}>
                          <EditTwoToneIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => confirmDelete(row)} disabled={saving}>
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
  );

  const dialogs = (
    <>
      <ProgressionEmailDetailDialog
        open={detailOpen}
        email={selectedEmail}
        onClose={closeDetail}
      />

      <ProgressionEmailEditDialog
        open={editOpen}
        email={editingRecord}
        onClose={() => !saving && setEditOpen(false)}
        onSaved={notifyRefresh}
      />

      <Dialog open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)}>
        <DialogTitle>Delete progression email</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <b>{deletingRecord?.reference_no}</b>? This cannot be undone.
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

      <ImportExportPasswordDialog {...importExportPasswordDialogProps} />
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

ProgressionEmailsTableView.propTypes = {
  listProfileId: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  onRefresh: PropTypes.func,
  onTotalChange: PropTypes.func,
  profile: PropTypes.object,
  exportProfileId: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  profiles: PropTypes.array,
  identities: PropTypes.array,
  showProfileColumn: PropTypes.bool,
  tableCardHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
  renderLayout: PropTypes.func,
  singleLine: PropTypes.bool
};

export default ProgressionEmailsTableView;
