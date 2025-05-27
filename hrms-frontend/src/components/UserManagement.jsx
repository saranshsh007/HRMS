import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  CircularProgress,
  Paper,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Breadcrumbs,
  Badge,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  Event as EventIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ExitToApp as ExitToAppIcon,
  Badge as BadgeIcon,
  NavigateNext as NavigateNextIcon,
  AdminPanelSettings as AdminIcon,
  Person as EmployeeIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const departments = [
  "Software Development",
  "Quality Assurance",
  "DevOps",
  "Database Administration",
  "Network Administration",
  "System Administration",
  "Security",
  "IT Support",
  "Project Management",
  "Business Analysis"
];

const positions = {
  "Software Development": [
    "Software Engineer",
    "Senior Software Engineer",
    "Lead Software Engineer",
    "Software Architect",
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "Mobile Developer"
  ],
  "Quality Assurance": [
    "QA Engineer",
    "Senior QA Engineer",
    "QA Lead",
    "Test Automation Engineer",
    "Performance Test Engineer"
  ],
  "DevOps": [
    "DevOps Engineer",
    "Senior DevOps Engineer",
    "DevOps Lead",
    "Site Reliability Engineer",
    "Cloud Engineer"
  ],
  "Database Administration": [
    "Database Administrator",
    "Senior DBA",
    "Database Developer",
    "Data Engineer"
  ],
  "Network Administration": [
    "Network Administrator",
    "Network Engineer",
    "Network Security Engineer",
    "Network Architect"
  ],
  "System Administration": [
    "System Administrator",
    "Senior System Administrator",
    "Systems Engineer",
    "IT Operations Manager"
  ],
  "Security": [
    "Security Engineer",
    "Security Analyst",
    "Security Architect",
    "Information Security Officer"
  ],
  "IT Support": [
    "IT Support Specialist",
    "Help Desk Technician",
    "Technical Support Engineer",
    "IT Support Manager"
  ],
  "Project Management": [
    "Project Manager",
    "Program Manager",
    "Technical Project Manager",
    "Scrum Master"
  ],
  "Business Analysis": [
    "Business Analyst",
    "Senior Business Analyst",
    "Technical Business Analyst",
    "Product Owner"
  ]
};

// Add axios interceptor for authentication
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add timeout and retry configuration
    config.timeout = 10000; // 10 seconds timeout
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration and connection issues
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server might be down');
      return Promise.reject(new Error('Request timeout - please check your connection'));
    }
    
    if (!error.response) {
      console.error('Network error - no response from server');
      return Promise.reject(new Error('Network error - please check your connection'));
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'employee',
    employee_id: '',
    first_name: '',
    last_name: '',
    department: '',
    position: '',
    password: ''
  });
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please login again.');
        setLoading(false);
        navigate('/login');
        return;
      }

      console.log('Fetching users with token:', token);
      const response = await axios.get(`${API_BASE_URL}/users/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Users response:', response.data);
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error details:', error.response?.data || error.message);
      setError(error.response?.data?.detail || 'Error fetching users: ' + (error.message || 'Unknown error'));
      setLoading(false);
      
      // Handle token expiration
      if (error.response?.status === 401) {
        console.log('Token expired or invalid, redirecting to login');
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleAdd = () => {
      setFormData({
        email: '',
        full_name: '',
        role: 'employee',
        employee_id: '',
        first_name: '',
        last_name: '',
        department: '',
        position: '',
      password: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      employee_id: user.employee_id,
      first_name: user.first_name,
      last_name: user.last_name,
      department: user.department,
      position: user.position,
      password: ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(users.filter(user => user.id !== userId));
        setSuccess('User deleted successfully');
      } catch (err) {
        setError('Failed to delete user');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (showEditModal) {
        await axios.put(`${API_BASE_URL}/users/${selectedUser.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(users.map(user => 
          user.id === selectedUser.id ? { ...user, ...formData } : user
        ));
        setSuccess('User updated successfully');
      } else {
        const response = await axios.post(`${API_BASE_URL}/users/`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers([...users, response.data]);
        setSuccess('User added successfully');
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setFormData({
        email: '',
        full_name: '',
        role: 'employee',
        employee_id: '',
        first_name: '',
        last_name: '',
        department: '',
        position: '',
        password: ''
      });
    } catch (err) {
      setError('Failed to save user');
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        py: 4,
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center'
      }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  const renderModal = (isEdit = false) => (
          <Dialog
      open={isEdit ? showEditModal : showAddModal} 
      onClose={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
            PaperProps={{
              sx: {
          background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
              }
            }}
          >
      <DialogTitle>{isEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
            required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                  <EmailIcon />
                          </InputAdornment>
                        ),
                      }}
          />
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            margin="normal"
            required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                  <PersonIcon />
                          </InputAdornment>
                        ),
                      }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
                      <Select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              label="Role"
                        required
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="hr">HR</MenuItem>
                        <MenuItem value="employee">Employee</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Employee ID"
                      value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            margin="normal"
            required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                  <BadgeIcon />
                          </InputAdornment>
                        ),
                      }}
          />
                    <TextField
                      fullWidth
                      label="First Name"
                      value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            margin="normal"
            required
          />
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Department</InputLabel>
                      <Select
                        value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        label="Department"
              required
                      >
                        {departments.map((dept) => (
                          <MenuItem key={dept} value={dept}>
                            {dept}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Position</InputLabel>
                      <Select
                        value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        label="Position"
              required
                        disabled={!formData.department}
            >
              {formData.department &&
                positions[formData.department].map((pos) => (
                          <MenuItem key={pos} value={pos}>
                            {pos}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
          {!isEdit && (
                    <TextField
                      fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
              required
            />
          )}
              </Box>
            </DialogContent>
      <DialogActions>
        <Button onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {isEdit ? 'Save Changes' : 'Add User'}
        </Button>
      </DialogActions>
    </Dialog>
  );

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
            <Typography color="white">User Management</Typography>
          </Breadcrumbs>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
              User Management
            </Typography>
            <Box>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
                startIcon={<ArrowBackIcon />}
                sx={{
                  color: 'white', 
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  mr: 2,
                  '&:hover': {
                    borderColor: 'white',
                  },
                }}
              >
                Back to Dashboard
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PersonIcon />}
                onClick={handleAdd}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
              >
                Add New User
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Success and error messages */}
        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', color: 'white' }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', color: 'white' }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Users table */}
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
                <TableCell sx={{ color: 'white' }}>Employee ID</TableCell>
                <TableCell sx={{ color: 'white' }}>Name</TableCell>
                <TableCell sx={{ color: 'white' }}>Email</TableCell>
                <TableCell sx={{ color: 'white' }}>Department</TableCell>
                <TableCell sx={{ color: 'white' }}>Position</TableCell>
                <TableCell sx={{ color: 'white' }}>Role</TableCell>
                <TableCell sx={{ color: 'white' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
          {users.map((user) => (
                <TableRow 
                  key={user.id}
                  sx={{ 
                    '&:nth-of-type(odd)': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)' 
                    },
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                    }
                  }}
                >
                  <TableCell sx={{ color: 'white' }}>{user.employee_id}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{user.full_name}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{user.email}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{user.department}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{user.position}</TableCell>
                  <TableCell>
                    <Chip
                      icon={user.role === 'admin' ? <AdminIcon /> : <EmployeeIcon />}
                      label={user.role.toUpperCase()}
                      color={
                        user.role === 'admin' ? 'error' :
                        user.role === 'hr' ? 'warning' :
                        'success'
                      }
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiChip-label': { color: 'white' }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                  <IconButton
                        color="primary"
                    onClick={() => handleEdit(user)}
                        size="small"
                        sx={{ color: 'white' }}
                  >
                    <EditIcon />
                  </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                  <IconButton
                        color="error"
                    onClick={() => handleDelete(user.id)}
                        size="small"
                        sx={{ color: 'white' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
          ))}
            </TableBody>
          </Table>
        </TableContainer>

        {renderModal(false)}
        {renderModal(true)}
      </Container>
    </Box>
  );
};

export default UserManagement; 