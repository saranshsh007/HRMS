import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link, useNavigate } from 'react-router-dom';
import { Container, Box, AppBar, Toolbar, Typography, Button, CssBaseline, Paper } from '@mui/material';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import Attendance from './components/Attendance';
import Login from './components/Login';
import EmployeeLeaveRequests from './components/EmployeeLeaveRequests';
import AssetAllocation from './components/AssetAllocation';
import PolicyManagement from './components/PolicyManagement';
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
function AppHeader({ isAuthenticated, userData, userRole, onLogout }) {
  return (
    <AppBar position="static" sx={{ 
      bgcolor: 'rgba(0, 0, 0, 0.5)', 
      backdropFilter: 'blur(10px)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <Toolbar sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        px: { xs: 2, sm: 4 }
      }}>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 'bold',
            letterSpacing: '0.5px'
          }}
        >
          {isAuthenticated ? (
            userRole?.toLowerCase() === 'hr' ? (
            <Link to="/dashboard" style={{ textDecoration: 'none', color: 'white' }}>
              HR Management System
            </Link>
            ) : (
              <Link to="/attendance" style={{ textDecoration: 'none', color: 'white' }}>
                Employee Portal
              </Link>
            )
          ) : 'HR Management System'}
        </Typography>
        
        {isAuthenticated && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 2 },
            flexWrap: 'nowrap'
          }}>
            {userRole?.toLowerCase() === 'hr' ? (
                <>
                  <Button 
                    color="inherit" 
                    component={Link} 
                    to="/user-management"
                  sx={{ 
                    minWidth: 'auto',
                    px: { xs: 1, sm: 2 },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  >
                    Users
                  </Button>
                  <Button 
                  color="inherit"
                    component={Link} 
                    to="/employee-leave-requests"
                    sx={{
                    minWidth: 'auto',
                    px: { xs: 1, sm: 2 },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  Leave Requests
                </Button>
                <Button 
                  color="inherit"
                  component={Link} 
                  to="/asset-allocation"
                  sx={{ 
                    minWidth: 'auto',
                    px: { xs: 1, sm: 2 },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  Assets
                </Button>
                <Button 
                  color="inherit"
                  component={Link} 
                  to="/policy-management"
                  sx={{ 
                    minWidth: 'auto',
                    px: { xs: 1, sm: 2 },
                      '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                    }}
                  >
                  Policies
                  </Button>
                </>
            ) : null}
              <Button 
                color="inherit" 
                component={Link} 
                to="/attendance"
              sx={{ 
                minWidth: 'auto',
                px: { xs: 1, sm: 2 },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              >
              Personal Information
              </Button>
            <Button 
              color="inherit" 
              onClick={onLogout}
              sx={{ 
                minWidth: 'auto',
                px: { xs: 1, sm: 2 },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Logout
            </Button>
            </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
  const [userId, setUserId] = useState(localStorage.getItem('userId'));
  
  // Add effect to update state when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const currentToken = localStorage.getItem('token');
      const currentRole = localStorage.getItem('userRole');
      const currentUserId = localStorage.getItem('userId');
      
      setToken(currentToken);
      setUserRole(currentRole);
      setUserId(currentUserId);
    };
    
    // Initial check
    handleStorageChange();
    
    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    setToken(null);
    setUserRole(null);
    setUserId(null);
    window.location.href = '/login';
  };
  
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
          userRole={userRole}
          onLogout={handleLogout}
        />
        
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Routes>
            <Route path="/login" element={!token ? <Login /> : <Navigate to={userRole?.toLowerCase() === 'hr' ? '/dashboard' : '/attendance'} />} />
            
            {/* HR Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                {userRole?.toLowerCase() === 'hr' ? <Dashboard /> : <Navigate to="/attendance" />}
              </ProtectedRoute>
            } />
            <Route path="/user-management" element={
              <ProtectedRoute>
                {userRole?.toLowerCase() === 'hr' ? <UserManagement /> : <Navigate to="/attendance" />}
              </ProtectedRoute>
            } />
            <Route path="/employee-leave-requests" element={
                <ProtectedRoute>
                {userRole?.toLowerCase() === 'hr' ? <EmployeeLeaveRequests /> : <Navigate to="/attendance" />}
                </ProtectedRoute>
            } />
            <Route path="/asset-allocation" element={
                <ProtectedRoute>
                {userRole?.toLowerCase() === 'hr' ? <AssetAllocation /> : <Navigate to="/attendance" />}
                </ProtectedRoute>
            } />
            <Route path="/policy-management" element={
                <ProtectedRoute>
                {userRole?.toLowerCase() === 'hr' ? <PolicyManagement /> : <Navigate to="/attendance" />}
                </ProtectedRoute>
            } />
            
            {/* Employee Routes */}
            <Route path="/attendance" element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
            } />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to={token ? (userRole?.toLowerCase() === 'hr' ? '/dashboard' : '/attendance') : '/login'} />} />
            <Route path="*" element={<Navigate to={token ? (userRole?.toLowerCase() === 'hr' ? '/dashboard' : '/attendance') : '/login'} />} />
          </Routes>
        </Container>
      </Box>
    </Router>
  );
}

export default App;
