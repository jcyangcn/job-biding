import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import CloseTwoToneIcon from '@mui/icons-material/CloseTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import FixedHeightMultilineField from 'src/components/FixedHeightMultilineField';
import { PROJECT_NAME } from 'src/config/app';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import {
  bulkReplaceSkills,
  createSkill,
  deleteSkill,
  listAllSkills
} from 'src/services/skillApi';
import {
  groupSkillsByRole,
  parseSkillBulkText
} from 'src/utils/skillKeywords';

const DEFAULT_ROLE = 'Full stack engineer';

const PASTE_PLACEHOLDER = `Languages & Core Technologies (25)
JavaScript, TypeScript, Python, Java, React, Node.js, ...

Databases (12)
PostgreSQL, MySQL, MongoDB, Redis, ...`;

function fieldKey(role, field) {
  return `${role}\u0000${field}`;
}

function SkillManagement() {
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader('Skill Management', 'Paste skill lists by role and field');
  const [roleGroups, setRoleGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [roleName, setRoleName] = useState(DEFAULT_ROLE);
  const [bulkText, setBulkText] = useState('');
  const [addingFieldKey, setAddingFieldKey] = useState(null);
  const [draftKeyword, setDraftKeyword] = useState('');
  const [draftWeight, setDraftWeight] = useState('1');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState('');

  const roleOptions = useMemo(
    () => roleGroups.map((group) => group.role).filter(Boolean),
    [roleGroups]
  );

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAllSkills({ pageSize: 500 });
      setRoleGroups(groupSkillsByRole(rows));
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load skills', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleOpenForm = () => {
    setRoleName(DEFAULT_ROLE);
    setBulkText('');
    setFormOpen(true);
  };

  const handleCancelForm = () => {
    if (!saving) {
      setFormOpen(false);
    }
  };

  const handleOpenDelete = (role = '') => {
    setDeleteRole(role || roleOptions[0] || '');
    setDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    if (!saving) {
      setDeleteOpen(false);
      setDeleteRole('');
    }
  };

  const handleDeleteData = async () => {
    const role = deleteRole.trim();
    if (!role) {
      enqueueSnackbar('Select a role to delete', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      await bulkReplaceSkills({ role, items: [] });
      enqueueSnackbar(`Deleted skill data for ${role}`, { variant: 'success' });
      setDeleteOpen(false);
      setDeleteRole('');
      await loadSkills();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async () => {
    const role = roleName.trim();
    if (!role) {
      enqueueSnackbar('Role is required', { variant: 'warning' });
      return;
    }

    const parsedFields = parseSkillBulkText(bulkText);
    if (!parsedFields.length) {
      enqueueSnackbar('No skill data found. Paste category headers and comma-separated skills.', {
        variant: 'warning'
      });
      return;
    }

    setSaving(true);
    try {
      const items = parsedFields.flatMap((fieldGroup) =>
        fieldGroup.items.map((entry) => ({
          field: fieldGroup.field,
          keyword: entry.item,
          weight: entry.weight == null || entry.weight === '' ? 1 : Number(entry.weight)
        }))
      );

      await bulkReplaceSkills({ role, items });

      enqueueSnackbar('Skills saved', { variant: 'success' });
      setFormOpen(false);
      setBulkText('');
      await loadSkills();
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openAddSkillForm = (role, field) => {
    setAddingFieldKey(fieldKey(role, field));
    setDraftKeyword('');
    setDraftWeight('1');
  };

  const closeAddSkillForm = () => {
    setAddingFieldKey(null);
    setDraftKeyword('');
    setDraftWeight('1');
  };

  const handleCancelAddSkill = () => {
    if (!saving) {
      closeAddSkillForm();
    }
  };

  const handleAddSkill = async (role, field) => {
    const keyword = draftKeyword.trim();
    if (!keyword) {
      enqueueSnackbar('Skill name is required', { variant: 'warning' });
      return;
    }

    const weightValue = draftWeight === '' ? 1 : Number(draftWeight);
    if (Number.isNaN(weightValue) || weightValue < 0) {
      enqueueSnackbar('Weight must be a number ≥ 0', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      await createSkill({
        role,
        field,
        keyword,
        weight: weightValue
      });
      enqueueSnackbar('Skill added', { variant: 'success' });
      closeAddSkillForm();
      await loadSkills();
    } catch (err) {
      enqueueSnackbar(err.message || 'Add failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    if (!skillId) {
      return;
    }

    setSaving(true);
    try {
      await deleteSkill(skillId);
      enqueueSnackbar('Skill removed', { variant: 'success' });
      await loadSkills();
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
      <Container maxWidth="lg" sx={{ pt: 3, pb: 4 }}>
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshTwoToneIcon />}
            onClick={loadSkills}
            disabled={loading || saving}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteTwoToneIcon />}
            onClick={() => handleOpenDelete()}
            disabled={loading || saving || roleOptions.length === 0}
          >
            Delete Data
          </Button>
          <Button
            variant="contained"
            startIcon={<AddTwoToneIcon />}
            onClick={handleOpenForm}
            disabled={loading || saving}
          >
            Add Data
          </Button>
        </Stack>

        <Collapse in={formOpen}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Paste skill data
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Use a category line like <b>Languages &amp; Core Technologies (25)</b>, then a
                comma-separated skill list on the next line. Repeat for each field.
              </Typography>
              <TextField
                fullWidth
                label="Role"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                margin="normal"
                required
              />
              <Box mt={2}>
                <FixedHeightMultilineField
                  height={360}
                  label="Skill lists"
                  placeholder={PASTE_PLACEHOLDER}
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  monospace
                />
              </Box>
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button onClick={handleCancelForm} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveTwoToneIcon />}
                  onClick={handleBulkSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Collapse>

        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading skills…
          </Typography>
        ) : roleGroups.length === 0 ? (
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                No skills yet. Click <b>Add Data</b> to paste your skill lists.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          roleGroups.map((roleGroup) => (
            <Card key={roleGroup.role} sx={{ mb: 3 }}>
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WorkTwoToneIcon color="primary" />
                    <Typography variant="h5" component="h2">
                      {roleGroup.role}
                    </Typography>
                  </Stack>
                  <Tooltip title="Delete this role's skill data" arrow>
                    <span>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<DeleteTwoToneIcon />}
                        onClick={() => handleOpenDelete(roleGroup.role)}
                        disabled={saving}
                      >
                        Delete Data
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>

                {roleGroup.fields.map((fieldGroup, fieldIndex) => {
                  const addKey = fieldKey(roleGroup.role, fieldGroup.field);
                  const isAdding = addingFieldKey === addKey;

                  return (
                    <Box
                      key={`${roleGroup.role}-${fieldGroup.field}`}
                      sx={{ mb: fieldIndex < roleGroup.fields.length - 1 ? 3 : 0 }}
                    >
                      {fieldIndex > 0 ? <Divider sx={{ mb: 2 }} /> : null}
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {fieldGroup.field}{' '}
                          <Typography component="span" variant="body2" color="text.secondary">
                            ({fieldGroup.items.length})
                          </Typography>
                        </Typography>
                        <Tooltip title="Add skill" arrow>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openAddSkillForm(roleGroup.role, fieldGroup.field)}
                            disabled={saving || isAdding}
                          >
                            <AddTwoToneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Collapse in={isAdding}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          alignItems={{ xs: 'stretch', sm: 'center' }}
                          sx={{ mb: 1.5 }}
                        >
                          <TextField
                            size="small"
                            label="Skill"
                            value={draftKeyword}
                            onChange={(event) => setDraftKeyword(event.target.value)}
                            autoFocus
                            fullWidth
                          />
                          <TextField
                            size="small"
                            label="Weight"
                            type="number"
                            value={draftWeight}
                            onChange={(event) => setDraftWeight(event.target.value)}
                            inputProps={{ min: 0, step: 0.1 }}
                            sx={{ width: { xs: '100%', sm: 110 } }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleAddSkill(roleGroup.role, fieldGroup.field)}
                            disabled={saving}
                          >
                            Add
                          </Button>
                          <Button size="small" onClick={handleCancelAddSkill} disabled={saving}>
                            Cancel
                          </Button>
                        </Stack>
                      </Collapse>

                      {fieldGroup.items.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          No skills in this field.
                        </Typography>
                      ) : (
                        <Stack direction="row" flexWrap="wrap" gap={0.75}>
                          {fieldGroup.items.map((entry) => (
                            <Chip
                              key={entry.id || `${fieldGroup.field}-${entry.item}`}
                              label={`${entry.item} (${entry.weight ?? 1})`}
                              size="small"
                              variant="outlined"
                              onDelete={
                                entry.id && !saving
                                  ? () => handleDeleteSkill(entry.id)
                                  : undefined
                              }
                              deleteIcon={<CloseTwoToneIcon fontSize="small" />}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          ))
        )}
      </Container>

      <Dialog open={deleteOpen} onClose={handleCloseDelete} fullWidth maxWidth="xs">
        <DialogTitle>Delete skill data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This removes all skill keywords for the selected role. Job post vectors are not changed
            until you recompute them.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="skill-delete-role-label">Role</InputLabel>
            <Select
              labelId="skill-delete-role-label"
              label="Role"
              value={deleteRole}
              onChange={(event) => setDeleteRole(event.target.value)}
              disabled={saving}
            >
              {roleOptions.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} disabled={saving}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteData}
            disabled={saving || !deleteRole}
          >
            {saving ? 'Deleting…' : 'Delete Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SkillManagement;
