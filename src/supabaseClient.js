import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

console.log('🔍 Supabase URL:', supabaseUrl);
console.log('🔍 Supabase Key prefix:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase env variables missing! Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
