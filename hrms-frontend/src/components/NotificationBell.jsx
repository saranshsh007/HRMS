import React, { useState, useEffect, useRef } from 'react';
import { 
  Badge, 
  IconButton, 
  Box, 
  Popover, 
  List, 
  ListItem, 
  ListItemText,
  Typography,
  Divider,
  Button 
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import axios from 'axios';
import { format, formatDistanceToNow } from 'date-fns';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

const NotificationBell = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  
  // For tracking if component is mounted
  const isMounted = useRef(true);
  // Track updates with state rather than ref
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Poll for notifications with improved polling
  useEffect(() => {
    if (!userId) return;
    
    const fetchNotifications = async () => {
      if (!isMounted.current) return;
      
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching notifications for user ID:', userId);
        console.log('Authorization token available:', !!token);
        
        // Get unread count
        const countResponse = await axios.get(`${API_BASE_URL}/notifications/unread-count`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            // Add cache-busting parameter
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          // Add timestamp parameter to prevent caching
          params: { t: Date.now() }
        });
        
        console.log('Unread count response:', countResponse.data);
        if (isMounted.current) {
          setUnreadCount(countResponse.data);
        }
        
        // Get all notifications regardless of whether popover is open
        // This ensures new notifications are detected
        const allNotificationsResponse = await axios.get(`${API_BASE_URL}/notifications/user`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          params: { t: Date.now() }
        });
        
        console.log('All notifications:', allNotificationsResponse.data);
        
        // Update notifications state even if popover is closed
        if (isMounted.current) {
          setNotifications(allNotificationsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        if (isMounted.current) {
          setError('Failed to load notifications');
        }
      }
    };
    
    // Fetch immediately on first render
    fetchNotifications();
    
    // And set up polling every 5 seconds (decreased from 10 seconds for more responsive updates)
    const interval = setInterval(() => {
      // Use state update instead of ref update
      setUpdateCounter(prev => prev + 1);
      fetchNotifications();
    }, 5000);
    
    // Cleanup
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [userId, updateCounter]); // Use updateCounter state instead of ref
  
  // Load all notifications when the popover opens
  useEffect(() => {
    if (anchorEl && userId) {
      const fetchAllNotifications = async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          const response = await axios.get(`${API_BASE_URL}/notifications/user`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            params: { t: Date.now() }
          });
          
          if (isMounted.current) {
            setNotifications(response.data);
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
          if (isMounted.current) {
            setError('Failed to load notifications');
          }
        } finally {
          if (isMounted.current) {
            setLoading(false);
          }
        }
      };
      
      fetchAllNotifications();
    }
  }, [anchorEl, userId]);
  
  // Set mounted ref to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/notifications/${notificationId}/mark-read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId ? { ...notification, read: true } : notification
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local state
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  const open = Boolean(anchorEl);
  
  const formatNotificationDate = (dateString) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  const getNotificationType = (message) => {
    if (message.toLowerCase().includes('leave request')) {
      return 'Leave Request';
    } else if (message.toLowerCase().includes('approved') || message.toLowerCase().includes('rejected')) {
      return 'Leave Update';
    } else {
      return 'Notification';
    }
  };
  
  const handleNotificationClick = (notification) => {
    // First mark as read if not already read
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (userRole === 'HR' && notification.message.toLowerCase().includes('leave request')) {
      handleClose();
      navigate('/employee-leave-requests');
    }
  };
  
  return (
    <Box>
      <IconButton 
        onClick={handleClick}
        sx={{ color: 'white' }}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          overlap="circular"
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            width: 320,
            maxHeight: 400,
            bgcolor: 'rgba(33, 33, 33, 0.95)',
            color: 'white',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>Notifications</Typography>
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={handleMarkAllAsRead}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { color: 'white' },
                textTransform: 'none'
              }}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        
        <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        
        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">Loading notifications...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="error">{error}</Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">No notifications</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <ListItem 
                key={notification.id} 
                alignItems="flex-start"
                onClick={() => handleNotificationClick(notification)}
                sx={{ 
                  cursor: 'pointer',
                  bgcolor: !notification.read ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  },
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: !notification.read ? 'bold' : 'normal',
                          color: 'white' 
                        }}
                      >
                        {notification.read ? null : (
                          <Box 
                            component="span" 
                            sx={{ 
                              display: 'inline-block', 
                              width: 8, 
                              height: 8, 
                              bgcolor: 'error.main', 
                              borderRadius: '50%', 
                              mr: 1 
                            }} 
                          />
                        )}
                        {getNotificationType(notification.message)}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                      >
                        {formatNotificationDate(notification.created_at)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        mt: 0.5
                      }}
                    >
                      {notification.message}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </Box>
  );
};

export default NotificationBell; 