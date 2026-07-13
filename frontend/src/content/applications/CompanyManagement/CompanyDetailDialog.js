import PropTypes from 'prop-types';
import { Grid, Link } from '@mui/material';
import BusinessTwoToneIcon from '@mui/icons-material/BusinessTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import {
  DetailDialog,
  DetailField,
  DetailTextSection,
  formatDetailDate
} from 'src/components/DetailDialog';

function CompanyDetailDialog({ open, company, onClose }) {
  if (!company) {
    return null;
  }

  const title = company.company || 'Company details';
  const caption = `#${company.id}`;
  const hasUrl = Boolean(company.url?.trim());
  const vectorPreview = Array.isArray(company.job_vector)
    ? JSON.stringify(company.job_vector)
    : '[]';

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption} maxWidth="md">
      <Grid container spacing={2}>
        <DetailField
          label="Company"
          value={company.company || '—'}
          icon={BusinessTwoToneIcon}
        />
        <DetailField label="URL" icon={LinkTwoToneIcon}>
          {hasUrl ? (
            <Link
              href={company.url}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ wordBreak: 'break-all' }}
            >
              {company.url}
            </Link>
          ) : (
            '—'
          )}
        </DetailField>
        <DetailField label="Created" value={formatDetailDate(company.created_at) || '—'} />
      </Grid>

      <DetailTextSection
        title="Job description"
        text={company.job_description}
        emptyText="No job description."
      />
      <DetailTextSection
        title="Job vector"
        text={vectorPreview}
        emptyText="[]"
      />
    </DetailDialog>
  );
}

CompanyDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  company: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default CompanyDetailDialog;
