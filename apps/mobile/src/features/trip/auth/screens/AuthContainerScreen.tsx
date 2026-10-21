import React, { useState } from 'react';
import { router } from 'expo-router';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';

interface AuthContainerScreenProps {
  initialMode?: 'login' | 'register';
  onAuthSuccess?: () => void;
  onClose?: () => void;
}

export default function AuthContainerScreen({
  initialMode = 'login',
  onAuthSuccess,
  onClose,
}: AuthContainerScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const handleSuccess = () => {
    if (onAuthSuccess) {
      onAuthSuccess();
    } else {
      router.replace('/');
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (mode === 'register') {
    return (
      <RegisterScreen
        onSuccess={handleSuccess}
        onNavigateToLogin={() => setMode('login')}
        onClose={handleClose}
      />
    );
  }

  return (
    <LoginScreen
      onSuccess={handleSuccess}
      onNavigateToRegister={() => setMode('register')}
      onClose={handleClose}
    />
  );
}
