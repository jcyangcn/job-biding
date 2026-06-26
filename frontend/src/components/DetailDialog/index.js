import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import {
  alpha,
  Box,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  styled,
  useTheme
} from '@mui/material';
import CloseTwoToneIcon from '@mui/icons-material/CloseTwoTone';
import { formatDateValue, formatDateTimeValue } from 'src/utils/dateFormat';

export const DetailItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  borderRadius: theme.general.borderRadius,
  border: `1px solid ${theme.colors.alpha.black[10]}`,
  background:
    theme.palette.mode === 'dark'
      ? alpha(theme.colors.alpha.white[100], 0.02)
      : alpha(theme.colors.alpha.black[100], 0.02)
}));

export function formatDetailDate(value) {
  return formatDateTimeValue(value);
}

export function formatDetailDateOnly(value) {
  return formatDateValue(value);
}

export function useDetailDialog() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const openDetail = useCallback((row) => {
    setSelected(row);
    setOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setOpen(false);
    setSelected(null);
  }, []);

  const stopPropagation = useCallback((event) => {
    event.stopPropagation();
  }, []);

  return { open, selected, openDetail, closeDetail, stopPropagation };
}

export function DetailDialog({
  open,
  onClose,
  title,
  caption,
  maxWidth = 'md',
  children
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      PaperProps={{
        sx: {
          borderRadius: theme.general.borderRadiusLg,
          overflow: 'hidden'
        }
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${theme.colors.alpha.black[10]}`
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Box minWidth={0}>
            <Typography variant="h4" noWrap>
              {title}
            </Typography>
            {caption ? (
              typeof caption === 'string' ? (
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {caption}
                </Typography>
              ) : (
                <Box>{caption}</Box>
              )
            ) : null}
          </Box>
          <IconButton onClick={onClose} aria-label="Close" size="small">
            <CloseTwoToneIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ px: 3, py: 3 }}>{children}</DialogContent>
    </Dialog>
  );
}

DetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  caption: PropTypes.node,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  children: PropTypes.node
};

export function DetailField({ label, value, icon: Icon, xs = 12, sm = 6, children }) {
  return (
    <Grid item xs={xs} sm={sm}>
      <DetailItem elevation={0}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {Icon ? <Icon color="primary" /> : null}
          <Box minWidth={0} flex={1}>
            <Typography variant="overline" color="text.secondary">
              {label}
            </Typography>
            {children || (
              <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                {value ?? '—'}
              </Typography>
            )}
          </Box>
        </Stack>
      </DetailItem>
    </Grid>
  );
}

DetailField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  icon: PropTypes.elementType,
  xs: PropTypes.number,
  sm: PropTypes.number,
  children: PropTypes.node
};

export function DetailTextSection({ title, icon: Icon, text, emptyText = 'No content provided.' }) {
  const theme = useTheme();
  const content = text?.trim();

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 2,
        borderRadius: theme.general.borderRadius,
        borderColor: theme.colors.alpha.black[10]
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          {Icon ? <Icon color="primary" /> : null}
          <Typography variant="h5">{title}</Typography>
        </Stack>
        <Box
          sx={{
            maxHeight: 280,
            overflow: 'auto',
            p: 2,
            borderRadius: theme.general.borderRadius,
            bgcolor: alpha(theme.colors.alpha.black[100], 0.03),
            border: `1px dashed ${theme.colors.alpha.black[10]}`
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.7,
              color: content ? 'text.primary' : 'text.secondary'
            }}
          >
            {content || emptyText}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

DetailTextSection.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  text: PropTypes.string,
  emptyText: PropTypes.string
};
