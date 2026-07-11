import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  CircularProgress,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import ErrorTwoToneIcon from '@mui/icons-material/ErrorTwoTone';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import Label from 'src/components/Label';
import ApplicationResumePdfDialog from './ApplicationResumePdfDialog';
import { getResumeDownloadUrl } from 'src/services/resumeApi';

function ApplicationResumeCell({ row }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const filename = row.resume_pdf_filename;
  const status = row.resume_generation_status;
  const hasGeneratedPdf = Boolean(row.resume_generated_id && filename);

  if (status === 'generating') {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        onClick={(event) => event.stopPropagation()}
      >
        <CircularProgress size={16} thickness={5} color="warning" />
        <Label color="warning">Generating…</Label>
      </Stack>
    );
  }

  if (status === 'failed') {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        onClick={(event) => event.stopPropagation()}
      >
        <ErrorTwoToneIcon color="error" sx={{ fontSize: 18 }} />
        <Label color="error">Failed</Label>
      </Stack>
    );
  }

  if (hasGeneratedPdf) {
    return (
      <>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          minWidth={0}
          onClick={(event) => event.stopPropagation()}
        >
          <Tooltip title="View resume PDF">
            <Typography
              component="button"
              type="button"
              variant="body2"
              onClick={(event) => {
                event.stopPropagation();
                setViewerOpen(true);
              }}
              sx={{
                all: 'unset',
                wordBreak: 'break-all',
                fontWeight: 500,
                minWidth: 0,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'primary.main',
                textDecoration: 'underline',
                textDecorationColor: 'transparent',
                '&:hover': {
                  textDecorationColor: 'currentColor'
                }
              }}
            >
              {filename}
            </Typography>
          </Tooltip>
          <Tooltip title="Download PDF">
            <IconButton
              component="a"
              href={getResumeDownloadUrl(filename)}
              download={filename}
              size="small"
              color="primary"
              aria-label={`Download ${filename}`}
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              sx={{ flexShrink: 0 }}
            >
              <FileDownloadTwoToneIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        <ApplicationResumePdfDialog
          open={viewerOpen}
          filename={filename}
          onClose={() => setViewerOpen(false)}
        />
      </>
    );
  }

  if (row.resume_online_link) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        minWidth={0}
        onClick={(event) => event.stopPropagation()}
      >
        <LinkTwoToneIcon color="info" sx={{ fontSize: 18, flexShrink: 0 }} />
        <Tooltip title={row.resume_online_link}>
          <Link
            href={row.resume_online_link}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ wordBreak: 'break-all' }}
          >
            Online link
          </Link>
        </Tooltip>
      </Stack>
    );
  }

  if (row.resume_generated_id) {
    return (
      <Typography variant="body2" color="text.secondary">
        Generated #{row.resume_generated_id}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );
}

ApplicationResumeCell.propTypes = {
  row: PropTypes.object.isRequired
};

export default ApplicationResumeCell;
