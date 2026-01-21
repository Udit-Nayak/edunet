const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('⚠️  Supabase credentials missing in .env file');
  console.log('⚠️  File uploads will not work');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testConnection = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('❌ Supabase Storage Error:', error.message);
    } else {
      console.log('✅ Supabase Storage Connected');
      console.log(`📦 Available buckets: ${data.map(b => b.name).join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
  }
};

testConnection();

module.exports = supabase;
