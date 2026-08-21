const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function run() {
  const { data, error } = await supabase.rpc("exec_sql", {
    query:
      "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS council_licence text, ADD COLUMN IF NOT EXISTS tax_settings jsonb;",
  });
  console.log("Result:", data, error);
}
run();
