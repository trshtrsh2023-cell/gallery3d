import { createClient } from '@supabase/supabase-js';

const getUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set in environment variables');
  return url;
};

const getAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables');
  return key;
};

const getServiceKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  return key;
};

// Lazy singleton — only created on first call, not at module load time
let _client = null;
export const supabase = {
  get client() {
    if (!_client) _client = createClient(getUrl(), getAnonKey());
    return _client;
  },
  from: (table) => {
    if (!_client) _client = createClient(getUrl(), getAnonKey());
    return _client.from(table);
  },
  storage: {
    from: (bucket) => {
      if (!_client) _client = createClient(getUrl(), getAnonKey());
      return _client.storage.from(bucket);
    }
  }
};

// Admin client — created fresh each call (server-side only)
export const supabaseAdmin = () => createClient(getUrl(), getServiceKey());
