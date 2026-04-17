import { supabase } from './server/db.js';

async function check() {
  const { data, error } = await supabase.from('users').select('id, full_name, wallet_balance').limit(5);
  console.log('Columns:', data);
  console.log('Error:', error);
}

check();
