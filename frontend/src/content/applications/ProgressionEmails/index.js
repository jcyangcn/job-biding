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
import { listAllIdentities } from 'src/services/identityApi';
import { listAllProfiles } from 'src/services/profileApi';
import { listAllProgressionEmails } from 'src/services/progressionEmailApi';

const LAST_CHECKED_STORAGE_KEY = 'progression-email-last-checked';

function loadLastCheckedDates() {
  try {
    return JSON.parse(window.localStorage.getItem(LAST_CHECKED_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function ProgressionEmails() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader(
    'Progression Emails',
    'Choose a profile to view and manage progression emails'
  );
  const [profiles, setProfiles] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [progressionEmails, setProgressionEmails] = useState([]);
  const [lastCheckedByProfile, setLastCheckedByProfile] = useState(loadLastCheckedDates);
  const [loading, setLoading] = useState(true);

  const activeProfiles = useMemo(
    () => profiles.filter((profile) => profile.is_active),
    [profiles]
  );

  const identityById = useMemo(
    () => Object.fromEntries(identities.map((identity) => [identity.id, identity])),
    [identities]
  );

  const emailStatsByProfile = useMemo(() => {
    const stats = {};
    progressionEmails.forEach((email) => {
      if (!stats[email.profile_id]) {
        stats[email.profile_id] = {
          total: 0,
          humanInterviews: 0,
          needAction: 0
        };
      }
      stats[email.profile_id].total += 1;
      if (email.type === 'human_interview') {
        stats[email.profile_id].humanInterviews += 1;
      }
      if (email.status === 'received') {
        stats[email.profile_id].needAction += 1;
      }
    });
    return stats;
  }, [progressionEmails]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRows, identityRows, emailRows] = await Promise.all([
        listAllProfiles(),
        listAllIdentities(),
        listAllProgressionEmails()
      ]);
      setProfiles(profileRows);
      setIdentities(identityRows);
      setProgressionEmails(emailRows);
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
    const checkedAt = new Date().toISOString();
    setLastCheckedByProfile((current) => {
      const updated = { ...current, [profile.id]: checkedAt };
      window.localStorage.setItem(LAST_CHECKED_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
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
                stats={emailStatsByProfile[profile.id]}
                lastCheckedAt={lastCheckedByProfile[profile.id]}
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
