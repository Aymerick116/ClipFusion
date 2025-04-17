import { supabase } from './supabaseClient';

export const logout = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};