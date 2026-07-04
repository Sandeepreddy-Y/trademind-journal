'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
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
  const [isLocalMode, setIsLocalMode] = useState(!isFirebaseEnabled);

  useEffect(() => {
    if (isFirebaseEnabled && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
          setIsLocalMode(false);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // LocalStorage Auth Fallback
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('trademind_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(null);
          }
        }
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    if (isFirebaseEnabled && auth) {
      await signInWithEmailAndPassword(auth, email, password);
      return;
    }

    // Local Mode simulation
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API delay
    const mockUser: AuthUser = {
      uid: 'local-trader-id',
      email: email,
      displayName: email.split('@')[0].toUpperCase(),
    };
    setUser(mockUser);
    localStorage.setItem('trademind_user', JSON.stringify(mockUser));
    setLoading(false);
  };

  const signup = async (email: string, password: string, name: string) => {
    if (isFirebaseEnabled && auth) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      setUser({
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: name,
      });
      return;
    }

    // Local Mode simulation
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockUser: AuthUser = {
      uid: 'local-trader-id',
      email: email,
      displayName: name,
    };
    setUser(mockUser);
    localStorage.setItem('trademind_user', JSON.stringify(mockUser));
    setLoading(false);
  };

  const loginWithGoogle = async () => {
    if (isFirebaseEnabled && auth) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return;
    }

    // Local Mode simulation
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const mockUser: AuthUser = {
      uid: 'google-local-trader',
      email: 'trader.joe@gmail.com',
      displayName: 'Trader Joe',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    };
    setUser(mockUser);
    localStorage.setItem('trademind_user', JSON.stringify(mockUser));
    setLoading(false);
  };

  const logout = async () => {
    if (isFirebaseEnabled && auth) {
      await signOut(auth);
      setUser(null);
      return;
    }

    // Local Mode
    localStorage.removeItem('trademind_user');
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    if (isFirebaseEnabled && auth) {
      await sendPasswordResetEmail(auth, email);
      return;
    }

    // Local Mode
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`Simulated reset password link sent to: ${email}`);
  };

  const updateDisplayName = async (name: string) => {
    if (isFirebaseEnabled && auth && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      setUser(prev => prev ? { ...prev, displayName: name } : null);
      return;
    }

    // Local Mode
    if (user) {
      const updated = { ...user, displayName: name };
      setUser(updated);
      localStorage.setItem('trademind_user', JSON.stringify(updated));
    }
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
