import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Select,
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
import AssignmentIndTwoToneIcon from '@mui/icons-material/AssignmentIndTwoTone';
import AutoAwesomeTwoToneIcon from '@mui/icons-material/AutoAwesomeTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import SelectAllTwoToneIcon from '@mui/icons-material/SelectAllTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import PostDetailDialog from './PostDetailDialog';
import FixedHeightMultilineField from 'src/components/FixedHeightMultilineField';
import TableListFilters from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { useDetailDialog } from 'src/components/DetailDialog';
import useServerTable from 'src/hooks/useServerTable';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { formatDateTime } from 'src/utils/dateFormat';
import { buildJobVector } from 'src/utils/jobVector';
import { listAllProfiles } from 'src/services/profileApi';
import { generateResumeForPost } from 'src/services/resumeApi';
import { listSkillKeywords } from 'src/services/skillApi';
import {
  createJobPost,
  batchAssignPostsToProfile,
  deleteJobPost,
  listJobPosts,
  updateJobPost
} from 'src/services/jobPostApi';

const emptyForm = {
  company: '',
  role: '',
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

// Fetch every job post across all pages. The list API caps page size (200),
// so a single call misses posts when there are more than that — which made
// batch selection/generation silently skip posts outside the first page.
async function fetchAllJobPostsComplete() {
  const pageSize = 200;
  const fetchPage = async (page, all) => {
    const result = await listJobPosts({ page, pageSize });
    const items = Array.isArray(result?.items) ? result.items : [];
    const accumulated = [...all, ...items];
    const total = Number(result?.total) || 0;

    if (items.length < pageSize || accumulated.length >= total || page >= 100) {
      return accumulated;
    }

    return fetchPage(page + 1, accumulated);
  };

  return fetchPage(1, []);
}

function PostManagement() {
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader(
    'Post Management',
    'Manage job posts and batch-generate tailored resumes for a profile'
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [deletingPost, setDeletingPost] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [skillKeywords, setSkillKeywords] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [generatingResumes, setGeneratingResumes] = useState(false);
  const [assigningPosts, setAssigningPosts] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({
    current: 0,
    total: 0,
    label: ''
  });
  const { open: detailOpen, selected: selectedPost, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();

  useEffect(() => {
    listAllProfiles()
      .then((rows) => setProfiles(Array.isArray(rows) ? rows : []))
      .catch(() => setProfiles([]));
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => Number(profile.id) === Number(selectedProfileId)) || null,
    [profiles, selectedProfileId]
  );

  const fetchPosts = useCallback((opts) => listJobPosts(opts), []);

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
    fetcher: fetchPosts,
    defaultSort: { field: 'id', direction: 'desc' }
  });

  const busy = loading || saving || generatingResumes || assigningPosts;

  const selectedPostIdSet = useMemo(() => new Set(selectedPostIds.map(Number)), [selectedPostIds]);

  const pagePostIds = useMemo(
    () => paginatedRows.map((row) => Number(row.id)),
    [paginatedRows]
  );

  const allPageSelected =
    pagePostIds.length > 0 && pagePostIds.every((id) => selectedPostIdSet.has(id));
  const somePageSelected =
    pagePostIds.some((id) => selectedPostIdSet.has(id)) && !allPageSelected;

  const togglePostSelection = (postId) => {
    const id = Number(postId);
    setSelectedPostIds((current) =>
      current.some((value) => Number(value) === id)
        ? current.filter((value) => Number(value) !== id)
        : [...current, id]
    );
  };

  const handleTogglePageSelection = () => {
    if (allPageSelected) {
      setSelectedPostIds((current) =>
        current.filter((id) => !pagePostIds.includes(Number(id)))
      );
      return;
    }

    setSelectedPostIds((current) => {
      const merged = new Set(current.map(Number));
      pagePostIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  const handleSelectAllPosts = async () => {
    try {
      const posts = await fetchAllJobPostsComplete();
      setSelectedPostIds(posts.map((post) => Number(post.id)));
      enqueueSnackbar(`Selected ${posts.length} post(s)`, { variant: 'info' });
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to select all posts', { variant: 'error' });
    }
  };

  const handleAssignPosts = async () => {
    if (!selectedProfile) {
      enqueueSnackbar('Select a profile first', { variant: 'warning' });
      return;
    }
    if (!selectedPostIds.length) {
      enqueueSnackbar('Select at least one post', { variant: 'warning' });
      return;
    }

    setAssigningPosts(true);
    try {
      const result = await batchAssignPostsToProfile(selectedProfile.id, selectedPostIds);
      const createdCount = result.created?.length || 0;
      const skippedCount = result.skipped?.length || 0;

      if (createdCount) {
        enqueueSnackbar(
          `Created ${createdCount} application(s) for ${selectedProfile.identity_name || 'profile'}`,
          { variant: 'success' }
        );
      }
      if (skippedCount) {
        const reason = result.skipped[0]?.reason || 'Already assigned';
        enqueueSnackbar(
          `${skippedCount} post(s) skipped${createdCount ? '' : `: ${reason}`}`,
          { variant: createdCount ? 'warning' : 'info' }
        );
      }
      if (!createdCount && !skippedCount) {
        enqueueSnackbar('No applications were created', { variant: 'warning' });
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Assign failed', { variant: 'error' });
    } finally {
      setAssigningPosts(false);
    }
  };

  const loadKeywordsForRole = useCallback(async (role) => {
    const skillRole = (role || '').trim() || 'Full stack engineer';
    try {
      const keywords = await listSkillKeywords(skillRole);
      return Array.isArray(keywords) ? keywords : [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!dialogOpen) {
      return undefined;
    }

    let cancelled = false;
    const syncKeywords = async () => {
      const keywords = await loadKeywordsForRole(form.role);
      if (cancelled) {
        return;
      }
      setSkillKeywords(keywords);
      setForm((current) => ({
        ...current,
        job_vector: buildJobVector(current.job_description || '', keywords)
      }));
    };

    syncKeywords();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, loadKeywordsForRole]);

  const handleRoleBlur = async () => {
    const keywords = await loadKeywordsForRole(form.role);
    setSkillKeywords(keywords);
    setForm((current) => ({
      ...current,
      job_vector: buildJobVector(current.job_description || '', keywords)
    }));
  };

  const dialogTitle = useMemo(
    () => (editingPost ? 'Edit post' : 'Add post'),
    [editingPost]
  );

  const openCreateDialog = () => {
    setEditingPost(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (post) => {
    closeDetail();
    setEditingPost(post);
    setForm({
      company: post.company || '',
      role: post.role || '',
      url: post.url || '',
      job_description: post.job_description || '',
      job_vector: Array.isArray(post.job_vector) ? post.job_vector : []
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!saving) {
      setDialogOpen(false);
      setEditingPost(null);
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
      enqueueSnackbar('Company is required', { variant: 'warning' });
      return;
    }

    const roleName = form.role.trim();
    if (!roleName) {
      enqueueSnackbar('Role is required', { variant: 'warning' });
      return;
    }

    const urlValue = form.url.trim();
    if (!urlValue) {
      enqueueSnackbar('URL is required', { variant: 'warning' });
      return;
    }

    const jobDescription = form.job_description.trim();
    const payload = {
      company: companyName,
      role: roleName,
      url: urlValue,
      job_description: jobDescription
    };

    setSaving(true);
    try {
      if (editingPost) {
        await updateJobPost(editingPost.id, payload);
        enqueueSnackbar('Post updated', { variant: 'success' });
      } else {
        await createJobPost(payload);
        enqueueSnackbar('Post created', { variant: 'success' });
      }
      setDialogOpen(false);
      setEditingPost(null);
      setForm(emptyForm);
      refresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (post) => {
    setDeletingPost(post);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPost) return;
    setSaving(true);
    try {
      await deleteJobPost(deletingPost.id);
      enqueueSnackbar('Post deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingPost(null);
      refresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateResumes = async () => {
    if (!selectedProfile) {
      enqueueSnackbar('Select a profile first', { variant: 'warning' });
      return;
    }
    if (!selectedPostIds.length) {
      enqueueSnackbar('Select at least one post', { variant: 'warning' });
      return;
    }

    setGeneratingResumes(true);
    setGenerateProgress({ current: 0, total: 0, label: 'Loading posts…' });

    try {
      const posts = await fetchAllJobPostsComplete();
      const selectedIdSet = new Set(selectedPostIds.map(Number));
      // A resume is generated for every selected post, even when the job
      // description is short/empty (the AI falls back to the profile).
      const eligiblePosts = posts.filter((post) => selectedIdSet.has(Number(post.id)));

      if (!eligiblePosts.length) {
        enqueueSnackbar('Selected posts could not be found. Refresh the list and try again.', {
          variant: 'warning'
        });
        return;
      }

      enqueueSnackbar(
        `Generating ${eligiblePosts.length} resume(s). Each one usually takes 1–3 minutes.`,
        { variant: 'info' }
      );

      let successCount = 0;
      const failures = [];

      await eligiblePosts.reduce(async (previousPromise, post, index) => {
        await previousPromise;

        const label = [post.company, post.role].filter(Boolean).join(' · ') || `Post #${post.id}`;

        setGenerateProgress({
          current: index,
          total: eligiblePosts.length,
          label
        });

        try {
          const result = await generateResumeForPost({
            profile_id: selectedProfile.id,
            post_id: post.id
          });
          successCount += 1;
          enqueueSnackbar(
            `Resume saved for ${label}${result.generationId ? ` (#${result.generationId})` : ''}`,
            { variant: 'success' }
          );
        } catch (err) {
          failures.push(`${label}: ${err.message || 'Generation failed'}`);
        }
      }, Promise.resolve());

      setGenerateProgress({
        current: eligiblePosts.length,
        total: eligiblePosts.length,
        label: 'Done'
      });

      if (failures.length) {
        enqueueSnackbar(
          `Finished with ${successCount} saved and ${failures.length} failed. ${failures[0]}`,
          { variant: successCount ? 'warning' : 'error' }
        );
      } else {
        enqueueSnackbar(`Generated and saved ${successCount} resume(s)`, {
          variant: 'success'
        });
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Batch resume generation failed', { variant: 'error' });
    } finally {
      setGeneratingResumes(false);
      setGenerateProgress({ current: 0, total: 0, label: '' });
    }
  };

  return (
    <>
      <Helmet>
        <title>Post Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search company, role, URL, job description…"
            showDateRange={showDateRange}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={total}
            totalCount={total}
            actions={
              <>
                <FormControl
                  size="small"
                  sx={{ minWidth: 220, flexShrink: 0 }}
                  disabled={busy}
                >
                  <InputLabel id="post-management-profile-label">Profile</InputLabel>
                  <Select
                    labelId="post-management-profile-label"
                    label="Profile"
                    value={selectedProfileId}
                    onChange={(event) => setSelectedProfileId(event.target.value)}
                  >
                    <MenuItem value="">
                      <em>Select profile…</em>
                    </MenuItem>
                    {profiles.map((profile) => (
                      <MenuItem key={profile.id} value={String(profile.id)}>
                        {profile.identity_name || `Profile #${profile.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={<SelectAllTwoToneIcon />}
                  onClick={handleSelectAllPosts}
                  disabled={busy}
                >
                  Select all
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AssignmentIndTwoToneIcon />}
                  onClick={handleAssignPosts}
                  disabled={busy || !selectedProfile || !selectedPostIds.length}
                >
                  {assigningPosts ? 'Assigning…' : 'Assign'}
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AutoAwesomeTwoToneIcon />}
                  endIcon={<PictureAsPdfTwoToneIcon />}
                  onClick={handleGenerateResumes}
                  disabled={busy || !selectedProfile || !selectedPostIds.length}
                >
                  {generatingResumes ? 'Generating…' : 'Generate Resume'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshTwoToneIcon />}
                  onClick={() => refresh()}
                  disabled={busy}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddTwoToneIcon />}
                  onClick={openCreateDialog}
                  disabled={busy}
                >
                  Add post
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
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={somePageSelected}
                        checked={allPageSelected}
                        onChange={handleTogglePageSelection}
                        disabled={loading || !pagePostIds.length}
                        inputProps={{ 'aria-label': 'Select posts on this page' }}
                      />
                    </TableCell>
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
                      label="Role"
                      sortKey="role"
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
                      <TableCell colSpan={9}>
                        <Typography variant="body2" color="text.secondary">
                          Loading…
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Typography variant="body2" color="text.secondary">
                          {hasActiveFilters
                            ? 'No posts match your filters.'
                            : 'No posts found.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => (
                      <TableRow
                        hover
                        key={row.id}
                        selected={selectedPostIdSet.has(Number(row.id))}
                        onClick={() => openDetail(row)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox" onClick={stopPropagation}>
                          <Checkbox
                            checked={selectedPostIdSet.has(Number(row.id))}
                            onChange={() => togglePostSelection(row.id)}
                            inputProps={{ 'aria-label': `Select post ${row.id}` }}
                          />
                        </TableCell>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.company || '—'}</TableCell>
                        <TableCell>{row.role || '—'}</TableCell>
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
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditDialog(row);
                              }}
                              disabled={saving}
                            >
                              <EditTwoToneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete" arrow>
                            <IconButton
                              color="error"
                              onClick={(event) => {
                                event.stopPropagation();
                                confirmDelete(row);
                              }}
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
            label="Role"
            value={form.role}
            onChange={handleFormChange('role')}
            onBlur={handleRoleBlur}
            placeholder="e.g. Senior Software Engineer"
            required
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
        <DialogTitle>Delete post</DialogTitle>
        <DialogContent>
          <Typography>
            Delete post <b>{deletingPost?.company}</b>
            {deletingPost?.role ? ` · ${deletingPost.role}` : ''}? This cannot be undone.
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

      <PostDetailDialog open={detailOpen} post={selectedPost} onClose={closeDetail} />

      <Dialog open={generatingResumes} maxWidth="sm" fullWidth>
        <DialogTitle>Generating resumes</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {generateProgress.label
              ? `${generateProgress.label} (${generateProgress.current + 1} of ${generateProgress.total || '…'})`
              : 'Preparing…'}
          </Typography>
          {generateProgress.total > 0 ? (
            <LinearProgress
              variant="determinate"
              value={Math.min(
                100,
                Math.round((generateProgress.current / generateProgress.total) * 100)
              )}
            />
          ) : (
            <LinearProgress />
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Each resume is saved to Resume History and linked to its job post.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PostManagement;
