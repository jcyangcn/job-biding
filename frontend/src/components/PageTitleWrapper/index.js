import PropTypes from 'prop-types';
import { Box, styled } from '@mui/material';

const PageTitle = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'compact'
})(
  ({ theme, compact }) => `
        padding: ${theme.spacing(compact ? 3 : 4)};
`
);

const PageTitleWrapper = ({ children, compact = false }) => {
  return (
    <>
      <PageTitle compact={compact} className="MuiPageTitle-wrapper">
        {children}
      </PageTitle>
    </>
  );
};

PageTitleWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  compact: PropTypes.bool
};

export default PageTitleWrapper;
