import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import CloseTwoToneIcon from '@mui/icons-material/CloseTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import ApplicationResumePdfDialog from '../Applications/ApplicationResumePdfDialog';
import { listJobApplications } from 'src/services/jobApplicationApi';
import { listAllResumeGenerations } from 'src/services/resumeApi';
import { formatDateTime } from 'src/utils/dateFormat';

function resumeFilename(path) {
  if (!path) return '';
  return String(path).replace(/\\/g, '/').split('/').pop() || '';
}

function ProfileResumeHistoryDialog({ open, profile, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generations, setGenerations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [viewingFilename, setViewingFilename] = useState('');

  useEffect(() => {
    if (!open || !profile?.id) {
      setGenerations([]);
      setApplications([]);
      setError('');
      setViewingFilename('');
      return undefined;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [generationRows, applicationRows] = await Promise.all([
          listAllResumeGenerations(),
          listJobApplications(profile.id)
        ]);
        if (cancelled) return;

        setGenerations(
          (generationRows || [])
            .filter((row) => Number(row.profile_id) === Number(profile.id))
            .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
        );
        setApplications(Array.isArray(applicationRows) ? applicationRows : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load profile resumes');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [open, profile]);

  const usageByGeneration = useMemo(() => {
    const usage = {};
    applications.forEach((application) => {
      if (application.resume_generated_id != null) {
        usage[application.resume_generated_id] =
          (usage[application.resume_generated_id] || 0) + 1;
      }
    });
    return usage;
  }, [applications]);

  const usedApplicationCount = useMemo(
    () => applications.filter((application) => application.resume_generated_id != null).length,
    [applications]
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
        >
          <Box minWidth={0}>
            <Typography variant="h4" noWrap>
              Generated resumes · {profile?.identity_name || `Profile #${profile?.id}`}
            </Typography>
            <Box display="flex" gap={0.75} mt={0.75}>
              <Chip size="small" label={`${generations.length} resumes`} />
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${usedApplicationCount} applications using generated resumes`}
              />
            </Box>
          </Box>
          <IconButton aria-label="Close" size="small" onClick={onClose}>
            <CloseTwoToneIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" sx={{ p: 3 }}>
              {error}
            </Typography>
          ) : generations.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              No generated resumes found for this profile.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>PDF</TableCell>
                    <TableCell>Origin Job</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Used in applications</TableCell>
                    <TableCell align="right">View</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generations.map((generation) => {
                    const filename = resumeFilename(generation.pdf_path);
                    return (
                      <TableRow key={generation.id} hover>
                        <TableCell>{generation.id}</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap title={filename}>
                            {filename || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {[generation.company, generation.role].filter(Boolean).join(' · ') || '—'}
                        </TableCell>
                        <TableCell>{formatDateTime(generation.created_at)}</TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            color={usageByGeneration[generation.id] ? 'primary' : 'default'}
                            label={usageByGeneration[generation.id] || 0}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={filename ? 'View PDF' : 'PDF unavailable'}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!filename}
                                onClick={() => setViewingFilename(filename)}
                              >
                                <VisibilityTwoToneIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <ApplicationResumePdfDialog
        open={Boolean(viewingFilename)}
        filename={viewingFilename}
        onClose={() => setViewingFilename('')}
      />
    </>
  );
}

ProfileResumeHistoryDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  profile: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default ProfileResumeHistoryDialog;
