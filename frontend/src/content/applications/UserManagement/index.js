import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import PageTitleWrapper from 'src/components/PageTitleWrapper';
import Footer from 'src/components/Footer';
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
import PeopleTwoToneIcon from '@mui/icons-material/PeopleTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser
} from 'src/services/usersApi';

const emptyForm = {
  full_name: '',
  username: '',
  password: '',
  role: 'user',
  description: ''
};

function UserManagement() {
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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
    if (!form.full_name.trim() || !form.username.trim() || !form.role.trim()) {
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
          role: form.role.trim(),
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
          role: form.role.trim() || 'user',
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
      <PageTitleWrapper>
        <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
          <Grid item>
            <Typography component="h1" variant="h3" gutterBottom>
              User Management
            </Typography>
            <Typography variant="subtitle2">
              Add, edit, and delete users stored in the database.
            </Typography>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1}>
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
            </Box>
          </Grid>
        </Grid>
      </PageTitleWrapper>
      <Container maxWidth="lg">
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PeopleTwoToneIcon color="primary" />
              <Typography variant="h4">Users</Typography>
            </Box>
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
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.username}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Typography noWrap title={row.description || ''}>
                            {row.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
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
        <Footer />
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
            label="Role"
            value={form.role}
            onChange={handleFormChange('role')}
          />
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
    </>
  );
}

export default UserManagement;
