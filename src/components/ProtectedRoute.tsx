import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  fallback = <div>Access denied</div> 
}) => {
  const { user, userType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !userType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access this page.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && userType !== requiredRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => window.location.href = userType === 'admin' ? '/admin/dashboard' : '/dashboard'}
            className="btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
