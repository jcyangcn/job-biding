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
  IconButton,
  Link,
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
import CompanyDetailDialog from './CompanyDetailDialog';
import FixedHeightMultilineField from 'src/components/FixedHeightMultilineField';
import TableListFilters from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { useDetailDialog } from 'src/components/DetailDialog';
import useServerTable from 'src/hooks/useServerTable';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { formatDateTime } from 'src/utils/dateFormat';
import { buildJobVector } from 'src/utils/jobVector';
import { listSkillKeywords } from 'src/services/skillApi';
import {
  createCompany,
  deleteCompany,
  listCompanies,
  updateCompany
} from 'src/services/companyApi';

const emptyForm = {
  company: '',
  url: '',
  job_description: '',
  job_vector: []
};

function previewText(value, maxLength = 80) {
  const text = value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
  if (!text) {
    return '—';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
}

function CompanyManagement() {
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader('Company Management', 'Manage companies, job postings, and scored vectors');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [skillKeywords, setSkillKeywords] = useState([]);
  const { open: detailOpen, selected: selectedCompany, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();

  const fetchCompanies = useCallback((opts) => listCompanies(opts), []);

  const {
    total,
    loading,
    page,
    limit,
    search,
    setSearch,
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
    fetcher: fetchCompanies,
    defaultSort: { field: 'id', direction: 'desc' }
  });

  useEffect(() => {
    let cancelled = false;
    const loadKeywords = async () => {
      try {
        const keywords = await listSkillKeywords();
        if (!cancelled) {
          setSkillKeywords(Array.isArray(keywords) ? keywords : []);
        }
      } catch {
        if (!cancelled) {
          setSkillKeywords([]);
        }
      }
    };
    loadKeywords();
    return () => {
      cancelled = true;
    };
  }, []);

  const dialogTitle = useMemo(
    () => (editingCompany ? 'Edit company' : 'Add company'),
    [editingCompany]
  );

  const openCreateDialog = () => {
    setEditingCompany(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (company) => {
    closeDetail();
    setEditingCompany(company);
    setForm({
      company: company.company || '',
      url: company.url || '',
      job_description: company.job_description || '',
      job_vector: Array.isArray(company.job_vector)
        ? company.job_vector
        : buildJobVector(company.job_description || '', skillKeywords)
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!saving) {
      setDialogOpen(false);
      setEditingCompany(null);
      setForm(emptyForm);
    }
  };

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleJobDescriptionChange = (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      job_description: value,
      job_vector: buildJobVector(value, skillKeywords)
    }));
  };

  const handleSave = async () => {
    const companyName = form.company.trim();
    if (!companyName) {
      enqueueSnackbar('Company name is required', { variant: 'warning' });
      return;
    }

    const jobDescription = form.job_description.trim();
    const payload = {
      company: companyName,
      url: form.url.trim(),
      job_description: jobDescription,
      job_vector: buildJobVector(jobDescription, skillKeywords)
    };

    setSaving(true);
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, payload);
        enqueueSnackbar('Company updated', { variant: 'success' });
      } else {
        await createCompany(payload);
        enqueueSnackbar('Company created', { variant: 'success' });
      }
      setDialogOpen(false);
      setEditingCompany(null);
      setForm(emptyForm);
      refresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (company) => {
    setDeletingCompany(company);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCompany) return;
    setSaving(true);
    try {
      await deleteCompany(deletingCompany.id);
      enqueueSnackbar('Company deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingCompany(null);
      refresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Company Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search company, URL, job description…"
            showDateRange={showDateRange}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={total}
            totalCount={total}
            actions={
              <>
                <Button
                  variant="outlined"
                  startIcon={<RefreshTwoToneIcon />}
                  onClick={() => refresh()}
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
                  Add company
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
                      label="Company"
                      sortKey="company"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="URL"
                      sortKey="url"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Job description"
                      sortKey="job_description"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <TableCell>Job vector</TableCell>
                    <SortableTableCell
                      label="Created"
                      sortKey="created_at"
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
                      <TableCell colSpan={7}>
                        <Typography variant="body2" color="text.secondary">
                          Loading…
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography variant="body2" color="text.secondary">
                          {hasActiveFilters
                            ? 'No companies match your filters.'
                            : 'No companies found.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => (
                      <TableRow
                        hover
                        key={row.id}
                        onClick={() => openDetail(row)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.company || '—'}</TableCell>
                        <TableCell onClick={stopPropagation}>
                          {row.url ? (
                            <Link
                              href={row.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              sx={{ wordBreak: 'break-all' }}
                            >
                              {previewText(row.url, 40)}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell title={row.job_description || ''}>
                          {previewText(row.job_description)}
                        </TableCell>
                        <TableCell title={JSON.stringify(row.job_vector || [])}>
                          {Array.isArray(row.job_vector) && row.job_vector.length
                            ? `[${row.job_vector.length}]`
                            : '[]'}
                        </TableCell>
                        <TableCell>{formatDateTime(row.created_at)}</TableCell>
                        <TableCell align="right" onClick={stopPropagation}>
                          <Tooltip title="Edit" arrow>
                            <IconButton
                              color="primary"
                              onClick={() => openEditDialog(row)}
                              disabled={saving}
                            >
                              <EditTwoToneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete" arrow>
                            <IconButton
                              color="error"
                              onClick={() => confirmDelete(row)}
                              disabled={saving}
                            >
                              <DeleteTwoToneIcon fontSize="small" />
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
              rowsPerPageOptions={rowsPerPageOptions}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleLimitChange}
            />
          </CardContent>
        </Card>
      </Container>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            margin="normal"
            label="Company"
            value={form.company}
            onChange={handleFormChange('company')}
            required
            autoFocus
          />
          <TextField
            fullWidth
            margin="normal"
            label="URL"
            value={form.url}
            onChange={handleFormChange('url')}
            placeholder="https://..."
          />
          <Box mt={2} mb={1}>
            <FixedHeightMultilineField
              height={280}
              label="Job description"
              placeholder="Paste the job posting here…"
              value={form.job_description}
              onChange={handleJobDescriptionChange}
            />
          </Box>
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
        <DialogTitle>Delete company</DialogTitle>
        <DialogContent>
          <Typography>
            Delete company <b>{deletingCompany?.company}</b>? This cannot be undone.
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

      <CompanyDetailDialog
        open={detailOpen}
        company={selectedCompany}
        onClose={closeDetail}
      />
    </>
  );
}

export default CompanyManagement;
