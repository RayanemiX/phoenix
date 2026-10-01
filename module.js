// Page générique pour les modules pas encore développés (module.html?m=ID).
(async () => {
  Utils.showLoader('Chargement…');
  const user = await Auth.requireAuth(); if (!user) return;
  Layout.render(user);
  const mod = MODULES.find(m => m[0] === Layout.currentId());
  const PHASES = ['Fondations','Fournisseurs','Achats','Stocks & coûts','Négociation','Stratégie','IA','Progression'];
  let html;
  if (!mod) {
    html = '<h1>Module introuvable</h1><p class="muted">Ce module n\'existe pas.</p><a class="btn" href="dashboard.html">Retour au dashboard</a>';
  } else {
    const [, label, phase, desc] = mod;
    const steps = PHASES.map((p, i) => `<div class="${i + 1 < phase ? 'done' : i + 1 === phase ? 'current' : ''}">P${i + 1}<br>${p}</div>`).join('');
    html = `<div class="fade"><div class="row"><h1>${Utils.esc(label)}</h1><span class="badge">Phase ${phase}</span></div>
      <div class="card soon"><h3>Module en construction</h3><p>${Utils.esc(desc)}</p>
      <p>Il sera activé à la <b>phase ${phase}</b> du développement.</p><div class="steps">${steps}</div>
      <a class="btn" href="dashboard.html">Retour au dashboard</a></div></div>`;
  }
  document.getElementById('content').innerHTML = html;
  Utils.hideLoader();
})();
