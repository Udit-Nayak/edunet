const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const createDisabledClient = () => ({
  storage: {
    from: () => {
      throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    },
  },
});

let supabase = createDisabledClient();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('⚠️  Supabase credentials missing in .env file');
  console.log('⚠️  File uploads will not work');
} else {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Supabase client initialized');
  console.log('ℹ️  Storage access will be checked only when upload or file operations run');
}

module.exports = supabase;