import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  useTheme
} from '@mui/material';
import CloudUploadTwoToneIcon from '@mui/icons-material/CloudUploadTwoTone';
import ContentPasteTwoToneIcon from '@mui/icons-material/ContentPasteTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CopyableTextField, { CopyFieldAdornment } from 'src/components/CopyableTextField';
import DateField from 'src/components/DateField';
import {
  DEFAULT_LINKEDIN_NEED_ACTION,
  DEFAULT_LINKEDIN_STATUS,
  LINKEDIN_NEED_ACTIONS,
  LINKEDIN_PROVIDERS,
  LINKEDIN_STATUSES
} from 'src/data/linkedinOptions';
import { DEFAULT_COUNTRY } from 'src/data/countries';
import { formatDateTime } from 'src/utils/dateFormat';
import LinkedInImageThumb from './LinkedInImageThumb';

function TabPanel({ children, value, index }) {
  if (value !== index) {
    return null;
  }
  return <Box sx={{ pt: 2.5 }}>{children}</Box>;
}

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired
};

function SectionCard({ title, subtitle, children }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}
    >
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
      <Grid container spacing={2}>
        {children}
      </Grid>
    </Paper>
  );
}

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired
};

function FieldCell({ children, xs = 12, sm, md, sx }) {
  const smValue = sm ?? (xs === 12 ? 12 : 6);

  return (
    <Grid item xs={xs} sm={smValue} md={md} sx={sx}>
      {children}
    </Grid>
  );
}

FieldCell.propTypes = {
  children: PropTypes.node.isRequired,
  xs: PropTypes.number,
  sm: PropTypes.number,
  md: PropTypes.number,
  sx: PropTypes.object
};

function PasswordField({ label, value, onChange, required, helperText, copyValue }) {
  const storedValue = copyValue ?? '';
  const hasFormValue = value !== '' && value != null;
  const displayValue = hasFormValue ? value : storedValue;
  const copyText = String(displayValue ?? '').trim() || String(storedValue ?? '').trim();

  return (
    <TextField
      label={label}
      required={required}
      fullWidth
      size="small"
      type="text"
      value={displayValue}
      onChange={onChange}
      helperText={helperText}
      autoComplete="off"
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <CopyFieldAdornment label={label} value={copyText} />
          </InputAdornment>
        )
      }}
    />
  );
}

PasswordField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  helperText: PropTypes.string,
  copyValue: PropTypes.string
};

function LinkedInScreenshotField({
  screenshotPasteRef,
  pendingPreviewUrl,
  existingImage,
  editingRecordId,
  imageInputRef,
  onPendingFileChange,
  onPaste,
  onPasteFromClipboard,
  onFileSelect,
  hasScreenshot,
  onClear,
  onRemoveExistingImage,
  pendingFile
}) {
  const theme = useTheme();
  const [dragOver, setDragOver] = useState(false);
  const fileName = pendingFile?.name || existingImage?.original_name;

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        width: '100%',
        maxWidth: 360,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.02),
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Stack spacing={1.5} sx={{ flex: 1 }}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            Screenshot
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Optional · max 10MB
          </Typography>
        </Stack>

        <Box
          ref={screenshotPasteRef}
          tabIndex={0}
          role="button"
          aria-label="Screenshot preview. Drag and drop, paste with Ctrl+V, or upload an image."
          onPaste={onPaste}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => {
            if (!hasScreenshot) {
              imageInputRef.current?.click();
              return;
            }
            screenshotPasteRef.current?.focus();
          }}
          sx={{
            flex: 1,
            minHeight: 240,
            borderRadius: 2,
            border: '2px dashed',
            borderColor: dragOver ? 'primary.main' : 'divider',
            bgcolor: dragOver
              ? alpha(theme.palette.primary.main, 0.08)
              : alpha(theme.palette.background.default, 0.8),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            '&:focus': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2
            },
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.04)
            }
          }}
        >
          {pendingPreviewUrl ? (
            <Box
              component="img"
              src={pendingPreviewUrl}
              alt="Screenshot preview"
              sx={{
                width: '100%',
                height: '100%',
                maxHeight: 280,
                objectFit: 'contain',
                p: 1,
                pointerEvents: 'none'
              }}
            />
          ) : existingImage && editingRecordId ? (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                minHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 1
              }}
            >
              <LinkedInImageThumb accountId={editingRecordId} image={existingImage} size={280} />
            </Box>
          ) : (
            <Stack spacing={1} alignItems="center" sx={{ px: 2, py: 3, textAlign: 'center' }}>
              <ImageOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Drop image here
              </Typography>
              <Typography variant="caption" color="text.secondary">
                or click to browse · Ctrl+V to paste
              </Typography>
            </Stack>
          )}
        </Box>

        {fileName ? (
          <Typography variant="caption" color="text.secondary" noWrap title={fileName}>
            {fileName}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            PNG, JPG, WEBP, GIF, or BMP
          </Typography>
        )}

        <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={onPendingFileChange} />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloudUploadTwoToneIcon />}
            onClick={(event) => {
              event.stopPropagation();
              imageInputRef.current?.click();
            }}
          >
            Upload
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentPasteTwoToneIcon />}
            onClick={(event) => {
              event.stopPropagation();
              onPasteFromClipboard();
            }}
          >
            Paste
          </Button>
          {hasScreenshot ? (
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteTwoToneIcon />}
              onClick={(event) => {
                event.stopPropagation();
                onClear();
                if (existingImage) {
                  onRemoveExistingImage?.();
                }
              }}
            >
              Remove
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

LinkedInScreenshotField.propTypes = {
  screenshotPasteRef: PropTypes.object.isRequired,
  pendingPreviewUrl: PropTypes.string,
  existingImage: PropTypes.object,
  editingRecordId: PropTypes.number,
  imageInputRef: PropTypes.object.isRequired,
  onPendingFileChange: PropTypes.func.isRequired,
  onPaste: PropTypes.func.isRequired,
  onPasteFromClipboard: PropTypes.func.isRequired,
  onFileSelect: PropTypes.func.isRequired,
  hasScreenshot: PropTypes.bool.isRequired,
  onClear: PropTypes.func.isRequired,
  onRemoveExistingImage: PropTypes.func,
  pendingFile: PropTypes.object
};

function LinkedInFormFields({
  form,
  setForm,
  createdAt,
  editingRecordId,
  storedValues,
  pendingFile,
  onPendingFileChange,
  onPendingFileSelect,
  existingImage,
  onRemoveExistingImage,
  imageInputRef
}) {
  const { enqueueSnackbar } = useSnackbar();
  const screenshotPasteRef = useRef(null);
  const [tab, setTab] = useState(0);
  const pendingPreviewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );

  useEffect(
    () => () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    },
    [pendingPreviewUrl]
  );

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const setBooleanField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.checked }));
  };

  const setDateField = (field) => (value) => {
    setForm((current) => ({ ...current, [field]: value || '' }));
  };

  const clearPendingFile = () => {
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    onPendingFileSelect?.(null);
  };

  const selectPendingFile = (file) => {
    if (!file) {
      clearPendingFile();
      return;
    }
    if (!file.type?.startsWith('image/')) {
      enqueueSnackbar('Only image files are supported', { variant: 'warning' });
      return;
    }
    onPendingFileSelect?.(file);
  };

  const handleScreenshotPaste = (event) => {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }
    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) {
      return;
    }
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (file) {
      selectPendingFile(file);
      enqueueSnackbar('Image pasted', { variant: 'success' });
    }
  };

  const readFirstClipboardImage = async (items) => {
    const files = await Promise.all(
      items.map(async (item) => {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (!imageType) {
          return null;
        }
        const blob = await item.getType(imageType);
        const ext = imageType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        return new File([blob], `pasted-image.${ext}`, { type: imageType });
      })
    );
    return files.find(Boolean) || null;
  };

  const handlePasteFromClipboard = async () => {
    screenshotPasteRef.current?.focus();
    try {
      if (!navigator.clipboard?.read) {
        enqueueSnackbar('Click the preview and press Ctrl+V to paste an image', { variant: 'info' });
        return;
      }
      const items = await navigator.clipboard.read();
      const file = await readFirstClipboardImage(items);
      if (!file) {
        enqueueSnackbar('No image found in clipboard', { variant: 'warning' });
        return;
      }
      selectPendingFile(file);
      enqueueSnackbar('Image pasted from clipboard', { variant: 'success' });
    } catch {
      enqueueSnackbar('Paste not allowed — click the preview and use Ctrl+V', { variant: 'warning' });
    }
  };

  const hasScreenshot = Boolean(pendingFile || existingImage);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 1 }}
      >
        <Chip size="small" label={`Status: ${form.status || DEFAULT_LINKEDIN_STATUS}`} color="primary" variant="outlined" />
        {form.need_action && form.need_action !== 'None' ? (
          <Chip size="small" label={form.need_action} color="warning" variant="filled" />
        ) : null}
        {form.provider ? (
          <Chip size="small" label={form.provider} variant="outlined" />
        ) : null}
        {createdAt ? (
          <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
            Created {formatDateTime(createdAt)}
          </Typography>
        ) : null}
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 600 }
        }}
      >
        <Tab label="Credentials" />
        <Tab label="Profile & proxy" />
        <Tab label="Sales & tracking" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <SectionCard title="Primary email" subtitle="Login credentials for the mailbox">
              <FieldCell>
                <CopyableTextField
                  label="Email"
                  fullWidth
                  size="small"
                  value={form.email}
                  onChange={setField('email')}
                  placeholder="example@domain.com"
                />
              </FieldCell>
              <FieldCell>
                <PasswordField
                  label="Email password"
                  value={form.email_password}
                  onChange={setField('email_password')}
                  copyValue={storedValues?.email_password}
                />
              </FieldCell>
              <FieldCell>
                <CopyableTextField
                  label="Recovery email"
                  fullWidth
                  size="small"
                  value={form.email_recovery_email}
                  onChange={setField('email_recovery_email')}
                  placeholder="recovery@domain.com"
                />
              </FieldCell>
              <FieldCell>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(form.email_secured)}
                      onChange={setBooleanField('email_secured')}
                    />
                  }
                  label="Email secured"
                />
              </FieldCell>
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <SectionCard title="Recovery mailbox" subtitle="Backup access and recovery codes">
              <FieldCell>
                <CopyableTextField
                  label="Recovery email"
                  fullWidth
                  size="small"
                  value={form.recovery_email}
                  onChange={setField('recovery_email')}
                  placeholder="backup@domain.com"
                />
              </FieldCell>
              <FieldCell>
                <PasswordField
                  label="Recovery email password"
                  value={form.recovery_email_password}
                  onChange={setField('recovery_email_password')}
                  copyValue={storedValues?.recovery_email_password}
                />
              </FieldCell>
              <FieldCell xs={12}>
                <CopyableTextField
                  label="Recovery code / backup"
                  fullWidth
                  size="small"
                  value={form.recovery_email_recovery}
                  onChange={setField('recovery_email_recovery')}
                  placeholder="Backup codes or secondary email"
                />
              </FieldCell>
            </SectionCard>
          </Grid>

          <Grid item xs={12}>
            <SectionCard title="LinkedIn account" subtitle="LinkedIn login, profile, and screenshot">
              <FieldCell xs={12} md={6}>
                <Stack spacing={2}>
                  <CopyableTextField
                    label="LinkedIn email"
                    fullWidth
                    size="small"
                    value={form.linkedin_email}
                    onChange={setField('linkedin_email')}
                    placeholder="linked@domain.com"
                  />
                  <PasswordField
                    label="LinkedIn password"
                    value={form.linkedin_password}
                    onChange={setField('linkedin_password')}
                    copyValue={storedValues?.linkedin_password}
                  />
                  <CopyableTextField
                    label="LinkedIn profile link"
                    fullWidth
                    size="small"
                    value={form.linkedin_link}
                    onChange={setField('linkedin_link')}
                    placeholder="https://www.linkedin.com/in/username"
                  />
                  <TextField
                    label="Second email"
                    fullWidth
                    size="small"
                    value={form.second_email}
                    onChange={setField('second_email')}
                    placeholder="alt@domain.com"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(form.linkedin_secured)}
                        onChange={setBooleanField('linkedin_secured')}
                      />
                    }
                    label="LinkedIn secured"
                  />
                  <DateField
                    label="LinkedIn created at"
                    value={form.linkedin_created_at}
                    onChange={setDateField('linkedin_created_at')}
                    fullWidth
                  />
                </Stack>
              </FieldCell>
              <FieldCell
                xs={12}
                md={6}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LinkedInScreenshotField
                  screenshotPasteRef={screenshotPasteRef}
                  pendingPreviewUrl={pendingPreviewUrl}
                  existingImage={existingImage}
                  editingRecordId={editingRecordId}
                  imageInputRef={imageInputRef}
                  onPendingFileChange={onPendingFileChange}
                  onPaste={handleScreenshotPaste}
                  onPasteFromClipboard={handlePasteFromClipboard}
                  onFileSelect={selectPendingFile}
                  hasScreenshot={hasScreenshot}
                  onClear={clearPendingFile}
                  onRemoveExistingImage={onRemoveExistingImage}
                  pendingFile={pendingFile}
                />
              </FieldCell>
            </SectionCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <SectionCard title="Browser profile" subtitle="Anti-detect browser assignment">
              <FieldCell>
                <TextField
                  label="Browser"
                  fullWidth
                  size="small"
                  value={form.browser}
                  onChange={setField('browser')}
                  placeholder="Chrome, AdsPower, etc."
                />
              </FieldCell>
              <FieldCell>
                <TextField
                  label="Profile no."
                  fullWidth
                  size="small"
                  type="number"
                  value={form.profile_no}
                  onChange={setField('profile_no')}
                  placeholder="0"
                />
              </FieldCell>
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={7}>
            <SectionCard title="Proxy" subtitle="Provider, order details, and expiry">
              <FieldCell xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Provider</InputLabel>
                  <Select
                    label="Provider"
                    value={form.provider || ''}
                    onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}
                  >
                    {LINKEDIN_PROVIDERS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FieldCell>
              <FieldCell>
                <TextField
                  label="Order ID"
                  fullWidth
                  size="small"
                  value={form.order_id}
                  onChange={setField('order_id')}
                  placeholder="#12345"
                />
              </FieldCell>
              <FieldCell>
                <DateField
                  label="Proxy expired by"
                  value={form.proxy_expired_by}
                  onChange={setDateField('proxy_expired_by')}
                  fullWidth
                />
              </FieldCell>
              <FieldCell xs={12}>
                <CopyableTextField
                  label="Proxy info"
                  fullWidth
                  size="small"
                  multiline
                  minRows={4}
                  value={form.proxy_info}
                  onChange={setField('proxy_info')}
                  placeholder="IP:Port:User:Pass"
                />
              </FieldCell>
            </SectionCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <SectionCard title="Sales" subtitle="Purchase source and rental details">
              <FieldCell>
                <TextField
                  label="Purchased from"
                  fullWidth
                  size="small"
                  value={form.purchased_from}
                  onChange={setField('purchased_from')}
                  placeholder="Seller name"
                />
              </FieldCell>
              <FieldCell>
                <TextField
                  label="Renting to"
                  fullWidth
                  size="small"
                  value={form.renting_to}
                  onChange={setField('renting_to')}
                  placeholder="Client name"
                />
              </FieldCell>
              <FieldCell>
                <DateField
                  label="Renting by"
                  value={form.renting_by}
                  onChange={setDateField('renting_by')}
                  fullWidth
                />
              </FieldCell>
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SectionCard title="Status & actions" subtitle="Workflow state for this account">
              <FieldCell>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={form.status || DEFAULT_LINKEDIN_STATUS}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    {LINKEDIN_STATUSES.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FieldCell>
              <FieldCell>
                <FormControl fullWidth size="small">
                  <InputLabel>Need action</InputLabel>
                  <Select
                    label="Need action"
                    value={form.need_action || DEFAULT_LINKEDIN_NEED_ACTION}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, need_action: event.target.value }))
                    }
                  >
                    {LINKEDIN_NEED_ACTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FieldCell>
            </SectionCard>
          </Grid>

          <Grid item xs={12}>
            <SectionCard title="Activity log" subtitle="Notes and history for this account">
              <FieldCell xs={12}>
                <TextField
                  label="Logs"
                  fullWidth
                  size="small"
                  multiline
                  minRows={8}
                  value={form.logs}
                  onChange={setField('logs')}
                  placeholder="Activity logs, verification notes, handoff details…"
                />
              </FieldCell>
            </SectionCard>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}

LinkedInFormFields.propTypes = {
  form: PropTypes.object.isRequired,
  setForm: PropTypes.func.isRequired,
  createdAt: PropTypes.string,
  editingRecordId: PropTypes.number,
  storedValues: PropTypes.object,
  pendingFile: PropTypes.object,
  onPendingFileChange: PropTypes.func.isRequired,
  onPendingFileSelect: PropTypes.func,
  existingImage: PropTypes.object,
  onRemoveExistingImage: PropTypes.func,
  imageInputRef: PropTypes.object.isRequired
};

export function createEmptyLinkedInForm() {
  return {
    title: '',
    country: DEFAULT_COUNTRY,
    email: '',
    email_password: '',
    email_recovery_email: '',
    email_secured: false,
    recovery_email: '',
    recovery_email_password: '',
    recovery_email_recovery: '',
    linkedin_email: '',
    linkedin_password: '',
    linkedin_link: '',
    linkedin_created_at: '',
    second_email: '',
    linkedin_secured: false,
    browser: '',
    profile_no: '',
    provider: LINKEDIN_PROVIDERS[0]?.value || '',
    order_id: '',
    proxy_info: '',
    proxy_expired_by: '',
    purchased_from: '',
    renting_to: '',
    renting_by: '',
    status: DEFAULT_LINKEDIN_STATUS,
    need_action: DEFAULT_LINKEDIN_NEED_ACTION,
    logs: ''
  };
}

export function linkedInRecordToForm(record) {
  if (!record) {
    return createEmptyLinkedInForm();
  }

  return {
    title: record.title ?? '',
    country: record.country ?? DEFAULT_COUNTRY,
    email: record.email ?? '',
    email_password: record.email_password ?? '',
    email_recovery_email: record.email_recovery_email ?? '',
    email_secured: Boolean(record.email_secured),
    recovery_email: record.recovery_email ?? '',
    recovery_email_password: record.recovery_email_password ?? '',
    recovery_email_recovery: record.recovery_email_recovery ?? '',
    linkedin_email: record.linkedin_email ?? '',
    linkedin_password: record.linkedin_password ?? '',
    linkedin_link: record.linkedin_link ?? '',
    linkedin_created_at: record.linkedin_created_at || '',
    second_email: record.second_email ?? '',
    linkedin_secured: Boolean(record.linkedin_secured),
    browser: record.browser || '',
    profile_no: record.profile_no ?? '',
    provider: record.provider || LINKEDIN_PROVIDERS[0]?.value || '',
    order_id: record.order_id || '',
    proxy_info: record.proxy_info || '',
    proxy_expired_by: record.proxy_expired_by || '',
    purchased_from: record.purchased_from || '',
    renting_to: record.renting_to || '',
    renting_by: record.renting_by || '',
    status: record.status || DEFAULT_LINKEDIN_STATUS,
    need_action: record.need_action || DEFAULT_LINKEDIN_NEED_ACTION,
    logs: record.logs || ''
  };
}

export function buildLinkedInPayload(form, { isEdit = false, storedValues = null } = {}) {
  const payload = {
    title: form.title.trim(),
    country: form.country.trim(),
    email: form.email.trim(),
    email_recovery_email: form.email_recovery_email.trim() || null,
    email_secured: Boolean(form.email_secured),
    recovery_email: form.recovery_email.trim() || null,
    recovery_email_recovery: form.recovery_email_recovery.trim() || null,
    linkedin_email: form.linkedin_email.trim() || null,
    linkedin_link: form.linkedin_link.trim() || null,
    linkedin_created_at: form.linkedin_created_at || null,
    second_email: form.second_email.trim() || null,
    linkedin_secured: Boolean(form.linkedin_secured),
    browser: form.browser.trim() || null,
    profile_no: form.profile_no === '' || form.profile_no == null ? null : Number(form.profile_no),
    provider: form.provider || null,
    order_id: form.order_id.trim() || null,
    proxy_info: form.proxy_info || '',
    proxy_expired_by: form.proxy_expired_by || null,
    purchased_from: form.purchased_from.trim() || null,
    renting_to: form.renting_to.trim() || null,
    renting_by: form.renting_by || null,
    status: form.status,
    need_action: form.need_action,
    logs: form.logs || ''
  };

  const passwordFields = ['email_password', 'linkedin_password', 'recovery_email_password'];
  passwordFields.forEach((field) => {
    const value = form[field]?.trim();
    if (value) {
      payload[field] = value;
    } else if (!isEdit) {
      payload[field] = '';
    } else if (storedValues?.[field]?.trim()) {
      payload[field] = storedValues[field].trim();
    }
  });

  return payload;
}

export default LinkedInFormFields;
