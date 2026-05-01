import dotenv from 'dotenv';
import path from 'path';

// ensure env is loaded first
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// now we can import db which relies on env vars
import { supabase } from './db';

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
    // If no rows, try to insert a test row to see if it complains about missing columns
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
