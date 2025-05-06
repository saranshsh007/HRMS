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
  const userRole = localStorage.getItem('userRole');
  if (!userRole) {
    return <Navigate to="/" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const userRole = localStorage.getItem('userRole');

  return (
    <Router>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" sx={{ background: 'rgba(26, 35, 126, 0.9)', backdropFilter: 'blur(10px)' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              HRMS
            </Typography>
            {userRole === 'hr' && (
              <>
                <Button color="inherit" component={Link} to="/dashboard">
                  Dashboard
                </Button>
                <Button color="inherit" component={Link} to="/users">
                  User Management
                </Button>
              </>
            )}
            {userRole === 'user' && (
              <Button color="inherit" component={Link} to="/attendance">
                Attendance
              </Button>
            )}
            {userRole && (
              <Button 
                color="inherit" 
                onClick={() => {
                  localStorage.removeItem('userRole');
                  window.location.href = '/';
                }}
              >
                Logout
              </Button>
            )}
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ p: 3 }}>
          <Routes>
            <Route path="/" element={<Login />} />
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
                <PrivateRoute allowedRoles={['user', 'hr']}>
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
