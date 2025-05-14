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
  Badge,
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
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  Category as CategoryIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

const AssetAllocation = () => {
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [maintenanceDialog, setMaintenanceDialog] = useState(false);
  const [categories, setCategories] = useState([
    'Hardware',
    'Software',
    'Furniture',
    'Vehicle',
    'Machinery',
    'Other'
  ]);
  const [departments, setDepartments] = useState([
    'IT',
    'HR',
    'Finance',
    'Operations',
    'Sales',
    'Marketing'
  ]);

  const [formData, setFormData] = useState({
    asset_name: '',
    category: '',
    department: '',
    condition: 'New',
    purchase_date: '',
    warranty_expiry: '',
    maintenance_schedule: '',
    notes: '',
    assigned_to: '',
    user_id: ''
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchAssets();
    fetchUsers();
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        if (!token || !userId) {
          console.error('No token or user ID found');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCurrentUser({
          ...response.data,
          id: userId
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
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
        console.error('No authentication token found');
        return;
      }

      if (!currentUser || !currentUser.id) {
        console.error('User data not available');
        return;
      }

      const payload = {
        ...formData,
        user_id: currentUser.id,
        assigned_to: parseInt(formData.assigned_to)
      };

      if (selectedAsset) {
        await axios.put(
          `${API_BASE_URL}/assets/${selectedAsset.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Asset updated successfully');
      } else {
        await axios.post(
          `${API_BASE_URL}/assets`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Asset created successfully');
      }

      setOpenDialog(false);
      setSelectedAsset(null);
      setFormData({
        asset_name: '',
        category: '',
        department: '',
        condition: 'New',
        purchase_date: '',
        warranty_expiry: '',
        maintenance_schedule: '',
        notes: '',
        assigned_to: '',
        user_id: ''
      });
      fetchAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
      setSuccess(null);
    }
  };

  const handleEdit = (asset) => {
    setSelectedAsset(asset);
    setFormData({
      asset_name: asset.asset_name,
      category: asset.category,
      department: asset.department,
      condition: asset.condition,
      purchase_date: asset.purchase_date,
      warranty_expiry: asset.warranty_expiry,
      maintenance_schedule: asset.maintenance_schedule,
      notes: asset.notes,
      assigned_to: asset.assigned_to.toString(),
      user_id: asset.user_id
    });
    setOpenDialog(true);
  };

  const handleDelete = async (assetId) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }

        await axios.delete(`${API_BASE_URL}/assets/${assetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Asset deleted successfully');
        fetchAssets();
      } catch (error) {
        console.error('Error deleting asset:', error);
      }
    }
  };

  const handleMaintenance = (asset) => {
    setSelectedAsset(asset);
    setMaintenanceDialog(true);
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      await axios.post(
        `${API_BASE_URL}/assets/${selectedAsset.id}/maintenance`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Maintenance scheduled successfully');
      setMaintenanceDialog(false);
      fetchAssets();
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
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
            <Typography color="white">Asset Allocation</Typography>
          </Breadcrumbs>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
              Asset Allocation
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedAsset(null);
                  setFormData({
                    asset_name: '',
                    category: '',
                    department: '',
                    assigned_to: '',
                    condition: 'New',
                    purchase_date: '',
                    warranty_expiry: '',
                    maintenance_schedule: '',
                    notes: '',
                    user_id: ''
                  });
                  setOpenDialog(true);
                }}
                sx={{ 
                  background: 'rgba(76, 175, 80, 0.8)',
                  '&:hover': { background: 'rgba(76, 175, 80, 0.9)' }
                }}
              >
                Add Asset
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
            sx={{ mb: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', color: 'white' }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        {/* Loading indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        )}

        {/* Assets table */}
        {!loading && (
          <TableContainer 
            component={Paper} 
            sx={{ 
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white' }}>Asset Name</TableCell>
                  <TableCell sx={{ color: 'white' }}>Category</TableCell>
                  <TableCell sx={{ color: 'white' }}>Department</TableCell>
                  <TableCell sx={{ color: 'white' }}>Assigned To</TableCell>
                  <TableCell sx={{ color: 'white' }}>User</TableCell>
                  <TableCell sx={{ color: 'white' }}>Condition</TableCell>
                  <TableCell sx={{ color: 'white' }}>Purchase Date</TableCell>
                  <TableCell sx={{ color: 'white' }}>Warranty Expiry</TableCell>
                  <TableCell sx={{ color: 'white' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assets.length > 0 ? (
                  assets.map((asset) => (
                    <TableRow 
                      key={asset.id}
                      sx={{ 
                        '&:nth-of-type(odd)': { 
                          backgroundColor: 'rgba(255, 255, 255, 0.05)' 
                        },
                        '&:hover': { 
                          backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                        }
                      }}
                    >
                      <TableCell sx={{ color: 'white' }}>{asset.asset_name}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{asset.category}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{asset.department}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{asset.assigned_to}</TableCell>
                      <TableCell sx={{ color: 'white' }}>
                        {users.find(user => user.id === asset.user_id)?.full_name || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={asset.condition}
                          sx={{ 
                            bgcolor: asset.condition === 'New' 
                              ? 'rgba(76, 175, 80, 0.2)'
                              : asset.condition === 'Good'
                              ? 'rgba(33, 150, 243, 0.2)'
                              : asset.condition === 'Fair'
                              ? 'rgba(255, 152, 0, 0.2)'
                              : 'rgba(244, 67, 54, 0.2)',
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white' }}>{asset.purchase_date}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{asset.warranty_expiry}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              onClick={() => handleEdit(asset)}
                              sx={{ color: 'rgba(33, 150, 243, 0.8)' }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Maintenance">
                            <IconButton
                              onClick={() => handleMaintenance(asset)}
                              sx={{ color: 'rgba(255, 152, 0, 0.8)' }}
                            >
                              <BuildIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              onClick={() => handleDelete(asset.id)}
                              sx={{ color: 'rgba(244, 67, 54, 0.8)' }}
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
                    <TableCell colSpan={9} sx={{ textAlign: 'center', color: 'white' }}>
                      No assets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add/Edit Asset Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedAsset ? 'Edit Asset' : 'Add New Asset'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Asset Name"
                  name="asset_name"
                  value={formData.asset_name}
                  onChange={handleInputChange}
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
                  select
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  required
                >
                  {departments.map((department) => (
                    <MenuItem key={department} value={department}>
                      {department}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Assigned User</InputLabel>
                  <Select
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleInputChange}
                    label="Assigned User"
                    startAdornment={
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    }
                  >
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id.toString()}>
                        {user.full_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                  required
                >
                  {['New', 'Good', 'Fair', 'Poor'].map((condition) => (
                    <MenuItem key={condition} value={condition}>
                      {condition}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Purchase Date"
                  name="purchase_date"
                  value={formData.purchase_date}
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Warranty Expiry"
                  name="warranty_expiry"
                  value={formData.warranty_expiry}
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Maintenance Schedule"
                  name="maintenance_schedule"
                  value={formData.maintenance_schedule}
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {selectedAsset ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Maintenance Dialog */}
        <Dialog 
          open={maintenanceDialog} 
          onClose={() => setMaintenanceDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Schedule Maintenance</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Maintenance Date"
                  name="maintenanceDate"
                  value={formData.maintenanceDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Maintenance Notes"
                  name="maintenanceNotes"
                  value={formData.maintenanceNotes}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMaintenanceDialog(false)}>Cancel</Button>
            <Button onClick={handleMaintenanceSubmit} variant="contained" color="primary">
              Schedule
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AssetAllocation; 