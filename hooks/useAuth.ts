import { supabase } from '@/utils/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user) {
        try {
          setUserRole(session.user.user_metadata?.role || null);
        } catch (error: any) {
          console.error('Error fetching user role:', error.message);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [session]);

  return { session, userRole, loading };
}
