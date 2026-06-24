import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from 'notistack';
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
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import ApplicationDetailDialog from './ApplicationDetailDialog';
import ApplicationEditDialog from './ApplicationEditDialog';
import TableListFilters from 'src/components/TableListFilters';
import { useDetailDialog } from 'src/components/DetailDialog';
import useTableListFilters from 'src/hooks/useTableListFilters';
import { deleteJobApplication } from 'src/services/jobApplicationApi';
import { formatDateTime } from 'src/utils/dateFormat';

function formatResumeSource(row) {
  if (row.resume_generated_id) {
    return `Generated #${row.resume_generated_id}`;
  }
  if (row.resume_online_link) {
    return 'Online link';
  }
  return '—';
}

const BASE_SEARCH_FIELDS = [
  'id',
  'role',
  'company',
  'link',
  'job_description',
  (row) => formatResumeSource(row)
];

function ApplicationsTableView({
  rows,
  loading,
  onRefresh,
  profile,
  showProfileColumn = false,
  tableCardHeight,
  renderLayout
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
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
    filteredRows,
    clearFilters,
    hasActiveFilters,
    showDateRange
  } = useTableListFilters(rows, {
    searchFields,
    dateField: 'applied_at'
  });

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

  const columnCount = showProfileColumn ? 8 : 7;
  const fixedTableCard = Boolean(tableCardHeight);

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
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
      filteredCount={filteredRows.length}
      totalCount={rows.length}
      actions={
        <>
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
              component={RouterLink}
              to={`/applications/job-applications/${profile.id}/new`}
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
          <Table stickyHeader={fixedTableCard}>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  {showProfileColumn ? <TableCell>Profile</TableCell> : null}
                  <TableCell>Role</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Link</TableCell>
                  <TableCell>Resume</TableCell>
                  <TableCell>Applied</TableCell>
                  <TableCell align="right">Actions</TableCell>
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
                  filteredRows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openDetail(row)}
                    >
                      <TableCell>{row.id}</TableCell>
                      {showProfileColumn ? (
                        <TableCell>{row.profile_label || '—'}</TableCell>
                      ) : null}
                      <TableCell>{row.role || '—'}</TableCell>
                      <TableCell>{row.company || '—'}</TableCell>
                      <TableCell onClick={stopPropagation}>
                        {row.link ? (
                          <Link
                            href={row.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                          >
                            Open
                            <OpenInNewTwoToneIcon sx={{ fontSize: 16 }} />
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell onClick={stopPropagation}>
                        {row.resume_online_link ? (
                          <Tooltip title={row.resume_online_link}>
                            <Link
                              href={row.resume_online_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                            >
                              {formatResumeSource(row)}
                            </Link>
                          </Tooltip>
                        ) : (
                          formatResumeSource(row)
                        )}
                      </TableCell>
                      <TableCell>
                        {row.applied ? formatDateTime(row.applied_at) : 'Not applied'}
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
        </CardContent>
      </Card>
  );

  const dialogs = (
    <>
      <ApplicationDetailDialog
        open={detailOpen}
        application={selectedApplication}
        onClose={closeDetail}
      />

      <ApplicationEditDialog
        open={editOpen}
        application={editingRecord}
        onClose={() => !saving && setEditOpen(false)}
        onSaved={onRefresh}
      />

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
  showProfileColumn: PropTypes.bool,
  tableCardHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
  renderLayout: PropTypes.func
};

export default ApplicationsTableView;
