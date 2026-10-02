// Module Fournisseurs : liste, filtres, création/modification, fiche détaillée (contacts + historique).
const Suppliers = {
  INCOTERMS: ['', 'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'],
  CURRENCIES: ['MAD', 'EUR', 'USD', 'CNY', 'TRY', 'GBP'],
  STATUSES: ['prospect', 'actif', 'suspendu', 'inactif'],
  RISKS: ['', 'faible', 'moyen', 'élevé'],
  get FIELDS() { return [
    { name: 'name', label: 'Nom *', required: true }, { name: 'company_name', label: 'Entreprise' },
    { name: 'country', label: 'Pays' }, { name: 'region', label: 'Région' }, { name: 'city', label: 'Ville' },
    { name: 'sector', label: 'Secteur' }, { name: 'category', label: 'Catégorie' },
    { name: 'products_text', label: 'Produits proposés', wide: true },
    { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Téléphone' }, { name: 'website', label: 'Site web' },
    { name: 'certifications', label: 'Certifications (séparées par des virgules)', type: 'tags' },
    { name: 'capacity', label: 'Capacité' }, { name: 'moq', label: 'MOQ', type: 'number' },
    { name: 'currency', label: 'Devise', type: 'select', options: this.CURRENCIES },
    { name: 'unit_price', label: 'Prix unitaire', type: 'number' }, { name: 'lead_time_days', label: 'Délai moyen (jours)', type: 'number' },
    { name: 'payment_terms', label: 'Conditions de paiement' }, { name: 'incoterms', label: 'Incoterm', type: 'select', options: this.INCOTERMS },
    { name: 'quality_score', label: 'Qualité (0-100)', type: 'number' }, { name: 'performance_score', label: 'Performance (0-100)', type: 'number' },
    { name: 'risk_level', label: 'Niveau de risque', type: 'select', options: this.RISKS },
    { name: 'status', label: 'Statut', type: 'select', options: this.STATUSES },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true }]; },
  all: [], view: [],

  async load() { this.all = UI.ok(await sb.from('suppliers').select('*').order('created_at', { ascending: false })); },
  async reload() { await this.load(); this.renderTable(); },

  async init() {
    await UI.page(async (u, c) => {
      await this.load();
      const opts = a => a.filter(Boolean).map(o => `<option>${o}</option>`).join('');
      c.innerHTML = `<div class="fade"><div class="row"><h1>Fournisseurs</h1><span class="grow"></span>
        <button class="btn small outline" id="exp">Exporter CSV</button><button class="btn" id="add">+ Nouveau fournisseur</button></div>
        <div class="filters"><input id="q" placeholder="Rechercher (nom, pays, produit…)">
        <select id="fs"><option value="">Tous les statuts</option>${opts(this.STATUSES)}</select>
        <select id="fr"><option value="">Tous les risques</option>${opts(this.RISKS)}</select></div>
        <div class="tablewrap" id="tbl"></div></div>`;
      ['q', 'fs', 'fr'].forEach(id => $(id).oninput = () => this.renderTable());
      $('add').onclick = () => this.form();
      $('exp').onclick = () => UI.csv('fournisseurs.csv', this.view.map(s => ({ Nom: s.name, Entreprise: s.company_name, Pays: s.country, Ville: s.city, Catégorie: s.category, Prix: s.unit_price, Devise: s.currency, MOQ: s.moq, 'Délai (j)': s.lead_time_days, Incoterm: s.incoterms, Certifications: s.certifications, Performance: s.performance_score, Risque: s.risk_level, Statut: s.status })));
      $('tbl').onclick = e => {
        const b = e.target.closest('button[data-act]'); if (!b) return;
        const s = this.all.find(x => x.id === b.dataset.id);
        if (b.dataset.act === 'view') this.detail(s.id);
        if (b.dataset.act === 'edit') this.form(s);
        if (b.dataset.act === 'del' && confirm(`Supprimer « ${s.name} » et tout son historique ?`))
          sb.from('suppliers').delete().eq('id', s.id).then(r => { if (r.error) Utils.toast(r.error.message, 'err'); else { Utils.toast('Fournisseur supprimé.'); this.reload(); } });
      };
      this.renderTable();
    });
  },

  renderTable() {
    const q = $('q').value.toLowerCase(), st = $('fs').value, rk = $('fr').value;
    this.view = this.all.filter(s => (!st || s.status === st) && (!rk || s.risk_level === rk) &&
      (!q || [s.name, s.company_name, s.country, s.city, s.category, s.products_text].join(' ').toLowerCase().includes(q)));
    $('tbl').innerHTML = !this.view.length ? '<p class="empty">Aucun fournisseur. Clique sur « + Nouveau fournisseur » ou crée un cas de simulation depuis le dashboard.</p>' :
      `<table><thead><tr><th>Nom</th><th>Pays</th><th>Catégorie</th><th>Prix</th><th>MOQ</th><th>Délai</th><th>Perf.</th><th>Risque</th><th>Statut</th><th></th></tr></thead><tbody>${this.view.map(s => `<tr>
      <td><b>${Utils.esc(s.name)}</b>${UI.demoTag(s)}<div class="muted">${Utils.esc(s.company_name || '')}</div></td>
      <td>${Utils.esc(s.country || '—')}</td><td>${Utils.esc(s.category || '—')}</td>
      <td>${s.unit_price ?? '—'} ${s.unit_price != null ? Utils.esc(s.currency || '') : ''}</td><td>${s.moq ?? '—'}</td><td>${s.lead_time_days != null ? s.lead_time_days + ' j' : '—'}</td>
      <td>${s.performance_score ?? '—'}</td><td>${UI.riskBadge(s.risk_level)}</td><td>${UI.statusBadge(s.status)}</td>
      <td class="act"><button class="link-btn" data-act="view" data-id="${s.id}">Fiche</button> <button class="link-btn" data-act="edit" data-id="${s.id}">Modifier</button> <button class="link-btn" data-act="del" data-id="${s.id}">Supprimer</button></td></tr>`).join('')}</tbody></table>`;
  },

  form(s) {
    UI.modal({ title: s ? 'Modifier le fournisseur' : 'Nouveau fournisseur', fields: this.FIELDS, values: s || { currency: 'MAD', status: 'prospect' },
      onSubmit: async v => {
        UI.ok(s ? await sb.from('suppliers').update(v).eq('id', s.id) : await sb.from('suppliers').insert(v));
        Utils.toast('Fournisseur enregistré.'); await this.reload();
      } });
  },

  async detail(id) {
    const s = this.all.find(x => x.id === id);
    const [contacts, events] = (await Promise.all([
      sb.from('supplier_contacts').select('*').eq('supplier_id', id).order('created_at'),
      sb.from('supplier_events').select('*').eq('supplier_id', id).order('event_date', { ascending: false })])).map(UI.ok);
    const info = [['Entreprise', s.company_name], ['Pays / Ville', [s.country, s.city].filter(Boolean).join(' / ')], ['Région', s.region], ['Secteur', s.sector], ['Catégorie', s.category],
      ['Produits', s.products_text], ['Email', s.email], ['Téléphone', s.phone], ['Site web', s.website], ['Certifications', (s.certifications || []).join(', ')], ['Capacité', s.capacity],
      ['MOQ', s.moq], ['Prix unitaire', s.unit_price != null ? s.unit_price + ' ' + (s.currency || '') : null], ['Délai (jours)', s.lead_time_days], ['Paiement', s.payment_terms],
      ['Incoterm', s.incoterms], ['Qualité', s.quality_score], ['Performance', s.performance_score], ['Risque', s.risk_level], ['Statut', s.status], ['Notes', s.notes]];
    const p = UI.panel(s.name, `<div class="kv">${info.map(([k, v]) => `<div><span class="k">${k}</span><b>${Utils.esc(v ?? '—')}</b></div>`).join('')}</div>
      <div class="sec"><h4>Contacts</h4><span class="grow"></span><button class="btn small" id="add-c">+ Contact</button></div>
      ${contacts.length ? `<div class="tablewrap"><table>${contacts.map(c => `<tr><td><b>${Utils.esc(c.name)}</b></td><td>${Utils.esc(c.role || '')}</td><td>${Utils.esc(c.email || '')}</td><td>${Utils.esc(c.phone || '')}</td><td class="act"><button class="link-btn" data-t="supplier_contacts" data-id="${c.id}">Supprimer</button></td></tr>`).join('')}</table></div>` : '<p class="muted">Aucun contact.</p>'}
      <div class="sec"><h4>Historique (incidents, évaluations, offres…)</h4><span class="grow"></span><button class="btn small" id="add-e">+ Événement</button></div>
      ${events.length ? `<div class="tablewrap"><table>${events.map(e => `<tr><td>${Utils.esc(e.event_date || '')}</td><td>${UI.badge(e.event_type, e.event_type === 'incident' ? 'bad' : 'info')}</td><td><b>${Utils.esc(e.title)}</b><div class="muted">${Utils.esc(e.details || '')}</div></td><td class="act"><button class="link-btn" data-t="supplier_events" data-id="${e.id}">Supprimer</button></td></tr>`).join('')}</table></div>` : '<p class="muted">Aucun événement.</p>'}`);
    const refresh = () => { p.close(); this.detail(id); };
    p.el.querySelector('#add-c').onclick = () => UI.modal({ title: 'Nouveau contact', fields: [
      { name: 'name', label: 'Nom *', required: true }, { name: 'role', label: 'Fonction' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Téléphone' }],
      onSubmit: async v => { UI.ok(await sb.from('supplier_contacts').insert({ ...v, supplier_id: id })); refresh(); } });
    p.el.querySelector('#add-e').onclick = () => UI.modal({ title: 'Nouvel événement', values: { event_type: 'note', event_date: new Date().toISOString().slice(0, 10) }, fields: [
      { name: 'event_type', label: 'Type', type: 'select', options: ['incident', 'évaluation', 'offre', 'commande', 'négociation', 'note'] }, { name: 'event_date', label: 'Date', type: 'date' },
      { name: 'title', label: 'Titre *', required: true, wide: true }, { name: 'details', label: 'Détails', type: 'textarea', wide: true }],
      onSubmit: async v => { UI.ok(await sb.from('supplier_events').insert({ ...v, supplier_id: id })); refresh(); } });
    p.el.querySelectorAll('button[data-t]').forEach(b => b.onclick = async () => {
      if (!confirm('Supprimer cet élément ?')) return;
      UI.ok(await sb.from(b.dataset.t).delete().eq('id', b.dataset.id)); refresh();
    });
  }
};
