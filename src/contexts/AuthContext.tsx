import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthContextType, User, Admin, LoginResponse, RegisterResponse } from '../types/auth';
import { authAPI } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | Admin | null>(null);
  const [userType, setUserType] = useState<'user' | 'admin' | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await authAPI.getCurrentUser();
          console.log('User data from server:', response); // Debug log
          
          // Check if response has user data or if it's the user object directly
          const userData = response.user || response;
          
          if (!userData) {
            throw new Error('No user data received');
          }
          
          setUser(userData);
          setUserType(userData.role === 'admin' ? 'admin' : 'user');
          setToken(storedToken);
        } catch (error) {
          console.error('Auth check error:', error);
          // Token is invalid, remove it
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setUserType(null);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response: LoginResponse = await authAPI.login(email, password);
      console.log('Login response:', response); // Debug log
      
      if (!response || !response.token) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('token', response.token);
      setToken(response.token);
      
      // Ensure we have user data in the response
      if (!response.user) {
        throw new Error('No user data received');
      }
      
      // Create a proper User object
      const userData: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: 'user' // Default role
      };
      
      setUser(userData);
      setUserType('user');
      
      return userData;
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response: LoginResponse = await authAPI.adminLogin(email, password);
      console.log('Admin login response:', response); // Debug log
      
      if (!response || !response.token) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('token', response.token);
      setToken(response.token);
      
      // Ensure we have user data in the response
      if (!response.user) {
        throw new Error('No admin data received');
      }
      
      // Create a proper Admin object (assuming Admin has same fields as User for now)
      const adminData: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: 'admin'
      };
      
      setUser(adminData);
      setUserType('admin');
      
      return adminData;
    } catch (error: any) {
      console.error('Admin login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Admin login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response: RegisterResponse = await authAPI.register(name, email, password);
      
      localStorage.setItem('token', response.token);
      setToken(response.token);
      setUser(response.user);
      setUserType('user');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setUserType(null);
    setError(null);
  };

  const value: AuthContextType = {
    user,
    userType,
    token,
    login,
    adminLogin,
    register,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
