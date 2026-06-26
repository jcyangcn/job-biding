import PropTypes from 'prop-types';
import CopyableLink from 'src/components/CopyableLink';

function CitizenLinkedInCell({ url, maxWidth = 160 }) {
  return <CopyableLink url={url} label="LinkedIn" maxWidth={maxWidth} emptyText="—" />;
}

CitizenLinkedInCell.propTypes = {
  url: PropTypes.string,
  maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

export default CitizenLinkedInCell;
