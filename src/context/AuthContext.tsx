'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, isFirebaseEnabled } from '../lib/firebase';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isLocalMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Initialize: Load user profile from REST API using stored JWT token
  useEffect(() => {
    const initializeAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('trademind_token') : null;
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser({
              uid: data.user.id,
              email: data.user.email,
              displayName: data.user.name,
              photoURL: data.user.avatar,
            });
          } else {
            localStorage.removeItem('trademind_token');
            setUser(null);
          }
        } else {
          localStorage.removeItem('trademind_token');
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
        // Do not delete token on network error to allow retries, but stop loading
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('trademind_token', data.token);
      setUser({
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.name,
        photoURL: data.user.avatar,
      });
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('trademind_token', data.token);
      setUser({
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.name,
        photoURL: data.user.avatar,
      });
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      let email = 'google.trader@example.com';
      let name = 'Google Trader';
      let avatar = '';

      // If Firebase is enabled, we can use it to get the Google credentials, then exchange for backend JWT
      if (isFirebaseEnabled && auth) {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(auth, provider);
        if (credential.user) {
          email = credential.user.email || email;
          name = credential.user.displayName || name;
          avatar = credential.user.photoURL || avatar;
        }
      } else {
        // Mock Google login in local/custom auth mode
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // Upsert user via backend login endpoint
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          email,
          name,
          avatar
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google login failed');
      }

      localStorage.setItem('trademind_token', data.token);
      setUser({
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.name,
        photoURL: data.user.avatar,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('trademind_token');
      if (token) {
        await fetch('/api/auth/me', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      localStorage.removeItem('trademind_token');
      setUser(null);
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reset password request failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateDisplayName = async (name: string) => {
    if (!user) throw new Error('Authentication required');
    
    // We can update locally first, and in production this would call an API
    setUser(prev => prev ? { ...prev, displayName: name } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLocalMode,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPassword,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
