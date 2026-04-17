import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('users').select('id, full_name, wallet_balance').order('updated_at', { ascending: false }).limit(2);
  if (error) {
    console.log('Error fetching wallet_balance:', error.message);
  } else {
    for (let d of data) {
      console.log(`User: ${d.id}, type of wallet_balance: ${typeof d.wallet_balance}, value:`, d.wallet_balance);
    }
  }
}
check();
