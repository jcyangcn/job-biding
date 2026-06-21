import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageTitleWrapper from 'src/components/PageTitleWrapper';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import ArrowBackTwoToneIcon from '@mui/icons-material/ArrowBackTwoTone';
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import { listJobApplications } from 'src/services/jobApplicationApi';
import { listProfiles } from 'src/services/profileApi';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function formatResumeSource(row) {
  if (row.resume_generated_id) {
    return `Generated #${row.resume_generated_id}`;
  }
  if (row.resume_online_link) {
    return 'Online link';
  }
  return '—';
}

function ApplicationList() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [profile, setProfile] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const numericId = Number(profileId);
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
        <title>{profile.identity_name} - Applications - {PROJECT_NAME}</title>
      </Helmet>
      <PageTitleWrapper>
        <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
          <Grid item>
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton
                color="primary"
                onClick={() => navigate('/applications/job-applications')}
              >
                <ArrowBackTwoToneIcon />
              </IconButton>
              <Box>
                <Typography component="h1" variant="h3" gutterBottom sx={{ mb: 0 }}>
                  {profile.identity_name}
                </Typography>
                <Typography variant="subtitle2">
                  {profile.email} · Job applications
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshTwoToneIcon />}
                onClick={loadData}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddTwoToneIcon />}
                component={RouterLink}
                to={`/applications/job-applications/${profile.id}/new`}
              >
                Add application
              </Button>
            </Box>
          </Grid>
        </Grid>
      </PageTitleWrapper>
      <Container maxWidth="lg">
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <WorkTwoToneIcon color="primary" />
              <Typography variant="h4">Applications</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Link</TableCell>
                    <TableCell>Resume</TableCell>
                    <TableCell>Applied</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}>Loading…</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>No applications yet.</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>{row.company}</TableCell>
                        <TableCell>
                          <Link
                            href={row.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                          >
                            Open
                            <OpenInNewTwoToneIcon sx={{ fontSize: 16 }} />
                          </Link>
                        </TableCell>
                        <TableCell>
                          {row.resume_online_link ? (
                            <Tooltip title={row.resume_online_link}>
                              <Link
                                href={row.resume_online_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                              >
                                {formatResumeSource(row)}
                              </Link>
                            </Tooltip>
                          ) : (
                            formatResumeSource(row)
                          )}
                        </TableCell>
                        <TableCell>{formatDate(row.applied_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}

export default ApplicationList;
