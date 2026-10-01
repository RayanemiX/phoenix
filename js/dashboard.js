// Dashboard : les KPI avec un trait rouge seront branchés dans les phases suivantes.
const Dashboard = {
  async count(table, filter) {
    let q = sb.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = q.match(filter);
    const { count, error } = await q;
    return error ? null : count;
  },
  card(label, value, hint = '') {
    const v = (value === null || value === undefined) ? '<span class="dash"></span>' : value;
    return `<div class="card"><div class="label">${label}</div><div class="value">${v}</div><div class="hint">${hint}</div></div>`;
  },
  section(title, cards) { return `<h2>${title}</h2><div class="grid">${cards.join('')}</div>`; },
  async init() {
    Utils.showLoader('Chargement de ton espace…');
    const user = await Auth.requireAuth(); if (!user) return;
    Layout.render(user);
    const [total, active, risky, products] = await Promise.all([
      this.count('suppliers'), this.count('suppliers', { status: 'actif' }),
      this.count('suppliers', { risk_level: 'élevé' }), this.count('products')]);
    document.getElementById('content').innerHTML = `<div class="fade">
      <div class="row"><h1>Tableau de bord</h1><span class="grow"></span>
      <button class="btn" id="demo">Créer un cas de simulation</button>
      <button class="btn small outline" id="demo-del">Supprimer les données de simulation</button></div>
      ${this.section('Achats', [this.card('Spend total'), this.card('Savings'), this.card('Cost avoidance'), this.card('Commandes en cours'), this.card('RFQ en cours')])}
      ${this.section('Fournisseurs', [this.card('Fournisseurs', total), this.card('Actifs', active), this.card('À risque', risky), this.card('Performance moyenne')])}
      ${this.section('Stock', [this.card('Produits', products), this.card('Stock critique'), this.card('Ruptures'), this.card('Surstock')])}
      ${this.section('Apprentissage', [this.card('Cas réalisés'), this.card('Compétences pratiquées'), this.card('Progression')])}
      ${this.section('IA', [this.card('Dernières conversations'), this.card('Cas recommandé'), this.card('Prochaine compétence')])}</div>`;
    const b1 = document.getElementById('demo'), b2 = document.getElementById('demo-del');
    b1.onclick = () => Utils.withLoading(b1, 'Création en cours…', () => this.createDemo());
    b2.onclick = () => { if (confirm('Supprimer toutes les données de simulation ?')) Utils.withLoading(b2, 'Suppression…', () => this.deleteDemo()); };
    Utils.hideLoader();
  },
  async createDemo() {
    const rows = [
      { name: 'Fournisseur A (DONNÉE DE SIMULATION)', moq: 5000, lead_time_days: 20, unit_price: 80 },
      { name: 'Fournisseur B (DONNÉE DE SIMULATION)', moq: 10000, lead_time_days: 45, unit_price: 76 },
      { name: 'Fournisseur C (DONNÉE DE SIMULATION)', moq: 2000, lead_time_days: 15, unit_price: 84 }
    ].map(r => ({ ...r, company_name: 'Atlas Manufacturing (simulation)', currency: 'MAD', status: 'actif', is_demo: true,
      notes: 'DONNÉE DE SIMULATION — besoin : 10 000 composants industriels.' }));
    const { error } = await sb.from('suppliers').insert(rows);
    if (error) return Utils.toast(error.message, 'err');
    Utils.toast('Cas de simulation créé.'); await this.init();
  },
  async deleteDemo() {
    const { error } = await sb.from('suppliers').delete().eq('is_demo', true);
    if (error) return Utils.toast(error.message, 'err');
    Utils.toast('Données de simulation supprimées.'); await this.init();
  }
};
