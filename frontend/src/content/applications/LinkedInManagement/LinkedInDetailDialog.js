import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme
} from '@mui/material';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import MailTwoToneIcon from '@mui/icons-material/MailTwoTone';
import PersonTwoToneIcon from '@mui/icons-material/PersonTwoTone';
import SecurityTwoToneIcon from '@mui/icons-material/SecurityTwoTone';
import StorageTwoToneIcon from '@mui/icons-material/StorageTwoTone';
import VpnKeyTwoToneIcon from '@mui/icons-material/VpnKeyTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import { DetailDialog, DetailTextSection } from 'src/components/DetailDialog';
import { CopyFieldAdornment } from 'src/components/CopyableTextField';
import LinkedInImageThumb from './LinkedInImageThumb';
import LinkedInStatusLabel from './LinkedInStatusLabel';
import LinkedInNeedActionLabel from './LinkedInNeedActionLabel';
import { formatDate, formatDateTime } from 'src/utils/dateFormat';

function buildSectionCopyText(title, fields) {
  const body = fields
    .map(({ label, value }) => `${label}: ${String(value ?? '').trim()}`)
    .join('\r\n');

  return `${title}\r\n-----\r\n${body}`;
}

function sectionHasCopyValues(fields) {
  return fields.some(({ value }) => String(value ?? '').trim());
}

function DetailSection({ title, children, copyFields, bordered = false, dense = false, gutter = true }) {
  const copyValue = copyFields ? buildSectionCopyText(title, copyFields) : '';
  const canCopy = copyFields ? sectionHasCopyValues(copyFields) : false;

  const header = (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ mb: dense ? 1 : bordered ? 2 : 1.5 }}
    >
      <Typography
        variant={bordered ? 'subtitle2' : 'overline'}
        fontWeight={bordered ? 700 : undefined}
        color={bordered ? 'text.primary' : 'text.secondary'}
        sx={{ flex: bordered ? 1 : undefined, display: 'block' }}
      >
        {title}
      </Typography>
      {canCopy ? <CopyFieldAdornment label={title} value={copyValue} /> : null}
    </Stack>
  );

  const content = (
    <>
      {header}
      {dense ? (
        <Stack divider={<Divider flexItem />}>{children}</Stack>
      ) : (
        <Grid container spacing={2}>
          {children}
        </Grid>
      )}
    </>
  );

  if (!bordered) {
    return <Box sx={{ mb: gutter ? 2.5 : 0 }}>{content}</Box>;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: gutter ? 2.5 : 0,
        height: '100%',
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}
    >
      {content}
    </Paper>
  );
}

DetailSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  copyFields: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ),
  bordered: PropTypes.bool,
  dense: PropTypes.bool,
  gutter: PropTypes.bool
};

function CompactField({ label, value, copyValue, icon: Icon, link = false }) {
  const text = displayValue(value);
  const canCopy = Boolean(String(copyValue ?? '').trim());
  const hasLink = link && Boolean(String(value ?? '').trim());

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ py: 0.65, minHeight: 34 }}
    >
      {Icon ? <Icon color="primary" sx={{ fontSize: 18, flexShrink: 0 }} /> : null}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ width: 132, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {hasLink ? (
          <Link
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            variant="body2"
            sx={{ wordBreak: 'break-all', fontWeight: 500 }}
          >
            {value}
          </Link>
        ) : (
          <Typography variant="body2" sx={{ wordBreak: 'break-word', fontWeight: 500 }}>
            {text}
          </Typography>
        )}
      </Box>
      {canCopy ? <CopyFieldAdornment label={label} value={copyValue} /> : null}
    </Stack>
  );
}

CompactField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  copyValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.elementType,
  link: PropTypes.bool
};

function displayValue(value) {
  const text = value?.trim?.() ?? (value == null ? '' : String(value));
  return text || '—';
}

function LinkedInDetailDialog({ open, account, onClose, onEdit, onDelete, disabled = false }) {
  const theme = useTheme();

  if (!account) {
    return null;
  }

  const title = account.title || account.email || 'LinkedIn account details';
  const caption = [account.email, account.linkedin_email, account.provider].filter(Boolean).join(' · ');

  return (
    <DetailDialog open={open} title={title} caption={caption || undefined} onClose={onClose} maxWidth="lg">
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <LinkedInStatusLabel status={account.status} />
        <LinkedInNeedActionLabel needAction={account.need_action} />
        {account.email_secured ? (
          <Chip size="small" label="Email secured" color="success" variant="outlined" />
        ) : null}
        {account.linkedin_secured ? (
          <Chip size="small" label="LinkedIn secured" color="success" variant="outlined" />
        ) : null}
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <DetailSection
            title="Email"
            bordered
            dense
            gutter={false}
            copyFields={[
              { label: 'Email', value: account.email },
              { label: 'Password', value: account.email_password },
              { label: 'Recovery', value: account.email_recovery_email }
            ]}
          >
            <CompactField label="Email" value={account.email} copyValue={account.email} icon={MailTwoToneIcon} />
            <CompactField
              label="Password"
              value={account.email_password}
              copyValue={account.email_password}
              icon={VpnKeyTwoToneIcon}
            />
            <CompactField
              label="Recovery"
              value={account.email_recovery_email}
              copyValue={account.email_recovery_email}
              icon={MailTwoToneIcon}
            />
          </DetailSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            variant="outlined"
            sx={{ p: 2, height: '100%', borderRadius: 2, bgcolor: 'background.paper' }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Screenshot
            </Typography>
            {account.image ? (
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  overflow: 'hidden',
                  bgcolor: alpha(theme.palette.primary.main, 0.04)
                }}
              >
                <LinkedInImageThumb accountId={account.id} image={account.image} fill fillMode="contain" />
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  borderRadius: 2,
                  border: `1px dashed ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.disabled'
                }}
              >
                <Typography variant="caption">No screenshot</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <DetailSection
            title="LinkedIn account"
            bordered
            dense
            gutter={false}
            copyFields={[
              { label: 'Email', value: account.linkedin_email },
              { label: 'Password', value: account.linkedin_password },
              { label: 'Link', value: account.linkedin_link }
            ]}
          >
            <CompactField
              label="Email"
              value={account.linkedin_email}
              copyValue={account.linkedin_email}
              icon={PersonTwoToneIcon}
            />
            <CompactField
              label="Password"
              value={account.linkedin_password}
              copyValue={account.linkedin_password}
              icon={VpnKeyTwoToneIcon}
            />
            <CompactField
              label="Link"
              value={account.linkedin_link}
              copyValue={account.linkedin_link}
              icon={LinkTwoToneIcon}
              link
            />
            <CompactField
              label="Second email"
              value={account.second_email}
              copyValue={account.second_email}
              icon={MailTwoToneIcon}
            />
            <CompactField
              label="Created at"
              value={account.linkedin_created_at ? formatDate(account.linkedin_created_at) : ''}
              icon={WorkTwoToneIcon}
            />
          </DetailSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <DetailSection
            title="Recovery email"
            bordered
            dense
            gutter={false}
            copyFields={[
              { label: 'Email', value: account.recovery_email },
              { label: 'Password', value: account.recovery_email_password },
              { label: 'Code / backup', value: account.recovery_email_recovery }
            ]}
          >
            <CompactField
              label="Email"
              value={account.recovery_email}
              copyValue={account.recovery_email}
              icon={MailTwoToneIcon}
            />
            <CompactField
              label="Password"
              value={account.recovery_email_password}
              copyValue={account.recovery_email_password}
              icon={VpnKeyTwoToneIcon}
            />
            <CompactField
              label="Code / backup"
              value={account.recovery_email_recovery}
              copyValue={account.recovery_email_recovery}
              icon={SecurityTwoToneIcon}
            />
          </DetailSection>
        </Grid>
      </Grid>

      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'background.paper' }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Proxy
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            IP:Port:User:Pass
          </Typography>
          {account.proxy_expired_by ? (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <StorageTwoToneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Expired by {formatDate(account.proxy_expired_by)}
              </Typography>
            </Stack>
          ) : null}
          {(() => {
            const proxyCopyFields = [
              {
                label: 'Expired by',
                value: account.proxy_expired_by ? formatDate(account.proxy_expired_by) : ''
              },
              { label: 'Info (IP:Port:User:Pass)', value: account.proxy_info }
            ];
            return sectionHasCopyValues(proxyCopyFields) ? (
              <CopyFieldAdornment
                label="Proxy"
                value={buildSectionCopyText('Proxy', proxyCopyFields)}
              />
            ) : null;
          })()}
        </Stack>
        <Box
          sx={{
            mt: 1,
            p: 1.5,
            borderRadius: 1,
            maxHeight: 200,
            overflow: 'auto',
            bgcolor: alpha(theme.palette.common.black, 0.03),
            border: `1px dashed ${theme.palette.divider}`
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.7,
              color: String(account.proxy_info ?? '').trim() ? 'text.primary' : 'text.secondary'
            }}
          >
            {String(account.proxy_info ?? '').trim() || 'No proxy info provided.'}
          </Typography>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <DetailSection title="Infrastructure" bordered dense gutter={false}>
            <CompactField label="Browser" value={account.browser} icon={WorkTwoToneIcon} />
            <CompactField
              label="Profile no."
              value={account.profile_no != null ? String(account.profile_no) : ''}
              icon={PersonTwoToneIcon}
            />
            <CompactField label="Provider" value={account.provider} icon={StorageTwoToneIcon} />
            <CompactField label="Order ID" value={account.order_id} icon={StorageTwoToneIcon} />
          </DetailSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <DetailSection title="Sales & timeline" bordered dense gutter={false}>
            <CompactField label="Purchased from" value={account.purchased_from} icon={WorkTwoToneIcon} />
            <CompactField label="Renting to" value={account.renting_to} icon={WorkTwoToneIcon} />
            <CompactField
              label="Renting by"
              value={account.renting_by ? formatDate(account.renting_by) : ''}
              icon={WorkTwoToneIcon}
            />
            <CompactField
              label="Created at"
              value={account.created_at ? formatDateTime(account.created_at) : ''}
              icon={SecurityTwoToneIcon}
            />
            <CompactField
              label="Updated at"
              value={account.updated_at ? formatDateTime(account.updated_at) : ''}
              icon={SecurityTwoToneIcon}
            />
          </DetailSection>
        </Grid>
      </Grid>

      {account.logs ? <DetailTextSection title="Logs" text={account.logs} /> : null}

      {onEdit || onDelete ? (
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          {onEdit ? (
            <Button
              variant="outlined"
              startIcon={<EditTwoToneIcon />}
              onClick={() => onEdit(account)}
              disabled={disabled}
            >
              Edit
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteTwoToneIcon />}
              onClick={() => onDelete(account)}
              disabled={disabled}
            >
              Delete
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </DetailDialog>
  );
}

LinkedInDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  account: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  disabled: PropTypes.bool
};

export default LinkedInDetailDialog;
