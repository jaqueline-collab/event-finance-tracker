import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oseuaxctkxyalajimblh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZXVheGN0a3h5YWxhamltYmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzg4MjQsImV4cCI6MjA5NDgxNDgyNH0.UrCKKqb90rEQJ4XonkysgvAigLH1VxvMyzcE3YdwLCE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
