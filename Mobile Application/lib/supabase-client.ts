import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;



if (!supabaseUrl || !supabaseKey) throw new Error('Supabase config missing!');

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;