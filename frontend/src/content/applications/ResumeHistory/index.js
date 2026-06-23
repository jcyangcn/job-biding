import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { useDetailDialog } from 'src/components/DetailDialog';
import TableListFilters from 'src/components/TableListFilters';
import useTableListFilters from 'src/hooks/useTableListFilters';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { PROJECT_NAME } from 'src/config/app';
import { fetchHealth, listResumeGenerations } from 'src/services/resumeApi';
import ResumeGenerationDetailDialog from './ResumeGenerationDetailDialog';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function profileName(profile) {
  if (!profile || typeof profile !== 'object') return '—';
  return profile.name || '—';
}

const RESUME_HISTORY_SEARCH_FIELDS = [
  'id',
  'job_details',
  'pdf_path',
  (row) => profileName(row.profile)
];

function ResumeHistory() {
  const { enqueueSnackbar } = useSnackbar();
  useSetPageHeader(
    'Generation History',
    'Recent resume generations saved by the backend'
  );
  const [rows, setRows] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const {
    open: detailOpen,
    selected: selectedGeneration,
    openDetail,
    closeDetail
  } = useDetailDialog();
  const {
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filteredRows,
    clearFilters,
    hasActiveFilters,
    showDateRange
  } = useTableListFilters(rows, {
    searchFields: RESUME_HISTORY_SEARCH_FIELDS,
    dateField: 'created_at'
  });

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
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search candidate, job details, PDF…"
            showDateRange={showDateRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            dateFromLabel="Created from"
            dateToLabel="Created to"
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
            actions={
              <Button
                variant="outlined"
                startIcon={<RefreshTwoToneIcon />}
                onClick={loadData}
                disabled={loading}
              >
                Refresh
              </Button>
            }
          />
        </Box>
        {health && (
          <Box mb={3} display="flex" gap={1} flexWrap="wrap">
            <Chip label={`API: ${health.status}`} color="primary" variant="outlined" />
            <Chip label={`AI: ${health.ai_provider}`} variant="outlined" />
            <Chip label={`Database: ${health.database}`} variant="outlined" />
          </Box>
        )}

        <Card>
          <CardContent>
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
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>No generations match your filters.</TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => openDetail(row)}
                      >
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

      <ResumeGenerationDetailDialog
        open={detailOpen}
        generation={selectedGeneration}
        onClose={closeDetail}
      />
    </>
  );
}

export default ResumeHistory;
