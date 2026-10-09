import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { 
  authenticateBiometrics, 
  enrollBiometrics, 
  disableBiometrics, 
  isBiometricEnrolled, 
  getEnrolledBiometricUser,
  isPlatformAuthenticatorAvailable
} from '../utils/biometricAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_user');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('apex_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If token exists, sync active session profile with backend in background
    if (token) {
      authApi.getMe()
        .then(res => {
          if (res && res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('apex_user', JSON.stringify(res.user));
          }
        })
        .catch(err => {
          // Do NOT log out on network hiccups, offline mode, or aborted fetches.
          // Hard session invalidation (401) is handled centrally by 'auth:unauthorized'.
          console.warn('[AuthContext] Background profile sync note:', err?.message || 'offline');
        });
    }
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (identifier, password, role) => {
    setLoading(true);
    try {
      const res = await authApi.login({ identifier, password, role });
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('apex_token', res.token);
        localStorage.setItem('apex_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message || 'Login failed.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await authApi.register(userData);
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('apex_token', res.token);
        localStorage.setItem('apex_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message || 'Registration failed.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (_) {
      // Ignore network errors during logout
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('apex_token');
    localStorage.removeItem('apex_user');
    sessionStorage.clear();

    // Clear document cookies if any
    try {
      document.cookie.split(';').forEach(c => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('apex:auth_logout'));
  };

  const updateCurrentUser = (updatedFields) => {
    setUser(prev => {
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('apex_user', JSON.stringify(merged));
      return merged;
    });
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res && res.success && res.user) {
        setUser(res.user);
        localStorage.setItem('apex_user', JSON.stringify(res.user));
        return res.user;
      }
    } catch (e) {
      console.warn('Failed to refresh user:', e.message);
    }
    return null;
  };

  const loginWithBiometrics = async () => {
    setLoading(true);
    try {
      const res = await authenticateBiometrics();
      if (res && res.success && res.token && res.user) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('apex_token', res.token);
        localStorage.setItem('apex_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
      return { success: false, message: res?.message || 'Biometric authentication failed.' };
    } catch (err) {
      return { success: false, message: err.message || 'Fingerprint verification failed.' };
    } finally {
      setLoading(false);
    }
  };

  const enrollUserBiometrics = async () => {
    if (!user || !token) {
      throw new Error('You must be signed in to enroll fingerprint authentication.');
    }
    return await enrollBiometrics(user, token);
  };

  const disableUserBiometrics = () => {
    return disableBiometrics();
  };

  const isAuthenticated = !!(user && token);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      role: user?.role, 
      isAuthenticated, 
      login, 
      loginWithBiometrics,
      enrollUserBiometrics,
      disableUserBiometrics,
      isBiometricEnrolled,
      getEnrolledBiometricUser,
      isPlatformAuthenticatorAvailable,
      register, 
      logout, 
      updateCurrentUser,
      refreshUser,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
