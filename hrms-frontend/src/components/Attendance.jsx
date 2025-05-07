import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  AccessTime as TimeIcon,
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  BarChart as ChartIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  EventBusy as EventBusyIcon,
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { format, subDays, startOfMonth, endOfMonth, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

// Add axios interceptor for authentication
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

const Attendance = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    earlyExit: 0,
    totalHours: 0,
    avgHoursPerDay: 0,
  });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [newLeave, setNewLeave] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [userDetails, setUserDetails] = useState(null);
  const [allEmployeesAttendance, setAllEmployeesAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');
  const isHR = userRole?.toLowerCase() === 'hr';

  useEffect(() => {
    // Check for tab parameter in URL
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      const tabIndex = parseInt(tabParam);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 3) {
        setActiveTab(tabIndex);
      }
    }
  }, [location]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAttendanceRecords();
      checkTodayAttendance();
      fetchLeaveRequests();
      fetchLeaveBalance();
      fetchUserDetails();
    }
  }, [userId, dateRange]);

  useEffect(() => {
    if (isHR) {
      fetchAllEmployeesAttendance();
    }
  }, [isHR, selectedDate]);

  const checkTodayAttendance = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/attendance/today/${userId}`);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/attendance/records`, {
        params: {
          employee_id: userId,
          start_date: dateRange.start,
          end_date: dateRange.end,
        },
      });
      setAttendanceRecords(response.data);
      calculateStats(response.data);
    } catch (error) {
      setError('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records) => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      earlyExit: 0,
      totalHours: 0,
      avgHoursPerDay: 0,
    };

    records.forEach(record => {
      if (record.status === 'present') stats.present++;
      if (record.status === 'absent') stats.absent++;
      if (record.late_entry) stats.late++;
      if (record.early_exit) stats.earlyExit++;

      // Calculate working hours if both check-in and check-out exist
      if (record.check_in && record.check_out) {
        const checkIn = parseISO(`2000-01-01T${record.check_in}`);
        const checkOut = parseISO(`2000-01-01T${record.check_out}`);
        const hours = differenceInMinutes(checkOut, checkIn) / 60;
        stats.totalHours += hours;
      }
    });

    // Calculate average hours per day
    if (stats.present > 0) {
      stats.avgHoursPerDay = stats.totalHours / stats.present;
    }

    setStats(stats);
  };

  const handleLogin = async () => {
    try {
      if (!userId) {
        setError('User ID not found. Please log in again.');
        return;
      }

      setLoading(true);
      setError(null);
      setSuccess(null);

      console.log('Attempting check-in for user:', userId);
      const response = await axios.post(`${API_BASE_URL}/attendance/check-in`, {
        employee_id: parseInt(userId),
        date: format(new Date(), 'yyyy-MM-dd'),
        check_in: format(new Date(), 'HH:mm'),
        status: 'present',
        late_entry: new Date().getHours() > 9 || (new Date().getHours() === 9 && new Date().getMinutes() > 0),
      });

      console.log('Check-in response:', response.data);
      setAttendance(response.data);
      setSuccess('Successfully checked in!');
      fetchAttendanceRecords();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      console.log('Attempting check-out for user:', userId);
      const response = await axios.put(`${API_BASE_URL}/attendance/check-out`, {
        employee_id: parseInt(userId),
        date: format(new Date(), 'yyyy-MM-dd'),
        check_out: format(new Date(), 'HH:mm'),
        early_exit: new Date().getHours() < 17 || (new Date().getHours() === 17 && new Date().getMinutes() < 30)
      });

      console.log('Check-out response:', response.data);
      setAttendance(response.data);
      setSuccess('Successfully checked out!');
      fetchAttendanceRecords();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    
    // Force a page refresh to ensure complete state reset
    window.location.href = '/';
  };

  const handleBackToLogin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    
    // Force a page refresh to ensure complete state reset
    window.location.href = '/';
  };

  const fetchLeaveRequests = async () => {
    try {
      console.log('Fetching leave requests for user:', userId);
      const response = await axios.get(`${API_BASE_URL}/leave/requests`, {
        params: { employee_id: userId }
      });
      console.log('Leave requests response:', response.data);
      setLeaveRequests(response.data);
    } catch (error) {
      console.error('Error fetching leave requests:', error.response || error);
      setError(error.response?.data?.detail || 'Failed to fetch leave requests');
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      console.log('Fetching leave balance for user:', userId);
      const response = await axios.get(`${API_BASE_URL}/leave/balance/${userId}`);
      console.log('Leave balance response:', response.data);
      setLeaveBalance(response.data);
    } catch (error) {
      console.error('Error fetching leave balance:', error.response || error);
      setError(error.response?.data?.detail || 'Failed to fetch leave balance');
    }
  };

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users/${parseInt(userId)}`);
      console.log('User details response:', response.data);
      if (response.data) {
        setUserDetails(response.data);
      } else {
        setError('No user details found');
      }
    } catch (error) {
      console.error('Error fetching user details:', error.response?.data || error);
      setError('Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Format dates to YYYY-MM-DD
      const formattedLeave = {
        employee_id: parseInt(userId),
        leave_type: newLeave.leave_type,
        start_date: new Date(newLeave.start_date).toISOString().split('T')[0],
        end_date: new Date(newLeave.end_date).toISOString().split('T')[0],
        reason: newLeave.reason
      };

      console.log('Submitting leave request:', formattedLeave);
      console.log('API URL:', `${API_BASE_URL}/leave/request`);

      const response = await axios.post(`${API_BASE_URL}/leave/request`, formattedLeave);

      console.log('Leave request response:', response.data);
      setSuccess('Leave request submitted successfully');
      setNewLeave({
        leave_type: '',
        start_date: '',
        end_date: '',
        reason: ''
      });
      fetchLeaveRequests();
      fetchLeaveBalance();
      fetchUserDetails();
    } catch (error) {
      console.error('Leave request error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      setError(error.response?.data?.detail || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEmployeesAttendance = async () => {
    try {
      setLoading(true);
      console.log('Fetching all employees attendance for date:', selectedDate);
      const response = await axios.get(`${API_BASE_URL}/attendance/all-records`, {
        params: { date: selectedDate }
      });
      console.log('All employees attendance:', response.data);
      setAllEmployeesAttendance(response.data);
    } catch (error) {
      console.error('Error fetching all employees attendance:', error.response || error);
      setError(error.response?.data?.detail || 'Failed to fetch all employees attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleHRCheckout = async (employeeId) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      console.log('HR performing check-out for employee:', employeeId);
      const response = await axios.put(`${API_BASE_URL}/attendance/check-out`, {
        employee_id: parseInt(employeeId),
        date: selectedDate,
        check_out: format(new Date(), 'HH:mm'),
        early_exit: new Date().getHours() < 17 || (new Date().getHours() === 17 && new Date().getMinutes() < 30)
      });

      console.log('HR Check-out response:', response.data);
      setSuccess(`Successfully checked out employee #${employeeId}`);
      fetchAllEmployeesAttendance();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to check out employee');
    } finally {
      setLoading(false);
    }
  };

  const renderAllEmployeesAttendance = () => (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Button 
            variant="contained" 
            onClick={fetchAllEmployeesAttendance}
            sx={{
              mt: 1,
              background: 'rgba(33, 150, 243, 0.2)',
              '&:hover': { background: 'rgba(33, 150, 243, 0.3)' },
            }}
          >
            Refresh Data
          </Button>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Employee</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Check In</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Check Out</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Working Hours</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Remarks</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allEmployeesAttendance.map((record) => {
              let workingHours = 0;
              if (record.check_in && record.check_out) {
                const checkIn = parseISO(`2000-01-01T${record.check_in}`);
                const checkOut = parseISO(`2000-01-01T${record.check_out}`);
                workingHours = differenceInMinutes(checkOut, checkIn) / 60;
              }

              return (
                <TableRow key={record.employee_id}>
                  <TableCell sx={{ color: 'white' }}>{record.employee_name}</TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {record.check_in}
                    {record.late_entry && (
                      <Chip
                        size="small"
                        icon={<WarningIcon />}
                        label="Late"
                        sx={{
                          ml: 1,
                          bgcolor: 'rgba(255, 152, 0, 0.2)',
                          color: 'white',
                          '& .MuiChip-icon': { color: 'white' }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {record.check_out}
                    {record.early_exit && (
                      <Chip
                        size="small"
                        icon={<WarningIcon />}
                        label="Early"
                        sx={{
                          ml: 1,
                          bgcolor: 'rgba(33, 150, 243, 0.2)',
                          color: 'white',
                          '& .MuiChip-icon': { color: 'white' }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    <Chip
                      size="small"
                      icon={record.status === 'present' ? <CheckCircleIcon /> : <CancelIcon />}
                      label={record.status}
                      sx={{
                        bgcolor: record.status === 'present' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                        color: 'white',
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {workingHours > 0 ? `${workingHours.toFixed(1)}h` : '-'}
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {record.late_entry && record.early_exit && 'Irregular Hours'}
                    {record.late_entry && !record.early_exit && 'Late Arrival'}
                    {!record.late_entry && record.early_exit && 'Early Departure'}
                    {!record.late_entry && !record.early_exit && record.status === 'present' && 'Regular'}
                    {record.status === 'absent' && 'Absent'}
                  </TableCell>
                  <TableCell>
                    {record.status === 'present' && !record.check_out && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleHRCheckout(record.employee_id)}
                        sx={{
                          background: 'rgba(244, 67, 54, 0.2)',
                          '&:hover': { background: 'rgba(244, 67, 54, 0.3)' },
                        }}
                      >
                        Check Out
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6} lg={3}>
        <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white' }}>Present Days</Typography>
            <Typography variant="h4" sx={{ color: 'white' }}>{stats.present}</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Total Hours: {stats.totalHours.toFixed(1)}h
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white' }}>Absent Days</Typography>
            <Typography variant="h4" sx={{ color: 'white' }}>{stats.absent}</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Avg Hours/Day: {stats.avgHoursPerDay.toFixed(1)}h
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white' }}>Late Entries</Typography>
            <Typography variant="h4" sx={{ color: 'white' }}>{stats.late}</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {((stats.late / stats.present) * 100).toFixed(1)}% of days
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white' }}>Early Exits</Typography>
            <Typography variant="h4" sx={{ color: 'white' }}>{stats.earlyExit}</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {((stats.earlyExit / stats.present) * 100).toFixed(1)}% of days
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAttendanceTable = () => (
    <TableContainer component={Paper} sx={{ mt: 3, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Check In</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Check Out</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Working Hours</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Remarks</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Leave Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {attendanceRecords.map((record) => {
            let workingHours = 0;
            if (record.check_in && record.check_out) {
              const checkIn = parseISO(`2000-01-01T${record.check_in}`);
              const checkOut = parseISO(`2000-01-01T${record.check_out}`);
              workingHours = differenceInMinutes(checkOut, checkIn) / 60;
            }

            // Find if there's a leave request for this date
            const leaveRequest = leaveRequests.find(request => {
              const startDate = new Date(request.start_date);
              const endDate = new Date(request.end_date);
              const recordDate = new Date(record.date);
              return recordDate >= startDate && recordDate <= endDate;
            });

            return (
              <TableRow key={record.id}>
                <TableCell sx={{ color: 'white' }}>{record.date}</TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {record.check_in}
                  {record.late_entry && (
                    <Chip
                      size="small"
                      icon={<WarningIcon />}
                      label="Late"
                      sx={{
                        ml: 1,
                        bgcolor: 'rgba(255, 152, 0, 0.2)',
                        color: 'white',
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {record.check_out}
                  {record.early_exit && (
                    <Chip
                      size="small"
                      icon={<WarningIcon />}
                      label="Early"
                      sx={{
                        ml: 1,
                        bgcolor: 'rgba(33, 150, 243, 0.2)',
                        color: 'white',
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>
                  <Chip
                    size="small"
                    icon={record.status === 'present' ? <CheckCircleIcon /> : <CancelIcon />}
                    label={record.status}
                    sx={{
                      bgcolor: record.status === 'present' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                      color: 'white',
                      '& .MuiChip-icon': { color: 'white' }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {workingHours > 0 ? `${workingHours.toFixed(1)}h` : '-'}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {record.late_entry && record.early_exit && 'Irregular Hours'}
                  {record.late_entry && !record.early_exit && 'Late Arrival'}
                  {!record.late_entry && record.early_exit && 'Early Departure'}
                  {!record.late_entry && !record.early_exit && record.status === 'present' && 'Regular'}
                  {record.status === 'absent' && 'Absent'}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {leaveRequest ? (
                    <Chip
                      size="small"
                      icon={leaveRequest.status === 'approved' ? <CheckCircleIcon /> : 
                           leaveRequest.status === 'rejected' ? <CancelIcon /> : 
                           <EventBusyIcon />}
                      label={`${leaveRequest.leave_type} (${leaveRequest.status})`}
                      sx={{
                        bgcolor: leaveRequest.status === 'approved' ? 'rgba(76, 175, 80, 0.2)' :
                                leaveRequest.status === 'rejected' ? 'rgba(244, 67, 54, 0.2)' :
                                'rgba(255, 152, 0, 0.2)',
                        color: 'white',
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EventBusyIcon />}
                      onClick={() => {
                        setNewLeave(prev => ({
                          ...prev,
                          start_date: record.date,
                          end_date: record.date
                        }));
                        setActiveTab(2); // Switch to leave management tab
                      }}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        '&:hover': {
                          borderColor: 'rgba(255, 255, 255, 0.4)',
                          bgcolor: 'rgba(255, 255, 255, 0.1)'
                        }
                      }}
                    >
                      Apply Leave
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderLeaveManagement = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
                Leave Balance
              </Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                </Box>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : userDetails ? (
                <Box>
                  <Typography variant="body1" gutterBottom sx={{ color: 'white' }}>
                    Available Balance: {userDetails.leave_balance} days
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Note: Leave balance will be deducted when your request is approved
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ color: 'white' }}>No leave balance information available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mt: 3, p: 3, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Apply for Leave</Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        <form onSubmit={handleLeaveSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Leave Type"
                value={newLeave.leave_type}
                onChange={(e) => setNewLeave(prev => ({ ...prev, leave_type: e.target.value }))}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                }}
              >
                <MenuItem value="annual">Annual Leave</MenuItem>
                <MenuItem value="sick">Sick Leave</MenuItem>
                <MenuItem value="personal">Personal Leave</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={newLeave.start_date}
                onChange={(e) => setNewLeave(prev => ({ ...prev, start_date: e.target.value }))}
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={newLeave.end_date}
                onChange={(e) => setNewLeave(prev => ({ ...prev, end_date: e.target.value }))}
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
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reason"
                value={newLeave.reason}
                onChange={(e) => setNewLeave(prev => ({ ...prev, reason: e.target.value }))}
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
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={<EventBusyIcon />}
                sx={{
                  background: 'rgba(33, 150, 243, 0.2)',
                  '&:hover': { background: 'rgba(33, 150, 243, 0.3)' },
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Submit Leave Request'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Paper sx={{ mt: 3, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Start Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>End Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell sx={{ color: 'white' }}>{request.leave_type}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{request.start_date}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{request.end_date}</TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    <Chip
                      size="small"
                      label={request.status}
                      sx={{
                        bgcolor: request.status === 'approved' ? 'rgba(76, 175, 80, 0.2)' :
                                request.status === 'rejected' ? 'rgba(244, 67, 54, 0.2)' :
                                'rgba(255, 152, 0, 0.2)',
                        color: 'white',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>{request.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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

  return (
    <Box sx={{ 
      minHeight: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      overflowY: 'auto',
      background: 'linear-gradient(135deg, #1a237e 0%, #4a148c 50%, #880e4f 100%)',
      py: 4
    }}>
      <Container maxWidth="xl">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4 
        }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ color: 'white' }}
          >
            Back
          </Button>
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

        <Paper sx={{ 
          p: 3, 
          mb: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 2,
        }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: 'white',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'white',
              },
            }}
          >
            <Tab label="Daily Log" />
            <Tab label="Attendance" />
            <Tab label="Leave Management" />
            <Tab label="My Profile" />
            {isHR && <Tab label="All Employees" />}
          </Tabs>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {activeTab === 0 && (
          <Box>
            <Paper sx={{
              p: 2,
              mb: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              textAlign: 'center',
            }}>
              <Typography variant="h5" sx={{ color: 'white' }}>
                {format(currentTime, 'HH:mm:ss')}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </Typography>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {!attendance || attendance.id === 0 ? (
              <Box>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleLogin}
                  disabled={loading || !userId}
                  startIcon={<LoginIcon />}
                  sx={{
                    background: 'rgba(76, 175, 80, 0.2)',
                    '&:hover': {
                      background: 'rgba(76, 175, 80, 0.3)',
                    },
                    height: 48,
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Check In'}
                </Button>
              </Box>
            ) : (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Paper sx={{
                      p: 2,
                      background: 'rgba(255, 255, 255, 0.05)',
                      textAlign: 'center',
                    }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Check In
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        {attendance.check_in}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{
                      p: 2,
                      background: 'rgba(255, 255, 255, 0.05)',
                      textAlign: 'center',
                    }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Check Out
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        {attendance.check_out || 'Not checked out'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {!attendance.check_out && (
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleCheckout}
                    disabled={loading}
                    startIcon={<LogoutIcon />}
                    sx={{
                      background: 'rgba(244, 67, 54, 0.2)',
                      '&:hover': {
                        background: 'rgba(244, 67, 54, 0.3)',
                      },
                      height: 48,
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Check Out'}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  }}
                />
              </Grid>
            </Grid>

            {renderDashboard()}
            {renderAttendanceTable()}
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            {renderLeaveManagement()}
          </Box>
        )}

        {activeTab === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'primary.main',
                        mr: 2,
                      }}
                    >
                      {userDetails?.full_name?.[0] || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {userDetails?.full_name || 'Loading...'}
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {userDetails?.role || 'Loading...'}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EmailIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 2 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Email
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {userDetails?.email || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BadgeIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 2 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Employee ID
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {userDetails?.employee_id || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 2 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Phone
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {userDetails?.phone || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BusinessIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 2 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Department
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {userDetails?.department || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WorkIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 2 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Position
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {userDetails?.position || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EventIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 2 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Hire Date
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {userDetails?.hire_date ? new Date(userDetails.hire_date).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                height: '100%',
              }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
                    Leave Balance
                  </Typography>
                  {leaveBalance ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Monthly Accrual
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          2 days
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Total Days Available
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {leaveBalance.total_days} days
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Days Taken
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {leaveBalance.days_taken} days
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Days Remaining
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {leaveBalance.days_remaining} days
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      No leave balance information available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {isHR && activeTab === 4 && renderAllEmployeesAttendance()}
      </Container>
    </Box>
  );
};

export default Attendance; 