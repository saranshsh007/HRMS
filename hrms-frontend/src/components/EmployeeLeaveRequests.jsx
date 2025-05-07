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
  Link as MuiLink,
  Badge,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

const EmployeeLeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [processingRequestIds, setProcessingRequestIds] = useState([]);
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    // Check if user is HR
    if (userRole !== 'HR') {
      navigate('/dashboard');
      return;
    }
    fetchAllLeaveRequests();
  }, [userRole, navigate]);

  const fetchAllLeaveRequests = async (status = 'all') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = status === 'all' 
        ? `${API_BASE_URL}/leave/all-requests`
        : `${API_BASE_URL}/leave/all-requests?status=${status}`;
        
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Leave requests response:', response.data);
      setLeaveRequests(response.data);
      
      // Count pending requests
      if (status === 'all') {
        const pendingRequests = response.data.filter(req => req.status === 'pending');
        setPendingCount(pendingRequests.length);
      } else if (status === 'pending') {
        setPendingCount(response.data.length);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setError(error.response?.data?.detail || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (requestId) => {
    try {
      setProcessingRequestIds(prev => [...prev, requestId]);
      setError(null);
      const token = localStorage.getItem('token');
      
      const requestToApprove = leaveRequests.find(req => req.id === requestId);
      
      const response = await axios.put(
        `${API_BASE_URL}/leave/request/${requestId}/approve`, 
        {}, 
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      setSuccess(`Leave request for ${requestToApprove?.employee_name || 'employee'} approved successfully`);
      
      // Refresh the leave requests list
      await fetchAllLeaveRequests();
      
      // Force refresh parent components by simulating a navigation action
      // This will cause App.jsx to reload which will refresh the NotificationBell
      setTimeout(() => {
        navigate('/employee-leave-requests');
      }, 1000);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error approving leave request:', error);
      setError(error.response?.data?.detail || 'Failed to approve leave request');
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleRejectLeave = async (requestId) => {
    try {
      setProcessingRequestIds(prev => [...prev, requestId]);
      setError(null);
      const token = localStorage.getItem('token');
      
      const requestToReject = leaveRequests.find(req => req.id === requestId);
      
      const response = await axios.put(
        `${API_BASE_URL}/leave/request/${requestId}/reject`, 
        {}, 
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      setSuccess(`Leave request for ${requestToReject?.employee_name || 'employee'} rejected successfully`);
      
      // Refresh the leave requests list
      await fetchAllLeaveRequests();
      
      // Force refresh parent components by simulating a navigation action
      // This will cause App.jsx to reload which will refresh the NotificationBell
      setTimeout(() => {
        navigate('/employee-leave-requests');
      }, 1000);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      setError(error.response?.data?.detail || 'Failed to reject leave request');
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId));
    }
  };

  if (loading && leaveRequests.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)'
      }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

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
            <Typography color="white">Employee Leave Requests</Typography>
          </Breadcrumbs>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
              Employee Leave Requests
            </Typography>
            <Button 
              variant="outlined"
              onClick={() => navigate('/dashboard')}
              startIcon={<ArrowBackIcon />}
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'white',
                },
              }}
            >
              Back to Dashboard
            </Button>
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

        {/* Filter by status */}
        <Paper sx={{ 
          p: 3, 
          mb: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)', 
          borderRadius: 2,
        }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Filter Requests
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained"
              onClick={() => fetchAllLeaveRequests('all')}
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.3)' }
              }}
            >
              All Requests
            </Button>
            <Button 
              variant="contained"
              onClick={() => fetchAllLeaveRequests('pending')}
              sx={{
                bgcolor: 'rgba(255, 152, 0, 0.2)',
                '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.3)' }
              }}
            >
              <Badge 
                color="error" 
                badgeContent={pendingCount} 
                sx={{ '& .MuiBadge-badge': { top: -8, right: -8 } }}
              >
                Pending
              </Badge>
            </Button>
            <Button 
              variant="contained"
              onClick={() => fetchAllLeaveRequests('approved')}
              sx={{
                bgcolor: 'rgba(76, 175, 80, 0.2)',
                '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.3)' }
              }}
            >
              Approved
            </Button>
            <Button 
              variant="contained"
              onClick={() => fetchAllLeaveRequests('rejected')}
              sx={{
                bgcolor: 'rgba(244, 67, 54, 0.2)',
                '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.3)' }
              }}
            >
              Rejected
            </Button>
          </Box>
        </Paper>

        {/* Leave requests table */}
        <Paper sx={{ 
          p: 3, 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)', 
          borderRadius: 2,
          overflowX: 'auto'
        }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
            Leave Requests
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress sx={{ color: 'white' }} />
            </Box>
          ) : (
            <Box component="table" sx={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              color: 'white'
            }}>
              <Box component="thead">
                <Box component="tr" sx={{ 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Employee</Box>
                  <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Leave Type</Box>
                  <Box component="th" sx={{ p: 2, textAlign: 'left' }}>From</Box>
                  <Box component="th" sx={{ p: 2, textAlign: 'left' }}>To</Box>
                  <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Status</Box>
                  <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Reason</Box>
                  <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Actions</Box>
                </Box>
              </Box>
              <Box component="tbody">
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((request) => (
                    <Box 
                      component="tr" 
                      key={request.id}
                      sx={{ 
                        '&:nth-of-type(odd)': { 
                          backgroundColor: 'rgba(255, 255, 255, 0.05)' 
                        },
                        '&:hover': { 
                          backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                        }
                      }}
                    >
                      <Box component="td" sx={{ p: 2 }}>{request.employee_name}</Box>
                      <Box component="td" sx={{ p: 2, textTransform: 'capitalize' }}>{request.leave_type}</Box>
                      <Box component="td" sx={{ p: 2 }}>{request.start_date}</Box>
                      <Box component="td" sx={{ p: 2 }}>{request.end_date}</Box>
                      <Box component="td" sx={{ p: 2 }}>
                        <Box 
                          component="span" 
                          sx={{ 
                            p: '2px 8px', 
                            borderRadius: '4px', 
                            background: request.status === 'approved' 
                              ? 'rgba(76, 175, 80, 0.2)' 
                              : request.status === 'rejected'
                              ? 'rgba(244, 67, 54, 0.2)'
                              : 'rgba(255, 152, 0, 0.2)',
                            textTransform: 'capitalize'
                          }}
                        >
                          {request.status}
                        </Box>
                      </Box>
                      <Box component="td" sx={{ p: 2 }}>{request.reason}</Box>
                      <Box component="td" sx={{ p: 2 }}>
                        {request.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              disabled={processingRequestIds.includes(request.id)}
                              sx={{
                                bgcolor: 'rgba(76, 175, 80, 0.2)',
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.3)' }
                              }}
                              onClick={() => handleApproveLeave(request.id)}
                            >
                              {processingRequestIds.includes(request.id) ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              size="small"
                              disabled={processingRequestIds.includes(request.id)}
                              sx={{
                                bgcolor: 'rgba(244, 67, 54, 0.2)',
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.3)' }
                              }}
                              onClick={() => handleRejectLeave(request.id)}
                            >
                              {processingRequestIds.includes(request.id) ? 'Processing...' : 'Reject'}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box component="tr">
                    <Box component="td" colSpan={7} sx={{ p: 2, textAlign: 'center' }}>
                      No leave requests found
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default EmployeeLeaveRequests; 