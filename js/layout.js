// Génère la sidebar + topbar. Pour ajouter un module : ajoute une ligne dans MODULES.
// phase = phase de développement où le module devient actif (null = déjà actif).
const MODULES = [
  ['Dashboard','dashboard.html',null],['Fournisseurs','pages/suppliers.html',2],
  ['Sourcing & Études de marché','pages/sourcing.html',2],['Besoins & Achats','pages/purchases.html',3],
  ["Appels d'offres / RFQ",'pages/rfq.html',3],['Commandes','pages/orders.html',3],
  ['Stocks & Approvisionnements','pages/inventory.html',4],['Analyse des coûts','pages/costs.html',4],
  ['Négociation','pages/negotiation.html',5],['Cahiers des charges','pages/specifications.html',5],
  ['Performance fournisseurs','pages/supplier-performance.html',5],['Stratégie achats','pages/strategy.html',6],
  ['Achats durables','pages/sustainability.html',6],['Marchés publics','pages/public-procurement.html',6],
  ['Risques fournisseurs','pages/risks.html',6],['Cas pratiques IA','pages/cases.html',7],
  ['Réglementation & Normes','pages/regulations.html',7],['Indicateurs économiques','pages/analytics.html',8],
  ['Comptabilité analytique','pages/costs.html#analytique',4],['Progression ESITH','pages/progression.html',8],
  ['Paramètres','pages/settings.html',8]
];
const Layout = {
  render(user, base = '') {
    const items = MODULES.map(([label, href, phase]) => phase
      ? `<span class="nav disabled" title="Disponible en phase ${phase}">${Utils.esc(label)} <small>P${phase}</small></span>`
      : `<a class="nav ${location.pathname.endsWith(href) ? 'active' : ''}" href="${base}${href}">${Utils.esc(label)}</a>`).join('');
    document.getElementById('app').innerHTML = `
      <aside class="sidebar" id="sidebar"><div class="brand">${CONFIG.APP_NAME}<small>${CONFIG.APP_SUBTITLE}</small></div>${items}</aside>
      <div class="main"><header class="topbar"><button class="burger" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
      <span class="grow"></span><span class="muted">${Utils.esc(user.email)}</span><button class="btn small" onclick="Auth.logout()">Déconnexion</button></header>
      <main id="content"></main></div>`;
  }
};
