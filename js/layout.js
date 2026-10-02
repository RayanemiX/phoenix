// Sidebar + topbar. Un module est ACTIF quand sa phase vaut null : il ouvre alors <id>.html
// (sinon il ouvre la page "en construction" module.html?m=<id>).
const MODULES = [
  ['dashboard','Dashboard',null,''],
  ['suppliers','Fournisseurs',null,''],
  ['products','Produits',null,''],
  ['sourcing','Sourcing & Études de marché',null,''],
  ['purchases','Besoins & Achats',null,'Demandes d\'achat : besoin, quantité, budget, critères, validation.'],
  ['rfq','Appels d\'offres / RFQ',null,'RFI, RFQ, RFP, réception et comparaison des offres.'],
  ['orders','Commandes',null,'Purchase Orders, statuts, réceptions.'],
  ['inventory','Stocks & Approvisionnements',4,'Articles, point de commande, alertes et mouvements de stock.'],
  ['costs','Analyse des coûts',4,'Coût de revient, TCO, coût rendu import, scénarios.'],
  ['analytique','Comptabilité analytique',4,'Simulateur d\'entreprise : coûts directs/indirects, fixes/variables, scénarios.'],
  ['negotiation','Négociation',5,'Simulateur de négociation avec un fournisseur IA et analyse descriptive.'],
  ['specifications','Cahiers des charges',5,'Générateur de cahier des charges en 17 sections, export PDF.'],
  ['supplier-performance','Performance fournisseurs',5,'Scorecards, KPI, historique mensuel et alertes.'],
  ['strategy','Stratégie achats',6,'Segmentation, stratégies fournisseur, sourcing, dual sourcing.'],
  ['sustainability','Achats durables',6,'Évaluation RSE et comparaison de scénarios économiques/environnementaux.'],
  ['public-procurement','Marchés publics',6,'Simulations de consultation, offres, critères et attribution.'],
  ['risks','Risques fournisseurs',6,'Analyse et suivi des risques fournisseurs.'],
  ['cases','Cas pratiques IA',7,'AI Procurement Lab : cas générés par l\'IA, corrigés par un tuteur.'],
  ['regulations','Réglementation & Normes',7,'Base juridique et normative pédagogique, checklist de conformité.'],
  ['analytics','Indicateurs économiques',8,'Inflation, change, matières premières, transport.'],
  ['progression','Progression ESITH',8,'Compétences par semestre et par domaine, basées sur tes exercices.'],
  ['settings','Paramètres',8,'Profil, préférences, mode démo.']
];

const Layout = {
  currentId() {
    const f = location.pathname.split('/').pop().replace('.html', '');
    if (f === 'module') return new URLSearchParams(location.search).get('m');
    return f && f !== 'index' ? f : 'dashboard';
  },
  hrefOf(id, phase) { return phase === null ? id + '.html' : 'module.html?m=' + id; },
  render(user) {
    const cur = this.currentId();
    const items = MODULES.map(([id, label, phase]) =>
      `<a class="nav ${id === cur ? 'active' : ''}" href="${this.hrefOf(id, phase)}">${Utils.esc(label)}${phase ? `<small>P${phase}</small>` : ''}</a>`).join('');
    document.getElementById('app').innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="brand"><img class="logo" src="assets/logo.png" alt="" onerror="this.remove()">
          <div>${Utils.esc(CONFIG.APP_NAME)}<small>${Utils.esc(CONFIG.APP_SUBTITLE)}</small></div></div>${items}</aside>
      <div class="backdrop" onclick="document.getElementById('sidebar').classList.remove('open')"></div>
      <div class="main"><header class="topbar">
        <button class="burger" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
        <span class="grow"></span><span class="muted">${Utils.esc(user.email)}</span>
        <button class="btn small" onclick="Auth.logout()">Déconnexion</button></header>
        <main id="content"></main></div>`;
  }
};
