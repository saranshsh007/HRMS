import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
  Breadcrumbs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';

const PolicyManagement = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [error, setError] = useState(null);

  const categories = [
    'Leave',
    'Conduct',
    'IT',
    'Finance',
    'HR',
    'General',
    'Other'
  ];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: '',
    effective_date: '',
    expiry_date: '',
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/policies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPolicies(response.data || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      if (selectedPolicy) {
        const response = await axios.put(
          `${API_BASE_URL}/policies/${selectedPolicy.policy_id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Policy updated successfully');
        setPolicies(prevPolicies => 
          prevPolicies.map(p => 
            p.policy_id === selectedPolicy.policy_id ? response.data : p
          )
        );
      } else {
        const response = await axios.post(
          `${API_BASE_URL}/policies`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Policy created successfully');
        setPolicies(prevPolicies => [...prevPolicies, response.data]);
      }

      setOpenDialog(false);
      setSelectedPolicy(null);
      setFormData({
        title: '',
        description: '',
        content: '',
        category: '',
        effective_date: '',
        expiry_date: '',
      });
    } catch (error) {
      console.error('Error saving policy:', error);
      setSuccess(null);
    }
  };

  const handleEdit = (policy) => {
    setSelectedPolicy(policy);
    setFormData({
      title: policy.title,
      description: policy.description,
      content: policy.content,
      category: policy.category,
      effective_date: policy.effective_date,
      expiry_date: policy.expiry_date || '',
    });
    setOpenDialog(true);
  };

  const handleDelete = async (policy) => {
    if (window.confirm('Are you sure you want to delete this policy?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }

        await axios.delete(`${API_BASE_URL}/policies/${policy.policy_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Policy deleted successfully');
        setPolicies(prevPolicies => prevPolicies.filter(p => p.policy_id !== policy.policy_id));
      } catch (error) {
        console.error('Error deleting policy:', error);
        setSuccess(null);
      }
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      py: 4,
      background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)'
    }}>
      <Container>
        {/* Header with breadcrumbs */}
        <Box sx={{ mb: 4 }}>
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" sx={{ color: 'white' }} />}
            aria-label="breadcrumb"
            sx={{ color: 'white', mb: 2 }}
          >
            <RouterLink 
              to="/dashboard" 
              style={{ color: 'white', textDecoration: 'none' }}
            >
              Dashboard
            </RouterLink>
            <Typography color="white">Policy Management</Typography>
          </Breadcrumbs>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
              Policy Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedPolicy(null);
                  setFormData({
                    title: '',
                    description: '',
                    content: '',
                    category: '',
                    effective_date: '',
                    expiry_date: '',
                  });
                  setOpenDialog(true);
                }}
                sx={{ 
                  background: 'rgba(76, 175, 80, 0.8)',
                  '&:hover': { background: 'rgba(76, 175, 80, 0.9)' }
                }}
              >
                Create Policy
              </Button>
              <Button 
                variant="outlined"
                onClick={() => navigate('/dashboard')}
                startIcon={<ArrowBackIcon />}
                sx={{ 
                  color: 'white', 
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  '&:hover': { borderColor: 'white' }
                }}
              >
                Back to Dashboard
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Success message */}
        {success && (
          <Alert 
            severity="success" 
            onClose={() => setSuccess(null)}
            sx={{ mb: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', color: 'white' }}
          >
            {success}
          </Alert>
        )}

        {/* Loading state */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Title</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Effective Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Expiry Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policies.length > 0 ? (
                  policies.map((policy) => (
                    <TableRow key={policy.policy_id}>
                      <TableCell sx={{ color: 'white' }}>{policy.title}</TableCell>
                      <TableCell sx={{ color: 'white' }}>
                        <Chip 
                          label={policy.category}
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white' }}>{policy.effective_date}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{policy.expiry_date || 'N/A'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(policy)}
                              sx={{ color: 'white' }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(policy)}
                              sx={{ color: 'white' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: 'white' }}>
                      No policies available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Policy Form Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => {
            setOpenDialog(false);
            setSelectedPolicy(null);
            setFormData({
              title: '',
              description: '',
              content: '',
              category: '',
              effective_date: '',
              expiry_date: '',
            });
          }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }
          }}
        >
          <DialogTitle>
            {selectedPolicy ? 'Edit Policy' : 'Create New Policy'}
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    multiline
                    rows={4}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Effective Date"
                  name="effective_date"
                  value={formData.effective_date}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'black',
                      '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.2)' },
                      '& input': { color: 'black' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(0, 0, 0, 0.7)' },
                    '& .MuiIconButton-root': { color: 'black' },
                    '& .MuiInputBase-input': { color: 'black' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.2)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.4)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'black' },
                    '& .MuiButtonBase-root': { color: 'black' },
                    '& .MuiSvgIcon-root': { color: 'black' },
                    '& .MuiPickersInputBase-root': { color: 'black' },
                    '& .MuiPickersInputBase-input': { color: 'black' },
                    '& .MuiPickersSectionList-sectionContent': { color: 'black' },
                    '& .MuiPickersSectionList-sectionSeparator': { color: 'black' },
                    '& .MuiPickersInputBase-sectionsContainer': { color: 'black' },
                    '& .MuiPickersSectionList-root': { color: 'black' },
                    '& .MuiPickersInputBase-sectionContent': { color: 'black' },
                    '& .MuiPickersInputBase-sectionBefore': { color: 'black' },
                    '& .MuiPickersInputBase-sectionAfter': { color: 'black' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Expiry Date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'black',
                      '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.2)' },
                      '& input': { color: 'black' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(0, 0, 0, 0.7)' },
                    '& .MuiIconButton-root': { color: 'black' },
                    '& .MuiInputBase-input': { color: 'black' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.2)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.4)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'black' },
                    '& .MuiButtonBase-root': { color: 'black' },
                    '& .MuiSvgIcon-root': { color: 'black' },
                    '& .MuiPickersInputBase-root': { color: 'black' },
                    '& .MuiPickersInputBase-input': { color: 'black' },
                    '& .MuiPickersSectionList-sectionContent': { color: 'black' },
                    '& .MuiPickersSectionList-sectionSeparator': { color: 'black' },
                    '& .MuiPickersInputBase-sectionsContainer': { color: 'black' },
                    '& .MuiPickersSectionList-root': { color: 'black' },
                    '& .MuiPickersInputBase-sectionContent': { color: 'black' },
                    '& .MuiPickersInputBase-sectionBefore': { color: 'black' },
                    '& .MuiPickersInputBase-sectionAfter': { color: 'black' },
                  }}
                />
              </Grid>
            </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setOpenDialog(false);
                setSelectedPolicy(null);
                setFormData({
                  title: '',
                  description: '',
                  content: '',
                  category: '',
                  effective_date: '',
                  expiry_date: '',
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              color="primary"
            >
              {selectedPolicy ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default PolicyManagement; 