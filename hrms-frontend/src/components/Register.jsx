import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  MenuItem,
  Alert,
} from '@mui/material';

const Register = () => {
  const departments = [
    { value: 'software_development', label: 'Software Development' },
    { value: 'quality_assurance', label: 'Quality Assurance' },
    { value: 'devops', label: 'DevOps' },
    { value: 'data_science', label: 'Data Science' },
    { value: 'ui_ux', label: 'UI/UX Design' },
    { value: 'product_management', label: 'Product Management' },
    { value: 'it_support', label: 'IT Support' },
    { value: 'cybersecurity', label: 'Cybersecurity' },
    { value: 'cloud_services', label: 'Cloud Services' },
    { value: 'mobile_development', label: 'Mobile Development' },
  ];

  const positions = {
    software_development: [
      { value: 'junior_developer', label: 'Junior Developer' },
      { value: 'senior_developer', label: 'Senior Developer' },
      { value: 'tech_lead', label: 'Tech Lead' },
      { value: 'software_architect', label: 'Software Architect' },
    ],
    quality_assurance: [
      { value: 'qa_engineer', label: 'QA Engineer' },
      { value: 'senior_qa', label: 'Senior QA Engineer' },
      { value: 'qa_lead', label: 'QA Lead' },
    ],
    devops: [
      { value: 'devops_engineer', label: 'DevOps Engineer' },
      { value: 'senior_devops', label: 'Senior DevOps Engineer' },
      { value: 'cloud_architect', label: 'Cloud Architect' },
    ],
    data_science: [
      { value: 'data_analyst', label: 'Data Analyst' },
      { value: 'data_scientist', label: 'Data Scientist' },
      { value: 'ml_engineer', label: 'Machine Learning Engineer' },
    ],
    ui_ux: [
      { value: 'ui_designer', label: 'UI Designer' },
      { value: 'ux_designer', label: 'UX Designer' },
      { value: 'senior_designer', label: 'Senior Designer' },
    ],
    product_management: [
      { value: 'product_owner', label: 'Product Owner' },
      { value: 'product_manager', label: 'Product Manager' },
      { value: 'senior_pm', label: 'Senior Product Manager' },
    ],
    it_support: [
      { value: 'it_specialist', label: 'IT Specialist' },
      { value: 'senior_support', label: 'Senior IT Support' },
      { value: 'support_lead', label: 'IT Support Lead' },
    ],
    cybersecurity: [
      { value: 'security_analyst', label: 'Security Analyst' },
      { value: 'security_engineer', label: 'Security Engineer' },
      { value: 'security_architect', label: 'Security Architect' },
    ],
    cloud_services: [
      { value: 'cloud_engineer', label: 'Cloud Engineer' },
      { value: 'senior_cloud', label: 'Senior Cloud Engineer' },
      { value: 'cloud_architect', label: 'Cloud Architect' },
    ],
    mobile_development: [
      { value: 'mobile_developer', label: 'Mobile Developer' },
      { value: 'senior_mobile', label: 'Senior Mobile Developer' },
      { value: 'mobile_lead', label: 'Mobile Development Lead' },
    ],
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #1a237e 0%, #4a148c 50%, #880e4f 100%)',
      py: 4
    }}>
      <Container maxWidth="sm">
        <Paper sx={{ 
          p: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 2,
        }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'white', textAlign: 'center' }}>
            Register New Employee
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  disabled={!formData.department}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                >
                  {formData.department && positions[formData.department]?.map((pos) => (
                    <MenuItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Hire Date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    background: 'rgba(33, 150, 243, 0.2)',
                    '&:hover': { background: 'rgba(33, 150, 243, 0.3)' },
                    height: 48,
                  }}
                >
                  {loading ? 'Registering...' : 'Register Employee'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register; 