import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import useServerTable from 'src/hooks/useServerTable';
import TableListFilters from 'src/components/TableListFilters';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { listAllIdentities } from 'src/services/identityApi';
import { listJobApplications } from 'src/services/jobApplicationApi';
import { listAllProfiles } from 'src/services/profileApi';
import {
  deleteResumeGeneration,
  listAllResumeGenerations,
  listResumeGenerations
} from 'src/services/resumeApi';
import { formatDateTime } from 'src/utils/dateFormat';
import ProfileSidebar, {
  ALL_PROFILES
} from '../ApplicationManagement/ProfileSidebar';
import ApplicationResumePdfDialog from '../Applications/ApplicationResumePdfDialog';
import ResumeEditDialog from './ResumeEditDialog';

function filenameFromPath(path) {
  return String(path || '').split(/[\\/]/).pop() || '—';
}

function jobLabel(row) {
  const parts = [row?.company, row?.role].filter(Boolean);
  return parts.length ? parts.join(' · ') : `Post #${row?.post_id}`;
}

function resumeVectorLength(vector) {
  return Array.isArray(vector) ? vector.length : 0;
}

function ResumeManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const tableHeight = {
    xs: 420,
    md: `calc(100vh - ${theme.header.height} - ${theme.spacing(14)})`
  };
  const profileSidebarHeight = { xs: 260, md: 480 };

  useSetPageHeader(
    'Resume Management',
    'Edit, rebuild, and delete generated resumes by profile'
  );

  const [profiles, setProfiles] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(ALL_PROFILES);
  const [resumeCounts, setResumeCounts] = useState({ total: 0 });
  const [usageByGeneration, setUsageByGeneration] = useState({});
  const [previewing, setPreviewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) || null,
    [profiles, selectedProfileId]
  );

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const [profileRows, identityRows] = await Promise.all([
        listAllProfiles(),
        listAllIdentities()
      ]);
      setProfiles(Array.isArray(profileRows) ? profileRows : []);
      setIdentities(Array.isArray(identityRows) ? identityRows : []);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load profiles', { variant: 'error' });
    } finally {
      setLoadingProfiles(false);
    }
  }, [enqueueSnackbar]);

  const loadCounts = useCallback(async () => {
    try {
      const generations = await listAllResumeGenerations();
      const counts = { total: generations.length };
      generations.forEach((generation) => {
        if (generation.profile_id != null) {
          counts[generation.profile_id] = (counts[generation.profile_id] || 0) + 1;
        }
      });
      setResumeCounts(counts);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load resume counts', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  const loadApplicationUsage = useCallback(async () => {
    try {
      const applications = await listJobApplications();
      const usage = {};
      (applications || []).forEach((application) => {
        if (application.resume_generated_id != null) {
          usage[application.resume_generated_id] =
            (usage[application.resume_generated_id] || 0) + 1;
        }
      });
      setUsageByGeneration(usage);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load resume usage', {
        variant: 'error'
      });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadProfiles();
    loadCounts();
    loadApplicationUsage();
  }, [loadApplicationUsage, loadCounts, loadProfiles]);

  const fetchGenerations = useCallback(
    (options) =>
      listResumeGenerations({
        ...options,
        profileId:
          selectedProfileId === ALL_PROFILES ? undefined : selectedProfileId
      }),
    [selectedProfileId]
  );

  const {
    rows,
    total,
    loading,
    error,
    page,
    limit,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
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
    fetcher: fetchGenerations,
    dateField: 'created_at',
    defaultSort: { field: 'created_at', direction: 'desc' }
  });

  useEffect(() => {
    refresh();
  }, [refresh, selectedProfileId]);

  const handleRefresh = () => {
    refresh();
    loadCounts();
    loadApplicationUsage();
  };

  const handleRebuilt = (generation) => {
    setEditing(null);
    refresh();
    loadCounts();
    loadApplicationUsage();
    enqueueSnackbar(
      `Rebuilt ${filenameFromPath(generation.pdf_path)} with the same filename`,
      { variant: 'success' }
    );
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteResumeGeneration(deleting.id);
      enqueueSnackbar(`Deleted ${filenameFromPath(deleting.pdf_path)}`, {
        variant: 'success'
      });
      setDeleting(null);
      refresh();
      loadCounts();
      loadApplicationUsage();
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to delete resume', { variant: 'error' });
    } finally {
      setDeleteBusy(false);
    }
  };

  const toolbar = (
    <TableListFilters
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search company, role, job description, PDF…"
      showDateRange={showDateRange}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      dateFromLabel="Created from"
      dateToLabel="Created to"
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
      filteredCount={total}
      totalCount={total}
      actions={
        <Button
          variant="outlined"
          startIcon={<RefreshTwoToneIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      }
    />
  );

  return (
    <>
      <Helmet>
        <title>Resume Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ mb: 2, width: '100%' }}>{toolbar}</Box>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} md={2}>
            <ProfileSidebar
              profiles={profiles}
              identities={identities}
              loading={loadingProfiles}
              selectedProfileId={selectedProfileId}
              onSelectProfile={setSelectedProfileId}
              itemCounts={resumeCounts}
              height={profileSidebarHeight}
            />
          </Grid>
          <Grid item xs={12} md={10}>
            <Card
              sx={{
                height: tableHeight,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0
              }}
            >
              <CardContent
                sx={{
                  p: 0,
                  '&:last-child': { pb: 0 },
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0
                }}
              >
                <TableContainer sx={{ flex: 1 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <SortableTableCell
                          label="ID"
                          sortKey="id"
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        {selectedProfileId === ALL_PROFILES ? (
                          <SortableTableCell
                            label="Profile"
                            sortKey="profile_id"
                            sortField={sortField}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        ) : null}
                        <SortableTableCell
                          label="Matched job"
                          sortKey="company"
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableTableCell
                          label="PDF"
                          sortKey="pdf_path"
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <TableCell>Skills</TableCell>
                        <SortableTableCell
                          label="Created"
                          sortKey="created_at"
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <TableCell align="center">Resume vector</TableCell>
                        <TableCell align="center">Used in applications</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading && rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={selectedProfileId === ALL_PROFILES ? 9 : 8}
                          >
                            Loading…
                          </TableCell>
                        </TableRow>
                      ) : error ? (
                        <TableRow>
                          <TableCell
                            colSpan={selectedProfileId === ALL_PROFILES ? 9 : 8}
                          >
                            <Typography color="error">
                              {error.message || 'Failed to load resumes'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={selectedProfileId === ALL_PROFILES ? 9 : 8}
                          >
                            {hasActiveFilters
                              ? 'No resumes match your filters.'
                              : selectedProfile
                              ? 'No generated resumes for this profile.'
                              : 'No generated resumes yet.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRows.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell>{row.id}</TableCell>
                            {selectedProfileId === ALL_PROFILES ? (
                              <TableCell>{row.profile_label || '—'}</TableCell>
                            ) : null}
                            <TableCell sx={{ maxWidth: 260 }}>
                              <Typography noWrap title={jobLabel(row)}>
                                {jobLabel(row)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 220 }}>
                              <Button
                                variant="text"
                                size="small"
                                title={row.pdf_path || ''}
                                onClick={() => setPreviewing(row)}
                                sx={{
                                  maxWidth: '100%',
                                  minWidth: 0,
                                  p: 0,
                                  justifyContent: 'flex-start',
                                  textTransform: 'none'
                                }}
                              >
                                <Typography component="span" noWrap>
                                {filenameFromPath(row.pdf_path)}
                                </Typography>
                              </Button>
                            </TableCell>
                            <TableCell sx={{ minWidth: 220, maxWidth: 300 }}>
                              {Array.isArray(row.top_skills) && row.top_skills.length ? (
                                <Box display="flex" gap={0.5} flexWrap="wrap">
                                  {row.top_skills.map((skill) => (
                                    <Tooltip
                                      key={skill.name}
                                      title={`Mention score: ${skill.mentions}`}
                                    >
                                      <Chip
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        label={skill.name}
                                      />
                                    </Tooltip>
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{formatDateTime(row.created_at)}</TableCell>
                            <TableCell
                              align="center"
                              title={JSON.stringify(row.resume_vector || [])}
                            >
                              <Box display="flex" justifyContent="center">
                                {resumeVectorLength(row.resume_vector)
                                  ? `[${resumeVectorLength(row.resume_vector)}]`
                                  : '[]'}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" justifyContent="center">
                                <Chip
                                  size="small"
                                  color={usageByGeneration[row.id] ? 'primary' : 'default'}
                                  label={usageByGeneration[row.id] || 0}
                                />
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                              <Tooltip title="Edit and rebuild">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => setEditing(row)}
                                >
                                  <EditTwoToneIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setDeleting(row)}
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
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleLimitChange}
                  rowsPerPageOptions={rowsPerPageOptions}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <ApplicationResumePdfDialog
        open={Boolean(previewing)}
        filename={filenameFromPath(previewing?.pdf_path)}
        downloadFilename={filenameFromPath(previewing?.pdf_path)}
        onClose={() => setPreviewing(null)}
      />

      <ResumeEditDialog
        open={Boolean(editing)}
        generation={editing}
        onClose={() => setEditing(null)}
        onRebuilt={handleRebuilt}
      />

      <Dialog
        open={Boolean(deleting)}
        onClose={deleteBusy ? undefined : () => setDeleting(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete resume?</DialogTitle>
        <DialogContent>
          <Typography>
            This permanently deletes {filenameFromPath(deleting?.pdf_path)} and its database
            record. Applications using this resume will have their resume link cleared.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={deleteBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteBusy}
          >
            {deleteBusy ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ResumeManagement;
