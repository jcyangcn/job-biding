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
  MenuItem,
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
import UserDetailDialog from './UserDetailDialog';
import TableListFilters from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import { useDetailDialog } from 'src/components/DetailDialog';
import useTableListFilters from 'src/hooks/useTableListFilters';
import useTablePagination from 'src/hooks/useTablePagination';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser
} from 'src/services/usersApi';

const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'bidder', label: 'Bidder' },
  { value: 'caller', label: 'Caller' }
];

const emptyForm = {
  full_name: '',
  username: '',
  password: '',
  role: 'bidder',
  description: ''
};

const USER_SEARCH_FIELDS = [
  'id',
  'full_name',
  'username',
  'role',
  'description',
  (row) => USER_ROLES.find((option) => option.value === row.role)?.label
];

const USER_SELECT_FILTERS = [{ id: 'role', field: 'role' }];

function UserManagement() {
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader('User Management', 'Add, edit, and delete users');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { open: detailOpen, selected: selectedUser, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();
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
    searchFields: USER_SEARCH_FIELDS,
    dateField: null,
    selects: USER_SELECT_FILTERS
  });

  const {
    page,
    limit,
    paginatedRows,
    handlePageChange,
    handleLimitChange,
    rowsPerPageOptions
  } = useTablePagination(filteredRows);

  const dialogTitle = useMemo(
    () => (editingUser ? 'Edit user' : 'Add user'),
    [editingUser]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listUsers());
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (user) => {
    closeDetail();
    setEditingUser(user);
    setForm({
      full_name: user.full_name,
      username: user.username,
      password: '',
      role: user.role,
      description: user.description || ''
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!saving) {
      setDialogOpen(false);
      setEditingUser(null);
      setForm(emptyForm);
    }
  };

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.username.trim() || !form.role) {
      enqueueSnackbar('Full name, username, and role are required', { variant: 'warning' });
      return;
    }
    if (!editingUser && !form.password.trim()) {
      enqueueSnackbar('Password is required for new users', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const payload = {
          full_name: form.full_name.trim(),
          username: form.username.trim(),
          role: form.role,
          description: form.description.trim() || null
        };
        if (form.password.trim()) {
          payload.password = form.password;
        }
        await updateUser(editingUser.id, payload);
        enqueueSnackbar('User updated', { variant: 'success' });
      } else {
        await createUser({
          full_name: form.full_name.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role || 'bidder',
          description: form.description.trim() || null
        });
        enqueueSnackbar('User created', { variant: 'success' });
      }
      closeDialog();
      await loadUsers();
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (user) => {
    setDeletingUser(user);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setSaving(true);
    try {
      await deleteUser(deletingUser.id);
      enqueueSnackbar('User deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>User Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, username, role, description…"
            showDateRange={showDateRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            selects={[
              {
                id: 'role',
                label: 'Role',
                value: selectValues.role,
                onChange: (value) => setSelectValue('role', value),
                options: USER_ROLES
              }
            ]}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
            actions={
              <>
                <Button
                  variant="outlined"
                  startIcon={<RefreshTwoToneIcon />}
                  onClick={loadUsers}
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
                  Add user
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
                    <TableCell>ID</TableCell>
                    <TableCell>Full name</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        {loading ? 'Loading…' : 'No users found.'}
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>No users match your filters.</TableCell>
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
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.username}</TableCell>
                        <TableCell>
                          {USER_ROLES.find((option) => option.value === row.role)?.label ||
                            row.role}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Typography noWrap title={row.description || ''}>
                            {row.description || '—'}
                          </Typography>
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Full name"
            value={form.full_name}
            onChange={handleFormChange('full_name')}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            value={form.username}
            onChange={handleFormChange('username')}
          />
          <TextField
            fullWidth
            margin="normal"
            label={editingUser ? 'Password (leave blank to keep)' : 'Password'}
            type="password"
            value={form.password}
            onChange={handleFormChange('password')}
          />
          <TextField
            fullWidth
            margin="normal"
            select
            label="Role"
            value={form.role}
            onChange={handleFormChange('role')}
          >
            {USER_ROLES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            margin="normal"
            label="Description"
            multiline
            minRows={2}
            value={form.description}
            onChange={handleFormChange('description')}
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
        <DialogTitle>Delete user</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <b>{deletingUser?.username}</b>? This cannot be undone.
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

      <UserDetailDialog
        open={detailOpen}
        user={selectedUser}
        onClose={closeDetail}
      />
    </>
  );
}

export default UserManagement;
