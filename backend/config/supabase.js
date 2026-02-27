// D:\SalesCRM\backend\config\supabase.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // service role key
  { db: { schema: "public" } }
);

module.exports = supabase;
