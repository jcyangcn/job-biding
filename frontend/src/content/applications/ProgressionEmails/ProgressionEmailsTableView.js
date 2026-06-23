import { useMemo, useState } from 'react';
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
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import EmailLinkInfo from 'src/components/EmailLinkInfo';
import TableListFilters, { compactButtonSx } from 'src/components/TableListFilters';
import { useDetailDialog } from 'src/components/DetailDialog';
import useTableListFilters from 'src/hooks/useTableListFilters';
import ProgressionEmailDetailDialog from './ProgressionEmailDetailDialog';
import ProgressionEmailEditDialog from './ProgressionEmailEditDialog';
import ProgressionEmailStatusLabel from './ProgressionEmailStatusLabel';
import ProgressionEmailTypeLabel from './ProgressionEmailTypeLabel';
import {
  formatProgressionEmailStatus,
  formatProgressionEmailType,
  isHumanInterviewType,
  PROGRESSION_EMAIL_STATUSES,
  PROGRESSION_EMAIL_TYPES
} from 'src/data/progressionEmailOptions';
import { deleteProgressionEmail } from 'src/services/progressionEmailApi';
import { formatDateTime } from 'src/utils/dateFormat';

const BASE_SEARCH_FIELDS = [
  'id',
  'reference_no',
  'company',
  'email_link',
  'log',
  (row) => formatProgressionEmailType(row.type),
  (row) => formatProgressionEmailStatus(row.status)
];

const PROGRESSION_EMAIL_SELECT_FILTERS = [
  { id: 'type', field: 'type' },
  { id: 'status', field: 'status' }
];

function ProgressionEmailsTableView({
  rows,
  loading,
  onRefresh,
  profile,
  showProfileColumn = false,
  tableCardHeight,
  renderLayout,
  singleLine = false
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const { open: detailOpen, selected: selectedEmail, openDetail, closeDetail, stopPropagation } =
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
    dateField: 'email_date',
    selects: PROGRESSION_EMAIL_SELECT_FILTERS
  });

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
      await onRefresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
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
      filteredCount={filteredRows.length}
      totalCount={rows.length}
      actions={
        <>
          <Button
            variant="outlined"
            size={singleLine ? 'small' : 'medium'}
            startIcon={<RefreshTwoToneIcon />}
            onClick={onRefresh}
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
                <TableCell>Reference no</TableCell>
                {showProfileColumn ? <TableCell>Profile</TableCell> : null}
                <TableCell>Company</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Email date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Log</TableCell>
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
                  <TableCell colSpan={columnCount}>No progression emails yet.</TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount}>No progression emails match your filters.</TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
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
                      <TableCell>{row.profile_label || '—'}</TableCell>
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
        onSaved={onRefresh}
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
  rows: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  profile: PropTypes.object,
  showProfileColumn: PropTypes.bool,
  tableCardHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
  renderLayout: PropTypes.func,
  singleLine: PropTypes.bool
};

export default ProgressionEmailsTableView;
