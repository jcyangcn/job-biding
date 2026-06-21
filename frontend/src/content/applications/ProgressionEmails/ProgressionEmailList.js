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
  Typography
} from '@mui/material';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import ArrowBackTwoToneIcon from '@mui/icons-material/ArrowBackTwoTone';
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import {
  formatProgressionEmailStatus,
  formatProgressionEmailType
} from 'src/data/progressionEmailOptions';
import { listProgressionEmails } from 'src/services/progressionEmailApi';
import { listProfiles } from 'src/services/profileApi';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function ProgressionEmailList() {
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
      <PageTitleWrapper>
        <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
          <Grid item>
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton
                color="primary"
                onClick={() => navigate('/applications/progression-emails')}
              >
                <ArrowBackTwoToneIcon />
              </IconButton>
              <Box>
                <Typography component="h1" variant="h3" gutterBottom sx={{ mb: 0 }}>
                  {profile.identity_name}
                </Typography>
                <Typography variant="subtitle2">
                  {profile.email} · Progression emails
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
                to={`/applications/progression-emails/${profile.id}/new`}
              >
                Add progression email
              </Button>
            </Box>
          </Grid>
        </Grid>
      </PageTitleWrapper>
      <Container maxWidth="lg">
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <EmailTwoToneIcon color="primary" />
              <Typography variant="h4">Progression emails</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Reference no</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Email link</TableCell>
                    <TableCell>Email date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Log</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7}>Loading…</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>No progression emails yet.</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.reference_no}</TableCell>
                        <TableCell>{row.company}</TableCell>
                        <TableCell>{formatProgressionEmailType(row.type)}</TableCell>
                        <TableCell>
                          <Link
                            href={row.email_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                          >
                            Open
                            <OpenInNewTwoToneIcon sx={{ fontSize: 16 }} />
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(row.email_date)}</TableCell>
                        <TableCell>{formatProgressionEmailStatus(row.status)}</TableCell>
                        <TableCell sx={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.log || '—'}
                        </TableCell>
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

export default ProgressionEmailList;
