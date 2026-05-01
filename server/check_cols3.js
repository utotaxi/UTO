const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCols() {
  const { data, error } = await supabase
    .from('later_bookings')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    const { error: insertError } = await supabase
      .from('later_bookings')
      .insert([
        {
          rider_id: 'test_id',
          pickup_address: 'Test',
          dropoff_address: 'Test',
          pickup_at: new Date().toISOString(),
          dropoff_by: new Date().toISOString(),
          status: 'scheduled',
          passengers: 2,
          luggage: 2
        }
      ]);
    console.log('Insert error:', insertError);
  }
}

checkCols();
