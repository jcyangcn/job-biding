import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import { Box, Container, Grid, useTheme } from '@mui/material';
import { PROJECT_NAME } from 'src/config/app';
import ProfileSidebar, { ALL_PROFILES } from '../ApplicationManagement/ProfileSidebar';
import ProgressionEmailsTableView from '../ProgressionEmails/ProgressionEmailsTableView';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { listAllIdentities } from 'src/services/identityApi';
import { listAllProfiles } from 'src/services/profileApi';

function EmailManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const tableHeight = {
    xs: 320,
    md: `calc(100vh - ${theme.header.height} - ${theme.spacing(14)})`
  };
  const profileSidebarHeight = { xs: 260, md: 480 };
  useSetPageHeader(
    'Email Management',
    'View and manage progression emails by profile'
  );
  const [profiles, setProfiles] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(ALL_PROFILES);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [emailCounts, setEmailCounts] = useState({ total: 0 });

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) || null,
    [profiles, selectedProfileId]
  );

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const [profileResult, identityRows] = await Promise.all([
        listAllProfiles(),
        listAllIdentities()
      ]);
      const profileRows = Array.isArray(profileResult)
        ? profileResult
        : profileResult?.items || [];
      setProfiles(profileRows);
      setIdentities(identityRows);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load profiles', { variant: 'error' });
    } finally {
      setLoadingProfiles(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleTotalChange = useCallback((total) => {
    setEmailCounts({ total });
  }, []);

  return (
    <>
      <Helmet>
        <title>Email Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <ProgressionEmailsTableView
          listProfileId={selectedProfileId === ALL_PROFILES ? null : selectedProfileId}
          onTotalChange={handleTotalChange}
          profile={selectedProfileId === ALL_PROFILES ? null : selectedProfile}
          profiles={profiles}
          identities={identities}
          showProfileColumn={selectedProfileId === ALL_PROFILES}
          tableCardHeight={tableHeight}
          renderLayout={({ toolbar, table, dialogs }) => (
            <>
              <Box sx={{ mb: 2, width: '100%' }}>{toolbar}</Box>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={2}>
                  <ProfileSidebar
                    profiles={profiles}
                    identities={identities}
                    loading={loadingProfiles}
                    selectedProfileId={selectedProfileId}
                    onSelectProfile={setSelectedProfileId}
                    itemCounts={emailCounts}
                    height={profileSidebarHeight}
                  />
                </Grid>
                <Grid item xs={12} md={10}>
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

export default EmailManagement;
