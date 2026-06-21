import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import PageTitleWrapper from 'src/components/PageTitleWrapper';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import HistoryTwoToneIcon from '@mui/icons-material/HistoryTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { fetchHealth, listResumeGenerations } from 'src/services/resumeApi';
import { PROJECT_NAME } from 'src/config/app';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function profileName(profile) {
  if (!profile || typeof profile !== 'object') return '—';
  return profile.name || '—';
}

function ResumeHistory() {
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [history, healthStatus] = await Promise.all([
        listResumeGenerations(),
        fetchHealth().catch(() => null)
      ]);
      setRows(history);
      setHealth(healthStatus);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load history', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <Helmet>
        <title>Generation History - {PROJECT_NAME}</title>
      </Helmet>
      <PageTitleWrapper>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography component="h1" variant="h3" gutterBottom>
              Generation History
            </Typography>
            <Typography variant="subtitle2">
              Recent resume generations saved by the backend.
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<RefreshTwoToneIcon />}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </PageTitleWrapper>
      <Container maxWidth="lg">
        {health && (
          <Box mb={3} display="flex" gap={1} flexWrap="wrap">
            <Chip label={`API: ${health.status}`} color="primary" variant="outlined" />
            <Chip label={`AI: ${health.ai_provider}`} variant="outlined" />
            <Chip label={`Database: ${health.database}`} variant="outlined" />
          </Box>
        )}

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <HistoryTwoToneIcon color="primary" />
              <Typography variant="h4">Recent generations</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Candidate</TableCell>
                    <TableCell>Job preview</TableCell>
                    <TableCell>PDF</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        {loading ? 'Loading…' : 'No generations yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{profileName(row.profile)}</TableCell>
                        <TableCell sx={{ maxWidth: 360 }}>
                          <Typography noWrap title={row.job_details}>
                            {row.job_details}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.pdf_path || '—'}</TableCell>
                        <TableCell>{formatDate(row.created_at)}</TableCell>
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

export default ResumeHistory;
