import PropTypes from 'prop-types';
import { Alert, Box, Link, Stack, Typography } from '@mui/material';
import externalUrl from 'src/utils/externalUrl';

/**
 * Shows existing applications that share the same company as the one being
 * entered. A matching company is only a warning (still saveable); an exact
 * match (company + role + link) is an error that blocks saving.
 */
function DuplicateApplicationWarning({ matches, exact }) {
  if (!matches?.length) {
    return null;
  }

  return (
    <Alert severity={exact ? 'error' : 'warning'} sx={{ py: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {exact
          ? 'An identical application already exists (same company, role, and link). Change the role or link to save.'
          : `Already applied to this company (${matches.length}). You can still save.`}
      </Typography>
      <Stack spacing={0.5}>
        {matches.map((app) => (
          <Box key={app.id} sx={{ fontSize: 13, lineHeight: 1.4 }}>
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {app.company || '—'}
            </Typography>
            {' · '}
            <Typography component="span">{app.role || 'No role'}</Typography>
            {app.link ? (
              <>
                {' · '}
                <Link
                  href={externalUrl(app.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ wordBreak: 'break-all' }}
                >
                  {app.link}
                </Link>
              </>
            ) : null}
          </Box>
        ))}
      </Stack>
    </Alert>
  );
}

DuplicateApplicationWarning.propTypes = {
  matches: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      company: PropTypes.string,
      role: PropTypes.string,
      link: PropTypes.string
    })
  ),
  exact: PropTypes.bool
};

export default DuplicateApplicationWarning;
