import PropTypes from 'prop-types';
import { Box, Grid, Stack, Typography } from '@mui/material';
import BadgeTwoToneIcon from '@mui/icons-material/BadgeTwoTone';
import FlagTwoToneIcon from '@mui/icons-material/FlagTwoTone';
import ImageTwoToneIcon from '@mui/icons-material/ImageTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PublicTwoToneIcon from '@mui/icons-material/PublicTwoTone';
import CountryLabel from 'src/components/CountryLabel';
import CopyableLink from 'src/components/CopyableLink';
import {
  DetailDialog,
  DetailField,
  DetailTextSection,
  formatDetailDate
} from 'src/components/DetailDialog';
import { formatDateTime } from 'src/utils/dateFormat';
import CitizenImageTile from './CitizenImageTile';
import CitizenStatusLabel from './CitizenStatusLabel';

function CitizenDetailDialog({ open, citizen, onClose, onPreviewImage, onDownloadImage }) {
  if (!citizen) {
    return null;
  }

  const title = citizen.name || 'Citizen details';
  const caption = (
    <Stack direction="row" alignItems="center" gap={0.75} component="span">
      <Typography variant="caption" color="text.secondary" component="span">
        #{citizen.id} ·
      </Typography>
      <CountryLabel country={citizen.country} flagHeight={12} variant="caption" />
    </Stack>
  );
  const images = citizen.images || [];

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption}>
      <Grid container spacing={2}>
        <DetailField label="Country" icon={PublicTwoToneIcon}>
          <CountryLabel country={citizen.country} variant="body1" />
        </DetailField>
        <DetailField label="Name" value={citizen.name} icon={BadgeTwoToneIcon} />
        <DetailField label="Status" icon={FlagTwoToneIcon}>
          <CitizenStatusLabel status={citizen.status} />
        </DetailField>
        <DetailField label="LinkedIn" icon={LinkTwoToneIcon} xs={12}>
          <CopyableLink url={citizen.linkedin} label="LinkedIn" maxWidth="100%" multiline />
        </DetailField>
        <DetailField label="Created" value={formatDetailDate(citizen.created_at) || '—'} />
        <DetailField label="Updated" value={formatDetailDate(citizen.updated_at) || '—'} />
      </Grid>

      <DetailTextSection
        title="Details"
        icon={BadgeTwoToneIcon}
        text={citizen.details}
        emptyText="No details provided."
      />

      <Box mt={2}>
        <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
          <ImageTwoToneIcon color="primary" />
          <Typography variant="h5">Images</Typography>
        </Stack>
        {images.length ? (
          <Grid container spacing={1.5}>
            {images.map((image) => (
              <Grid item xs={6} sm={4} md={3} key={image.filename}>
                <Box textAlign="center">
                  <CitizenImageTile
                    citizenId={citizen.id}
                    image={image}
                    size={120}
                    onPreview={onPreviewImage}
                    onDownload={() => onDownloadImage(citizen.id, image)}
                  />
                  <Typography variant="caption" display="block" noWrap title={image.original_name} mt={0.75}>
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
            No images uploaded.
          </Typography>
        )}
      </Box>
    </DetailDialog>
  );
}

CitizenDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  citizen: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onPreviewImage: PropTypes.func.isRequired,
  onDownloadImage: PropTypes.func.isRequired
};

export default CitizenDetailDialog;
