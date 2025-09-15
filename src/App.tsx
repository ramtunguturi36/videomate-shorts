import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import LandingPage from './components/LandingPage';
import AuthPage from './components/auth/AuthPage';
import UserDashboard from './components/dashboard/UserDashboard';
import AdminDashboard from './components/dashboard/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

const AppRoutes: React.FC = () => {
  const { user, userType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={<LandingPage />} 
      />
      <Route 
        path="/login" 
        element={!user ? <AuthPage /> : <Navigate to={userType === 'admin' ? '/admin/dashboard' : '/dashboard'} />} 
      />
      
      {/* Protected user routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requiredRole="user">
            <UserDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Protected admin routes */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all route */}
      <Route 
        path="*" 
        element={<Navigate to="/" replace />} 
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
