import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hhttkidobrwwautenmva.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodHRraWRvYnJ3d2F1dGVubXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4OTI1ODYsImV4cCI6MjA3NzQ2ODU4Nn0.LjL-UyywqQjbiYrIuiD_TJGPQ81P4_YOhO7UizMjM2w";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
