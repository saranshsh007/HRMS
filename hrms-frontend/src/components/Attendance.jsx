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
} from '@mui/material';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  AccessTime as TimeIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const Attendance = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await axios.post(`${API_BASE_URL}/attendance/check-in`, {
        employee_id: parseInt(employeeId),
        date: format(new Date(), 'yyyy-MM-dd'),
        check_in: format(new Date(), 'HH:mm'),
        status: 'Present',
        late_entry: new Date().getHours() > 9 || (new Date().getHours() === 9 && new Date().getMinutes() > 0),
      });

      setAttendance(response.data);
      setSuccess('Successfully checked in!');
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await axios.put(`${API_BASE_URL}/attendance/check-out/${attendance.id}`, {
        check_out: format(new Date(), 'HH:mm'),
        early_exit: new Date().getHours() < 18,
      });

      setAttendance(response.data);
      setSuccess('Successfully checked out!');
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

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
      <Container maxWidth="sm">
        <Card sx={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 2,
        }}>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 4 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    color: 'white',
                    background: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                    },
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1" sx={{ color: 'white', fontWeight: 'bold' }}>
                  Attendance System
                </Typography>
              </Box>
            </Box>

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

            {!attendance ? (
              <Box>
                <TextField
                  fullWidth
                  label="Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.6)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleLogin}
                  disabled={loading || !employeeId}
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
                    onClick={handleLogout}
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
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Attendance; 