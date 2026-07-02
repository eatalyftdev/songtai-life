import { createClient } from "@supabase/supabase-js";

// Public values — safe to include in client bundle (same pattern as Firebase config).
// The service role key is NEVER used here; it lives only in server.ts via env var.
const SUPABASE_URL = "https://auyjxchghtetxpiyecds.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eWp4Y2hnaHRldHhwaXllY2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMDIxNjksImV4cCI6MjA5ODU3ODE2OX0.KhNahEFCe4_l4a_2ucsOp9OFUXnmEBlYNZW33xSFnas";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
