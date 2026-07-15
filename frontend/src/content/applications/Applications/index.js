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
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import ApplicationProfileRow from './ApplicationProfileRow';
import IdentityQADialog from './IdentityQADialog';
import { listAllIdentities } from 'src/services/identityApi';
import { listJobApplications } from 'src/services/jobApplicationApi';
import { listAllProfiles } from 'src/services/profileApi';

function Applications() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader(
    'Applications',
    'Choose a profile to view and manage job applications'
  );
  const [profiles, setProfiles] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qaOpen, setQaOpen] = useState(false);
  const [qaIdentity, setQaIdentity] = useState(null);

  const activeProfiles = useMemo(
    () => profiles.filter((profile) => profile.is_active),
    [profiles]
  );

  const identityById = useMemo(
    () => Object.fromEntries(identities.map((identity) => [identity.id, identity])),
    [identities]
  );

  const applicationStatsByProfile = useMemo(() => {
    const stats = {};
    applications.forEach((application) => {
      if (!stats[application.profile_id]) {
        stats[application.profile_id] = {
          total: 0,
          applied: 0,
          notApplied: 0
        };
      }
      stats[application.profile_id].total += 1;
      if (application.applied) {
        stats[application.profile_id].applied += 1;
      } else {
        stats[application.profile_id].notApplied += 1;
      }
    });
    return stats;
  }, [applications]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRows, identityRows, applicationRows] = await Promise.all([
        listAllProfiles(),
        listAllIdentities(),
        listJobApplications()
      ]);
      setProfiles(profileRows);
      setIdentities(identityRows);
      setApplications(Array.isArray(applicationRows) ? applicationRows : []);
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

  const handleViewProfile = (profile) => {
    navigate(`/applications/job-applications/${profile.id}`);
  };

  const handleOpenQa = (profile) => {
    const identity = identityById[profile.identity_id];
    if (!identity) {
      enqueueSnackbar('Identity not found for this profile', { variant: 'warning' });
      return;
    }
    setQaIdentity(identity);
    setQaOpen(true);
  };

  const handleCloseQa = () => {
    setQaOpen(false);
    setQaIdentity(null);
  };

  return (
    <>
      <Helmet>
        <title>Applications - {PROJECT_NAME}</title>
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
            <WorkTwoToneIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
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
              <ApplicationProfileRow
                key={profile.id}
                profile={profile}
                identity={identityById[profile.identity_id]}
                stats={applicationStatsByProfile[profile.id]}
                onQaClick={() => handleOpenQa(profile)}
                onViewClick={() => handleViewProfile(profile)}
              />
            ))}
          </Stack>
        )}
      </Container>

      <IdentityQADialog open={qaOpen} identity={qaIdentity} onClose={handleCloseQa} />
    </>
  );
}

export default Applications;
