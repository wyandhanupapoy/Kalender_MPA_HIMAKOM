import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';

import { auth, db } from '../config/firebase-config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid) => {
    try {
      // First try to get directly by ID (new standard)
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const profileData = { id: userDocSnap.id, ...userDocSnap.data() };
        
        // Initialize isActive field for legacy users who don't have it
        if (profileData.isActive === undefined) {
          await setDoc(userDocRef, { isActive: true }, { merge: true });
          profileData.isActive = true;
        }
        
        return profileData;
      }

      // Fallback: queries for legacy users created with random IDs
      // This ensures backward compatibility while we migrate
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', uid), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const profileData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        
        // Initialize isActive field for legacy users who don't have it
        if (profileData.isActive === undefined) {
          const legacyUserDocRef = doc(db, 'users', snapshot.docs[0].id);
          await setDoc(legacyUserDocRef, { isActive: true }, { merge: true });
          profileData.isActive = true;
        }
        
        return profileData;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  };

  // Update last login timestamp
  const updateLastLogin = async (uid) => {
    if (!uid) return;
    try {
      await setDoc(doc(db, 'users', uid), { lastLogin: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('Error updating last login:', err);
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Wait for profile to be fetched before updating lastLogin
      // This ensures the profile snapshot listener has time to load full data
      await new Promise(resolve => setTimeout(resolve, 100));
      await updateLastLogin(userCredential.user.uid);
      return userCredential;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetPassword = async (email) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateUserProfile = async (updates) => {
    setError(null);
    try {
      if (currentUser) {
        if (updates.displayName || updates.photoURL) {
          await updateProfile(currentUser, {
            displayName: updates.displayName,
            photoURL: updates.photoURL
          });
        }
        await updateDoc(doc(db, 'users', currentUser.uid), {
          ...updates,
          updatedAt: serverTimestamp()
        });
        const updatedProfile = await fetchUserProfile(currentUser.uid);
        setUserProfile(updatedProfile);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Permission checking helpers
  const isAdmin = () => userProfile?.role === 'admin';
  const isPengurus = () => userProfile?.role === 'pengurus' || isAdmin();
  const isAnggota = () => userProfile?.role === 'anggota' || isPengurus();
  const isActive = () => {
    // Check if user has isActive field, default to true for backward compatibility
    return userProfile?.isActive !== false;
  };

  const hasPermission = (requiredRole) => {
    if (!userProfile || !isActive()) return false;
    const roleHierarchy = { admin: 3, pengurus: 2, anggota: 1 };
    const userRoleLevel = roleHierarchy[userProfile.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    return userRoleLevel >= requiredRoleLevel;
  };

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        console.log('User Profile Loaded:', profile); // Debug log
        console.log('isActive value:', profile?.isActive, 'Type:', typeof profile?.isActive); // Debug log
        setUserProfile(profile);
        setLoading(false); // Set loading false after profile is loaded
      } else {
        setUserProfile(null);
        setLoading(false); // Set loading false when no user
      }
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    isAdmin,
    isPengurus,
    isAnggota,
    isActive,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
