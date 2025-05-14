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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

const EmployeeLeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [processingRequestIds, setProcessingRequestIds] = useState([]);
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole')?.toLowerCase();

  useEffect(() => {
    // Check if user is HR
    if (userRole !== 'hr') {
      navigate('/dashboard');
      return;
    }
    fetchAllLeaveRequests();
  }, [userRole, navigate]);

  const fetchAllLeaveRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/leave/all-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaveRequests(response.data);
      setPendingCount(response.data.filter(req => req.status === 'pending').length);
      setError(null);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setError(error.response?.data?.detail || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setProcessingRequestIds(prev => [...prev, requestId]);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/leave/request/${requestId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Leave request approved successfully');
      fetchAllLeaveRequests(); // Refresh the list
    } catch (error) {
      console.error('Error approving leave request:', error);
      setError(error.response?.data?.detail || 'Failed to approve leave request');
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessingRequestIds(prev => [...prev, requestId]);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/leave/request/${requestId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Leave request rejected successfully');
      fetchAllLeaveRequests(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      setError(error.response?.data?.detail || 'Failed to reject leave request');
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId));
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
            <Typography color="white">Employee Leave Requests</Typography>
          </Breadcrumbs>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
              Employee Leave Requests
              {pendingCount > 0 && (
                <Badge 
                  badgeContent={pendingCount} 
                  color="error" 
                  sx={{ ml: 2 }}
                />
              )}
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

        {/* Loading indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        )}

        {/* Leave requests table */}
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
                  <TableCell sx={{ color: 'white' }}>Employee</TableCell>
                  <TableCell sx={{ color: 'white' }}>Leave Type</TableCell>
                  <TableCell sx={{ color: 'white' }}>Start Date</TableCell>
                  <TableCell sx={{ color: 'white' }}>End Date</TableCell>
                  <TableCell sx={{ color: 'white' }}>Reason</TableCell>
                  <TableCell sx={{ color: 'white' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((request) => (
                    <TableRow 
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
                      <TableCell sx={{ color: 'white' }}>{request.employee_name}</TableCell>
                      <TableCell sx={{ color: 'white', textTransform: 'capitalize' }}>{request.leave_type}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{request.start_date}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{request.end_date}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{request.reason}</TableCell>
                      <TableCell>
                        <Box 
                          sx={{ 
                            p: '2px 8px', 
                            borderRadius: '4px', 
                            background: request.status === 'approved' 
                              ? 'rgba(76, 175, 80, 0.2)' 
                              : request.status === 'rejected'
                              ? 'rgba(244, 67, 54, 0.2)'
                              : 'rgba(255, 152, 0, 0.2)',
                            color: 'white',
                            textTransform: 'capitalize',
                            display: 'inline-block'
                          }}
                        >
                          {request.status}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Approve">
                              <IconButton
                                onClick={() => handleApprove(request.id)}
                                disabled={processingRequestIds.includes(request.id)}
                                sx={{ 
                                  color: 'rgba(76, 175, 80, 0.8)',
                                  '&:hover': { color: 'rgba(76, 175, 80, 1)' }
                                }}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                onClick={() => handleReject(request.id)}
                                disabled={processingRequestIds.includes(request.id)}
                                sx={{ 
                                  color: 'rgba(244, 67, 54, 0.8)',
                                  '&:hover': { color: 'rgba(244, 67, 54, 1)' }
                                }}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'white' }}>
                      No leave requests found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
};

export default EmployeeLeaveRequests; 