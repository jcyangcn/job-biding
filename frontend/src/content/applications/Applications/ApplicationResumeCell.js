import PropTypes from 'prop-types';
import {
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import { getResumeDownloadUrl, getResumeInlineUrl } from 'src/services/resumeApi';

function ApplicationResumeCell({ row }) {
  const filename = row.resume_pdf_filename;
  const hasGeneratedPdf = Boolean(row.resume_generated_id && filename);

  if (hasGeneratedPdf) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.25}
        minWidth={0}
        onClick={(event) => event.stopPropagation()}
      >
        <Tooltip title="Open PDF in new tab">
          <Link
            href={getResumeInlineUrl(filename)}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              wordBreak: 'break-all',
              fontWeight: 500,
              minWidth: 0,
              textAlign: 'left'
            }}
          >
            {filename}
          </Link>
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
            sx={{ flexShrink: 0 }}
          >
            <FileDownloadTwoToneIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    );
  }

  if (row.resume_online_link) {
    return (
      <Tooltip title={row.resume_online_link}>
        <Link
          href={row.resume_online_link}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          onClick={(event) => event.stopPropagation()}
          sx={{ wordBreak: 'break-all' }}
        >
          Online link
        </Link>
      </Tooltip>
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
