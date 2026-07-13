import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
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
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import useServerTable from 'src/hooks/useServerTable';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { PROJECT_NAME } from 'src/config/app';
import { fetchHealth, listResumeGenerations } from 'src/services/resumeApi';
import ResumeGenerationDetailDialog from './ResumeGenerationDetailDialog';
import { formatDateTime } from 'src/utils/dateFormat';

function profileLabel(row) {
  if (!row) return '—';
  if (row.profile_label) return row.profile_label;
  if (row.profile_id != null) return `Profile #${row.profile_id}`;
  return '—';
}

function jobPostLabel(row) {
  if (!row) return '—';
  const parts = [row.company, row.role].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  if (row.post_id != null) return `Post #${row.post_id}`;
  return '—';
}

function jobDescriptionPreview(row, maxLength = 120) {
  const text = (row?.job_description || '').trim();
  if (!text) return '—';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function ResumeHistory() {
  useSetPageHeader(
    'Generation History',
    'Recent resume generations saved by the backend'
  );
  const [health, setHealth] = useState(null);
  const {
    open: detailOpen,
    selected: selectedGeneration,
    openDetail,
    closeDetail
  } = useDetailDialog();

  const fetchGenerations = useCallback((opts) => listResumeGenerations(opts), []);

  const {
    rows,
    total,
    loading,
    page,
    limit,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    clearFilters,
    hasActiveFilters,
    showDateRange,
    sortField,
    sortDirection,
    handleSort,
    handlePageChange,
    handleLimitChange,
    rowsPerPageOptions,
    refresh,
    paginatedRows
  } = useServerTable({
    fetcher: fetchGenerations,
    dateField: 'created_at',
    defaultSort: { field: 'created_at', direction: 'desc' }
  });

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

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
            searchPlaceholder="Search candidate, company, role, job description, PDF…"
            showDateRange={showDateRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            dateFromLabel="Created from"
            dateToLabel="Created to"
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={total}
            totalCount={total}
            actions={
              <Button
                variant="outlined"
                startIcon={<RefreshTwoToneIcon />}
                onClick={() => refresh()}
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
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <SortableTableCell
                      label="ID"
                      sortKey="id"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Candidate"
                      sortKey="profile_id"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Job post"
                      sortKey="company"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Job preview"
                      sortKey="job_description"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="PDF"
                      sortKey="pdf_path"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      label="Created"
                      sortKey="created_at"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>Loading…</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        {hasActiveFilters ? 'No generations match your filters.' : 'No generations yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => openDetail(row)}
                      >
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{profileLabel(row)}</TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography noWrap title={jobPostLabel(row)}>
                            {jobPostLabel(row)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 320 }}>
                          <Typography noWrap title={row.job_description || ''}>
                            {jobDescriptionPreview(row)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography noWrap title={row.pdf_path || ''}>
                            {row.pdf_path || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDateTime(row.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePaginationFooter
              count={total}
              page={page}
              rowsPerPage={limit}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleLimitChange}
              rowsPerPageOptions={rowsPerPageOptions}
            />
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
