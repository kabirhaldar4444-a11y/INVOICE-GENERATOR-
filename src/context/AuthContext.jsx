import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';

const AuthContext = createContext();

// Detect if Supabase is fully configured
const useSupabase = 
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (useSupabase) {
      // 1. SUPABASE AUTH MODE
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // 2. TRIAL LOCAL STORAGE MODE
      const localSession = localStorage.getItem('invoisify_trial_session');
      if (localSession) {
        try {
          const parsed = JSON.parse(localSession);
          setUser(parsed.user);
          setSession(parsed);
          setProfile(parsed.profile);
        } catch (e) {
          console.error("Failed to parse trial session", e);
        }
      }
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    
    if (useSupabase) {
      // Supabase Sign In
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setLoading(false);
        throw error;
      }
      return data;
    } else {
      // Mock Trial Sign In (Accepts any email and password for seamless demoing)
      const mockUser = {
        id: 'trial-user-id',
        email: email || 'trial@example.com',
      };
      const mockProfile = {
        id: 'trial-user-id',
        email: email || 'trial@example.com',
        role: 'admin',
      };
      const trialSession = {
        access_token: 'trial-token',
        user: mockUser,
        profile: mockProfile,
      };

      localStorage.setItem('invoisify_trial_session', JSON.stringify(trialSession));
      setUser(mockUser);
      setSession(trialSession);
      setProfile(mockProfile);
      setLoading(false);
      return trialSession;
    }
  };

  const logout = async () => {
    setLoading(true);
    
    if (useSupabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setLoading(false);
        throw error;
      }
    } else {
      localStorage.removeItem('invoisify_trial_session');
    }

    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isTrialMode: !useSupabase
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
