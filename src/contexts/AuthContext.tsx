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
          setUser(response.user);
          setUserType(response.userType);
          setToken(storedToken);
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setUserType(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response: LoginResponse = await authAPI.login(email, password);
      
      localStorage.setItem('token', response.token);
      setToken(response.token);
      setUser(response.user!);
      setUserType('user');
      
      // Don't redirect here - let the App component handle routing
      // The App component will automatically redirect based on user state
    } catch (error: any) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response: LoginResponse = await authAPI.adminLogin(email, password);
      
      localStorage.setItem('token', response.token);
      setToken(response.token);
      setUser(response.admin!);
      setUserType('admin');
      
      // Don't redirect here - let the App component handle routing
      // The App component will automatically redirect based on user state
    } catch (error: any) {
      setError(error.response?.data?.message || 'Admin login failed');
      throw error;
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
