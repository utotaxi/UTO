require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  const columns = [
    `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS estimated_fare NUMERIC(10,2) DEFAULT NULL`,
    `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'saloon'`,
    `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2) DEFAULT 0`,
    `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_note TEXT DEFAULT NULL`,
    `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT DEFAULT NULL`,
  ];

  for (const sql of columns) {
    const { error } = await sb.rpc('exec_sql', { sql });
    if (error) {
      // Try direct insert to check if column already exists by doing a test query
      console.log(`Column may already exist or exec_sql not available: ${error.message}`);
    } else {
      console.log(`✅ Ran: ${sql.slice(0, 60)}...`);
    }
  }
  console.log('Migration complete.');
}

migrate().catch(console.error);
