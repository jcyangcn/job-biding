import { useContext } from 'react';

import {
  Box,
  alpha,
  lighten,
  IconButton,
  Tooltip,
  Typography,
  styled,
  useTheme
} from '@mui/material';
import MenuTwoToneIcon from '@mui/icons-material/MenuTwoTone';
import { SidebarContext } from 'src/contexts/SidebarContext';
import { usePageHeader } from 'src/contexts/PageHeaderContext';
import CloseTwoToneIcon from '@mui/icons-material/CloseTwoTone';

import HeaderUserbox from './Userbox';

const HeaderWrapper = styled(Box)(
  ({ theme }) => `
        min-height: ${theme.header.height};
        color: ${theme.header.textColor};
        padding: ${theme.spacing(1, 2)};
        right: 0;
        z-index: 6;
        background-color: ${alpha(theme.header.background, 0.95)};
        backdrop-filter: blur(3px);
        position: fixed;
        justify-content: space-between;
        width: 100%;
        @media (min-width: ${theme.breakpoints.values.lg}px) {
            left: ${theme.sidebar.width};
            width: auto;
        }
`
);

function Header() {
  const { sidebarToggle, toggleSidebar } = useContext(SidebarContext);
  const { pageHeader } = usePageHeader();
  const theme = useTheme();

  return (
    <HeaderWrapper
      display="flex"
      alignItems="center"
      sx={{
        boxShadow:
          theme.palette.mode === 'dark'
            ? `0 1px 0 ${alpha(
              lighten(theme.colors.primary.main, 0.7),
              0.15
            )}, 0px 2px 8px -3px rgba(0, 0, 0, 0.2), 0px 5px 22px -4px rgba(0, 0, 0, .1)`
            : `0px 2px 8px -3px ${alpha(
              theme.colors.alpha.black[100],
              0.2
            )}, 0px 5px 22px -4px ${alpha(
              theme.colors.alpha.black[100],
              0.1
            )}`
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        sx={{ flex: 1, minWidth: 0, pr: 2 }}
      >
        {pageHeader.leading}
        {pageHeader.title ? (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h1"
              variant="h4"
              noWrap
              sx={{ lineHeight: 1.2, fontWeight: 700 }}
            >
              {pageHeader.title}
            </Typography>
            {pageHeader.description ? (
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                sx={{ lineHeight: 1.3 }}
              >
                {pageHeader.description}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>
      <Box display="flex" alignItems="center" flexShrink={0}>
        <HeaderUserbox />
        <Box
          component="span"
          sx={{
            ml: 1,
            display: { lg: 'none', xs: 'inline-block' }
          }}
        >
          <Tooltip arrow title="Toggle Menu">
            <IconButton color="primary" onClick={toggleSidebar}>
              {!sidebarToggle ? (
                <MenuTwoToneIcon fontSize="small" />
              ) : (
                <CloseTwoToneIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </HeaderWrapper>
  );
}

export default Header;
