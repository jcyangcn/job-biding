import { useState } from 'react';
import PropTypes from 'prop-types';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import GridViewTwoToneIcon from '@mui/icons-material/GridViewTwoTone';
import TableRowsTwoToneIcon from '@mui/icons-material/TableRowsTwoTone';

export const LINKEDIN_VIEW_MODES = {
  table: {
    value: 'table',
    label: 'Table view',
    Icon: TableRowsTwoToneIcon
  },
  tile: {
    value: 'tile',
    label: 'Grid View',
    Icon: GridViewTwoToneIcon
  }
};

function LinkedInViewModeMenu({ value, onChange, disabled }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const current = LINKEDIN_VIEW_MODES[value] || LINKEDIN_VIEW_MODES.table;
  const CurrentIcon = current.Icon;

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="View method">
        <IconButton
          size="small"
          color="primary"
          disabled={disabled}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            width: 40,
            height: 40
          }}
        >
          <CurrentIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {Object.values(LINKEDIN_VIEW_MODES).map((option) => {
          const OptionIcon = option.Icon;
          return (
            <MenuItem
              key={option.value}
              selected={value === option.value}
              onClick={() => {
                onChange(option.value);
                handleClose();
              }}
            >
              <ListItemIcon>
                <OptionIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

LinkedInViewModeMenu.propTypes = {
  value: PropTypes.oneOf(['table', 'tile']).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default LinkedInViewModeMenu;
