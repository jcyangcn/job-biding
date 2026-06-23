import { useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import ThemeSettings from 'src/components/ThemeSettings';
import { PageHeaderProvider } from 'src/contexts/PageHeaderContext';

import Sidebar from './Sidebar';
import Sidebar1 from '../CollapsedSidebarLayout/Sidebar';
import Header from './Header';

const CustomedSidebarLayout = () => {
  const theme = useTheme();
  const [isExtended, setIsExtended] = useState(true);

  return (
    <PageHeaderProvider>
      <Box
        sx={{
          flex: 1,
          height: '100%'
        }}
      >
        <Header />
        {isExtended ? <Sidebar isExtended={isExtended} setIsExtended={setIsExtended} />
          : <Sidebar1 isExtended={isExtended} setIsExtended={setIsExtended} />}
        <Box
          className="main-container"
          sx={{
            position: 'relative',
            zIndex: 5,
            display: 'block',
            flex: 1,
            pt: `${theme.header.height}`,
            mx: 0,
            '& .MuiContainer-root': {
              marginLeft: 0,
              marginRight: 0,
              maxWidth: '100%'
            },
            [theme.breakpoints.up('lg')]: {
              ml: `${isExtended ? theme.sidebar.width : 110}`
            }
          }}
        >
          <Box display="block">
            <Outlet />
          </Box>
          <ThemeSettings />
        </Box>
      </Box>
    </PageHeaderProvider>
  );
};

export default CustomedSidebarLayout;
