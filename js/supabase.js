// Crée le client Supabase unique utilisé par toute l'application.
const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
