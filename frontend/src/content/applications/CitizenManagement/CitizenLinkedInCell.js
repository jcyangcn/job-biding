import PropTypes from 'prop-types';
import { Link, Typography } from '@mui/material';

function CitizenLinkedInCell({ url, maxWidth = 160 }) {
  const text = url?.trim();

  if (!text) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }

  return (
    <Link
      href={text}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      title={text}
      onClick={(event) => event.stopPropagation()}
      sx={{
        display: 'block',
        maxWidth,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}
    >
      {text}
    </Link>
  );
}

CitizenLinkedInCell.propTypes = {
  url: PropTypes.string,
  maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

export default CitizenLinkedInCell;
