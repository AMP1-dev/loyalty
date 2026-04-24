import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://orzuawmiuvthpczhbouj.supabase.co';
const supabaseAnonKey = 'sb_publishable_zzmvteYeo-4gty1CTabj-Q_7p2cea09';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);