import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import { Box, Container, Grid, useTheme } from '@mui/material';
import { PROJECT_NAME } from 'src/config/app';
import ApplicationsTableView from '../Applications/ApplicationsTableView';
import ProfileSidebar, { ALL_PROFILES } from './ProfileSidebar';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { listJobApplications } from 'src/services/jobApplicationApi';
import { listAllIdentities } from 'src/services/identityApi';
import { listAllProfiles } from 'src/services/profileApi';
import { mergeApplicationResumeStatus } from 'src/utils/mergeApplicationResumeStatus';

function ApplicationManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const sectionHeight = {
    xs: 320,
    md: `calc(100vh - ${theme.header.height} - ${theme.spacing(14)})`
  };
  useSetPageHeader(
    'Application Management',
    'View and manage job applications by profile'
  );
  const [profiles, setProfiles] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(ALL_PROFILES);
  const [allApplications, setAllApplications] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) || null,
    [profiles, selectedProfileId]
  );

  const displayedRows = useMemo(() => {
    if (selectedProfileId === ALL_PROFILES) {
      return allApplications;
    }
    return allApplications.filter((row) => row.profile_id === selectedProfileId);
  }, [allApplications, selectedProfileId]);

  const applicationCounts = useMemo(() => {
    const counts = { total: allApplications.length };
    allApplications.forEach((row) => {
      counts[row.profile_id] = (counts[row.profile_id] || 0) + 1;
    });
    return counts;
  }, [allApplications]);

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

  const loadApplications = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setLoadingApplications(true);
    }
    try {
      const applicationRows = await listJobApplications();
      if (silent) {
        setAllApplications((prev) => mergeApplicationResumeStatus(prev, applicationRows));
      } else {
        setAllApplications(applicationRows);
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load applications', { variant: 'error' });
    } finally {
      if (!silent) {
        setLoadingApplications(false);
      }
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleRefresh = async (options = {}) => {
    await loadApplications(options);
  };

  return (
    <>
      <Helmet>
        <title>Application Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <ApplicationsTableView
          rows={displayedRows}
          loading={loadingApplications}
          onRefresh={handleRefresh}
          profile={selectedProfileId === ALL_PROFILES ? null : selectedProfile}
          exportProfileId={null}
          profiles={profiles}
          identities={identities}
          showProfileColumn={selectedProfileId === ALL_PROFILES}
          tableCardHeight={sectionHeight}
          renderLayout={({ toolbar, table, dialogs }) => (
            <>
              <Box sx={{ mb: 2, width: '100%' }}>{toolbar}</Box>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={3}>
                  <ProfileSidebar
                    profiles={profiles}
                    identities={identities}
                    loading={loadingProfiles}
                    selectedProfileId={selectedProfileId}
                    onSelectProfile={setSelectedProfileId}
                    itemCounts={applicationCounts}
                    height={sectionHeight}
                  />
                </Grid>
                <Grid item xs={12} md={9}>
                  {table}
                </Grid>
              </Grid>
              {dialogs}
            </>
          )}
        />
      </Container>
    </>
  );
}

export default ApplicationManagement;
