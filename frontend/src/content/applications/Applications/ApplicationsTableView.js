import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import FileUploadTwoToneIcon from '@mui/icons-material/FileUploadTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import WarningAmberTwoToneIcon from '@mui/icons-material/WarningAmberTwoTone';
import {
  alpha,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Link,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import ApplicationCreateDialog from './ApplicationCreateDialog';
import ApplicationDetailDialog from './ApplicationDetailDialog';
import ApplicationEditDialog from './ApplicationEditDialog';
import ApplicationResumeCell from './ApplicationResumeCell';
import ApplicationScreenshotThumb from './ApplicationScreenshotThumb';
import TableListFilters from 'src/components/TableListFilters';
import ImportExportPasswordDialog from 'src/components/ImportExportPasswordDialog';
import ApplicationIdentityLabel from 'src/components/IdentityLabel';
import { parseProfileDefaultResumeRef } from 'src/utils/profileDefaultResumeRef';
import TablePaginationFooter from 'src/components/TablePaginationFooter';
import SortableTableCell from 'src/components/SortableTableCell';
import { useDetailDialog } from 'src/components/DetailDialog';
import useTableListFilters from 'src/hooks/useTableListFilters';
import useTablePagination from 'src/hooks/useTablePagination';
import useTableSort from 'src/hooks/useTableSort';
import useImportExportPassword from 'src/hooks/useImportExportPassword';
import { formatIdentityLabel, parseIdentityLabel } from 'src/data/countryCodes';
import { importJobApplicationsSequentially, parseApplicationCsv } from 'src/utils/applicationCsvImport';
import {
  APPLICATION_CSV_HEADERS,
  buildApplicationExportRows
} from 'src/utils/applicationCsvExport';
import {
  approveJobApplications,
  createJobApplication,
  deleteJobApplication,
  listJobApplications
} from 'src/services/jobApplicationApi';
import { buildApplicationResumeFilename } from 'src/services/resumeApi';
import { formatDateTime } from 'src/utils/dateFormat';
import { downloadCsv, sanitizeCsvFilename } from 'src/utils/exportCsv';
import externalUrl from 'src/utils/externalUrl';

function formatResumeSource(row) {
  if (row.resume_generation_status === 'generating') {
    return 'Generating';
  }
  if (row.resume_generation_status === 'failed') {
    return 'Failed';
  }
  if (row.resume_pdf_filename) {
    return buildApplicationResumeFilename(
      parseIdentityLabel(row.profile_label).name,
      row.company
    );
  }
  if (row.resume_generated_id) {
    return `Generated #${row.resume_generated_id}`;
  }
  if (row.resume_online_link) {
    const defaultResumeRef = parseProfileDefaultResumeRef(row.resume_online_link);
    if (defaultResumeRef) {
      return buildApplicationResumeFilename(
        parseIdentityLabel(row.profile_label).name,
        row.company
      );
    }
    return 'Online link';
  }
  return '—';
}


function formatBidderLabel(row) {
  return row.bidder_name || row.bidder_username || '';
}

function formatRoleCompanySortValue(row) {
  return `${row.role || ''} ${row.company || ''}`;
}

function formatAppliedSortValue(row) {
  return row.applied_at || '';
}

function formatApprovedSortValue(row) {
  return Number(Boolean(row.approved));
}

function formatResumeDistance(row) {
  const distance = Number(row.resume_distance);
  return Number.isFinite(distance) ? distance.toFixed(2) : '—';
}

function formatAppliedStatus(row) {
  if (!row.applied) return 'Not applied';
  return row.applied_at ? formatDateTime(row.applied_at) : 'Applied';
}

function formatLinkPreview(link, maxLength = 42) {
  const value = String(link || '').trim();
  if (!value) return '';
  const withoutProtocol = value.replace(/^https?:\/\//i, '');
  if (withoutProtocol.length <= maxLength) {
    return withoutProtocol;
  }
  return `${withoutProtocol.slice(0, maxLength)}…`;
}

function normalizeDuplicateValue(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function exactDuplicateKey(row) {
  return JSON.stringify([
    normalizeDuplicateValue(row.company),
    normalizeDuplicateValue(row.role),
    normalizeDuplicateValue(row.link)
  ]);
}

/** Percent widths for table-layout: fixed (without Profile column). */
const COLUMN_WIDTHS = {
  select: '4%',
  no: '4%',
  bidder: '8%',
  roleCompany: '14%',
  link: '11%',
  resume: '13%',
  distance: '8%',
  applied: '9%',
  approved: '8%',
  applyProof: '11%',
  actions: '10%'
};

/** When Profile is shown, slightly shrink neighboring columns. */
const COLUMN_WIDTHS_WITH_PROFILE = {
  select: '4%',
  no: '4%',
  profile: '8%',
  bidder: '7%',
  roleCompany: '12%',
  link: '10%',
  resume: '11%',
  distance: '8%',
  applied: '9%',
  approved: '8%',
  applyProof: '9%',
  actions: '10%'
};

const STANDARD_COLUMN_WIDTHS = {
  no: '4%',
  bidder: '8%',
  roleCompany: '16%',
  link: '12%',
  resume: '17%',
  distance: '8%',
  applied: '9%',
  applyProof: '14%',
  actions: '13%'
};

const STANDARD_COLUMN_WIDTHS_WITH_PROFILE = {
  no: '4%',
  profile: '8%',
  bidder: '8%',
  roleCompany: '14%',
  link: '10%',
  resume: '14%',
  distance: '8%',
  applied: '9%',
  applyProof: '12%',
  actions: '13%'
};

function getColumnWidths(showProfileColumn, enableApproval) {
  if (enableApproval) {
    return showProfileColumn ? COLUMN_WIDTHS_WITH_PROFILE : COLUMN_WIDTHS;
  }
  return showProfileColumn ? STANDARD_COLUMN_WIDTHS_WITH_PROFILE : STANDARD_COLUMN_WIDTHS;
}

function colSx(width) {
  return {
    width,
    maxWidth: width,
    overflow: 'hidden'
  };
}

const ellipsisSx = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '100%'
};

const BASE_SEARCH_FIELDS = [
  'id',
  'bidder_name',
  'bidder_username',
  'role',
  'company',
  'link',
  'success_link',
  'resume_distance',
  (row) => formatResumeSource(row)
];

const APPLICATION_SELECT_FILTERS = [
  {
    id: 'bidder_username',
    getValue: formatBidderLabel,
    emptyValue: ''
  },
  {
    id: 'approved',
    getValue: (row) => (row.approved ? 'approved' : 'pending'),
    emptyValue: ''
  }
];

function ApplicationsTableView({
  rows,
  loading,
  onRefresh,
  profile,
  exportProfileId,
  profiles = [],
  identities = [],
  showProfileColumn = false,
  enableApproval = false,
  tableCardHeight,
  renderLayout
}) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSessionKey, setCreateSessionKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const {
    requestImportExportConfirmation,
    importExportPasswordDialogProps
  } = useImportExportPassword();
  const [showNotAppliedOnly, setShowNotAppliedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [approving, setApproving] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [deletingDuplicateId, setDeletingDuplicateId] = useState(null);
  const { open: detailOpen, selected: selectedApplication, openDetail, closeDetail, stopPropagation } =
    useDetailDialog();

  const searchFields = useMemo(
    () => (showProfileColumn ? ['profile_label', ...BASE_SEARCH_FIELDS] : BASE_SEARCH_FIELDS),
    [showProfileColumn]
  );

  const {
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectValues,
    setSelectValue,
    filteredRows,
    clearFilters,
    hasActiveFilters,
    showDateRange
  } = useTableListFilters(rows, {
    searchFields,
    dateField: 'applied_at',
    selects: APPLICATION_SELECT_FILTERS
  });

  const hasGeneratingResumes = useMemo(
    () => rows.some((row) => row.resume_generation_status === 'generating'),
    [rows]
  );

  useEffect(() => {
    if (!hasGeneratingResumes) return undefined;

    const intervalId = window.setInterval(() => {
      onRefresh({ silent: true });
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [hasGeneratingResumes, onRefresh]);

  const bidderOptions = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      const label = formatBidderLabel(row);
      values.add(label?.trim() ? label.trim() : '');
    });
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        value,
        label: value === '' ? '(Unknown)' : value
      }));
  }, [rows]);

  const filterSelects = useMemo(() => {
    const filters = [
      {
        id: 'bidder_username',
        label: 'Bidder',
        value: selectValues.bidder_username,
        onChange: (value) => setSelectValue('bidder_username', value),
        options: bidderOptions
      }
    ];
    if (enableApproval) {
      filters.push({
        id: 'approved',
        label: 'Approval',
        value: selectValues.approved,
        onChange: (value) => setSelectValue('approved', value),
        options: [
          { value: 'approved', label: 'Approved' },
          { value: 'pending', label: 'Pending' }
        ]
      });
    }
    return filters;
  }, [
    bidderOptions,
    enableApproval,
    selectValues.approved,
    selectValues.bidder_username,
    setSelectValue
  ]);

  const visibleRows = useMemo(
    () => (showNotAppliedOnly ? filteredRows.filter((row) => !row.applied) : filteredRows),
    [filteredRows, showNotAppliedOnly]
  );

  const duplicateCompanyGroups = useMemo(() => {
    const groups = new Map();
    visibleRows.forEach((row) => {
      const company = String(row.company || '').trim();
      if (!company) return;
      const key = company.toLocaleLowerCase();
      const group = groups.get(key) || [];
      group.push(row);
      groups.set(key, group);
    });
    return Array.from(groups.values())
      .filter((group) => group.length > 1)
      .sort((left, right) =>
        String(left[0]?.company || '').localeCompare(String(right[0]?.company || ''))
      );
  }, [visibleRows]);

  const exactDuplicateIds = useMemo(() => {
    const groups = new Map();
    visibleRows.forEach((row) => {
      const key = exactDuplicateKey(row);
      const group = groups.get(key) || [];
      group.push(row.id);
      groups.set(key, group);
    });
    return new Set(
      Array.from(groups.values())
        .filter((ids) => ids.length > 1)
        .flat()
    );
  }, [visibleRows]);

  const handleClearFilters = () => {
    clearFilters();
    setShowNotAppliedOnly(false);
  };

  const { sortedRows, sortField, sortDirection, handleSort } = useTableSort(visibleRows);

  const {
    page,
    limit,
    paginatedRows,
    handlePageChange,
    handleLimitChange,
    rowsPerPageOptions,
    rowOffset
  } = useTablePagination(sortedRows);

  useEffect(() => {
    const selectableIds = new Set(
      rows.filter((row) => !row.approved).map((row) => row.id)
    );
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => selectableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [rows]);

  const pageSelectableIds = useMemo(
    () => paginatedRows.filter((row) => !row.approved).map((row) => row.id),
    [paginatedRows]
  );
  const selectedPageCount = pageSelectableIds.filter((id) => selectedIds.has(id)).length;
  const allPageSelected =
    pageSelectableIds.length > 0 && selectedPageCount === pageSelectableIds.length;
  const somePageSelected = selectedPageCount > 0 && !allPageSelected;

  const profileLookup = useMemo(
    () => new Map(profiles.map((item) => [item.id, item])),
    [profiles]
  );

  const identityLookup = useMemo(
    () => new Map(identities.map((item) => [item.id, item])),
    [identities]
  );

  const profileLabelToId = useMemo(() => {
    const map = {};

    if (profiles.length && identities.length) {
      const identityById = Object.fromEntries(identities.map((identity) => [identity.id, identity]));
      profiles.forEach((item) => {
        const identity = identityById[item.identity_id];
        const label = formatIdentityLabel(identity);
        if (label) {
          map[label] = item.id;
        }
        if (item.identity_name) {
          map[item.identity_name] = item.id;
        }
      });
    }

    rows.forEach((row) => {
      if (row.profile_label && row.profile_id) {
        map[row.profile_label] = row.profile_id;
      }
    });

    return map;
  }, [profiles, identities, rows]);

  const openEditDialog = (row) => {
    closeDetail();
    setEditingRecord(row);
    setEditOpen(true);
  };

  const confirmDelete = (row) => {
    closeDetail();
    setDeletingRecord(row);
    setDeleteOpen(true);
  };

  const toggleSelected = (applicationId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }
      return next;
    });
  };

  const toggleCurrentPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        pageSelectableIds.forEach((id) => next.delete(id));
      } else {
        pageSelectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectCurrentPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageSelectableIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const selectAllApplications = () => {
    const applicationIds = rows
      .filter((row) => !row.approved)
      .map((row) => row.id);
    setSelectedIds(new Set(applicationIds));
    enqueueSnackbar(`Selected ${applicationIds.length} application(s)`, {
      variant: 'info'
    });
  };

  const selectFilteredApplications = () => {
    const applicationIds = visibleRows
      .filter((row) => !row.approved)
      .map((row) => row.id);
    setSelectedIds(new Set(applicationIds));
    enqueueSnackbar(`Selected ${applicationIds.length} filtered application(s)`, {
      variant: 'info'
    });
  };

  const handleApproveSelected = async () => {
    const applicationIds = [...selectedIds];
    if (!applicationIds.length) return;

    setApproving(true);
    try {
      const result = await approveJobApplications(applicationIds);
      enqueueSnackbar(
        `${result.approved_count} application(s) approved`,
        { variant: 'success' }
      );
      setSelectedIds(new Set());
      await onRefresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Approval failed', { variant: 'error' });
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setSaving(true);
    try {
      await deleteJobApplication(deletingRecord.id);
      enqueueSnackbar('Application deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingRecord(null);
      await onRefresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDuplicate = async (row) => {
    setDeletingDuplicateId(row.id);
    try {
      await deleteJobApplication(row.id);
      enqueueSnackbar(`Application #${row.id} deleted`, { variant: 'success' });
      await onRefresh();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setDeletingDuplicateId(null);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const resolvedExportProfileId =
        exportProfileId !== undefined ? exportProfileId : profile?.id ?? null;
      const exportRows = await listJobApplications(
        resolvedExportProfileId == null ? undefined : resolvedExportProfileId,
        { includeJobDescription: true }
      );
      if (!exportRows.length) {
        enqueueSnackbar('No applications to export', { variant: 'info' });
        return;
      }

      const csvRows = buildApplicationExportRows(exportRows);
      const namePart =
        resolvedExportProfileId == null
          ? 'all-profiles'
          : profile?.identity_name || `profile-${resolvedExportProfileId}`;
      const datePart = new Date().toISOString().slice(0, 10);
      downloadCsv(
        sanitizeCsvFilename(`job-applications-${namePart}-${datePart}.csv`),
        APPLICATION_CSV_HEADERS,
        csvRows
      );
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to export CSV', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsedRows = parseApplicationCsv(text, {
        defaultProfileId: profile?.id ?? null,
        profileLabelToId,
        hasProfileColumn: showProfileColumn && !profile
      }).filter((row) => row.error !== 'Empty row');

      if (!parsedRows.length) {
        enqueueSnackbar('No rows found in CSV', { variant: 'warning' });
        return;
      }

      const { created, failed, firstError } = await importJobApplicationsSequentially(
        parsedRows,
        createJobApplication
      );

      if (created) {
        await onRefresh();
      }

      if (created && failed) {
        enqueueSnackbar(`Imported ${created} application(s); ${failed} failed`, {
          variant: 'warning'
        });
      } else if (failed) {
        enqueueSnackbar(firstError || 'Import failed', { variant: 'error' });
      } else {
        enqueueSnackbar(`Imported ${created} application(s)`, { variant: 'success' });
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to import CSV', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const baseColumnCount = showProfileColumn ? 10 : 9;
  const columnCount = baseColumnCount + (enableApproval ? 2 : 0);
  const fixedTableCard = Boolean(tableCardHeight);
  const widths = getColumnWidths(showProfileColumn, enableApproval);

  const toolbar = (
    <TableListFilters
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search role, company, link, success link…"
      showDateRange={showDateRange}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      dateFromLabel="Applied from"
      dateToLabel="Applied to"
      selects={filterSelects}
      onClear={handleClearFilters}
      hasActiveFilters={hasActiveFilters || showNotAppliedOnly}
      filteredCount={visibleRows.length}
      totalCount={rows.length}
      actions={
        <>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showNotAppliedOnly}
                onChange={(event) => setShowNotAppliedOnly(event.target.checked)}
              />
            }
            label="Not applied only"
            sx={{
              m: 0,
              mr: 0.75,
              px: 1,
              py: 0.25,
              whiteSpace: 'nowrap',
              border: '1px solid',
              borderColor: showNotAppliedOnly ? 'primary.main' : 'divider',
              borderRadius: 1,
              bgcolor: showNotAppliedOnly
                ? alpha(theme.palette.primary.main, 0.1)
                : 'background.paper',
              boxShadow: showNotAppliedOnly
                ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.12)}`
                : 'none',
              '& .MuiFormControlLabel-label': {
                fontWeight: 600,
                color: showNotAppliedOnly ? 'primary.main' : 'text.primary'
              }
            }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshTwoToneIcon />}
            onClick={onRefresh}
            disabled={loading || approving}
          >
            Refresh
          </Button>
          {profile ? (
            <Button
              variant="contained"
              startIcon={<AddTwoToneIcon />}
              onClick={() => {
                setCreateSessionKey((key) => key + 1);
                setCreateOpen(true);
              }}
            >
              Add application
            </Button>
          ) : null}
        </>
      }
    />
  );

  const table = (
    <>
      {enableApproval ? (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            border: (currentTheme) => `1px solid ${currentTheme.palette.divider}`,
            borderRadius: 1,
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="body2" fontWeight="bold" color="text.secondary">
            Select:
          </Typography>
          <ButtonGroup size="small" variant="outlined" disabled={loading || approving}>
            <Button
              onClick={selectCurrentPage}
              disabled={loading || approving || !pageSelectableIds.length}
            >
              Current Page
            </Button>
            <Button
              onClick={selectAllApplications}
              disabled={loading || approving || !rows.some((row) => !row.approved)}
            >
              All Applications
            </Button>
            <Button
              onClick={selectFilteredApplications}
              disabled={loading || approving || !visibleRows.some((row) => !row.approved)}
            >
              Filtered Applications
            </Button>
          </ButtonGroup>
          <Chip
            size="small"
            color={selectedIds.size ? 'primary' : 'default'}
            label={`${selectedIds.size} selected`}
            onDelete={selectedIds.size ? () => setSelectedIds(new Set()) : undefined}
          />
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            startIcon={<ContentCopyTwoToneIcon />}
            onClick={() => setDuplicatesOpen(true)}
            disabled={loading || approving || !visibleRows.length}
          >
            Duplicates
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleTwoToneIcon />}
            onClick={handleApproveSelected}
            disabled={!selectedIds.size || loading || approving}
          >
            {approving ? 'Approving…' : 'Approve'}
          </Button>
        </Box>
      ) : null}
      <Card
      sx={
        fixedTableCard
          ? {
              height: tableCardHeight,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }
          : undefined
      }
    >
      <CardContent
        sx={
          fixedTableCard
            ? {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                '&:last-child': { pb: 2 }
              }
            : undefined
        }
      >
        <TableContainer sx={fixedTableCard ? { flex: 1, overflow: 'auto' } : undefined}>
          <Table stickyHeader={fixedTableCard} sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  {enableApproval ? (
                    <TableCell padding="checkbox" sx={colSx(widths.select)}>
                      <Checkbox
                        checked={allPageSelected}
                        indeterminate={somePageSelected}
                        onChange={toggleCurrentPage}
                        disabled={!pageSelectableIds.length || approving}
                        inputProps={{ 'aria-label': 'Select applications on this page' }}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell sx={colSx(widths.no)}>No</TableCell>
                  {showProfileColumn ? (
                    <SortableTableCell
                      label="Profile"
                      sortKey="profile_label"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      sx={colSx(widths.profile)}
                    />
                  ) : null}
                  <SortableTableCell
                    label="Bidder"
                    sortKey={formatBidderLabel}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.bidder)}
                  />
                  <SortableTableCell
                    label="Role / Company"
                    sortKey={formatRoleCompanySortValue}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.roleCompany)}
                  />
                  <SortableTableCell
                    label="Link"
                    sortKey="link"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.link)}
                  />
                  <SortableTableCell
                    label="Resume"
                    sortKey={formatResumeSource}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.resume)}
                  />
                  <SortableTableCell
                    label="Distance"
                    sortKey="resume_distance"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.distance)}
                  />
                  <SortableTableCell
                    label="Applied"
                    sortKey={formatAppliedSortValue}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sx={colSx(widths.applied)}
                  />
                  <TableCell sx={colSx(widths.applyProof)}>Apply Proof</TableCell>
                  {enableApproval ? (
                    <SortableTableCell
                      label="Approved"
                      sortKey={formatApprovedSortValue}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      sx={colSx(widths.approved)}
                    />
                  ) : null}
                  <TableCell align="right" sx={colSx(widths.actions)} />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columnCount}>Loading…</TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnCount}>No applications yet.</TableCell>
                  </TableRow>
                ) : visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnCount}>No applications match your filters.</TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      hover
                      selected={enableApproval && selectedIds.has(row.id)}
                      onClick={() => openEditDialog(row)}
                      sx={{ cursor: 'pointer' }}
                    >
                      {enableApproval ? (
                        <TableCell
                          padding="checkbox"
                          sx={colSx(widths.select)}
                          onClick={stopPropagation}
                        >
                          <Checkbox
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleSelected(row.id)}
                            disabled={row.approved || approving}
                            inputProps={{ 'aria-label': `Select application ${row.id}` }}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell sx={colSx(widths.no)}>{rowOffset + index + 1}</TableCell>
                      {showProfileColumn ? (
                        <TableCell sx={colSx(widths.profile)}>
                          <ApplicationIdentityLabel
                            identityId={profileLookup.get(row.profile_id)?.identity_id}
                            label={row.profile_label}
                            identityById={identityLookup}
                            typographySx={ellipsisSx}
                            sx={{ minWidth: 0, maxWidth: '100%' }}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell sx={colSx(widths.bidder)}>
                        <Typography variant="body2" sx={ellipsisSx}>
                          {formatBidderLabel(row) || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={colSx(widths.roleCompany)}>
                        <Tooltip
                          title={[row.role, row.company].filter(Boolean).join(' · ') || '—'}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={ellipsisSx}>
                              {row.role || '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={ellipsisSx}>
                              {row.company || '—'}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={colSx(widths.link)} onClick={stopPropagation}>
                        {row.link ? (
                          <Tooltip title={row.link}>
                            <Link
                              href={externalUrl(row.link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              sx={ellipsisSx}
                            >
                              {formatLinkPreview(row.link)}
                            </Link>
                          </Tooltip>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell sx={colSx(widths.resume)} onClick={stopPropagation}>
                        <ApplicationResumeCell row={row} />
                      </TableCell>
                      <TableCell sx={colSx(widths.distance)}>
                        <Tooltip
                          title={
                            row.resume_distance == null
                              ? 'No matched-resume distance'
                              : `Weighted distance: ${row.resume_distance}`
                          }
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {formatResumeDistance(row)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={colSx(widths.applied)}>
                        {row.applied ? (
                          <Typography variant="body2" sx={ellipsisSx}>
                            {formatDateTime(row.applied_at)}
                          </Typography>
                        ) : (
                          <Tooltip title="Not applied">
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                              <CancelTwoToneIcon
                                sx={{ fontSize: 20, color: 'error.main', flexShrink: 0 }}
                                aria-label="Not applied"
                              />
                              <Typography variant="body2" color="error.main" noWrap>
                                Not applied
                              </Typography>
                            </Stack>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{ ...colSx(widths.applyProof), py: 0.5 }}
                        onClick={stopPropagation}
                      >
                        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                          {row.applied_screenshot ? (
                            <Box
                              sx={{
                                width: '100%',
                                maxWidth: 128,
                                aspectRatio: '16 / 9',
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: `1px solid ${theme.palette.divider}`
                              }}
                            >
                              <ApplicationScreenshotThumb
                                applicationId={row.id}
                                image={row.applied_screenshot}
                                fill
                                fillMode="cover"
                                alt={row.role || 'Application screenshot'}
                              />
                            </Box>
                          ) : row.success_link ? (
                            <Tooltip title={row.success_link}>
                              <Link
                                href={externalUrl(row.success_link)}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                                variant="caption"
                                sx={ellipsisSx}
                              >
                                {formatLinkPreview(row.success_link, 24)}
                              </Link>
                            </Tooltip>
                          ) : (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <ImageOutlinedIcon
                                sx={{ fontSize: 18, color: 'text.disabled' }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                No proof
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </TableCell>
                      {enableApproval ? (
                        <TableCell sx={colSx(widths.approved)}>
                          <Chip
                            size="small"
                            color={row.approved ? 'success' : 'default'}
                            label={row.approved ? 'Approved' : 'Pending'}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell align="right" sx={colSx(widths.actions)} onClick={stopPropagation}>
                        <Tooltip title="View details">
                          <IconButton
                            color="primary"
                            onClick={() => openDetail(row)}
                            disabled={saving}
                          >
                            <VisibilityTwoToneIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            color="primary"
                            onClick={() => openEditDialog(row)}
                            disabled={saving}
                          >
                            <EditTwoToneIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() => confirmDelete(row)}
                            disabled={saving}
                          >
                            <DeleteTwoToneIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              pt: 1
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={handleImportFileSelected}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileUploadTwoToneIcon />}
              onClick={() =>
                requestImportExportConfirmation('Import', handleImportClick)
              }
              disabled={loading || importing}
            >
              {importing ? 'Importing…' : 'Import'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownloadTwoToneIcon />}
              onClick={() =>
                requestImportExportConfirmation('Export', handleExportCsv)
              }
              disabled={loading || exporting}
            >
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            <Box sx={{ flex: 1 }} />
            <TablePaginationFooter
              count={visibleRows.length}
              page={page}
              rowsPerPage={limit}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleLimitChange}
              rowsPerPageOptions={rowsPerPageOptions}
            />
          </Box>
        </CardContent>
      </Card>
    </>
  );

  const dialogs = (
    <>
      {createOpen ? (
        <ApplicationCreateDialog
          key={createSessionKey}
          open
          profile={profile}
          onClose={() => setCreateOpen(false)}
          onSaved={onRefresh}
        />
      ) : null}

      <ApplicationDetailDialog
        open={detailOpen}
        application={selectedApplication}
        onClose={closeDetail}
      />

      {editOpen && editingRecord ? (
        <ApplicationEditDialog
          open
          application={editingRecord}
          onClose={() => !saving && setEditOpen(false)}
          onSaved={onRefresh}
        />
      ) : null}

      <Dialog open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)}>
        <DialogTitle>Delete application</DialogTitle>
        <DialogContent>
          <Typography>
            Delete application #{deletingRecord?.id}
            {deletingRecord?.company ? ` for ${deletingRecord.company}` : ''}? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {enableApproval ? (
        <Dialog
          open={duplicatesOpen}
          onClose={() => !deletingDuplicateId && setDuplicatesOpen(false)}
          fullWidth
          maxWidth="lg"
        >
          <DialogTitle
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.1
              )}, ${alpha(theme.palette.background.paper, 0.95)})`
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ContentCopyTwoToneIcon color="primary" />
              <Box>
                <Typography variant="h4">Duplicate companies</Typography>
                <Typography variant="body2" color="text.secondary">
                  Review repeated companies in the current filtered applications.
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              p: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.025)
            }}
          >
            {duplicateCompanyGroups.length ? (
              <Stack spacing={2}>
                {duplicateCompanyGroups.map((group) => {
                  const groupHasExactDuplicates = group.some((row) =>
                    exactDuplicateIds.has(row.id)
                  );
                  return (
                    <Paper
                      key={normalizeDuplicateValue(group[0]?.company)}
                      variant="outlined"
                      sx={{
                        overflow: 'hidden',
                        borderColor: groupHasExactDuplicates ? 'error.light' : 'divider',
                        boxShadow: groupHasExactDuplicates
                          ? `0 4px 16px ${alpha(theme.palette.error.main, 0.12)}`
                          : `0 3px 12px ${alpha(theme.palette.common.black, 0.06)}`
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          py: 1.25,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          flexWrap: 'wrap',
                          bgcolor: groupHasExactDuplicates
                            ? alpha(theme.palette.error.main, 0.08)
                            : alpha(theme.palette.primary.main, 0.06)
                        }}
                      >
                        <Typography variant="h5">{group[0]?.company || '—'}</Typography>
                        <Chip
                          size="small"
                          color="primary"
                          variant="outlined"
                          label={`${group.length} applications`}
                        />
                        {groupHasExactDuplicates ? (
                          <Chip
                            size="small"
                            color="error"
                            icon={<WarningAmberTwoToneIcon />}
                            label="Exact duplicates found"
                          />
                        ) : null}
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Role</TableCell>
                              <TableCell>URL</TableCell>
                              <TableCell>Bidder</TableCell>
                              <TableCell>Applied Time</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align="right">Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.map((row) => {
                              const isExactDuplicate = exactDuplicateIds.has(row.id);
                              const isDeleting = deletingDuplicateId === row.id;
                              return (
                                <TableRow
                                  key={row.id}
                                  sx={{
                                    bgcolor: isExactDuplicate
                                      ? alpha(theme.palette.error.main, 0.045)
                                      : 'transparent'
                                  }}
                                >
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600}>
                                      {row.role || '—'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {row.link ? (
                                      <Tooltip title={row.link}>
                                        <Link
                                          href={externalUrl(row.link)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          underline="hover"
                                        >
                                          {formatLinkPreview(row.link, 38)}
                                        </Link>
                                      </Tooltip>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                  <TableCell>{formatBidderLabel(row) || '—'}</TableCell>
                                  <TableCell>{formatAppliedStatus(row)}</TableCell>
                                  <TableCell>
                                    {isExactDuplicate ? (
                                      <Chip
                                        size="small"
                                        color="error"
                                        icon={<WarningAmberTwoToneIcon />}
                                        label="Exact duplicate"
                                      />
                                    ) : (
                                      <Chip size="small" label="Same company" />
                                    )}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Button
                                      size="small"
                                      color="error"
                                      startIcon={<DeleteTwoToneIcon />}
                                      onClick={() => handleDeleteDuplicate(row)}
                                      disabled={deletingDuplicateId !== null}
                                    >
                                      {isDeleting ? 'Deleting…' : 'Delete'}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Paper
                variant="outlined"
                sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}
              >
                <ContentCopyTwoToneIcon
                  sx={{ fontSize: 42, color: 'text.disabled', mb: 1 }}
                />
                <Typography variant="h5">No duplicate companies</Typography>
                <Typography color="text.secondary" mt={0.5}>
                  No repeated company names were found in the current filtered applications.
                </Typography>
              </Paper>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
              Red rows have matching company, role, and URL.
            </Typography>
            <Button
              variant="contained"
              onClick={() => setDuplicatesOpen(false)}
              disabled={deletingDuplicateId !== null}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      <ImportExportPasswordDialog {...importExportPasswordDialogProps} />
    </>
  );

  if (renderLayout) {
    return renderLayout({ toolbar, table, dialogs });
  }

  return (
    <>
      <Box sx={{ mb: 2 }}>{toolbar}</Box>
      {table}
      {dialogs}
    </>
  );
}

ApplicationsTableView.propTypes = {
  rows: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  profile: PropTypes.object,
  exportProfileId: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  profiles: PropTypes.array,
  identities: PropTypes.array,
  showProfileColumn: PropTypes.bool,
  enableApproval: PropTypes.bool,
  tableCardHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
  renderLayout: PropTypes.func
};

export default ApplicationsTableView;
