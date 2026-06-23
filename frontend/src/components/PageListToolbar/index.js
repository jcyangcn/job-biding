import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

function PageListToolbar({ title, description, leading }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width: '100%',
        minWidth: 0
      }}
    >
      {leading}
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h1"
          variant="h3"
          sx={{ lineHeight: 1.25, fontWeight: 700, mb: description ? 0.5 : 0 }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography variant="subtitle2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

PageListToolbar.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  leading: PropTypes.node
};

export default PageListToolbar;
