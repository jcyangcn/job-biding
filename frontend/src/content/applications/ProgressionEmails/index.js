import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageTitleWrapper from 'src/components/PageTitleWrapper';
import {
  Box,
  CircularProgress,
  Container,
  Grid,
  Typography
} from '@mui/material';
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import ProfileCard from 'src/content/applications/Applications/ProfileCard';
import { listProfiles } from 'src/services/profileApi';

function ProgressionEmails() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeProfiles = useMemo(
    () => profiles.filter((profile) => profile.is_active),
    [profiles]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const profileRows = await listProfiles();
      setProfiles(profileRows);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load profiles', {
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProfileClick = (profile) => {
    navigate(`/applications/progression-emails/${profile.id}`);
  };

  return (
    <>
      <Helmet>
        <title>Progression Emails - {PROJECT_NAME}</title>
      </Helmet>
      <PageTitleWrapper>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography component="h1" variant="h3" gutterBottom>
              Progression Emails
            </Typography>
            <Typography variant="subtitle2">
              Choose a profile to view and manage progression emails.
            </Typography>
          </Grid>
        </Grid>
      </PageTitleWrapper>
      <Container maxWidth="lg">
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : activeProfiles.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={8}
            gap={2}
          >
            <EmailTwoToneIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="h4" color="text.secondary">
              No active profiles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask an admin to create and activate a profile first.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {activeProfiles.map((profile) => (
              <Grid item xs={12} sm={6} md={4} key={profile.id}>
                <ProfileCard
                  profile={profile}
                  onClick={() => handleProfileClick(profile)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </>
  );
}

export default ProgressionEmails;
