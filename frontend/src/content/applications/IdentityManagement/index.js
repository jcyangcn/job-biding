import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import {
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
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import IdentityDetailDialog from './IdentityDetailDialog';
import TableListFilters from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import CountryLabel from 'src/components/CountryLabel';
import CountrySelectField from 'src/components/CountrySelectField';
import DateField from 'src/components/DateField';
import { useDetailDialog } from 'src/components/DetailDialog';
import useTableListFilters from 'src/hooks/useTableListFilters';
import useTablePagination from 'src/hooks/useTablePagination';
import useTableSort from 'src/hooks/useTableSort';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import COUNTRIES, { DEFAULT_COUNTRY } from 'src/data/countries';
import {
  answersToItems,
  buildSampleAnswerItems,
  getAnswerFieldPlaceholder,
  itemsToAnswers
} from 'src/data/profileAnswerFields';
import {
  createIdentity,
  deleteIdentity,
  listIdentities,
  updateIdentity
} from 'src/services/identityApi';
import { formatDate } from 'src/utils/dateFormat';

const emptyForm = {
  name: '',
  country: DEFAULT_COUNTRY,
  address: '',
  city_state: '',
  zipcode: '',
  linkedin: '',
  github: '',
  dob: '',
  ssn: '',
  answerItems: buildSampleAnswerItems()
};

const IDENTITY_SEARCH_FIELDS = [
  'id',
  'name',
  'country',
  'address',
  'city_state',
  'zipcode',
  'linkedin',
  'github',
  'ssn',
  'dob'
];

function IdentityManagement() {
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader(
    'Identity Management',
    'Manage job application identities stored in the database'
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [answerDeleteIndex, setAnswerDeleteIndex] = useState(null);
  const { open: detailOpen, selected: selectedIdentity, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();
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
    searchFields: IDENTITY_SEARCH_FIELDS,
    dateField: 'created_at'
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
    closeDetail();
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
      ssn: record.ssn || '',
      answerItems: answersToItems(record.answers || {})
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!saving) {
      setDialogOpen(false);
      setEditingRecord(null);
      setForm(emptyForm);
      setAnswerDeleteIndex(null);
    }
  };

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleAddQuestion = () => {
    setForm((current) => ({
      ...current,
      answerItems: [
        ...current.answerItems,
        {
          id: `custom_${Date.now()}`,
          key: '',
          question: '',
          answer: '',
          predefined: false
        }
      ]
    }));
  };

  const handleAnswerItemChange = (index, field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({
      ...current,
      answerItems: current.answerItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const confirmAnswerDelete = (index) => {
    setAnswerDeleteIndex(index);
  };

  const handleDeleteAnswerItem = () => {
    if (answerDeleteIndex === null) return;
    setForm((current) => ({
      ...current,
      answerItems: current.answerItems.filter((_, index) => index !== answerDeleteIndex)
    }));
    setAnswerDeleteIndex(null);
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
    ssn: form.ssn.trim() || null,
    answers: itemsToAnswers(form.answerItems)
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.country) {
      enqueueSnackbar('Name and country are required', { variant: 'warning' });
      return;
    }
    if (!COUNTRIES.includes(form.country)) {
      enqueueSnackbar('Please select a country from the list', { variant: 'warning' });
      return;
    }
    if (form.answerItems.some((item) => !item.predefined && !item.question.trim())) {
      enqueueSnackbar('Each custom question must have a question label', { variant: 'warning' });
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
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, country, address, links…"
            showDateRange={showDateRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            dateFromLabel="Created from"
            dateToLabel="Created to"
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
            actions={
              <>
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
                      label="Name"
                      sortKey="name"
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
                      label="Address"
                      sortKey="address"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="City/State"
                      sortKey="city_state"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Zipcode"
                      sortKey="zipcode"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="LinkedIn"
                      sortKey="linkedin"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="GitHub"
                      sortKey="github"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="DOB"
                      sortKey="dob"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="SSN"
                      sortKey="ssn"
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
                      <TableCell colSpan={11}>
                        {loading ? 'Loading…' : 'No identities found.'}
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11}>No identities match your filters.</TableCell>
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
                        <TableCell>{row.name}</TableCell>
                        <TableCell>
                          <CountryLabel country={row.country} noWrap />
                        </TableCell>
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
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
          <CountrySelectField
            options={countryOptions}
            value={form.country}
            onChange={(value) => setForm((current) => ({ ...current, country: value }))}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Address"
            multiline
            minRows={2}
            value={form.address}
            onChange={handleFormChange('address')}
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
          <DateField
            fullWidth
            margin="normal"
            label="DOB"
            value={form.dob}
            onChange={(value) => setForm((current) => ({ ...current, dob: value }))}
          />
          <TextField
            fullWidth
            margin="normal"
            label="SSN"
            value={form.ssn}
            onChange={handleFormChange('ssn')}
          />

          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mt: 3, mb: 1 }}>
            <Typography variant="h5">Answers</Typography>
            <Button
              size="small"
              startIcon={<AddTwoToneIcon />}
              onClick={handleAddQuestion}
              disabled={saving}
            >
              Add question
            </Button>
          </Box>
          {form.answerItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No questions yet. Click &quot;Add question&quot; to create one.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {form.answerItems.map((item, index) => (
                <Grid item xs={12} key={item.id}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                      {item.predefined ? (
                        <Typography variant="body1">{item.question}</Typography>
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          label="Question"
                          value={item.question}
                          onChange={handleAnswerItemChange(index, 'question')}
                          required
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Answer"
                        value={item.answer}
                        onChange={handleAnswerItemChange(index, 'answer')}
                        placeholder={getAnswerFieldPlaceholder(item.key)}
                      />
                    </Grid>
                    <Grid item xs={12} md={1} sx={{ textAlign: { md: 'right' } }}>
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => confirmAnswerDelete(index)}
                          disabled={saving}
                        >
                          <DeleteTwoToneIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Grid>
              ))}
            </Grid>
          )}
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

      <Dialog open={answerDeleteIndex !== null} onClose={() => setAnswerDeleteIndex(null)}>
        <DialogTitle>Delete question</DialogTitle>
        <DialogContent>
          <Typography>
            Delete question <b>{form.answerItems[answerDeleteIndex]?.question || '—'}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnswerDeleteIndex(null)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleDeleteAnswerItem} color="error" variant="contained" disabled={saving}>
            Delete
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

      <IdentityDetailDialog
        open={detailOpen}
        identity={selectedIdentity}
        onClose={closeDetail}
      />
    </>
  );
}

export default IdentityManagement;
