import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
} from '@mui/material';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import Attendance from './components/Attendance';
import Login from './components/Login';
import './App.css'

const PrivateRoute = ({ children, allowedRoles }) => {
  const userRole = localStorage.getItem('userRole')?.toLowerCase();
  const token = localStorage.getItem('token');

  console.log('Current user role:', userRole);
  console.log('Allowed roles:', allowedRoles);

  if (!token || !userRole) {
    console.log('No token or role found, redirecting to login');
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.log('Role not allowed, redirecting to login');
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const userRole = localStorage.getItem('userRole')?.toLowerCase();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    window.location.href = '/';
  };

  return (
    <Router>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" sx={{ background: 'rgba(26, 35, 126, 0.9)', backdropFilter: 'blur(10px)' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              HRMS
            </Typography>
            {token && userRole === 'hr' && (
              <>
                <Button color="inherit" component={Link} to="/dashboard">
                  Dashboard
                </Button>
                <Button color="inherit" component={Link} to="/users">
                  User Management
                </Button>
                <Button color="inherit" component={Link} to="/attendance">
                  Attendance
                </Button>
              </>
            )}
            {token && userRole !== 'hr' && (
              <Button color="inherit" component={Link} to="/attendance">
                Attendance
              </Button>
            )}
            {token && (
              <Button 
                color="inherit" 
                onClick={handleLogout}
              >
                Logout
              </Button>
            )}
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ p: 3 }}>
          <Routes>
            <Route path="/" element={!token ? <Login /> : <Navigate to={userRole === 'hr' ? '/dashboard' : '/attendance'} />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute allowedRoles={['hr']}>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <PrivateRoute allowedRoles={['hr']}>
                  <UserManagement />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/attendance" 
              element={
                <PrivateRoute allowedRoles={['hr', 'user', 'employee']}>
                  <Attendance />
                </PrivateRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;
