import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  alpha,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadTwoToneIcon from '@mui/icons-material/CloudUploadTwoTone';
import ContentPasteTwoToneIcon from '@mui/icons-material/ContentPasteTwoTone';
import {
  resolveAppliedFromEvidence
} from 'src/utils/applicationAppliedHelpers';
import {
  extractImageFileFromPasteEvent,
  pasteImageOnUserClick
} from 'src/utils/pasteImageFromClipboard';
import { fetchApplicationScreenshotBlob } from 'src/services/jobApplicationApi';

const EVIDENCE_HEIGHT = 120;

function ApplicationAppliedSection({
  applied,
  successLink,
  appliedAt,
  onChange,
  pendingScreenshotFile,
  onPendingScreenshotChange,
  existingScreenshot,
  removeExistingScreenshot,
  onRemoveExistingScreenshot,
  applicationId,
  disabled
}) {
  const theme = useTheme();
  const screenshotPasteRef = useRef(null);
  const imageInputRef = useRef(null);
  const pasteRequestRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);
  const [pasteAwaiting, setPasteAwaiting] = useState(false);
  const [existingPreviewUrl, setExistingPreviewUrl] = useState(null);

  const pendingPreviewUrl = useMemo(
    () => (pendingScreenshotFile ? URL.createObjectURL(pendingScreenshotFile) : null),
    [pendingScreenshotFile]
  );

  useEffect(
    () => () => {
      pasteRequestRef.current += 1;
    },
    []
  );

  useEffect(
    () => () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    },
    [pendingPreviewUrl]
  );

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    if (
      !pendingScreenshotFile &&
      existingScreenshot?.filename &&
      applicationId &&
      !removeExistingScreenshot
    ) {
      fetchApplicationScreenshotBlob(applicationId, existingScreenshot.filename)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setExistingPreviewUrl(objectUrl);
        })
        .catch(() => {
          if (!cancelled) {
            setExistingPreviewUrl(null);
          }
        });
    } else {
      setExistingPreviewUrl(null);
    }

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    applicationId,
    existingScreenshot,
    pendingScreenshotFile,
    removeExistingScreenshot
  ]);

  const previewUrl = pendingPreviewUrl || existingPreviewUrl;
  const accentColor = applied ? theme.palette.success.main : theme.palette.error.main;

  const applyEvidenceState = (nextSuccessLink, nextHasScreenshot) => {
    const evidence = resolveAppliedFromEvidence({
      successLink: nextSuccessLink,
      hasScreenshot: nextHasScreenshot,
      appliedAt
    });
    onChange({
      applied: evidence.applied,
      success_link: nextSuccessLink,
      applied_at: evidence.applied_at
    });
  };

  const selectScreenshotFile = (file) => {
    if (!file) {
      onPendingScreenshotChange?.(null);
      if (existingScreenshot && !removeExistingScreenshot) {
        onRemoveExistingScreenshot?.();
      }
      applyEvidenceState(successLink, false);
      return;
    }
    if (!file.type?.startsWith('image/')) {
      return;
    }
    onPendingScreenshotChange?.(file);
    applyEvidenceState(successLink, true);
  };

  const handleScreenshotPaste = (event) => {
    const file = extractImageFileFromPasteEvent(event);
    if (!file) return;
    event.preventDefault();
    pasteRequestRef.current += 1;
    setPasteAwaiting(false);
    selectScreenshotFile(file);
  };

  const handleScreenshotDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      selectScreenshotFile(file);
    }
  };

  const handlePasteFromClipboard = async () => {
    if (disabled) return;

    const requestId = pasteRequestRef.current + 1;
    pasteRequestRef.current = requestId;
    setPasteAwaiting(true);

    try {
      const file = await pasteImageOnUserClick({
        getPasteTarget: () => screenshotPasteRef.current,
        getPasteContainer: () => screenshotPasteRef.current?.closest?.('[role="dialog"]')
      });

      if (pasteRequestRef.current !== requestId) {
        return;
      }

      selectScreenshotFile(file);
    } catch {
      if (pasteRequestRef.current === requestId) {
        setPasteAwaiting(false);
      }
    } finally {
      if (pasteRequestRef.current === requestId) {
        setPasteAwaiting(false);
      }
    }
  };

  const handleSuccessLinkChange = (event) => {
    const value = event.target.value;
    const nextHasScreenshot = Boolean(
      pendingScreenshotFile || (existingScreenshot && !removeExistingScreenshot)
    );
    applyEvidenceState(value, nextHasScreenshot);
  };

  const handleClearScreenshot = (event) => {
    event.stopPropagation();
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    onPendingScreenshotChange?.(null);
    if (existingScreenshot && !removeExistingScreenshot) {
      onRemoveExistingScreenshot?.();
    }
    applyEvidenceState(successLink, false);
  };

  return (
    <Box
      sx={{
        flexShrink: 0,
        px: 1.75,
        py: 1.25,
        borderRadius: theme.general.borderRadius,
        bgcolor: alpha(accentColor, applied ? 0.14 : 0.1),
        border: `2px solid ${accentColor}`
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography
            variant="h6"
            fontWeight={800}
            color={applied ? 'success.main' : 'error.main'}
            lineHeight={1.2}
          >
            Applied
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={applied}
                color={applied ? 'success' : 'error'}
                disabled={disabled}
                disableRipple
                tabIndex={-1}
                inputProps={{
                  'aria-label': 'Applied status',
                  'aria-readonly': true,
                  readOnly: true
                }}
                sx={{
                  cursor: 'default',
                  pointerEvents: 'none'
                }}
              />
            }
            label=""
            sx={{ m: 0, cursor: 'default', pointerEvents: 'none' }}
          />
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          alignItems="stretch"
          sx={{ height: { xs: 'auto', sm: EVIDENCE_HEIGHT }, flexShrink: 0 }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              height: EVIDENCE_HEIGHT,
              flexShrink: 0
            }}
          >
            <Box
              ref={screenshotPasteRef}
              tabIndex={disabled ? -1 : 0}
              role="button"
              aria-label="Upload or paste application image"
              onPaste={handleScreenshotPaste}
              onDrop={handleScreenshotDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              sx={{
                position: 'relative',
                width: '100%',
                height: EVIDENCE_HEIGHT,
                maxHeight: EVIDENCE_HEIGHT,
                borderRadius: theme.general.borderRadiusSm || theme.general.borderRadius,
                border: '2px dashed',
                borderColor: pasteAwaiting || dragOver ? accentColor : alpha(accentColor, 0.45),
                bgcolor: pasteAwaiting || dragOver
                  ? alpha(accentColor, 0.1)
                  : alpha(theme.palette.background.paper, 0.65),
                overflow: 'hidden',
                outline: 'none',
                boxSizing: 'border-box',
                '&:focus-visible': {
                  borderColor: accentColor,
                  boxShadow: `0 0 0 2px ${alpha(accentColor, 0.2)}`
                }
              }}
            >
              {previewUrl ? (
                <>
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Applied evidence"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      p: 0.75,
                      boxSizing: 'border-box'
                    }}
                  />
                  {!disabled ? (
                    <IconButton
                      size="small"
                      aria-label="Remove image"
                      onClick={handleClearScreenshot}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: alpha(theme.palette.background.paper, 0.92)
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </>
              ) : (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    px: 1.5,
                    pb: 1.5,
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" align="center">
                      {pasteAwaiting ? 'Press Ctrl+V to paste image' : 'Drop image here'}
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    justifyContent="center"
                    useFlexGap
                    sx={{ flexShrink: 0, width: '100%' }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CloudUploadTwoToneIcon />}
                      disabled={disabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        imageInputRef.current?.click();
                      }}
                    >
                      Upload
                    </Button>
                    <Button
                      size="small"
                      variant={pasteAwaiting ? 'contained' : 'outlined'}
                      color={applied ? 'success' : 'error'}
                      startIcon={<ContentPasteTwoToneIcon />}
                      disabled={disabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePasteFromClipboard();
                      }}
                    >
                      Paste
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => selectScreenshotFile(event.target.files?.[0] || null)}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              height: EVIDENCE_HEIGHT,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <TextField
              fullWidth
              size="small"
              label="Success link"
              value={successLink}
              onChange={handleSuccessLinkChange}
              disabled={disabled}
              placeholder="https://..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: theme.palette.common.white
                }
              }}
            />
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}

ApplicationAppliedSection.propTypes = {
  applied: PropTypes.bool.isRequired,
  successLink: PropTypes.string.isRequired,
  appliedAt: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  pendingScreenshotFile: PropTypes.object,
  onPendingScreenshotChange: PropTypes.func,
  existingScreenshot: PropTypes.object,
  removeExistingScreenshot: PropTypes.bool,
  onRemoveExistingScreenshot: PropTypes.func,
  applicationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  disabled: PropTypes.bool
};

export default ApplicationAppliedSection;
