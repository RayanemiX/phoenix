// Couche abstraite AIService : pour changer de fournisseur IA, modifie seulement ce fichier
// (ou la variable AI_PROVIDER). La clé vit dans les secrets Supabase, jamais dans le code.
export interface ChatMessage { role: "user" | "assistant"; content: string }

export async function askAI(system: string, messages: ChatMessage[]): Promise<string> {
  const provider = Deno.env.get("AI_PROVIDER") ?? "anthropic";
  const key = Deno.env.get("AI_API_KEY");
  if (!key) throw new Error("AI_API_KEY manquante (supabase secrets set AI_API_KEY=...)");
  if (provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("AI_MODEL") ?? "claude-sonnet-4-6", max_tokens: 1500, system, messages }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message ?? "Erreur API IA");
    return j.content.map((c: any) => c.text ?? "").join("");
  }
  throw new Error(`Fournisseur IA inconnu : ${provider}`); // ajoute ici openai, mistral, etc.
}
