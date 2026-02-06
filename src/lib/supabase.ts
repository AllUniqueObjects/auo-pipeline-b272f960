import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://melbptgutajptxhpjeuv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbGJwdGd1dGFqcHR4aHBqZXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzg2NDAsImV4cCI6MjA4NTk1NDY0MH0.YVCUKgmavn9CNiXctYvxLiVMh9KDuKjv_t9wZB1K_Ms';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
