import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import CloudUploadTwoToneIcon from '@mui/icons-material/CloudUploadTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import TableListFilters from 'src/components/TableListFilters';
import CountryLabel from 'src/components/CountryLabel';
import CountrySelectField from 'src/components/CountrySelectField';
import DateField from 'src/components/DateField';
import { useDetailDialog } from 'src/components/DetailDialog';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import useTableListFilters from 'src/hooks/useTableListFilters';
import COUNTRIES, { DEFAULT_COUNTRY } from 'src/data/countries';
import {
  CITIZEN_REVIEW_STATUSES,
  DEFAULT_CITIZEN_REVIEW_STATUS
} from 'src/data/citizenReviewStatusOptions';
import {
  createCitizen,
  deleteCitizen,
  deleteCitizenImage,
  deleteCitizenReviewFile,
  downloadCitizenImage,
  downloadCitizenReviewFile,
  listCitizens,
  updateCitizen,
  uploadCitizenImage,
  uploadCitizenReviewFile
} from 'src/services/citizenApi';
import { formatDateTime } from 'src/utils/dateFormat';
import CitizenImageTile from './CitizenImageTile';
import CitizenImagePreviewOverlay from './CitizenImagePreviewOverlay';
import CitizenDetailDialog from './CitizenDetailDialog';
import CitizenLinkedInCell from './CitizenLinkedInCell';
import CitizenReviewFileList from './CitizenReviewFileList';
import CitizenReviewStatusLabel from './CitizenReviewStatusLabel';
import PendingFileTile from './PendingFileTile';

const emptyForm = {
  country: DEFAULT_COUNTRY,
  name: '',
  linkedin: '',
  details: '',
  review_status: DEFAULT_CITIZEN_REVIEW_STATUS,
  reviewer: '',
  reviewed_at: '',
  review_log: ''
};

const CITIZEN_SEARCH_FIELDS = [
  'id',
  'name',
  'country',
  'linkedin',
  'details',
  'review_status',
  'reviewer',
  'review_log'
];

function CitizenManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);
  const reviewFileInputRef = useRef(null);
  useSetPageHeader('Citizen Management', 'Manage citizens with country, details, and images');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingReviewFiles, setPendingReviewFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const {
    open: detailOpen,
    selected: selectedCitizen,
    openDetail,
    closeDetail,
    stopPropagation
  } = useDetailDialog();

  const {
    search,
    setSearch,
    filteredRows
  } = useTableListFilters(rows, {
    searchFields: CITIZEN_SEARCH_FIELDS
  });

  const dialogTitle = useMemo(
    () => (editingRecord ? 'Edit citizen' : 'Add citizen'),
    [editingRecord]
  );

  const countryOptions = useMemo(() => {
    if (form.country && !COUNTRIES.includes(form.country)) {
      return [form.country, ...COUNTRIES];
    }
    return COUNTRIES;
  }, [form.country]);

  const closeImagePreview = () => {
    setImagePreview(null);
  };

  const openImagePreview = (preview) => {
    setImagePreview(preview);
  };

  const loadCitizens = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listCitizens());
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load citizens', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadCitizens();
  }, [loadCitizens]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setPendingFiles([]);
    setPendingReviewFiles([]);
    setDialogOpen(true);
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setForm({
      country: record.country || '',
      name: record.name || '',
      linkedin: record.linkedin || '',
      details: record.details || '',
      review_status: record.review_status || DEFAULT_CITIZEN_REVIEW_STATUS,
      reviewer: record.reviewer || '',
      reviewed_at: record.reviewed_at || '',
      review_log: record.review_log || ''
    });
    setPendingFiles([]);
    setPendingReviewFiles([]);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!saving && !uploading) {
      setDialogOpen(false);
      setEditingRecord(null);
      setForm(emptyForm);
      setPendingFiles([]);
      setPendingReviewFiles([]);
      setImagePreview(null);
    }
  };

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const uploadPendingFiles = async (citizenId) => {
    if (!pendingFiles.length) {
      return null;
    }

    setUploading(true);
    try {
      const latestRecord = await pendingFiles.reduce(
        (chain, file) => chain.then(() => uploadCitizenImage(citizenId, file)),
        Promise.resolve(null)
      );
      setPendingFiles([]);
      return latestRecord;
    } finally {
      setUploading(false);
    }
  };

  const uploadPendingReviewFiles = async (citizenId) => {
    if (!pendingReviewFiles.length) {
      return null;
    }

    setUploading(true);
    try {
      const latestRecord = await pendingReviewFiles.reduce(
        (chain, file) => chain.then(() => uploadCitizenReviewFile(citizenId, file)),
        Promise.resolve(null)
      );
      setPendingReviewFiles([]);
      return latestRecord;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.country.trim() || !form.name.trim()) {
      enqueueSnackbar('Country and name are required', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        country: form.country.trim(),
        name: form.name.trim(),
        linkedin: form.linkedin.trim() || null,
        details: form.details,
        review_status: form.review_status,
        reviewer: form.reviewer.trim() || null,
        reviewed_at: form.reviewed_at || null,
        review_log: form.review_log
      };

      let savedRecord;
      if (editingRecord) {
        savedRecord = await updateCitizen(editingRecord.id, payload);
      } else {
        savedRecord = await createCitizen(payload);
      }

      if (pendingFiles.length) {
        await uploadPendingFiles(savedRecord.id);
      }

      if (pendingReviewFiles.length) {
        await uploadPendingReviewFiles(savedRecord.id);
      }

      enqueueSnackbar(editingRecord ? 'Citizen updated' : 'Citizen created', {
        variant: 'success'
      });
      await loadCitizens();
      closeDialog();
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePickFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setPendingFiles((current) => [...current, ...files]);
  };

  const handleRemovePendingFile = (index) => {
    setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handlePickReviewFiles = () => {
    reviewFileInputRef.current?.click();
  };

  const handleReviewFilesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setPendingReviewFiles((current) => [...current, ...files]);
  };

  const handleRemovePendingReviewFile = (index) => {
    setPendingReviewFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleDownloadImage = async (citizenId, image) => {
    try {
      await downloadCitizenImage(citizenId, image.filename, image.original_name);
    } catch (err) {
      enqueueSnackbar(err.message || 'Download failed', { variant: 'error' });
    }
  };

  const handleDeleteImage = async (citizenId, filename) => {
    setUploading(true);
    try {
      const updated = await deleteCitizenImage(citizenId, filename);
      if (editingRecord?.id === citizenId) {
        setEditingRecord(updated);
      }
      await loadCitizens();
      enqueueSnackbar('Image deleted', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadReviewFile = async (citizenId, file) => {
    try {
      await downloadCitizenReviewFile(citizenId, file.filename, file.original_name);
    } catch (err) {
      enqueueSnackbar(err.message || 'Download failed', { variant: 'error' });
    }
  };

  const handleDeleteReviewFile = async (citizenId, filename) => {
    setUploading(true);
    try {
      const updated = await deleteCitizenReviewFile(citizenId, filename);
      if (editingRecord?.id === citizenId) {
        setEditingRecord(updated);
      }
      await loadCitizens();
      enqueueSnackbar('Review file deleted', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (record) => {
    setDeletingRecord(record);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setSaving(true);
    try {
      await deleteCitizen(deletingRecord.id);
      enqueueSnackbar('Citizen deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDeletingRecord(null);
      await loadCitizens();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const currentImages = editingRecord?.images || [];
  const currentReviewFiles = editingRecord?.review_files || [];

  return (
    <>
      <Helmet>
        <title>Citizen Management - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TableListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, country, LinkedIn, details…"
            showDateRange={false}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
            actions={
              <>
                <Button
                  variant="outlined"
                  startIcon={<RefreshTwoToneIcon />}
                  onClick={loadCitizens}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button variant="contained" startIcon={<AddTwoToneIcon />} onClick={openCreateDialog}>
                  Add citizen
                </Button>
              </>
            }
          />
        </Box>

        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Country</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Review</TableCell>
                    <TableCell>Reviewer</TableCell>
                    <TableCell>LinkedIn</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>Images</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9}>Loading…</TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        {rows.length === 0 ? 'No citizens yet.' : 'No citizens match your filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <CountryLabel country={row.country} noWrap />
                        </TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>
                          <CitizenReviewStatusLabel status={row.review_status} />
                        </TableCell>
                        <TableCell>{row.reviewer || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <CitizenLinkedInCell url={row.linkedin} />
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 320,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {row.details || '—'}
                        </TableCell>
                        <TableCell>
                          {(row.images || []).length ? (
                            <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
                              {row.images.slice(0, 4).map((image) => (
                                <CitizenImageTile
                                  key={image.filename}
                                  citizenId={row.id}
                                  image={image}
                                  size={48}
                                  onPreview={openImagePreview}
                                  onDownload={() => handleDownloadImage(row.id, image)}
                                />
                              ))}
                              {row.images.length > 4 ? (
                                <Typography variant="caption" color="text.secondary">
                                  +{row.images.length - 4}
                                </Typography>
                              ) : null}
                            </Stack>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(row.updated_at)}</TableCell>
                        <TableCell align="right" onClick={stopPropagation}>
                          <Tooltip title="View">
                            <IconButton onClick={() => openDetail(row)}>
                              <VisibilityTwoToneIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton color="primary" onClick={() => openEditDialog(row)}>
                              <EditTwoToneIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton color="error" onClick={() => confirmDelete(row)}>
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
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <CountrySelectField
                  options={countryOptions}
                  value={form.country}
                  onChange={(value) => setForm((current) => ({ ...current, country: value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Name"
                  value={form.name}
                  onChange={handleFormChange('name')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Review status</InputLabel>
                  <Select
                    label="Review status"
                    value={form.review_status}
                    onChange={handleFormChange('review_status')}
                    renderValue={(value) => <CitizenReviewStatusLabel status={value} />}
                  >
                    {CITIZEN_REVIEW_STATUSES.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <CitizenReviewStatusLabel status={option.value} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Reviewer"
                  value={form.reviewer}
                  onChange={handleFormChange('reviewer')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateField
                  fullWidth
                  label="Reviewed at"
                  value={form.reviewed_at}
                  onChange={(value) => setForm((current) => ({ ...current, reviewed_at: value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Review log"
                  multiline
                  minRows={3}
                  value={form.review_log}
                  onChange={handleFormChange('review_log')}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h5">Review files</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CloudUploadTwoToneIcon />}
                    onClick={handlePickReviewFiles}
                    disabled={uploading || saving}
                  >
                    Upload
                  </Button>
                  <input
                    ref={reviewFileInputRef}
                    type="file"
                    hidden
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.zip"
                    onChange={handleReviewFilesSelected}
                  />
                </Stack>

                {pendingReviewFiles.length ? (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Pending upload (saved when you click Save)
                    </Typography>
                    <Stack spacing={0.75}>
                      {pendingReviewFiles.map((file, index) => (
                        <Stack
                          key={`${file.name}-${index}`}
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            border: `1px solid ${theme.colors.alpha.black[10]}`
                          }}
                        >
                          <Typography variant="body2" flex={1} noWrap title={file.name}>
                            {file.name}
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemovePendingReviewFile(index)}
                            disabled={saving || uploading}
                          >
                            Remove
                          </Button>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                ) : null}

                {editingRecord ? (
                  <CitizenReviewFileList
                    files={currentReviewFiles}
                    onDownload={(file) => handleDownloadReviewFile(editingRecord.id, file)}
                    onDelete={(filename) => handleDeleteReviewFile(editingRecord.id, filename)}
                    disabled={uploading}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Save the citizen first, or select files now to upload on save.
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="LinkedIn"
                  placeholder="https://linkedin.com/in/..."
                  value={form.linkedin}
                  onChange={handleFormChange('linkedin')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Details"
                  multiline
                  minRows={4}
                  value={form.details}
                  onChange={handleFormChange('details')}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h5">Images</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CloudUploadTwoToneIcon />}
                    onClick={handlePickFiles}
                    disabled={uploading || saving}
                  >
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFilesSelected}
                  />
                </Stack>

                {pendingFiles.length ? (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Pending upload (saved when you click Save)
                    </Typography>
                    <Grid container spacing={1.5}>
                      {pendingFiles.map((file, index) => (
                        <Grid item xs={6} sm={4} md={3} key={`${file.name}-${index}`}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              border: `1px solid ${theme.colors.alpha.black[10]}`
                            }}
                          >
                            <Box display="flex" justifyContent="center" mb={0.75}>
                              <PendingFileTile
                                file={file}
                                size={96}
                                onPreview={openImagePreview}
                                onCancel={() => handleRemovePendingFile(index)}
                                disabled={saving || uploading}
                              />
                            </Box>
                            <Typography variant="caption" display="block" noWrap title={file.name} textAlign="center">
                              {file.name}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : null}

                {editingRecord && currentImages.length ? (
                  <Grid container spacing={1.5}>
                    {currentImages.map((image) => (
                      <Grid item xs={6} sm={4} md={3} key={image.filename}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            border: `1px solid ${theme.colors.alpha.black[10]}`
                          }}
                        >
                          <Box display="flex" justifyContent="center" mb={1}>
                            <CitizenImageTile
                              citizenId={editingRecord.id}
                              image={image}
                              size={120}
                              onPreview={openImagePreview}
                              onDownload={() => handleDownloadImage(editingRecord.id, image)}
                              onDelete={() => handleDeleteImage(editingRecord.id, image.filename)}
                              disabled={uploading}
                            />
                          </Box>
                          <Typography variant="caption" display="block" noWrap title={image.original_name}>
                            {image.original_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatDateTime(image.uploaded_at)}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {editingRecord
                      ? 'No images uploaded yet.'
                      : 'Save the citizen first, or select files now to upload on save.'}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={saving || uploading}>
              Cancel
            </Button>
            <Button onClick={handleSave} variant="contained" disabled={saving || uploading}>
              {saving || uploading ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        <CitizenImagePreviewOverlay
          open={Boolean(imagePreview?.src)}
          src={imagePreview?.src}
          title={imagePreview?.title}
          onClose={closeImagePreview}
          onDownload={
            imagePreview?.citizenId && imagePreview?.image
              ? () => handleDownloadImage(imagePreview.citizenId, imagePreview.image)
              : undefined
          }
        />

        <Dialog open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)}>
          <DialogTitle>Delete citizen</DialogTitle>
          <DialogContent>
            <Typography>
              Delete <b>{deletingRecord?.name}</b>? This will also remove all uploaded images and review files.
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
      </Container>

      <CitizenDetailDialog
        open={detailOpen}
        citizen={selectedCitizen}
        onClose={closeDetail}
        onPreviewImage={openImagePreview}
        onDownloadImage={handleDownloadImage}
        onDownloadReviewFile={handleDownloadReviewFile}
      />
    </>
  );
}

export default CitizenManagement;
