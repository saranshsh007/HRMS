import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedRole = localStorage.getItem('userRole');
      const storedUserId = localStorage.getItem('userId');

      if (storedToken && storedRole && storedUserId) {
        try {
          const response = await axios.get(`${API_BASE_URL}/users/${storedUserId}`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser({
            ...response.data,
            role: storedRole,
            id: storedUserId
          });
          setToken(storedToken);
        } catch (error) {
          console.error('Error fetching user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userId');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const loginData = new URLSearchParams();
      loginData.append('username', email);
      loginData.append('password', password);

      const response = await axios.post(`${API_BASE_URL}/token`, loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, role, user_id } = response.data;
      
      // Store auth data
      localStorage.setItem('token', access_token);
      localStorage.setItem('userRole', role.toLowerCase());
      localStorage.setItem('userId', user_id);
      
      setToken(access_token);

      // Fetch user details
      const userResponse = await axios.get(`${API_BASE_URL}/users/${user_id}`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      setUser({
        ...userResponse.data,
        role: role.toLowerCase(),
        id: user_id
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 