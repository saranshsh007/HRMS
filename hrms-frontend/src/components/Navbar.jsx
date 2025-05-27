import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Logout as LogoutIcon, Person as PersonIcon } from '@mui/icons-material';

const Navbar = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const isHR = userRole?.toLowerCase() === 'hr';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    navigate('/');
  };

  return (
    <AppBar position="static" sx={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white' }}>
          HRMS
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isHR ? (
            <>
              <Button 
                color="inherit" 
                onClick={() => navigate('/dashboard')}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  } 
                }}
              >
                Dashboard
              </Button>
              <Button 
                color="inherit" 
                onClick={() => navigate('/employees')}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  } 
                }}
              >
                Employees
              </Button>
              <Button 
                color="inherit" 
                onClick={() => navigate('/attendance')}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  } 
                }}
              >
                Attendance
              </Button>
              <Button 
                color="inherit" 
                onClick={() => navigate('/leave')}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  } 
                }}
              >
                Leave
              </Button>
              <Button 
                color="inherit" 
                onClick={() => navigate('/assets')}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  } 
                }}
              >
                Assets
              </Button>
              <Button 
                color="inherit" 
                onClick={() => navigate('/policies')}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  } 
                }}
              >
                Policies
              </Button>
            </>
          ) : (
            <Button 
              color="inherit" 
              onClick={() => navigate('/attendance')}
              startIcon={<PersonIcon />}
              sx={{ 
                '&:hover': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                } 
              }}
            >
              Personal Details
            </Button>
          )}
          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ 
              '&:hover': { 
                backgroundColor: 'rgba(255, 255, 255, 0.1)' 
              } 
            }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 