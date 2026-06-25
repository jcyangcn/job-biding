import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import { Box, Container, Grid, useTheme } from '@mui/material';
import { PROJECT_NAME } from 'src/config/app';
import ProfileSidebar, { ALL_PROFILES } from '../ApplicationManagement/ProfileSidebar';
import ProgressionEmailsTableView from '../ProgressionEmails/ProgressionEmailsTableView';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { listProgressionEmails } from 'src/services/progressionEmailApi';
import { listIdentities } from 'src/services/identityApi';
import { listProfiles } from 'src/services/profileApi';

function EmailManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const sectionHeight = {
    xs: 320,
    md: `calc(100vh - ${theme.header.height} - ${theme.spacing(14)})`
  };
  useSetPageHeader(
    'Email Management',
    'View and manage progression emails by profile'
  );
  const [profiles, setProfiles] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(ALL_PROFILES);
  const [allEmails, setAllEmails] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(true);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) || null,
    [profiles, selectedProfileId]
  );

  const displayedRows = useMemo(() => {
    if (selectedProfileId === ALL_PROFILES) {
      return allEmails;
    }
    return allEmails.filter((row) => row.profile_id === selectedProfileId);
  }, [allEmails, selectedProfileId]);

  const emailCounts = useMemo(() => {
    const counts = { total: allEmails.length };
    allEmails.forEach((row) => {
      counts[row.profile_id] = (counts[row.profile_id] || 0) + 1;
    });
    return counts;
  }, [allEmails]);

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const [profileRows, identityRows] = await Promise.all([
        listProfiles(),
        listIdentities()
      ]);
      setProfiles(profileRows);
      setIdentities(identityRows);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load profiles', { variant: 'error' });
    } finally {
      setLoadingProfiles(false);
    }
  }, [enqueueSnackbar]);

  const loadEmails = useCallback(async () => {
    setLoadingEmails(true);
    try {
      setAllEmails(await listProgressionEmails());
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load progression emails', { variant: 'error' });
    } finally {
      setLoadingEmails(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const handleRefresh = async () => {
    await loadEmails();
  };

  return (
    <>
      <Helmet>
        <title>Email Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <ProgressionEmailsTableView
          rows={displayedRows}
          loading={loadingEmails}
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
                    loading={loadingProfiles}
                    selectedProfileId={selectedProfileId}
                    onSelectProfile={setSelectedProfileId}
                    itemCounts={emailCounts}
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

export default EmailManagement;
