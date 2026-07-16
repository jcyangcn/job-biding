import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Checkbox,
  Chip,
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
import FilterAltTwoToneIcon from '@mui/icons-material/FilterAltTwoTone';
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
import { listAllUsers } from 'src/services/usersApi';
import { listJobApplicationPostIds } from 'src/services/jobApplicationApi';
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

const emptySelectionFilters = {
  profileId: '',
  bidderUserId: '',
  dateFrom: '',
  dateTo: ''
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

function renderApplicationStatuses(applications) {
  const rows = Array.from(
    new Map(
      (Array.isArray(applications) ? applications : []).map((item) => [
        item.profile_id,
        item
      ])
    ).values()
  );
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No applied profiles
      </Typography>
    );
  }

  const summary = rows.map((item) => item.profile_name).join('\n');

  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{summary}</span>} arrow>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', minWidth: 180 }}>
        {rows.slice(0, 3).map((item) => (
          <Chip
            key={item.application_id}
            size="small"
            color="success"
            label={item.profile_name}
            sx={{ maxWidth: 210 }}
          />
        ))}
        {rows.length > 3 ? <Chip size="small" label={`+${rows.length - 3} more`} /> : null}
      </Box>
    </Tooltip>
  );
}

// Fetch every job post across all pages. The list API caps page size (200),
// so a single call misses posts when there are more than that — which made
// batch selection/generation silently skip posts outside the first page.
async function fetchAllJobPostsComplete() {
  const pageSize = 200;
  const first = await listJobPosts({ page: 1, pageSize });
  const firstItems = Array.isArray(first?.items) ? first.items : [];
  const total = Number(first?.total) || firstItems.length;

  if (firstItems.length >= total || firstItems.length < pageSize) {
    return firstItems;
  }

  const totalPages = Math.ceil(total / pageSize);
  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listJobPosts({ page: index + 2, pageSize })
    )
  );

  return remainingPages.reduce(
    (all, result) => all.concat(Array.isArray(result?.items) ? result.items : []),
    firstItems
  );
}

function PostManagement() {
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader(
    'Post Management',
    'Manage job posts and batch-generate tailored resumes for a profile'
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectionFilterDialogOpen, setSelectionFilterDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [deletingPost, setDeletingPost] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [skillKeywords, setSkillKeywords] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [bidderUsers, setBidderUsers] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [selectionFilters, setSelectionFilters] = useState(emptySelectionFilters);
  const [selectingByFilters, setSelectingByFilters] = useState(false);
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

  useEffect(() => {
    listAllUsers()
      .then((rows) =>
        setBidderUsers(
          (Array.isArray(rows) ? rows : []).filter(
            (user) => String(user.role || '').toLowerCase() === 'bidder'
          )
        )
      )
      .catch(() => setBidderUsers([]));
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => Number(profile.id) === Number(selectedProfileId)) || null,
    [profiles, selectedProfileId]
  );
  const withoutProfileSelected = selectionFilters.profileId === 'without-profile';

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

  const busy = loading || saving || generatingResumes || assigningPosts || selectingByFilters;

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

  const handleSelectCurrentPage = () => {
    setSelectedPostIds((current) => {
      const merged = new Set(current.map(Number));
      pagePostIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  const handleSelectionFilterChange = (field) => (event) => {
    const value = event.target.value;
    setSelectionFilters((current) => {
      if (field === 'profileId' && value === 'without-profile') {
        return {
          ...emptySelectionFilters,
          profileId: value
        };
      }
      return { ...current, [field]: value };
    });
  };

  const closeSelectionFilterDialog = () => {
    if (!selectingByFilters) {
      setSelectionFilterDialogOpen(false);
    }
  };

  const handleSelectByApplicationFilters = async () => {
    const hasCriterion = Object.values(selectionFilters).some(Boolean);
    if (!hasCriterion) {
      enqueueSnackbar('Choose at least one application filter', { variant: 'warning' });
      return;
    }
    if (
      selectionFilters.dateFrom &&
      selectionFilters.dateTo &&
      selectionFilters.dateFrom > selectionFilters.dateTo
    ) {
      enqueueSnackbar('Post created from date cannot be after created to date', {
        variant: 'warning'
      });
      return;
    }

    setSelectingByFilters(true);
    try {
      const withoutProfile = selectionFilters.profileId === 'without-profile';
      const result = await listJobApplicationPostIds({
        ...selectionFilters,
        profileId: withoutProfile ? '' : selectionFilters.profileId,
        withoutProfile
      });
      const postIds = Array.isArray(result?.post_ids) ? result.post_ids.map(Number) : [];
      setSelectedPostIds(postIds);
      setSelectionFilterDialogOpen(false);
      enqueueSnackbar(
        withoutProfile
          ? `Selected ${postIds.length} post(s) with no related profile`
          : `Selected ${postIds.length} post(s) from ${
              result?.matched_application_count || 0
            } matching application(s)`,
        { variant: postIds.length ? 'success' : 'info' }
      );
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to select posts by application filters', {
        variant: 'error'
      });
    } finally {
      setSelectingByFilters(false);
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
      const skipped = Array.isArray(result.skipped) ? result.skipped : [];
      const alreadyAssignedCount = skipped.filter(
        (item) => item.reason === 'Application already exists'
      ).length;
      const otherSkipped = skipped.filter(
        (item) => item.reason !== 'Application already exists'
      );
      const summary = [];

      if (createdCount) {
        summary.push(`${createdCount} assigned`);
      }
      if (alreadyAssignedCount) {
        summary.push(`${alreadyAssignedCount} already assigned (not added again)`);
      }
      if (otherSkipped.length) {
        const reason = otherSkipped[0]?.reason;
        summary.push(
          `${otherSkipped.length} skipped${reason ? `: ${reason}` : ''}`
        );
      }
      if (!summary.length) {
        summary.push('No applications were created');
      }

      enqueueSnackbar(
        `${selectedProfile.identity_name || 'Profile'}: ${summary.join(', ')}`,
        {
          variant: skipped.length ? (createdCount ? 'warning' : 'info') : 'success'
        }
      );
      setAssignDialogOpen(false);
      refresh();
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

    setGenerateDialogOpen(false);
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
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="body2" fontWeight="bold" color="text.secondary">
            Select:
          </Typography>
          <ButtonGroup size="small" variant="outlined" disabled={busy}>
            <Button onClick={handleSelectCurrentPage} disabled={busy || !pagePostIds.length}>
              Current Page
            </Button>
            <Button onClick={handleSelectAllPosts} disabled={busy || !total}>
              All Posts
            </Button>
            <Button
              startIcon={<FilterAltTwoToneIcon />}
              onClick={() => setSelectionFilterDialogOpen(true)}
              disabled={busy}
            >
              Application Filters
            </Button>
          </ButtonGroup>
          <Chip
            size="small"
            color={selectedPostIds.length ? 'primary' : 'default'}
            label={`${selectedPostIds.length} selected`}
            onDelete={selectedPostIds.length ? () => setSelectedPostIds([]) : undefined}
          />
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AssignmentIndTwoToneIcon />}
            onClick={() => setAssignDialogOpen(true)}
            disabled={busy || !selectedPostIds.length}
          >
            Assign to Profile
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoAwesomeTwoToneIcon />}
            endIcon={<PictureAsPdfTwoToneIcon />}
            onClick={() => setGenerateDialogOpen(true)}
            disabled={busy || !selectedPostIds.length}
          >
            Generate Resumes
          </Button>
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
                    <TableCell sx={{ minWidth: 230 }}>Applied Profiles</TableCell>
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
                      <TableCell colSpan={10}>
                        <Typography variant="body2" color="text.secondary">
                          Loading…
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10}>
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
                        <TableCell>{renderApplicationStatuses(row.applications)}</TableCell>
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

      <Dialog
        open={selectionFilterDialogOpen}
        onClose={closeSelectionFilterDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Select posts by application filters</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Filter posts by their existing applications, or choose “No profile related” to find
            posts that have not been assigned yet. The profile here is only a source filter; you
            choose the target profile separately when assigning posts or generating resumes. Date
            filters use the job post creation date.
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <FormControl fullWidth disabled={selectingByFilters}>
              <InputLabel id="selection-source-profile-label">Application Profile</InputLabel>
              <Select
                labelId="selection-source-profile-label"
                label="Application Profile"
                value={selectionFilters.profileId}
                onChange={handleSelectionFilterChange('profileId')}
              >
                <MenuItem value="">
                  <em>Any related profile</em>
                </MenuItem>
                <MenuItem value="without-profile">No profile related</MenuItem>
                {profiles.map((profile) => (
                  <MenuItem key={profile.id} value={String(profile.id)}>
                    {profile.identity_name || `Profile #${profile.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={selectingByFilters || withoutProfileSelected}>
              <InputLabel id="selection-actual-bidder-label">Actual Bidder</InputLabel>
              <Select
                labelId="selection-actual-bidder-label"
                label="Actual Bidder"
                value={selectionFilters.bidderUserId}
                onChange={handleSelectionFilterChange('bidderUserId')}
              >
                <MenuItem value="">
                  <em>Any bidder</em>
                </MenuItem>
                {bidderUsers.map((user) => (
                  <MenuItem key={user.id} value={String(user.id)}>
                    {user.full_name || user.username || `Bidder #${user.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2
              }}
            >
              <TextField
                label="Post Created From"
                type="date"
                value={selectionFilters.dateFrom}
                onChange={handleSelectionFilterChange('dateFrom')}
                disabled={selectingByFilters || withoutProfileSelected}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Post Created To"
                type="date"
                value={selectionFilters.dateTo}
                onChange={handleSelectionFilterChange('dateTo')}
                disabled={selectingByFilters || withoutProfileSelected}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSelectionFilterDialog} disabled={selectingByFilters}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SelectAllTwoToneIcon />}
            onClick={handleSelectByApplicationFilters}
            disabled={selectingByFilters || !Object.values(selectionFilters).some(Boolean)}
          >
            {selectingByFilters ? 'Selecting…' : 'Replace Selection'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={assignDialogOpen}
        onClose={() => !assigningPosts && setAssignDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Assign job posts to profile</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Create applications from {selectedPostIds.length} selected job post(s).
          </Typography>
          <FormControl fullWidth disabled={assigningPosts}>
            <InputLabel id="assign-posts-profile-label">Profile</InputLabel>
            <Select
              labelId="assign-posts-profile-label"
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
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAssignDialogOpen(false)}
            disabled={assigningPosts}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<AssignmentIndTwoToneIcon />}
            onClick={handleAssignPosts}
            disabled={assigningPosts || !selectedProfile || !selectedPostIds.length}
          >
            {assigningPosts ? 'Assigning…' : 'Assign Posts'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={generateDialogOpen}
        onClose={() => !generatingResumes && setGenerateDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Generate resumes for job posts</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Generate and save one tailored resume for each of the {selectedPostIds.length} selected
            job post(s). Generation may take 1–3 minutes per resume.
          </Typography>
          <FormControl fullWidth disabled={generatingResumes}>
            <InputLabel id="generate-resumes-profile-label">Profile</InputLabel>
            <Select
              labelId="generate-resumes-profile-label"
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
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setGenerateDialogOpen(false)}
            disabled={generatingResumes}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoAwesomeTwoToneIcon />}
            endIcon={<PictureAsPdfTwoToneIcon />}
            onClick={handleGenerateResumes}
            disabled={generatingResumes || !selectedProfile || !selectedPostIds.length}
          >
            Generate Resumes
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
