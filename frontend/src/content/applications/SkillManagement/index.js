import { useCallback, useMemo, useState } from 'react';
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
import SkillDetailDialog from './SkillDetailDialog';
import TableListFilters from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { useDetailDialog } from 'src/components/DetailDialog';
import useServerTable from 'src/hooks/useServerTable';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { formatDateTime } from 'src/utils/dateFormat';
import {
  createSkill,
  deleteSkill,
  listSkills,
  updateSkill
} from 'src/services/skillApi';

const emptyForm = {
  role: 'Full stack engineer',
  field: '',
  keyword: '',
  weight: '1'
};

function formatJsonField(value) {
  const text = value == null ? '' : String(value);
  if (!text.trim()) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function previewJsonCell(value, maxLength = 80) {
  const text = value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
  if (!text) {
    return '—';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
}

function SkillManagement() {
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader('Skill Management', 'Manage role/field keywords and weights');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [deletingSkill, setDeletingSkill] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { open: detailOpen, selected: selectedSkill, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();

  const fetchSkills = useCallback((opts) => listSkills(opts), []);

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
    fetcher: fetchSkills,
    defaultSort: { field: 'id', direction: 'desc' }
  });

  const dialogTitle = useMemo(
    () => (editingSkill ? 'Edit skill' : 'Add skill'),
    [editingSkill]
  );

  const openCreateDialog = () => {
    setEditingSkill(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (skill) => {
    closeDetail();
    setEditingSkill(skill);
    setForm({
      role: skill.role || '',
      field: formatJsonField(skill.field),
      keyword: formatJsonField(skill.keyword),
      weight: skill.weight == null || skill.weight === '' ? '1' : String(skill.weight)
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!saving) {
      setDialogOpen(false);
      setEditingSkill(null);
      setForm(emptyForm);
    }
  };

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = async () => {
    const weightText = String(form.weight ?? '').trim();
    let weightValue = 1.0;
    if (weightText !== '') {
      weightValue = Number(weightText);
      if (Number.isNaN(weightValue) || weightValue < 0) {
        enqueueSnackbar('Weight must be a number ≥ 0', { variant: 'warning' });
        return;
      }
    }

    const payload = {
      role: form.role.trim(),
      field: form.field.trim(),
      keyword: form.keyword.trim(),
      weight: weightValue
    };

    setSaving(true);
    try {
      if (editingSkill) {
        await updateSkill(editingSkill.id, payload);
        enqueueSnackbar('Skill updated', { variant: 'success' });
      } else {
        await createSkill(payload);
        enqueueSnackbar('Skill created', { variant: 'success' });
      }
      setDialogOpen(false);
      setEditingSkill(null);
      setForm(emptyForm);
      refresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (skill) => {
    setDeletingSkill(skill);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingSkill) return;
    setSaving(true);
    try {
      await deleteSkill(deletingSkill.id);
      enqueueSnackbar('Skill deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingSkill(null);
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
        <title>Skill Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search role, field, keyword…"
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
                  Add skill
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
                      label="Role"
                      sortKey="role"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Field"
                      sortKey="field"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Keyword"
                      sortKey="keyword"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Weight"
                      sortKey="weight"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
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
                            ? 'No skills match your filters.'
                            : 'No skills found.'}
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
                        <TableCell>{row.role || '—'}</TableCell>
                        <TableCell title={row.field || ''}>{previewJsonCell(row.field)}</TableCell>
                        <TableCell title={row.keyword || ''}>{previewJsonCell(row.keyword)}</TableCell>
                        <TableCell>{row.weight == null ? '—' : row.weight}</TableCell>
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
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Role"
            value={form.role}
            onChange={handleFormChange('role')}
            autoFocus
          />
          <TextField
            fullWidth
            margin="normal"
            label="Field (JSON)"
            value={form.field}
            onChange={handleFormChange('field')}
            multiline
            minRows={8}
            placeholder={'{\n  "category": "Languages & Core Technologies",\n  "items": ["React", "Node.js"]\n}'}
            InputProps={{
              sx: {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.85rem'
              }
            }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Keyword (JSON)"
            value={form.keyword}
            onChange={handleFormChange('keyword')}
            multiline
            minRows={8}
            placeholder={'[\n  "React",\n  "Vue.js",\n  "Angular"\n]'}
            InputProps={{
              sx: {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.85rem'
              }
            }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Weight"
            type="number"
            inputProps={{ min: 0, step: 0.1 }}
            value={form.weight}
            onChange={handleFormChange('weight')}
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
        <DialogTitle>Delete skill</DialogTitle>
        <DialogContent>
          <Typography>
            Delete keyword <b>{deletingSkill?.keyword}</b> for role{' '}
            <b>{deletingSkill?.role}</b>? This cannot be undone.
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

      <SkillDetailDialog open={detailOpen} skill={selectedSkill} onClose={closeDetail} />
    </>
  );
}

export default SkillManagement;
