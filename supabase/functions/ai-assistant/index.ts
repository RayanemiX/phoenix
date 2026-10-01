import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { askAI } from "../_shared/ai-service.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // Le client agit AU NOM de l'utilisateur : la RLS s'applique aux données lues.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Non authentifié", { status: 401, headers: cors });

    const { messages } = await req.json();
    const { data: suppliers } = await supabase.from("suppliers").select("name,country,unit_price,moq,lead_time_days,risk_level,is_demo").limit(30);
    const system = `Tu es ProcureAI, tuteur professionnel en achats et sourcing (Licence ESITH). Réponds en français.
Guide l'étudiant à raisonner, ne donne pas la réponse directement. N'invente jamais de données réelles.
Contexte (données de l'utilisateur, is_demo=true = simulation) : ${JSON.stringify(suppliers ?? [])}`;
    const reply = await askAI(system, messages);
    return new Response(JSON.stringify({ reply }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
