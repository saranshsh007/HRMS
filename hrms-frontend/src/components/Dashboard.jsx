import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
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
} from '@mui/material';
import {
  PeopleAlt as PeopleIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  EventNote as EventIcon,
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
  const theme = useTheme();

  useEffect(() => {
    fetchSummary();
  }, []);

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
          <Typography variant="h4" component="h1" sx={{ color: 'white', fontWeight: 'bold' }}>
            Dashboard
          </Typography>
          <Button
            component={Link}
            to="/users"
            variant="contained"
            sx={{
              background: 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            View All Users
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StyledCard
              title="Total Present Today"
              value={summary.total_present_today}
              icon={<PeopleIcon sx={{ color: 'white' }} />}
              color="rgba(76, 175, 80, 0.2)"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StyledCard
              title="Absentee Percentage"
              value={`${summary.absentee_percentage.toFixed(1)}%`}
              icon={<TimeIcon sx={{ color: 'white' }} />}
              color="rgba(244, 67, 54, 0.2)"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StyledCard
              title="Late Arrivals"
              value={summary.late_arrivals_count}
              icon={<TrendingUpIcon sx={{ color: 'white' }} />}
              color="rgba(255, 152, 0, 0.2)"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StyledCard
              title="Early Exits"
              value={summary.early_exits_count}
              icon={<EventIcon sx={{ color: 'white' }} />}
              color="rgba(33, 150, 243, 0.2)"
            />
          </Grid>
        </Grid>

        <Paper sx={{
          mt: 4,
          p: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 2,
        }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Monthly Working Hours
          </Typography>
          <Box sx={{ height: 400 }}>
            <Line data={chartData} options={chartOptions} />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Dashboard; 