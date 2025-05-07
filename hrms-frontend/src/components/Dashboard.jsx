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
  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    fetchSummary();
    if (userRole === 'HR') {
      fetchAllAttendanceRecords();
      fetchAllLeaveRequests();
    }
  }, [userRole]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/attendance/summary`);
      setSummary(response.data);
      setError(null);
    } catch (error) {
      setError('Failed to fetch attendance summary: ' + error.message);
      console.error('Error fetching summary:', error);
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
      const endpoint = status === 'all' 
        ? `${API_BASE_URL}/leave/all-requests`
        : `${API_BASE_URL}/leave/all-requests?status=${status}`;
        
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Leave requests response:', response.data);
      setLeaveRequests(response.data);
      
      // Count pending leave requests
      const pendingRequests = response.data.filter(req => req.status === 'pending');
      setPendingLeaveCount(pendingRequests.length);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
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
    labels: Object.keys(summary.monthly_working_hours).map(id => `Employee ${id}`),
    datasets: [
      {
        label: 'Monthly Working Hours',
        data: Object.values(summary.monthly_working_hours),
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

  // HR dashboard view with tabs
  const renderHRDashboard = () => (
    <>
      {/* Summary Cards */}
      <Grid container spacing={3}>
        {summary && renderSummaryCards()}
      </Grid>

      {/* Quick Access Cards */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ color: 'white', mb: 2 }}>
          Quick Access
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ 
              p: 3, 
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)', 
              borderRadius: 2,
              height: '100%',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
              }
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ 
                  bgcolor: 'rgba(255, 152, 0, 0.2)', 
                  borderRadius: '50%', 
                  width: 70, 
                  height: 70, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  margin: '0 auto 16px'
                }}>
                  <EventIcon sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                  Employee Leave Requests
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                  View and manage all employee leave requests. Approve or reject pending requests.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  component={RouterLink}
                  to="/employee-leave-requests"
                  sx={{
                    background: 'rgba(255, 152, 0, 0.3)',
                    '&:hover': { background: 'rgba(255, 152, 0, 0.4)' },
                    color: 'white'
                  }}
                >
                  Employee Leave Requests
                  {pendingLeaveCount > 0 && (
                    <Badge 
                      color="error" 
                      badgeContent={pendingLeaveCount} 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Other quick access cards can be added here */}
        </Grid>
      </Box>

      {/* Attendance Records Table */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ color: 'white', mb: 2 }}>
          Today's Attendance
        </Typography>
        {renderAttendanceTable()}
      </Box>

      {/* Recent Leave Requests */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ color: 'white', mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Recent Leave Requests</span>
          <Button 
            variant="text" 
            component={RouterLink} 
            to="/employee-leave-requests" 
            sx={{ color: 'white' }}
          >
            View All
          </Button>
        </Typography>
        {renderLeaveRequestsTable(true)}
      </Box>

      {/* Navigation cards */}
      {renderNavigationCards()}
    </>
  );

  // Leave requests table (used in both tabs)
  const renderLeaveRequestsTable = (limitRows = false) => {
    const displayRequests = limitRows ? leaveRequests.slice(0, 5) : leaveRequests;
    
    return (
      <Paper sx={{ 
        p: 2, 
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)', 
        borderRadius: 2,
        overflowX: 'auto'
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        ) : (
          <>
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
            
            {/* Error message */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', color: 'white' }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
            
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
                {displayRequests.length > 0 ? (
                  displayRequests.map((request) => (
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
                              sx={{
                                bgcolor: 'rgba(76, 175, 80, 0.2)',
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.3)' }
                              }}
                              onClick={() => handleApproveLeave(request.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              sx={{
                                bgcolor: 'rgba(244, 67, 54, 0.2)',
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.3)' }
                              }}
                              onClick={() => handleRejectLeave(request.id)}
                            >
                              Reject
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
            
            {/* "View All" button if showing limited rows */}
            {limitRows && leaveRequests.length > 5 && (
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button 
                  onClick={() => setActiveTab('leaveRequests')}
                  sx={{ color: 'white' }}
                >
                  View All
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    );
  };

  // Render the attendance table
  const renderAttendanceTable = () => (
    <Paper sx={{ 
      p: 2, 
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)', 
      borderRadius: 2,
      overflowX: 'auto'
    }}>
      <Box component="table" sx={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        color: 'white'
      }}>
        <Box component="thead">
          <Box component="tr" sx={{ 
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Employee ID</Box>
            <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Name</Box>
            <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Check In</Box>
            <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Check Out</Box>
            <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Status</Box>
            <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Remarks</Box>
          </Box>
        </Box>
        <Box component="tbody">
          {attendanceRecords.length > 0 ? (
            attendanceRecords.map((record) => (
              <Box 
                component="tr" 
                key={record.id}
                sx={{ 
                  '&:nth-of-type(odd)': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)' 
                  },
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  }
                }}
              >
                <Box component="td" sx={{ p: 2 }}>{record.employee_id}</Box>
                <Box component="td" sx={{ p: 2 }}>{record.employee_name}</Box>
                <Box component="td" sx={{ p: 2 }}>
                  {record.check_in}
                  {record.late_entry && (
                    <Box 
                      component="span" 
                      sx={{ 
                        ml: 1, 
                        p: '2px 6px', 
                        borderRadius: '4px', 
                        background: 'rgba(255, 152, 0, 0.2)', 
                        fontSize: '0.75rem' 
                      }}
                    >
                      Late
                    </Box>
                  )}
                </Box>
                <Box component="td" sx={{ p: 2 }}>
                  {record.check_out}
                  {record.early_exit && (
                    <Box 
                      component="span" 
                      sx={{ 
                        ml: 1, 
                        p: '2px 6px', 
                        borderRadius: '4px', 
                        background: 'rgba(33, 150, 243, 0.2)', 
                        fontSize: '0.75rem' 
                      }}
                    >
                      Early
                    </Box>
                  )}
                </Box>
                <Box component="td" sx={{ p: 2 }}>
                  <Box 
                    component="span" 
                    sx={{ 
                      p: '2px 8px', 
                      borderRadius: '4px', 
                      background: record.status === 'present' 
                        ? 'rgba(76, 175, 80, 0.2)' 
                        : 'rgba(244, 67, 54, 0.2)',
                      textTransform: 'capitalize'
                    }}
                  >
                    {record.status}
                  </Box>
                </Box>
                <Box component="td" sx={{ p: 2 }}>
                  {!record.check_in && !record.check_out ? 'Not logged in' : 
                   record.check_in && !record.check_out ? 'Not checked out' : 
                   'Complete'}
                </Box>
              </Box>
            ))
          ) : (
            <Box component="tr">
              <Box component="td" colSpan={6} sx={{ p: 2, textAlign: 'center' }}>
                No attendance records found for today
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );

  // Summary cards for dashboard
  const renderSummaryCards = () => (
    <>
      <Grid item xs={12} sm={6} md={3}>
        <StyledCard
          title="Total Present Today"
          value={summary?.total_present || 0}
          icon={<PeopleIcon sx={{ color: 'white' }} />}
          color="rgba(76, 175, 80, 0.2)"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StyledCard
          title="Absentee Percentage"
          value={`${summary?.absentee_percentage?.toFixed(1) || 0}%`}
          icon={<TimeIcon sx={{ color: 'white' }} />}
          color="rgba(244, 67, 54, 0.2)"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StyledCard
          title="Late Arrivals"
          value={summary?.late_arrivals || 0}
          icon={<TrendingUpIcon sx={{ color: 'white' }} />}
          color="rgba(255, 152, 0, 0.2)"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StyledCard
          title="Early Exits"
          value={summary?.early_exits || 0}
          icon={<EventIcon sx={{ color: 'white' }} />}
          color="rgba(33, 150, 243, 0.2)"
        />
      </Grid>
    </>
  );

  // Navigation cards
  const renderNavigationCards = () => (
    <Grid container spacing={2} sx={{ mt: 3 }}>
      {/* HR-only navigation */}
      {userRole === 'HR' && (
        <>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              component={RouterLink} 
              to="/user-management"
              sx={{
                textDecoration: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 4 }}>
                <PeopleIcon sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'white' }}>
                  User Management
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              component={RouterLink} 
              to="/employee-leave-requests"
              sx={{
                textDecoration: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 4 }}>
                <EventIcon sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'white' }}>
                  Leave Requests
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}

      {/* Navigation common to all roles */}
      <Grid item xs={12} sm={6} md={3}>
        <Card 
          component={RouterLink} 
          to="/attendance"
          sx={{
            textDecoration: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 4 }}>
            <TimeIcon sx={{ fontSize: 48, color: 'white', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'white' }}>
              {userRole === 'HR' ? 'Attendance Management' : 'My Attendance'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
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
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {userRole === 'HR' && (
              <Button 
                variant="contained"
                component={RouterLink}
                to="/employee-leave-requests"
                sx={{ 
                  background: 'rgba(255, 152, 0, 0.2)',
                  color: 'white', 
                  '&:hover': {
                    background: 'rgba(255, 152, 0, 0.3)',
                  },
                }}
              >
                Employee Leave Requests
                {pendingLeaveCount > 0 && (
                  <Badge 
                    color="error" 
                    badgeContent={pendingLeaveCount} 
                    sx={{ ml: 1 }}
                  />
                )}
              </Button>
            )}
            <Button 
              variant="contained"
              onClick={handleLogout}
              startIcon={<ExitToAppIcon />}
              sx={{ 
                background: 'rgba(244, 67, 54, 0.2)',
                color: 'white', 
                '&:hover': {
                  background: 'rgba(244, 67, 54, 0.3)',
                },
              }}
            >
              Logout
            </Button>
          </Box>
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
          userRole === 'HR' ? renderHRDashboard() : (
            // Regular employee dashboard
            <>
              {/* Summary Cards */}
              <Grid container spacing={3}>
                {summary && renderSummaryCards()}
              </Grid>

              {/* Navigation cards for employees */}
              {renderNavigationCards()}
            </>
          )
        )}
      </Container>
    </Box>
  );
};

export default Dashboard; 