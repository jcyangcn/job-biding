import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  alpha,
  Avatar,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography,
  styled,
  useTheme
} from '@mui/material';
import AppsTwoToneIcon from '@mui/icons-material/AppsTwoTone';
import SearchTwoToneIcon from '@mui/icons-material/SearchTwoTone';
import Label from 'src/components/Label';
import Scrollbar from 'src/components/Scrollbar';
import { matchesSearch } from 'src/utils/tableListFilters';

const ALL_PROFILES = 'all';

const SidebarRoot = styled(Card)(
  ({ theme }) => `
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .MuiListItemButton-root {
      border-radius: ${theme.general.borderRadius};
      margin: ${theme.spacing(0.5, 1.5)};
      padding: ${theme.spacing(1, 1.25)};

      &.Mui-selected {
        background-color: ${alpha(theme.colors.primary.main, 0.08)};

        &:hover {
          background-color: ${alpha(theme.colors.primary.main, 0.12)};
        }
      }

      &:hover {
        background-color: ${alpha(theme.colors.alpha.black[100], 0.04)};
      }
    }
`
);

const TabsContainerWrapper = styled(Box)(
  ({ theme }) => `
    padding: 0 ${theme.spacing(2)};

    .MuiTabs-indicator {
      min-height: 3px;
      height: 3px;
    }

    .MuiTab-root {
      min-height: 36px;
      padding: 0;
      margin-right: ${theme.spacing(2)};
      font-size: ${theme.typography.pxToRem(13)};
      font-weight: 600;
      text-transform: none;
      color: ${theme.colors.alpha.black[50]};

      &.Mui-selected {
        color: ${theme.colors.primary.main};
      }
    }
`
);

const PROFILE_SEARCH_FIELDS = [
  'identity_name',
  'email',
  'roles',
  'bidder_name',
  'caller_name',
  'reference_tag'
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function ProfileSidebar({
  profiles,
  loading,
  selectedProfileId,
  onSelectProfile,
  itemCounts,
  height
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((profile) => {
        const matchesStatus =
          statusTab === 'all' ||
          (statusTab === 'active' && profile.is_active) ||
          (statusTab === 'inactive' && !profile.is_active);

        return matchesStatus && matchesSearch(profile, search, PROFILE_SEARCH_FIELDS);
      }),
    [profiles, search, statusTab]
  );

  const renderCount = (count) => (
    <Label color={count > 0 ? 'primary' : 'secondary'}>{count}</Label>
  );

  return (
    <SidebarRoot variant="outlined" sx={{ height }}>
      <CardContent
        sx={{
          p: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          '&:last-child': { pb: 0 }
        }}
      >
        <Box px={2} pt={2} pb={1.5} flexShrink={0}>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
            <Typography variant="h4">Profiles</Typography>
            <Label color="info">
              {filteredProfiles.length}/{profiles.length}
            </Label>
          </Box>
        </Box>

        <Box px={2} pb={1} flexShrink={0}>
          <TextField
            size="small"
            fullWidth
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, roles…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchTwoToneIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
        </Box>

        <TabsContainerWrapper>
          <Tabs
            value={statusTab}
            onChange={(_event, value) => setStatusTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="All" value="all" />
            <Tab label="Active" value="active" />
            <Tab label="Inactive" value="inactive" />
          </Tabs>
        </TabsContainerWrapper>

        <Divider sx={{ mx: 2, my: 1 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1} py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Scrollbar style={{ height: '100%' }}>
              <List disablePadding sx={{ pb: 1 }}>
                <ListItemButton
                  selected={selectedProfileId === ALL_PROFILES}
                  onClick={() => onSelectProfile(ALL_PROFILES)}
                >
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: alpha(theme.colors.primary.main, 0.12),
                        color: theme.colors.primary.main
                      }}
                    >
                      <AppsTwoToneIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="All profiles"
                    primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 600, noWrap: true }}
                  />
                  {renderCount(itemCounts.total || 0)}
                </ListItemButton>

                {filteredProfiles.length === 0 ? (
                  <Box px={2.5} py={3}>
                    <Typography variant="body2" color="text.secondary" align="center">
                      No profiles match your search.
                    </Typography>
                  </Box>
                ) : (
                  filteredProfiles.map((profile) => {
                    const appCount = itemCounts[profile.id] || 0;

                    return (
                      <ListItemButton
                        key={profile.id}
                        selected={selectedProfileId === profile.id}
                        onClick={() => onSelectProfile(profile.id)}
                      >
                        <ListItemAvatar sx={{ minWidth: 44 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: profile.is_active
                                ? theme.colors.primary.main
                                : theme.colors.alpha.black[30],
                              color: theme.palette.primary.contrastText,
                              fontSize: theme.typography.pxToRem(13),
                              fontWeight: 700
                            }}
                          >
                            {getInitials(profile.identity_name)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={profile.identity_name}
                          primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 600, noWrap: true }}
                        />
                        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5} ml={1}>
                          {renderCount(appCount)}
                          <Label color={profile.is_active ? 'success' : 'warning'}>
                            {profile.is_active ? 'Active' : 'Inactive'}
                          </Label>
                        </Box>
                      </ListItemButton>
                    );
                  })
                )}
              </List>
            </Scrollbar>
          </Box>
        )}
      </CardContent>
    </SidebarRoot>
  );
}

ProfileSidebar.propTypes = {
  profiles: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  selectedProfileId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onSelectProfile: PropTypes.func.isRequired,
  itemCounts: PropTypes.shape({
    total: PropTypes.number
  }).isRequired,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object])
};

export default ProfileSidebar;
export { ALL_PROFILES };
