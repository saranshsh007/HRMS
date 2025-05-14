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
  Breadcrumbs,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  NavigateNext as NavigateNextIcon,
  Description as DescriptionIcon,
  Inventory as InventoryIcon,
  EventNote as EventNoteIcon,
} from '@mui/icons-material';
import { format, subDays, startOfMonth, endOfMonth, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

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
  const [showPolicies, setShowPolicies] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [assets, setAssets] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');
  const isHR = userRole?.toLowerCase() === 'hr';
  const [activeSection, setActiveSection] = useState('attendance');

  useEffect(() => {
    console.log('Attendance component mounted');
    console.log('User ID:', userId);
    console.log('User Role:', userRole);
    
    if (!userId) {
      console.error('No user ID found');
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // First fetch attendance records to check for unchecked out records
        await fetchAttendanceRecords();
        // Then check today's attendance
        await checkTodayAttendance();
        
        // Finally fetch other data
        await Promise.all([
          fetchLeaveRequests(),
          fetchLeaveBalance(),
          fetchUserDetails(),
          fetchPolicies(),
          fetchAssets()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

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
    if (isHR) {
      fetchAllEmployeesAttendance();
    }
  }, [isHR, selectedDate]);

  useEffect(() => {
    // Add effect to log assets state changes
    console.log('Assets state updated:', assets);
  }, [assets]);

  useEffect(() => {
    // Add effect to log active section changes
    console.log('Active section changed to:', activeSection);
  }, [activeSection]);

  const checkTodayAttendance = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/attendance/today/${userId}`);
      console.log('Today\'s attendance:', response.data);
      
      // Check if there's any unchecked out record for today
      const today = format(new Date(), 'yyyy-MM-dd');
      const hasUncheckedOut = attendanceRecords.some(record => 
        record.date === today && 
        record.check_in && 
        !record.check_out
      );

      setAttendance(response.data);
      
      // Set active section and state based on attendance records
      if (hasUncheckedOut) {
        console.log('Found unchecked out record, setting to checkout state');
        setActiveSection('attendance');
      } else if (response.data && response.data.check_in && !response.data.check_out) {
        console.log('Current day has check-in but no check-out');
        setActiveSection('attendance');
      } else {
        console.log('No active attendance record found');
        setActiveSection('attendance');
      }
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
        const minutes = differenceInMinutes(checkOut, checkIn);
        stats.totalHours += minutes / 60;
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

      // Check if there's an existing check-in without check-out
      const hasUncheckedOut = attendanceRecords.some(record => 
        record.date === format(new Date(), 'yyyy-MM-dd') && 
        record.check_in && 
        !record.check_out
      );

      if (hasUncheckedOut) {
        setError('You must check out from your previous check-in before checking in again.');
        return;
      }

      setLoading(true);
      setError(null);

      const currentTime = new Date();
      const isLate = currentTime.getHours() > 9 || (currentTime.getHours() === 9 && currentTime.getMinutes() > 0);

      console.log('Attempting check-in for user:', userId);
      const response = await axios.post(`${API_BASE_URL}/attendance/check-in`, {
        employee_id: parseInt(userId),
        date: format(currentTime, 'yyyy-MM-dd'),
        check_in: format(currentTime, 'HH:mm'),
        status: 'present',
        late_entry: isLate
      });

      console.log('Check-in response:', response.data);
      setAttendance(response.data);
      setActiveSection('attendance');
      await fetchAttendanceRecords();
    } catch (error) {
      console.error('Check-in error:', error.response?.data || error);
      setError(error.response?.data?.detail || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Attempting check-out for user:', userId);
      const response = await axios.put(`${API_BASE_URL}/attendance/check-out`, {
        employee_id: parseInt(userId),
        date: format(new Date(), 'yyyy-MM-dd'),
        check_out: format(new Date(), 'HH:mm'),
        early_exit: new Date().getHours() < 17 || (new Date().getHours() === 17 && new Date().getMinutes() < 30)
      });

      console.log('Check-out response:', response.data);
      setAttendance(response.data);
      setActiveSection('attendance');
      await fetchAttendanceRecords();
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
      const response = await axios.get(`${API_BASE_URL}/leave/requests/${userId}`);
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
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/users/${parseInt(userId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('User details response:', response.data);
      if (response.data) {
        setUserDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching user details:', error.response?.data || error);
      if (error.response?.status === 403) {
        // Handle token expiration
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        window.location.href = '/';
      }
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

  const fetchPolicies = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/policies/`);
      setPolicies(response.data || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
      setPolicies([]);
    }
  };

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/assets/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Assets response:', response.data);
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error.response?.data || error);
      setError('Failed to fetch assets');
      setAssets([]);
    }
  };

  const renderAllEmployeesAttendance = () => (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Date"
              value={new Date(selectedDate)}
              onChange={(newValue) => {
                setSelectedDate(format(newValue, 'yyyy-MM-dd'));
              }}
              renderInput={(params) => (
          <TextField
                  {...params}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
            }}
          />
              )}
            />
          </LocalizationProvider>
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
      <Grid item xs={12} md={6}>
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
      <Grid item xs={12} md={6}>
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
      </Grid>
  );

  const renderDateRangeSelector = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={5}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Start Date"
            value={new Date(dateRange.start)}
            onChange={(newValue) => {
              setDateRange(prev => ({
                ...prev,
                start: format(newValue, 'yyyy-MM-dd')
              }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                }}
              />
            )}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12} md={5}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="End Date"
            value={new Date(dateRange.end)}
            onChange={(newValue) => {
              setDateRange(prev => ({
                ...prev,
                end: format(newValue, 'yyyy-MM-dd')
              }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                }}
              />
            )}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12} md={2}>
        <Button
          fullWidth
          variant="contained"
          onClick={fetchAttendanceRecords}
          sx={{
            mt: 1,
            background: 'rgba(33, 150, 243, 0.2)',
            '&:hover': { background: 'rgba(33, 150, 243, 0.3)' },
          }}
        >
          Apply
        </Button>
      </Grid>
    </Grid>
  );

  const renderAttendanceTable = () => (
    <TableContainer 
      component={Paper} 
      sx={{
        mb: 4,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: 2,
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'white' }}>Date</TableCell>
            <TableCell sx={{ color: 'white' }}>Check In</TableCell>
            <TableCell sx={{ color: 'white' }}>Check Out</TableCell>
            <TableCell sx={{ color: 'white' }}>Status</TableCell>
            <TableCell sx={{ color: 'white' }}>Working Hours</TableCell>
            <TableCell sx={{ color: 'white' }}>Entry Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {attendanceRecords.map((record) => {
            let workingHours = 0;
            if (record.check_in && record.check_out) {
              const checkIn = parseISO(`2000-01-01T${record.check_in}`);
              const checkOut = parseISO(`2000-01-01T${record.check_out}`);
              const minutes = differenceInMinutes(checkOut, checkIn);
              workingHours = minutes / 60;
            }

            const isToday = record.date === format(new Date(), 'yyyy-MM-dd');
            const needsCheckout = isToday && record.check_in && !record.check_out;

            return (
              <TableRow 
                key={record.id}
                      sx={{
                  '&:nth-of-type(odd)': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)' 
                  },
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  },
                  ...(needsCheckout && {
                    backgroundColor: 'rgba(255, 152, 0, 0.1)'
                  })
                }}
              >
                <TableCell sx={{ color: 'white' }}>
                  {format(new Date(record.date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>{record.check_in}</TableCell>
                <TableCell sx={{ color: 'white' }}>{record.check_out || '-'}</TableCell>
                <TableCell>
                  <Chip
                    icon={
                      record.status === 'present' ? <CheckCircleIcon /> :
                      record.status === 'absent' ? <CancelIcon /> :
                      <WarningIcon />
                    }
                    label={record.status.toUpperCase()}
                    color={
                      record.status === 'present' ? 'success' :
                      record.status === 'absent' ? 'error' :
                      'warning'
                    }
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiChip-label': { color: 'white' }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {`${workingHours.toFixed(1)} hours`}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {record.late_entry ? 'Late Entry' : 'Regular Entry'}
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
              ) : leaveBalance ? (
                <Box>
                  <Typography sx={{ color: 'white', mb: 1 }}>
                    Total Days: {leaveBalance.total_days || 0} days
                  </Typography>
                  <Typography sx={{ color: 'white', mb: 1 }}>
                    Days Taken: {leaveBalance.days_taken || 0} days
                  </Typography>
                  <Typography sx={{ color: 'white', mb: 1 }}>
                    Days Remaining: {leaveBalance.days_remaining || 0} days
                  </Typography>
                  <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                  <Typography sx={{ color: 'white', mb: 1 }}>
                    Annual Leave: {leaveBalance.annual_leave || 0} days
                  </Typography>
                  <Typography sx={{ color: 'white', mb: 1 }}>
                    Sick Leave: {leaveBalance.sick_leave || 0} days
                  </Typography>
                  <Typography sx={{ color: 'white', mb: 1 }}>
                    Casual Leave: {leaveBalance.casual_leave || 0} days
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
                <MenuItem value="casual">Casual Leave</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={newLeave.start_date ? new Date(newLeave.start_date) : null}
                  onChange={(newValue) => {
                    setNewLeave(prev => ({
                      ...prev,
                      start_date: format(newValue, 'yyyy-MM-dd')
                    }));
                  }}
                  renderInput={(params) => (
              <TextField
                      {...params}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '& input': { color: 'white' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                        '& .MuiIconButton-root': { color: 'white' },
                        '& .MuiInputBase-input': { color: 'white' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                        '& .MuiButtonBase-root': { color: 'white' },
                        '& .MuiSvgIcon-root': { color: 'white' },
                        '& .MuiPickersInputBase-root': { color: 'white' },
                        '& .MuiPickersInputBase-input': { color: 'white' },
                        '& .MuiPickersSectionList-sectionContent': { color: 'white' },
                        '& .MuiPickersSectionList-sectionSeparator': { color: 'white' },
                        '& .MuiPickersInputBase-sectionsContainer': { color: 'white' },
                        '& .MuiPickersSectionList-root': { color: 'white' },
                        '& .MuiPickersInputBase-sectionContent': { color: 'white' },
                        '& .MuiPickersInputBase-sectionBefore': { color: 'white' },
                        '& .MuiPickersInputBase-sectionAfter': { color: 'white' },
                      }}
              />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={newLeave.end_date ? new Date(newLeave.end_date) : null}
                  onChange={(newValue) => {
                    setNewLeave(prev => ({
                      ...prev,
                      end_date: format(newValue, 'yyyy-MM-dd')
                    }));
                  }}
                  renderInput={(params) => (
              <TextField
                      {...params}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                          '& input': { color: 'white' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                        '& .MuiIconButton-root': { color: 'white' },
                        '& .MuiInputBase-input': { color: 'white' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                        '& .MuiButtonBase-root': { color: 'white' },
                        '& .MuiSvgIcon-root': { color: 'white' },
                        '& .MuiPickersInputBase-root': { color: 'white' },
                        '& .MuiPickersInputBase-input': { color: 'white' },
                        '& .MuiPickersSectionList-sectionContent': { color: 'white' },
                        '& .MuiPickersSectionList-sectionSeparator': { color: 'white' },
                        '& .MuiPickersInputBase-sectionsContainer': { color: 'white' },
                        '& .MuiPickersSectionList-root': { color: 'white' },
                        '& .MuiPickersInputBase-sectionContent': { color: 'white' },
                        '& .MuiPickersInputBase-sectionBefore': { color: 'white' },
                        '& .MuiPickersInputBase-sectionAfter': { color: 'white' },
                      }}
              />
                  )}
                />
              </LocalizationProvider>
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
            <Typography color="white">Personal Details</Typography>
          </Breadcrumbs>
          
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
            alignItems: 'center' 
        }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
              Personal Details
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
            </Box>
          </Box>
        </Box>

        {/* Error messages */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', color: 'white' }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* User Details Card */}
        <Card sx={{ 
          mb: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
        }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                  Employee Information
              </Typography>
                <Typography sx={{ color: 'white', mb: 1 }}>
                  Name: {userDetails?.full_name}
              </Typography>
                <Typography sx={{ color: 'white', mb: 1 }}>
                  Employee ID: {userDetails?.employee_id}
                </Typography>
                <Typography sx={{ color: 'white', mb: 1 }}>
                  Department: {userDetails?.department}
                </Typography>
                <Typography sx={{ color: 'white', mb: 1 }}>
                  Position: {userDetails?.position}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<LoginIcon />}
            onClick={() => {
              setActiveSection('attendance');
              handleLogin();
            }}
            disabled={attendance?.check_in && !attendance?.check_out}
                  sx={{
              bgcolor: activeSection === 'attendance' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
                        Check In
          </Button>
                  <Button
                    variant="contained"
                    startIcon={<LogoutIcon />}
            onClick={() => {
              setActiveSection('attendance');
              handleCheckout();
            }}
            disabled={!attendance?.check_in || attendance?.check_out}
                    sx={{
              bgcolor: activeSection === 'attendance' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
            Check Out
                  </Button>
          <Button
            variant="contained"
            startIcon={<EventNoteIcon />}
            onClick={() => setActiveSection('leave')}
                  sx={{
              bgcolor: activeSection === 'leave' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                      },
            }}
          >
            Apply Leave
          </Button>
          <Button
            variant="contained"
            startIcon={<DescriptionIcon />}
            onClick={() => setActiveSection('policies')}
            sx={{
              bgcolor: activeSection === 'policies' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                    },
                  }}
          >
            Company Policies
          </Button>
          <Button
            variant="contained"
            startIcon={<InventoryIcon />}
            onClick={() => setActiveSection('assets')}
            sx={{
              bgcolor: activeSection === 'assets' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            My Assets
          </Button>
        </Box>

        {/* Attendance Records Table */}
        {activeSection === 'attendance' && (
          <>
            {renderDateRangeSelector()}
            <TableContainer 
              component={Paper} 
                  sx={{
                mb: 4,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'white' }}>Date</TableCell>
                    <TableCell sx={{ color: 'white' }}>Check In</TableCell>
                    <TableCell sx={{ color: 'white' }}>Check Out</TableCell>
                    <TableCell sx={{ color: 'white' }}>Status</TableCell>
                    <TableCell sx={{ color: 'white' }}>Working Hours</TableCell>
                    <TableCell sx={{ color: 'white' }}>Entry Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceRecords.map((record) => {
                    let workingHours = 0;
                    if (record.check_in && record.check_out) {
                      const checkIn = parseISO(`2000-01-01T${record.check_in}`);
                      const checkOut = parseISO(`2000-01-01T${record.check_out}`);
                      const minutes = differenceInMinutes(checkOut, checkIn);
                      workingHours = minutes / 60;
                    }

                    const isToday = record.date === format(new Date(), 'yyyy-MM-dd');
                    const needsCheckout = isToday && record.check_in && !record.check_out;

                    return (
                      <TableRow 
                        key={record.id}
                        sx={{ 
                          '&:nth-of-type(odd)': { 
                            backgroundColor: 'rgba(255, 255, 255, 0.05)' 
                    },
                          '&:hover': { 
                            backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                    },
                          ...(needsCheckout && {
                            backgroundColor: 'rgba(255, 152, 0, 0.1)'
                          })
                  }}
                      >
                        <TableCell sx={{ color: 'white' }}>
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{record.check_in}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{record.check_out || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            icon={
                              record.status === 'present' ? <CheckCircleIcon /> :
                              record.status === 'absent' ? <CancelIcon /> :
                              <WarningIcon />
                            }
                            label={record.status.toUpperCase()}
                            color={
                              record.status === 'present' ? 'success' :
                              record.status === 'absent' ? 'error' :
                              'warning'
                            }
                            size="small"
                            sx={{ 
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiChip-label': { color: 'white' }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {`${workingHours.toFixed(1)} hours`}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {record.late_entry ? 'Late Entry' : 'Regular Entry'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Company Policies Section */}
        {activeSection === 'policies' && (
              <Card sx={{
            mb: 4, 
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
              }}>
                <CardContent>
              <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
                Company Policies
                      </Typography>
              {policies.length > 0 ? (
                policies.map((policy) => (
                  <Box key={policy.id} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>
                      {policy.title}
                      </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {policy.content}
                        </Typography>
                      </Box>
                ))
              ) : (
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  No policies available at the moment.
                        </Typography>
              )}
                </CardContent>
              </Card>
        )}

        {/* Assets Section */}
        {activeSection === 'assets' && (
              <Card sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
              }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
                My Assets
                  </Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                      </Box>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : assets ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Asset Name</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Department</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Condition</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Purchase Date</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Warranty Expiry</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.isArray(assets) ? (
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
                            <TableCell>
                              <Chip
                                label={asset.condition.toUpperCase()}
                                color={
                                  asset.condition === 'New' ? 'success' :
                                  asset.condition === 'Good' ? 'primary' :
                                  asset.condition === 'Fair' ? 'warning' :
                                  'error'
                                }
                                size="small"
                                sx={{ 
                                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                                  '& .MuiChip-label': { color: 'white' }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: 'white' }}>
                              {asset.purchase_date ? format(new Date(asset.purchase_date), 'MMM dd, yyyy') : '-'}
                            </TableCell>
                            <TableCell sx={{ color: 'white' }}>
                              {asset.warranty_expiry ? format(new Date(asset.warranty_expiry), 'MMM dd, yyyy') : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ color: 'white', textAlign: 'center' }}>
                            No assets assigned
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography sx={{ color: 'white' }}>No assets assigned to you at the moment.</Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Leave Management Section */}
        {activeSection === 'leave' && (
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
                    ) : leaveBalance ? (
                      <Box>
                        <Typography sx={{ color: 'white', mb: 1 }}>
                          Total Days: {leaveBalance.total_days || 0} days
                        </Typography>
                        <Typography sx={{ color: 'white', mb: 1 }}>
                          Days Taken: {leaveBalance.days_taken || 0} days
                        </Typography>
                        <Typography sx={{ color: 'white', mb: 1 }}>
                          Days Remaining: {leaveBalance.days_remaining || 0} days
                        </Typography>
                        <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                        <Typography sx={{ color: 'white', mb: 1 }}>
                          Annual Leave: {leaveBalance.annual_leave || 0} days
                        </Typography>
                        <Typography sx={{ color: 'white', mb: 1 }}>
                          Sick Leave: {leaveBalance.sick_leave || 0} days
                        </Typography>
                        <Typography sx={{ color: 'white', mb: 1 }}>
                          Casual Leave: {leaveBalance.casual_leave || 0} days
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
                      <MenuItem value="casual">Casual Leave</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Start Date"
                        value={newLeave.start_date ? new Date(newLeave.start_date) : null}
                        onChange={(newValue) => {
                          setNewLeave(prev => ({
                            ...prev,
                            start_date: format(newValue, 'yyyy-MM-dd')
                          }));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            required
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                color: 'white',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                '& input': { color: 'white' },
                              },
                              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                              '& .MuiIconButton-root': { color: 'white' },
                              '& .MuiInputBase-input': { color: 'white' },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                              '& .MuiButtonBase-root': { color: 'white' },
                              '& .MuiSvgIcon-root': { color: 'white' },
                              '& .MuiPickersInputBase-root': { color: 'white' },
                              '& .MuiPickersInputBase-input': { color: 'white' },
                              '& .MuiPickersSectionList-sectionContent': { color: 'white' },
                              '& .MuiPickersSectionList-sectionSeparator': { color: 'white' },
                              '& .MuiPickersInputBase-sectionsContainer': { color: 'white' },
                              '& .MuiPickersSectionList-root': { color: 'white' },
                              '& .MuiPickersInputBase-sectionContent': { color: 'white' },
                              '& .MuiPickersInputBase-sectionBefore': { color: 'white' },
                              '& .MuiPickersInputBase-sectionAfter': { color: 'white' },
                            }}
                          />
                        )}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="End Date"
                        value={newLeave.end_date ? new Date(newLeave.end_date) : null}
                        onChange={(newValue) => {
                          setNewLeave(prev => ({
                            ...prev,
                            end_date: format(newValue, 'yyyy-MM-dd')
                          }));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            required
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                color: 'white',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                '& input': { color: 'white' },
                              },
                              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                              '& .MuiIconButton-root': { color: 'white' },
                              '& .MuiInputBase-input': { color: 'white' },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                              '& .MuiButtonBase-root': { color: 'white' },
                              '& .MuiSvgIcon-root': { color: 'white' },
                              '& .MuiPickersInputBase-root': { color: 'white' },
                              '& .MuiPickersInputBase-input': { color: 'white' },
                              '& .MuiPickersSectionList-sectionContent': { color: 'white' },
                              '& .MuiPickersSectionList-sectionSeparator': { color: 'white' },
                              '& .MuiPickersInputBase-sectionsContainer': { color: 'white' },
                              '& .MuiPickersSectionList-root': { color: 'white' },
                              '& .MuiPickersInputBase-sectionContent': { color: 'white' },
                              '& .MuiPickersInputBase-sectionBefore': { color: 'white' },
                              '& .MuiPickersInputBase-sectionAfter': { color: 'white' },
                            }}
                          />
                        )}
                      />
                    </LocalizationProvider>
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
        )}
      </Container>
    </Box>
  );
};

export default Attendance; 