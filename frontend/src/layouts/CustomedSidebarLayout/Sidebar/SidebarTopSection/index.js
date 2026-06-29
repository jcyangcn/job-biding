import useAuth from 'src/hooks/useAuth';

import { Avatar, Box, Typography, useTheme } from '@mui/material';

function SidebarTopSection() {
  const theme = useTheme();
  const { user } = useAuth();

  return (
    <Box
      sx={{
        textAlign: 'center',
        mx: 2,
        pt: 1
      }}
    >
      <Avatar
        sx={{
          width: 68,
          height: 68,
          mb: 2,
          mx: 'auto'
        }}
        alt={user.name}
        src={user.avatar}
      />

      <Typography
        variant="h4"
        sx={{
          color: `${theme.colors.alpha.trueWhite[100]}`
        }}
      >
        {user.name}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{
          color: `${theme.colors.alpha.trueWhite[70]}`
        }}
      >
        {user.jobtitle}
      </Typography>
    </Box>
  );
}

export default SidebarTopSection;
