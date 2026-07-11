import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Box, CircularProgress, Container, IconButton } from '@mui/material';
import ArrowBackTwoToneIcon from '@mui/icons-material/ArrowBackTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import ApplicationsTableView from './ApplicationsTableView';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { listJobApplications } from 'src/services/jobApplicationApi';
import { listProfiles } from 'src/services/profileApi';
import { mergeApplicationResumeStatus } from 'src/utils/mergeApplicationResumeStatus';

function ApplicationList() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [profile, setProfile] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const headerLeading = useMemo(
    () => (
      <IconButton
        color="primary"
        onClick={() => navigate('/applications/job-applications')}
      >
        <ArrowBackTwoToneIcon />
      </IconButton>
    ),
    [navigate]
  );

  useSetPageHeader(
    profile?.identity_name || 'Applications',
    profile ? `${profile.email} · Job applications` : '',
    profile ? headerLeading : null
  );

  const loadData = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
    }
    try {
      const numericId = Number(profileId);

      if (silent) {
        const applicationRows = await listJobApplications(numericId);
        setRows((prev) => mergeApplicationResumeStatus(prev, applicationRows));
        return;
      }

      const [profileRows, applicationRows] = await Promise.all([
        listProfiles(),
        listJobApplications(numericId)
      ]);
      const match = profileRows.find((row) => row.id === numericId && row.is_active);
      if (!match) {
        enqueueSnackbar('Profile not found or access denied', { variant: 'warning' });
        navigate('/applications/job-applications', { replace: true });
        return;
      }
      setProfile(match);
      setRows(applicationRows);
    } catch (err) {
      const message = err.message || 'Failed to load applications';
      enqueueSnackbar(message, { variant: 'error' });
      if (/access denied|403/i.test(message)) {
        navigate('/applications/job-applications', { replace: true });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [enqueueSnackbar, navigate, profileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !profile) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{profile.identity_name} - Applications - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <ApplicationsTableView
          rows={rows}
          loading={loading}
          onRefresh={loadData}
          profile={profile}
          showProfileColumn={false}
        />
      </Container>
    </>
  );
}

export default ApplicationList;
