import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Box, CircularProgress, Container, IconButton } from '@mui/material';
import ArrowBackTwoToneIcon from '@mui/icons-material/ArrowBackTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import ProgressionEmailsTableView from './ProgressionEmailsTableView';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { listProgressionEmails } from 'src/services/progressionEmailApi';
import { listProfiles } from 'src/services/profileApi';

function ProgressionEmailList() {
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
        onClick={() => navigate('/applications/progression-emails')}
      >
        <ArrowBackTwoToneIcon />
      </IconButton>
    ),
    [navigate]
  );

  useSetPageHeader(
    profile?.identity_name || 'Progression Emails',
    profile ? `${profile.email} · Progression emails` : '',
    profile ? headerLeading : null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const numericId = Number(profileId);
      const [profileRows, emailRows] = await Promise.all([
        listProfiles(),
        listProgressionEmails(numericId)
      ]);
      const match = profileRows.find((row) => row.id === numericId && row.is_active);
      if (!match) {
        enqueueSnackbar('Profile not found or access denied', { variant: 'warning' });
        navigate('/applications/progression-emails', { replace: true });
        return;
      }
      setProfile(match);
      setRows(emailRows);
    } catch (err) {
      const message = err.message || 'Failed to load progression emails';
      enqueueSnackbar(message, { variant: 'error' });
      if (/access denied|403/i.test(message)) {
        navigate('/applications/progression-emails', { replace: true });
      }
    } finally {
      setLoading(false);
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
        <title>{profile.identity_name} - Progression Emails - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <ProgressionEmailsTableView
          rows={rows}
          loading={loading}
          onRefresh={loadData}
          profile={profile}
          singleLine
        />
      </Container>
    </>
  );
}

export default ProgressionEmailList;
