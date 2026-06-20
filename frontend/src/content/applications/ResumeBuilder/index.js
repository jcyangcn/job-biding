import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import PageTitleWrapper from 'src/components/PageTitleWrapper';
import Footer from 'src/components/Footer';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import PersonTwoToneIcon from '@mui/icons-material/PersonTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import {
  buildResumeRequest,
  generateResumePdf,
  loadDefaultJd,
  loadDefaultProfileJson,
  loadDefaultProfileMarkdown
} from 'src/services/resumeApi';
import { PROJECT_NAME } from 'src/config/app';

function ResumeBuilder() {
  const { enqueueSnackbar } = useSnackbar();
  const [jobDescription, setJobDescription] = useState('');
  const [profileMode, setProfileMode] = useState('markdown');
  const [profileMarkdown, setProfileMarkdown] = useState('');
  const [profileJson, setProfileJson] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadDefaultProfileMarkdown()
      .then(setProfileMarkdown)
      .catch(() => {});
  }, []);

  const notify = (message, variant = 'default') => {
    enqueueSnackbar(message, { variant });
  };

  const handleLoadJd = async () => {
    try {
      setJobDescription(await loadDefaultJd());
      notify('Loaded JD.md', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleLoadProfileMarkdown = async () => {
    try {
      setProfileMarkdown(await loadDefaultProfileMarkdown());
      setProfileMode('markdown');
      notify('Loaded default profile markdown', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleLoadProfileJson = async () => {
    try {
      const profile = await loadDefaultProfileJson();
      setProfileJson(JSON.stringify(profile, null, 2));
      setProfileMode('json');
      notify('Loaded default profile as JSON', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    notify('Generating resume… this usually takes 1–3 minutes.', 'info');

    try {
      const body = buildResumeRequest({
        jobDescription,
        profileMode,
        profileMarkdown,
        profileJson
      });
      const filename = await generateResumePdf(body);
      notify(`Done — downloaded ${filename}`, 'success');
    } catch (err) {
      notify(err.message || 'Something went wrong.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Resume Builder - {PROJECT_NAME}</title>
      </Helmet>
      <PageTitleWrapper>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography component="h1" variant="h3" gutterBottom>
              Resume Builder
            </Typography>
            <Typography variant="subtitle2">
              Paste a job description, choose a profile, and generate a tailored PDF resume.
            </Typography>
          </Grid>
        </Grid>
      </PageTitleWrapper>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <DescriptionTwoToneIcon color="primary" />
                  <Typography variant="h4">Job description</Typography>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  minRows={12}
                  placeholder="Paste the full job posting here…"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                <Box mt={2}>
                  <Button variant="outlined" onClick={handleLoadJd}>
                    Load JD.md from repo
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <PersonTwoToneIcon color="primary" />
                  <Typography variant="h4">Profile source</Typography>
                </Box>
                <Tabs
                  value={profileMode}
                  onChange={(_e, value) => setProfileMode(value)}
                  sx={{ mb: 2 }}
                >
                  <Tab label="Custom markdown" value="markdown" />
                  <Tab label="Custom JSON" value="json" />
                </Tabs>

                {profileMode === 'markdown' ? (
                  <>
                    <TextField
                      fullWidth
                      multiline
                      minRows={14}
                      placeholder="Same format as profiles.md…"
                      value={profileMarkdown}
                      onChange={(e) => setProfileMarkdown(e.target.value)}
                    />
                    <Box mt={2}>
                      <Button variant="outlined" onClick={handleLoadProfileMarkdown}>
                        Load default template
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      multiline
                      minRows={14}
                      placeholder='{ "name": "…", "experience": […] }'
                      value={profileJson}
                      onChange={(e) => setProfileJson(e.target.value)}
                      inputProps={{ style: { fontFamily: 'monospace' } }}
                    />
                    <Box mt={2}>
                      <Button variant="outlined" onClick={handleLoadProfileJson}>
                        Load default as JSON
                      </Button>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PictureAsPdfTwoToneIcon />}
                  disabled={generating}
                  onClick={handleGenerate}
                >
                  {generating ? 'Generating…' : 'Generate PDF resume'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Footer />
      </Container>
    </>
  );
}

export default ResumeBuilder;
