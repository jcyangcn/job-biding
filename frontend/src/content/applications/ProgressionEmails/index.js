import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography
} from '@mui/material';
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import ProgressionEmailProfileRow from './ProgressionEmailProfileRow';
import { listIdentities } from 'src/services/identityApi';
import { listProfiles } from 'src/services/profileApi';

function ProgressionEmails() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader(
    'Progression Emails',
    'Choose a profile to view and manage progression emails'
  );
  const [profiles, setProfiles] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeProfiles = useMemo(
    () => profiles.filter((profile) => profile.is_active),
    [profiles]
  );

  const identityById = useMemo(
    () => Object.fromEntries(identities.map((identity) => [identity.id, identity])),
    [identities]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRows, identityRows] = await Promise.all([
        listProfiles(),
        listIdentities()
      ]);
      setProfiles(profileRows);
      setIdentities(identityRows);
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
      <Container maxWidth="lg" sx={{ pt: 3 }}>
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
          <Stack spacing={1.5}>
            {activeProfiles.map((profile) => (
              <ProgressionEmailProfileRow
                key={profile.id}
                profile={profile}
                identity={identityById[profile.identity_id]}
                onViewClick={() => handleProfileClick(profile)}
              />
            ))}
          </Stack>
        )}
      </Container>
    </>
  );
}

export default ProgressionEmails;
