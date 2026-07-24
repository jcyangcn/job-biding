import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Chart from 'react-apexcharts';
import {
  alpha,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import CloseTwoToneIcon from '@mui/icons-material/CloseTwoTone';
import QueryStatsTwoToneIcon from '@mui/icons-material/QueryStatsTwoTone';
import TimerTwoToneIcon from '@mui/icons-material/TimerTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import ScreenshotMonitorTwoToneIcon from '@mui/icons-material/ScreenshotMonitorTwoTone';
import {
  fetchDesktopScreenshotBlob,
  fetchUserUsageAnalytics
} from 'src/services/desktopUsageApi';

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
}

function StatCard({ icon: Icon, label, value, color }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.14)} 0%, ${alpha(
          color,
          0.04
        )} 100%)`,
        border: `1px solid ${alpha(color, 0.18)}`
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(color, 0.16),
            color
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}

StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  color: PropTypes.string.isRequired
};

function ScreenshotThumb({ screenshot }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl = null;
    fetchDesktopScreenshotBlob(screenshot.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!revoked) setSrc(objectUrl);
      })
      .catch(() => {
        if (!revoked) setSrc(null);
      });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [screenshot.id]);

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: (theme) => `1px solid ${theme.colors.alpha.black[10]}`,
        bgcolor: 'background.paper'
      }}
    >
      <Box
        sx={{
          height: 110,
          bgcolor: 'grey.100',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden'
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt={screenshot.original_filename}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            No preview
          </Typography>
        )}
      </Box>
      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {screenshot.reason} · screen {screenshot.screen_index}
        </Typography>
        <Typography variant="caption" noWrap display="block">
          {formatDateTime(screenshot.captured_at || screenshot.uploaded_at)}
        </Typography>
      </Box>
    </Box>
  );
}

ScreenshotThumb.propTypes = {
  screenshot: PropTypes.object.isRequired
};

function UserUsageAnalyticsDialog({ open, user, onClose }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !user?.id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);
    fetchUserUsageAnalytics(user.id, { days: 14 })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load usage analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const chart = useMemo(() => {
    const daily = data?.daily || [];
    const categories = daily.map((item) => {
      const d = new Date(`${item.date}T00:00:00`);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    const activeHours = daily.map((item) =>
      Number(((item.active_ms || 0) / 3600000).toFixed(2))
    );
    const focusedHours = daily.map((item) =>
      Number(((item.focused_ms || 0) / 3600000).toFixed(2))
    );
    const sessionCounts = daily.map((item) => item.sessions || 0);

    const areaOptions = {
      chart: {
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: theme.typography.fontFamily
      },
      colors: [theme.colors.primary.main, theme.colors.success.main],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100]
        }
      },
      grid: {
        borderColor: theme.colors.alpha.black[10],
        strokeDashArray: 4
      },
      xaxis: {
        categories,
        labels: { style: { colors: theme.colors.alpha.black[50] } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: theme.colors.alpha.black[50] },
          formatter: (val) => `${val}h`
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right'
      },
      tooltip: {
        y: {
          formatter: (val) => `${val} hours`
        }
      }
    };

    const barOptions = {
      chart: {
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: theme.typography.fontFamily
      },
      colors: [theme.colors.info.main],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '48%'
        }
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: theme.colors.alpha.black[10],
        strokeDashArray: 4
      },
      xaxis: {
        categories,
        labels: { style: { colors: theme.colors.alpha.black[50] } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: theme.colors.alpha.black[50] },
          formatter: (val) => `${Math.round(val)}`
        }
      },
      tooltip: {
        y: { formatter: (val) => `${val} sessions` }
      }
    };

    return {
      areaOptions,
      barOptions,
      areaSeries: [
        { name: 'Active', data: activeHours },
        { name: 'Focused', data: focusedHours }
      ],
      barSeries: [{ name: 'Sessions', data: sessionCounts }]
    };
  }, [data, theme]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(theme.colors.primary.main, 0.12),
              color: theme.colors.primary.main
            }}
          >
            <QueryStatsTwoToneIcon />
          </Box>
          <Box>
            <Typography variant="h4">Usage analytics</Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {user?.full_name || 'User'} · @{user?.username}
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
          aria-label="Close"
        >
          <CloseTwoToneIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : !data ? null : (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={TimerTwoToneIcon}
                  label="Total active"
                  value={formatDuration(data.total_active_ms)}
                  color={theme.colors.primary.main}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={VisibilityTwoToneIcon}
                  label="Total focused"
                  value={formatDuration(data.total_focused_ms)}
                  color={theme.colors.success.main}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={QueryStatsTwoToneIcon}
                  label="Sessions"
                  value={data.session_count}
                  color={theme.colors.info.main}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={ScreenshotMonitorTwoToneIcon}
                  label="Screenshots"
                  value={data.screenshot_count}
                  color={theme.colors.warning.main}
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={`Role: ${data.role}`} />
              <Chip
                size="small"
                variant="outlined"
                label={`Last seen: ${formatDateTime(data.last_seen_at)}`}
              />
              <Chip size="small" variant="outlined" label="Last 14 days" />
            </Stack>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.colors.alpha.black[10]}`,
                bgcolor: alpha(theme.colors.primary.main, 0.02)
              }}
            >
              <Typography variant="h5" sx={{ mb: 1 }}>
                Active vs focused time
              </Typography>
              <Chart
                options={chart.areaOptions}
                series={chart.areaSeries}
                type="area"
                height={280}
              />
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.colors.alpha.black[10]}`
              }}
            >
              <Typography variant="h5" sx={{ mb: 1 }}>
                Sessions per day
              </Typography>
              <Chart
                options={chart.barOptions}
                series={chart.barSeries}
                type="bar"
                height={240}
              />
            </Box>

            <Box>
              <Typography variant="h5" sx={{ mb: 1.5 }}>
                Recent sessions
              </Typography>
              {data.recent_sessions?.length ? (
                <Stack spacing={1}>
                  {data.recent_sessions.map((session) => (
                    <Box
                      key={session.id}
                      sx={{
                        px: 1.5,
                        py: 1.25,
                        borderRadius: 1.5,
                        border: `1px solid ${theme.colors.alpha.black[10]}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 2,
                        flexWrap: 'wrap'
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2">
                          {formatDateTime(session.started_at)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.ended_at
                            ? `Ended ${formatDateTime(session.ended_at)}`
                            : 'In progress / open'}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="body2">
                          Active {formatDuration(session.active_ms)}
                        </Typography>
                        <Typography variant="body2">
                          Focused {formatDuration(session.focused_ms)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No sessions yet.</Typography>
              )}
            </Box>

            <Divider />

            <Box>
              <Typography variant="h5" sx={{ mb: 1.5 }}>
                Recent screenshots
              </Typography>
              {data.recent_screenshots?.length ? (
                <Grid container spacing={1.5}>
                  {data.recent_screenshots.map((shot) => (
                    <Grid item xs={6} sm={4} md={3} key={shot.id}>
                      <ScreenshotThumb screenshot={shot} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">No screenshots uploaded yet.</Typography>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

UserUsageAnalyticsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  user: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default UserUsageAnalyticsDialog;
