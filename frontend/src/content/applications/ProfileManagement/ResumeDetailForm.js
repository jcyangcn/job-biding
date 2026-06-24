import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import MonthYearField from 'src/components/MonthYearField';
import {
  emptyEducation,
  emptyProject,
  emptyWorkExperience,
  WORK_METHOD_OPTIONS
} from 'src/data/profileResumeDetail';

function SectionHeader({ title, onAdd, addLabel }) {
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" mt={2} mb={1}>
      <Typography variant="h5">{title}</Typography>
      {onAdd ? (
        <Button size="small" startIcon={<AddTwoToneIcon />} onClick={onAdd}>
          {addLabel}
        </Button>
      ) : null}
    </Box>
  );
}

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onAdd: PropTypes.func,
  addLabel: PropTypes.string
};

function ResumeDetailForm({ value, onChange, disabled = false }) {
  const updateWorkExperience = (index, field, fieldValue) => {
    onChange({
      ...value,
      work_experience: value.work_experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: fieldValue } : item
      )
    });
  };

  const addWorkExperience = () => {
    onChange({
      ...value,
      work_experience: [...value.work_experience, emptyWorkExperience()]
    });
  };

  const removeWorkExperience = (index) => {
    onChange({
      ...value,
      work_experience: value.work_experience.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const updateEducation = (index, field, fieldValue) => {
    onChange({
      ...value,
      education: value.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: fieldValue } : item
      )
    });
  };

  const addEducation = () => {
    onChange({
      ...value,
      education: [...value.education, emptyEducation()]
    });
  };

  const removeEducation = (index) => {
    onChange({
      ...value,
      education: value.education.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const updateCertification = (index, fieldValue) => {
    onChange({
      ...value,
      certifications: value.certifications.map((item, itemIndex) =>
        itemIndex === index ? fieldValue : item
      )
    });
  };

  const addCertification = () => {
    onChange({
      ...value,
      certifications: [...value.certifications, '']
    });
  };

  const removeCertification = (index) => {
    onChange({
      ...value,
      certifications: value.certifications.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const updateProject = (index, field, fieldValue) => {
    onChange({
      ...value,
      projects: value.projects.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: fieldValue } : item
      )
    });
  };

  const addProject = () => {
    onChange({
      ...value,
      projects: [...value.projects, emptyProject()]
    });
  };

  const removeProject = (index) => {
    onChange({
      ...value,
      projects: value.projects.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  return (
    <Box
      sx={{
        mt: 3,
        pt: 3,
        borderTop: (theme) => `1px solid ${theme.colors.alpha.black[10]}`
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ mb: 1.5 }}>
        Resume detail
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <SectionHeader title="Work experience" onAdd={addWorkExperience} addLabel="Add experience" />
      {value.work_experience.map((item, index) => (
        <Box
          key={`work-${index}`}
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 1,
            border: (theme) => `1px solid ${theme.colors.alpha.black[10]}`
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Experience {index + 1}
            </Typography>
            {value.work_experience.length > 1 ? (
              <IconButton
                size="small"
                color="error"
                onClick={() => removeWorkExperience(index)}
                disabled={disabled}
              >
                <DeleteTwoToneIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Company name"
                value={item.company_name}
                onChange={(event) => updateWorkExperience(index, 'company_name', event.target.value)}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Location"
                value={item.location}
                onChange={(event) => updateWorkExperience(index, 'location', event.target.value)}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Role"
                value={item.role}
                onChange={(event) => updateWorkExperience(index, 'role', event.target.value)}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Method</InputLabel>
                <Select
                  label="Method"
                  value={item.method}
                  onChange={(event) => updateWorkExperience(index, 'method', event.target.value)}
                  disabled={disabled}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {WORK_METHOD_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <MonthYearField
                label="Start date"
                value={item.start_date}
                onChange={(dateValue) => updateWorkExperience(index, 'start_date', dateValue)}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <MonthYearField
                label="End date"
                value={item.end_date}
                onChange={(dateValue) => updateWorkExperience(index, 'end_date', dateValue)}
                disabled={disabled}
              />
            </Grid>
          </Grid>
        </Box>
      ))}

      <SectionHeader title="Education" onAdd={addEducation} addLabel="Add education" />
      {value.education.map((item, index) => (
        <Box
          key={`education-${index}`}
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 1,
            border: (theme) => `1px solid ${theme.colors.alpha.black[10]}`
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Education {index + 1}
            </Typography>
            {value.education.length > 1 ? (
              <IconButton
                size="small"
                color="error"
                onClick={() => removeEducation(index)}
                disabled={disabled}
              >
                <DeleteTwoToneIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="University name"
                value={item.university_name}
                onChange={(event) => updateEducation(index, 'university_name', event.target.value)}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Degree"
                value={item.degree}
                onChange={(event) => updateEducation(index, 'degree', event.target.value)}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <MonthYearField
                label="Start date"
                value={item.start_date}
                onChange={(dateValue) => updateEducation(index, 'start_date', dateValue)}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <MonthYearField
                label="End date"
                value={item.end_date}
                onChange={(dateValue) => updateEducation(index, 'end_date', dateValue)}
                disabled={disabled}
              />
            </Grid>
          </Grid>
        </Box>
      ))}

      <SectionHeader title="Certification" onAdd={addCertification} addLabel="Add certification" />
      {value.certifications.map((item, index) => (
        <Box key={`cert-${index}`} display="flex" alignItems="center" gap={1} mb={1.5}>
          <TextField
            fullWidth
            size="small"
            label={`Certification ${index + 1}`}
            value={item}
            onChange={(event) => updateCertification(index, event.target.value)}
            disabled={disabled}
          />
          {value.certifications.length > 1 ? (
            <IconButton
              size="small"
              color="error"
              onClick={() => removeCertification(index)}
              disabled={disabled}
            >
              <DeleteTwoToneIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>
      ))}

      <SectionHeader title="Projects" onAdd={addProject} addLabel="Add project" />
      {value.projects.map((item, index) => (
        <Box
          key={`project-${index}`}
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 1,
            border: (theme) => `1px solid ${theme.colors.alpha.black[10]}`
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Project {index + 1}
            </Typography>
            {value.projects.length > 1 ? (
              <IconButton
                size="small"
                color="error"
                onClick={() => removeProject(index)}
                disabled={disabled}
              >
                <DeleteTwoToneIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Project name"
                value={item.project_name}
                onChange={(event) => updateProject(index, 'project_name', event.target.value)}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Stack"
                value={item.stack}
                onChange={(event) => updateProject(index, 'stack', event.target.value)}
                disabled={disabled}
              />
            </Grid>
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

ResumeDetailForm.propTypes = {
  value: PropTypes.shape({
    work_experience: PropTypes.array.isRequired,
    education: PropTypes.array.isRequired,
    certifications: PropTypes.array.isRequired,
    projects: PropTypes.array.isRequired
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default ResumeDetailForm;
