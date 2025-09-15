import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'admin'>('login');

  const toggleMode = () => {
    if (mode === 'login') {
      setMode('register');
    } else if (mode === 'register') {
      setMode('login');
    } else {
      setMode('login');
    }
  };

  const switchToAdmin = () => {
    setMode('admin');
  };

  const switchToUser = () => {
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Auth App</h1>
          <p className="text-gray-600">Secure authentication system</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg p-1 shadow-soft">
            <button
              onClick={switchToUser}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode !== 'admin'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              User
            </button>
            <button
              onClick={switchToAdmin}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'admin'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Forms */}
        {mode === 'login' && <LoginForm onToggleMode={toggleMode} />}
        {mode === 'register' && <RegisterForm onToggleMode={toggleMode} />}
        {mode === 'admin' && <LoginForm onToggleMode={toggleMode} isAdmin={true} />}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2024 Auth App. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
