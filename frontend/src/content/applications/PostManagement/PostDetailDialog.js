import PropTypes from 'prop-types';
import { Grid, Link } from '@mui/material';
import BusinessTwoToneIcon from '@mui/icons-material/BusinessTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import {
  DetailDialog,
  DetailField,
  DetailTextSection,
  formatDetailDate
} from 'src/components/DetailDialog';

function PostDetailDialog({ open, post, onClose }) {
  if (!post) {
    return null;
  }

  const title = [post.company, post.role].filter(Boolean).join(' · ') || 'Post details';
  const caption = `#${post.id}`;
  const hasUrl = Boolean(post.url?.trim());
  const vectorPreview = Array.isArray(post.job_vector)
    ? JSON.stringify(post.job_vector)
    : '[]';

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption} maxWidth="md">
      <Grid container spacing={2}>
        <DetailField
          label="Company"
          value={post.company || '—'}
          icon={BusinessTwoToneIcon}
        />
        <DetailField label="Role" value={post.role || '—'} icon={WorkTwoToneIcon} />
        <DetailField label="URL" icon={LinkTwoToneIcon}>
          {hasUrl ? (
            <Link
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ wordBreak: 'break-all' }}
            >
              {post.url}
            </Link>
          ) : (
            '—'
          )}
        </DetailField>
        <DetailField label="Created" value={formatDetailDate(post.created_at) || '—'} />
      </Grid>

      <DetailTextSection
        title="Job description"
        text={post.job_description}
        emptyText="No job description."
      />
      <DetailTextSection title="Job vector" text={vectorPreview} emptyText="[]" />
    </DetailDialog>
  );
}

PostDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  post: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default PostDetailDialog;
