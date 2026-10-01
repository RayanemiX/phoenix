# Phoenix By RayanemiX — Phase 1
1. Supabase : crée un projet, exécute `supabase/migrations/001_phase1_core.sql` (SQL Editor).
2. Authentication > URL Configuration : ajoute l'URL GitHub Pages dans Site URL / Redirect URLs.
3. Édite `js/config.js` (URL + clé anon).
4. Pousse le dossier sur GitHub, Settings > Pages > Deploy from branch (main, /root).
5. Edge Function (plus tard, avec Supabase CLI) : `supabase secrets set AI_API_KEY=xxx` puis `supabase functions deploy ai-assistant`.
