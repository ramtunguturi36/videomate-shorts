import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DebugInfo: React.FC = () => {
  const { user, userType, token, loading } = useAuth();
  
  const apiUrl = import.meta.env.VITE_API_URL;
  const currentUrl = window.location.href;
  const localStorageToken = localStorage.getItem('token');

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <div><strong>API URL:</strong> {apiUrl || 'Not set'}</div>
        <div><strong>Current URL:</strong> {currentUrl}</div>
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        <div><strong>User:</strong> {user ? user.name || user.email : 'None'}</div>
        <div><strong>User Type:</strong> {userType || 'None'}</div>
        <div><strong>Token:</strong> {token ? 'Present' : 'None'}</div>
        <div><strong>LocalStorage Token:</strong> {localStorageToken ? 'Present' : 'None'}</div>
      </div>
    </div>
  );
};

export default DebugInfo;
