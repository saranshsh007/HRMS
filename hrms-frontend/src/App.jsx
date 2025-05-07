import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link, useNavigate } from 'react-router-dom';
import { Container, Box, AppBar, Toolbar, Typography, Button, CssBaseline, Paper } from '@mui/material';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import Attendance from './components/Attendance';
import Login from './components/Login';
import Register from './components/Register';
import NotificationBell from './components/NotificationBell';
import EmployeeLeaveRequests from './components/EmployeeLeaveRequests';
import './App.css'

// Protected route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Header component (defined outside of App)
function AppHeader({ isAuthenticated, userData, onLogout }) {
  const userRole = localStorage.getItem('userRole');
  
  return (
    <AppBar position="static" sx={{ bgcolor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(10px)' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {isAuthenticated ? (
            <Link to="/dashboard" style={{ textDecoration: 'none', color: 'white' }}>
              HR Management System
            </Link>
          ) : 'HR Management System'}
        </Typography>
        
        {isAuthenticated && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {userRole === 'HR' && (
                <>
                  <Button 
                    color="inherit" 
                    component={Link} 
                    to="/user-management"
                  >
                    Users
                  </Button>
                  <Button 
                    color="inherit" 
                    component={Link} 
                    to="/employee-leave-requests"
                  >
                    Leave Requests
                  </Button>
                </>
              )}
              <Button 
                color="inherit" 
                component={Link} 
                to="/attendance"
              >
                Attendance
              </Button>
              {userData && <NotificationBell userId={userData.id} />}
              <Button color="inherit" onClick={onLogout}>Logout</Button>
            </Box>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
  const [userId, setUserId] = useState(localStorage.getItem('userId'));
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    setToken(null);
    setUserRole(null);
    setUserId(null);
    window.location.href = '/login';
  };
  
  // Listen for storage events (for multi-tab logout)
  useEffect(() => {
    const handleStorageChange = () => {
      const currentToken = localStorage.getItem('token');
      if (token && !currentToken) {
        setToken(null);
        setUserRole(null);
        setUserId(null);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [token]);
  
  return (
    <Router>
      <Box 
        sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a237e 0%, #000000 100%)',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed'
        }}
      >
        <CssBaseline />
        
        <AppHeader 
          isAuthenticated={!!token} 
          userData={userId ? { id: userId } : null} 
          onLogout={handleLogout}
        />
        
        <Box component="main" sx={{ 
          p: 0, 
          height: 'calc(100vh - 64px)',  // Subtract the AppBar height
          overflow: 'auto'
        }}>
          <Routes>
            <Route 
              path="/login" 
              element={
                token ? <Navigate to="/dashboard" replace /> : <Login />
              } 
            />
            <Route 
              path="/register" 
              element={
                token ? <Navigate to="/dashboard" replace /> : <Register />
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user-management" 
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendance" 
              element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee-leave-requests" 
              element={
                <ProtectedRoute>
                  <EmployeeLeaveRequests />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={<Navigate to={token ? "/dashboard" : "/login"} replace />} 
            />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;
