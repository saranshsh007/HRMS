import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Paper,
  useTheme,
  Alert,
  Badge,
} from '@mui/material';
import {
  PeopleAlt as PeopleIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  EventNote as EventIcon,
  ExitToApp as ExitToAppIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StyledCard = ({ title, value, icon, color }) => (
  <Card sx={{
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    height: '100%',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'scale(1.02)',
    },
  }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{
          background: color,
          borderRadius: '50%',
          p: 1,
          mr: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </Box>
        <Typography variant="h6" sx={{ color: 'white' }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [success, setSuccess] = useState(null);
  const theme = useTheme();
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole')?.toLowerCase();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    fetchSummary();
    if (userRole === 'hr') {
      fetchAllAttendanceRecords();
      fetchAllLeaveRequests();
    }
  }, [userRole]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/attendance/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure we have a valid response with default values
      setSummary({
        total_present: response.data?.total_present || 0,
        absentee_percentage: response.data?.absentee_percentage || 0,
        monthly_working_hours: response.data?.monthly_working_hours || {}
      });
      setError(null);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setError('Failed to fetch attendance summary: ' + error.message);
      // Set default values when there's an error
      setSummary({
        total_present: 0,
        absentee_percentage: 0,
        monthly_working_hours: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAttendanceRecords = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${API_BASE_URL}/attendance/all-records`, {
        params: {
          date: today
        }
      });
      setAttendanceRecords(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setError('Failed to fetch attendance records: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeaveRequests = async (status = 'all') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Fetching leave requests with token:', token ? 'Token exists' : 'No token');
      
      const endpoint = status === 'all' 
        ? `${API_BASE_URL}/leave/all-requests`
        : `${API_BASE_URL}/leave/all-requests?status=${status}`;
      
      console.log('Fetching from endpoint:', endpoint);
        
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Leave requests response:', response.data);
      setLeaveRequests(response.data);
      
      // Count pending leave requests
      const pendingRequests = response.data.filter(req => req.status === 'pending');
      console.log('Pending requests:', pendingRequests);
      setPendingLeaveCount(pendingRequests.length);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.detail || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (requestId) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `${API_BASE_URL}/leave/request/${requestId}/approve`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Leave request approved successfully');
      // Refresh the leave requests list
      fetchAllLeaveRequests();
    } catch (error) {
      console.error('Error approving leave request:', error);
      setError(error.response?.data?.detail || 'Failed to approve leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectLeave = async (requestId) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `${API_BASE_URL}/leave/request/${requestId}/reject`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Leave request rejected successfully');
      // Refresh the leave requests list
      fetchAllLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      setError(error.response?.data?.detail || 'Failed to reject leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    // Navigate back to login
    navigate('/');
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'linear-gradient(135deg, #1a237e 0%, #4a148c 50%, #880e4f 100%)'
      }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'linear-gradient(135deg, #1a237e 0%, #4a148c 50%, #880e4f 100%)'
      }}>
        <Typography variant="h6" color="error" sx={{ color: 'white' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  const chartData = {
    labels: summary?.monthly_working_hours ? Object.keys(summary.monthly_working_hours).map(id => `Employee ${id}`) : [],
    datasets: [
      {
        label: 'Monthly Working Hours',
        data: summary?.monthly_working_hours ? Object.values(summary.monthly_working_hours) : [],
        borderColor: 'rgba(255, 255, 255, 0.8)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  // Navigation cards
  const renderNavigationCards = () => (
    <Grid container spacing={3} sx={{ mt: 2 }}>
      <Grid item xs={12} sm={6} md={4}>
        <Card
          component={RouterLink}
          to="/user-management"
          sx={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            height: '100%',
            textDecoration: 'none',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.02)',
              background: 'rgba(255, 255, 255, 0.15)',
            },
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PeopleIcon sx={{ color: 'white', mr: 2 }} />
              <Typography variant="h6" sx={{ color: 'white' }}>
                User Management
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={4}>
        <Card
          component={RouterLink}
          to="/attendance"
          sx={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            height: '100%',
            textDecoration: 'none',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.02)',
              background: 'rgba(255, 255, 255, 0.15)',
            },
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ color: 'white', mr: 2 }} />
              <Typography variant="h6" sx={{ color: 'white' }}>
                Personal Information
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Card
          component={RouterLink}
          to="/employee-leave-requests"
          sx={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            height: '100%',
            textDecoration: 'none',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.02)',
              background: 'rgba(255, 255, 255, 0.15)',
            },
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EventIcon sx={{ color: 'white', mr: 2 }} />
              <Typography variant="h6" sx={{ color: 'white' }}>
                Leave Requests
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // HR dashboard view with tabs
  const renderHRDashboard = () => (
    <>
      {/* Summary Cards */}
      <Grid container spacing={3}>
        {summary && renderSummaryCards()}
      </Grid>
      {/* Removing navigation cards section */}
    </>
  );

  // Summary cards for dashboard
  const renderSummaryCards = () => (
    <>
      <Grid item xs={12} sm={6} md={6}>
        <StyledCard
          title="Total Present Today"
          value={summary?.total_present || 0}
          icon={<PeopleIcon sx={{ color: 'white' }} />}
          color="rgba(76, 175, 80, 0.2)"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <StyledCard
          title="Absentee Percentage"
          value={`${(summary?.absentee_percentage || 0).toFixed(1)}%`}
          icon={<TimeIcon sx={{ color: 'white' }} />}
          color="rgba(244, 67, 54, 0.2)"
        />
      </Grid>
    </>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh',
      py: 4,
      background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)'
    }}>
      <Container>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4 
        }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
            Dashboard
          </Typography>
        </Box>

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

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        )}

        {!loading && (
          userRole === 'hr' ? renderHRDashboard() : (
            // Regular employee dashboard
            <>
              {/* Summary Cards */}
              <Grid container spacing={3}>
                {summary && renderSummaryCards()}
              </Grid>
            </>
          )
        )}
      </Container>
    </Box>
  );
};

export default Dashboard; 