'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // No session, redirect to login
          router.push('/admin-login');
          return;
        }
        
        // Check if user is in admin_users table
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', session.user.id)
          .single();
        
        if (adminError || !adminData) {
          // Not an admin, sign out and redirect
          await supabase.auth.signOut();
          router.push('/admin-login');
          return;
        }
        
        // User is authenticated and is an admin
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/admin-login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  // Add auth state listener for session changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          // Handle sign out
          setIsAuthenticated(false);
          router.push('/admin-login');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Verify admin status on sign in or token refresh
          try {
            const { data, error } = await supabase
              .from('admin_users')
              .select('id')
              .eq('id', session.user.id)
              .single();
              
            setIsAuthenticated(!!data && !error);
            if (!data || error) {
              router.push('/admin-login');
            }
          } catch (error) {
            console.error('Admin verification error:', error);
            setIsAuthenticated(false);
          }
        }
      }
    );

    return () => {
      // Clean up subscription
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  // Only render children if user is authenticated as admin
  return isAuthenticated ? children : null;
}