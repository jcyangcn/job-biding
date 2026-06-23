import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import CloseTwoToneIcon from '@mui/icons-material/CloseTwoTone';
import { getAnswerFieldLabel } from 'src/data/profileAnswerFields';

function IdentityQADialog({ open, identity, onClose }) {
  if (!identity) {
    return null;
  }

  const rows = Object.entries(identity.answers || {})
    .map(([key, value]) => ({
      question: getAnswerFieldLabel(key),
      answer: value?.trim() || ''
    }))
    .filter((row) => row.answer);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        Q&amp;A · {identity.name}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseTwoToneIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No answers provided for this identity.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="45%">Question</TableCell>
                  <TableCell>Answer</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.question}>
                    <TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>
                      {row.question}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{row.answer}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}

IdentityQADialog.propTypes = {
  open: PropTypes.bool.isRequired,
  identity: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default IdentityQADialog;
