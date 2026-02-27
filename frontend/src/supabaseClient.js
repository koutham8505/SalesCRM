// D:\SalesCRM\frontend\src\supabaseClient.js
/* eslint-disable react-refresh/only-export-components */
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
