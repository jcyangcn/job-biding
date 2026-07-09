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
  Typography
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
import { DetailDialog, DetailField, DetailTextSection } from 'src/components/DetailDialog';
import { CopyFieldAdornment } from 'src/components/CopyableTextField';
import LinkedInImageThumb from './LinkedInImageThumb';
import LinkedInStatusLabel from './LinkedInStatusLabel';
import { formatDate, formatDateTime } from 'src/utils/dateFormat';

function buildSectionCopyText(title, fields) {
  const body = fields
    .map(({ label, value }) => `${label}: ${String(value ?? '').trim()}`)
    .join('\r\n');

  return `${title}\r\n\r\n${body}`;
}

function sectionHasCopyValues(fields) {
  return fields.some(({ value }) => String(value ?? '').trim());
}

function DetailSection({ title, children, copyFields, bordered = false }) {
  const copyValue = copyFields ? buildSectionCopyText(title, copyFields) : '';
  const canCopy = copyFields ? sectionHasCopyValues(copyFields) : false;

  const header = (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ mb: bordered ? 2 : 1.5 }}
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
      <Grid container spacing={2}>
        {children}
      </Grid>
    </>
  );

  if (!bordered) {
    return <Box sx={{ mb: 2.5 }}>{content}</Box>;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2.5,
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
  bordered: PropTypes.bool
};

function displayValue(value) {
  const text = value?.trim?.() ?? (value == null ? '' : String(value));
  return text || '—';
}

function LinkedInDetailDialog({ open, account, onClose, onEdit, onDelete, disabled = false }) {
  if (!account) {
    return null;
  }

  const title = account.title || account.email || 'LinkedIn account details';
  const caption = [account.email, account.linkedin_email, account.provider].filter(Boolean).join(' · ');

  return (
    <DetailDialog open={open} title={title} caption={caption || undefined} onClose={onClose} maxWidth="md">
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <LinkedInStatusLabel status={account.status} />
        {account.need_action && account.need_action !== 'None' ? (
          <Chip size="small" label={account.need_action} color="warning" />
        ) : null}
        {account.email_secured ? (
          <Chip size="small" label="Email secured" color="success" variant="outlined" />
        ) : null}
        {account.linkedin_secured ? (
          <Chip size="small" label="LinkedIn secured" color="success" variant="outlined" />
        ) : null}
      </Stack>

      <DetailSection
        title="Email"
        bordered
        copyFields={[
          { label: 'Email', value: account.email },
          { label: 'Email password', value: account.email_password },
          { label: 'Recovery email', value: account.email_recovery_email }
        ]}
      >
        <DetailField label="Email" value={displayValue(account.email)} copyValue={account.email} icon={MailTwoToneIcon} />
        <DetailField
          label="Email password"
          value={displayValue(account.email_password)}
          copyValue={account.email_password}
          icon={VpnKeyTwoToneIcon}
        />
        <DetailField
          label="Recovery email"
          value={displayValue(account.email_recovery_email)}
          copyValue={account.email_recovery_email}
          icon={MailTwoToneIcon}
        />
      </DetailSection>

      <DetailSection
        title="Recovery email"
        bordered
        copyFields={[
          { label: 'Recovery email', value: account.recovery_email },
          { label: 'Recovery email password', value: account.recovery_email_password },
          { label: 'Recovery code / backup', value: account.recovery_email_recovery }
        ]}
      >
        <DetailField
          label="Recovery email"
          value={displayValue(account.recovery_email)}
          copyValue={account.recovery_email}
          icon={MailTwoToneIcon}
        />
        <DetailField
          label="Recovery email password"
          value={displayValue(account.recovery_email_password)}
          copyValue={account.recovery_email_password}
          icon={VpnKeyTwoToneIcon}
        />
        <DetailField
          label="Recovery code / backup"
          value={displayValue(account.recovery_email_recovery)}
          copyValue={account.recovery_email_recovery}
          icon={SecurityTwoToneIcon}
          xs={12}
        />
      </DetailSection>

      <DetailSection
        title="LinkedIn account"
        bordered
        copyFields={[
          { label: 'LinkedIn email', value: account.linkedin_email },
          { label: 'LinkedIn password', value: account.linkedin_password },
          { label: 'LinkedIn link', value: account.linkedin_link },
          { label: 'Second email', value: account.second_email },
          {
            label: 'LinkedIn created at',
            value: account.linkedin_created_at ? formatDate(account.linkedin_created_at) : ''
          }
        ]}
      >
        <DetailField
          label="LinkedIn email"
          value={displayValue(account.linkedin_email)}
          copyValue={account.linkedin_email}
          icon={PersonTwoToneIcon}
        />
        <DetailField
          label="LinkedIn password"
          value={displayValue(account.linkedin_password)}
          copyValue={account.linkedin_password}
          icon={VpnKeyTwoToneIcon}
        />
        <DetailField
          label="LinkedIn link"
          icon={LinkTwoToneIcon}
          sm={6}
          copyValue={account.linkedin_link}
        >
          {account.linkedin_link ? (
            <Typography
              variant="body1"
              sx={{
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}
            >
              <Link
                href={account.linkedin_link}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
              >
                {account.linkedin_link}
              </Link>
            </Typography>
          ) : (
            <Typography variant="body1">—</Typography>
          )}
        </DetailField>
        <DetailField
          label="Second email"
          value={displayValue(account.second_email)}
          copyValue={account.second_email}
          icon={MailTwoToneIcon}
          sm={6}
        />
        <DetailField
          label="LinkedIn created at"
          value={account.linkedin_created_at ? formatDate(account.linkedin_created_at) : '—'}
          icon={WorkTwoToneIcon}
        />
      </DetailSection>

      <Divider sx={{ my: 2 }} />

      <DetailSection title="Infrastructure">
        <DetailField label="Browser" value={account.browser?.trim() || '—'} icon={WorkTwoToneIcon} sm={4} />
        <DetailField
          label="Profile no."
          value={account.profile_no != null ? String(account.profile_no) : '—'}
          icon={PersonTwoToneIcon}
          sm={4}
        />
        <DetailField label="Provider" value={account.provider || '—'} icon={StorageTwoToneIcon} sm={4} />
        <DetailField label="Order ID" value={account.order_id || '—'} icon={StorageTwoToneIcon} />
        <DetailField
          label="Proxy expired by"
          value={account.proxy_expired_by ? formatDate(account.proxy_expired_by) : '—'}
          icon={StorageTwoToneIcon}
        />
      </DetailSection>

      {account.proxy_info ? (
        <DetailTextSection title="Proxy info" text={account.proxy_info} copyValue={account.proxy_info} />
      ) : null}

      <Divider sx={{ my: 2 }} />

      <DetailSection title="Sales & timeline">
        <DetailField label="Purchased from" value={account.purchased_from || '—'} icon={WorkTwoToneIcon} sm={4} />
        <DetailField label="Renting to" value={account.renting_to || '—'} icon={WorkTwoToneIcon} sm={4} />
        <DetailField
          label="Renting by"
          value={account.renting_by ? formatDate(account.renting_by) : '—'}
          icon={WorkTwoToneIcon}
          sm={4}
        />
        <DetailField
          label="Created at"
          value={account.created_at ? formatDateTime(account.created_at) : '—'}
          icon={SecurityTwoToneIcon}
        />
        <DetailField
          label="Updated at"
          value={account.updated_at ? formatDateTime(account.updated_at) : '—'}
          icon={SecurityTwoToneIcon}
        />
      </DetailSection>

      {account.image ? (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Screenshot
            </Typography>
            <LinkedInImageThumb accountId={account.id} image={account.image} size={160} />
          </Box>
        </>
      ) : null}

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
