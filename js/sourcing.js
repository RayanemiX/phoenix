// Module Sourcing : (1) études de marché  (2) recherche avancée + comparaison de fournisseurs.
const Sourcing = {
  TYPES: ['fabricant', 'distributeur', 'grossiste', 'négociant', 'autre'],
  sel: new Set(), all: [], res: [],
  get STUDY_FIELDS() { return [
    { name: 'title', label: "Titre de l'étude *", required: true }, { name: 'product_name', label: 'Produit recherché *', required: true },
    { name: 'category', label: "Famille d'achat" }, { name: 'country', label: 'Pays ciblé' }, { name: 'sector', label: 'Secteur' },
    { name: 'quantity', label: 'Quantité', type: 'number' }, { name: 'budget', label: 'Budget (MAD)', type: 'number' },
    { name: 'status', label: 'Statut', type: 'select', options: ['en cours', 'terminée'] },
    { name: 'constraints', label: 'Contraintes', type: 'textarea', wide: true }]; },
  get MS_FIELDS() { return [
    { name: 'name', label: 'Nom *', required: true }, { name: 'supplier_type', label: 'Type', type: 'select', options: this.TYPES },
    { name: 'country', label: 'Pays' }, { name: 'price', label: 'Prix', type: 'number' },
    { name: 'currency', label: 'Devise', type: 'select', options: Suppliers.CURRENCIES }, { name: 'moq', label: 'MOQ', type: 'number' },
    { name: 'lead_time_days', label: 'Délai (jours)', type: 'number' }, { name: 'capacity', label: 'Capacité' },
    { name: 'certifications', label: 'Certifications (virgules)', type: 'tags' }, { name: 'payment_terms', label: 'Conditions de paiement' },
    { name: 'incoterm', label: 'Incoterm', type: 'select', options: Suppliers.INCOTERMS }, { name: 'reputation', label: 'Réputation' },
    { name: 'risk_level', label: 'Risque', type: 'select', options: Suppliers.RISKS }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }]; },

  async init() {
    await UI.page(async (u, c) => {
      c.innerHTML = `<div class="fade"><h1>Sourcing & Études de marché</h1>
        <div class="ptabs"><button data-t="studies" class="active">Études de marché</button><button data-t="search">Recherche & comparaison</button></div><div id="tabbody"></div></div>`;
      c.querySelectorAll('.ptabs button').forEach(b => b.onclick = async () => {
        c.querySelectorAll('.ptabs button').forEach(x => x.classList.toggle('active', x === b));
        try { b.dataset.t === 'studies' ? await this.studies() : await this.search(); } catch (e) { Utils.toast(e.message, 'err'); }
      });
      await this.studies();
    });
  },

  // ---------- Onglet 1 : études ----------
  async studies() {
    const rows = UI.ok(await sb.from('market_studies').select('*').order('created_at', { ascending: false }));
    $('tabbody').innerHTML = `<div class="row" style="margin:14px 0"><span class="grow muted">Une étude = un besoin + les fournisseurs que tu as trouvés pour y répondre.</span><button class="btn" id="new-study">+ Nouvelle étude</button></div>` +
      (rows.length ? `<div class="grid">${rows.map(s => `<div class="card clickable" data-id="${s.id}"><div class="label"><b>${Utils.esc(s.title)}</b>${UI.demoTag(s)}</div>
        <div class="value" style="font-size:1rem">${Utils.esc(s.product_name)}</div><div class="hint">${Utils.esc([s.country, s.sector].filter(Boolean).join(' · '))} ${UI.badge(s.status, s.status === 'terminée' ? 'ok' : 'info')}</div></div>`).join('')}</div>` : '<p class="empty">Aucune étude de marché. Crée-en une pour commencer.</p>');
    $('new-study').onclick = () => UI.modal({ title: 'Nouvelle étude de marché', fields: this.STUDY_FIELDS, values: { status: 'en cours' },
      onSubmit: async v => { UI.ok(await sb.from('market_studies').insert(v)); await this.studies(); } });
    document.querySelectorAll('#tabbody .card[data-id]').forEach(el => el.onclick = () => this.study(el.dataset.id));
  },

  async study(id) {
    const s = UI.ok(await sb.from('market_studies').select('*').eq('id', id).single());
    const ms = UI.ok(await sb.from('market_suppliers').select('*').eq('study_id', id).order('created_at'));
    const table = (list, canEdit) => !list.length ? '' : `<div class="tablewrap"><table><thead><tr><th>Nom</th><th>Type</th><th>Pays</th><th>Prix</th><th>MOQ</th><th>Délai</th><th>Certifs</th><th>Incoterm</th><th>Risque</th><th></th></tr></thead><tbody>${list.map(m => `<tr>
      <td><b>${Utils.esc(m.name)}</b>${m.supplier_id ? ' ' + UI.badge('dans ma base', 'ok') : ''}${m.source_ref ? `<div class="muted">Source : ${Utils.esc(m.source_ref)}</div>` : ''}</td>
      <td>${Utils.esc(m.supplier_type || '—')}</td><td>${Utils.esc(m.country || '—')}</td><td>${m.price ?? '—'} ${m.price != null ? Utils.esc(m.currency || '') : ''}</td><td>${m.moq ?? '—'}</td>
      <td>${m.lead_time_days ?? '—'}</td><td>${Utils.esc((m.certifications || []).join(', ') || '—')}</td><td>${Utils.esc(m.incoterm || '—')}</td><td>${UI.riskBadge(m.risk_level)}</td>
      <td class="act">${canEdit ? `<button class="link-btn" data-a="edit" data-id="${m.id}">Modifier</button> ` : ''}${m.supplier_id ? '' : `<button class="link-btn" data-a="promote" data-id="${m.id}">Ajouter à ma base</button> `}<button class="link-btn" data-a="del" data-id="${m.id}">Supprimer</button></td></tr>`).join('')}</tbody></table></div>`;
    const mine = ms.filter(m => m.source === 'utilisateur'), ext = ms.filter(m => m.source === 'externe');
    $('tabbody').innerHTML = `<div class="row" style="margin:14px 0"><button class="btn small outline" id="back">← Retour aux études</button><span class="grow"></span><button class="btn small outline" id="del-study">Supprimer l'étude</button></div>
      <div class="card" style="max-width:none"><h3 style="margin:0 0 6px">${Utils.esc(s.title)}${UI.demoTag(s)}</h3><div class="kv">${[['Produit', s.product_name], ['Famille', s.category], ['Pays', s.country], ['Secteur', s.sector], ['Quantité', s.quantity], ['Budget', s.budget != null ? Utils.mad(s.budget) : null], ['Contraintes', s.constraints]].map(([k, v]) => `<div><span class="k">${k}</span><b>${Utils.esc(v ?? '—')}</b></div>`).join('')}</div></div>
      <div class="sec"><h4>Informations enregistrées par l'utilisateur</h4><span class="grow"></span><button class="btn small" id="add-ms">+ Ajouter un fournisseur trouvé</button></div>
      ${table(mine, true) || '<p class="empty">Aucun fournisseur enregistré pour cette étude.</p>'}
      <div class="sec"><h4>Informations récupérées automatiquement par une source externe</h4><span class="grow"></span><button class="btn small outline" id="ext">Lancer une recherche externe</button></div>
      ${table(ext, false) || '<div class="note">Aucune source externe connectée. Aucune donnée n\'est inventée : cette zone ne se remplira que lorsqu\'une API de données fournisseurs sera branchée (fonction <code>external-supplier-search</code>).</div>'}`;
    $('back').onclick = () => this.studies();
    $('del-study').onclick = async () => { if (confirm('Supprimer cette étude et ses fournisseurs ?')) { UI.ok(await sb.from('market_studies').delete().eq('id', id)); this.studies(); } };
    $('add-ms').onclick = () => UI.modal({ title: 'Fournisseur trouvé', fields: this.MS_FIELDS, values: { currency: 'MAD' },
      onSubmit: async v => { UI.ok(await sb.from('market_suppliers').insert({ ...v, study_id: id, source: 'utilisateur' })); this.study(id); } });
    $('ext').onclick = e => Utils.withLoading(e.currentTarget, 'Recherche en cours…', async () => {
      const { data, error } = await sb.functions.invoke('external-supplier-search', { body: { study_id: id } });
      if (error) return Utils.toast("Fonction externe non déployée ou indisponible.", 'err');
      Utils.toast(data.message || 'Recherche terminée.'); this.study(id);
    });
    $('tabbody').querySelectorAll('button[data-a]').forEach(b => b.onclick = async () => {
      const m = ms.find(x => x.id === b.dataset.id);
      if (b.dataset.a === 'edit') UI.modal({ title: 'Modifier', fields: this.MS_FIELDS, values: m, onSubmit: async v => { UI.ok(await sb.from('market_suppliers').update(v).eq('id', m.id)); this.study(id); } });
      if (b.dataset.a === 'del' && confirm('Supprimer cette ligne ?')) { UI.ok(await sb.from('market_suppliers').delete().eq('id', m.id)); this.study(id); }
      if (b.dataset.a === 'promote') {
        const row = { name: m.name, country: m.country, certifications: m.certifications, moq: m.moq, currency: m.currency || 'MAD', unit_price: m.price, lead_time_days: m.lead_time_days,
          payment_terms: m.payment_terms, incoterms: m.incoterm, capacity: m.capacity, risk_level: m.risk_level, status: 'prospect', source: m.source, notes: m.notes, is_demo: m.is_demo };
        const ns = UI.ok(await sb.from('suppliers').insert(row).select().single());
        UI.ok(await sb.from('market_suppliers').update({ supplier_id: ns.id }).eq('id', m.id));
        Utils.toast('Ajouté à ta base fournisseurs (statut : prospect).'); this.study(id);
      }
    });
  },

  // ---------- Onglet 2 : recherche avancée ----------
  async search() {
    this.all = UI.ok(await sb.from('suppliers').select('*'));
    const uniq = k => [...new Set(this.all.map(s => s[k]).filter(Boolean))].sort();
    const certs = [...new Set(this.all.flatMap(s => s.certifications || []))].sort();
    const sel = (id, label, o) => `<label>${label}<select id="${id}"><option value="">Tous</option>${o.map(x => `<option>${Utils.esc(x)}</option>`).join('')}</select></label>`;
    const num = (id, label) => `<label>${label}<input id="${id}" type="number" step="any"></label>`;
    $('tabbody').innerHTML = `<div class="filters adv">${sel('f-country', 'Pays', uniq('country'))}${sel('f-region', 'Région', uniq('region'))}${sel('f-sector', 'Secteur', uniq('sector'))}
      <label>Produit / mot-clé<input id="f-q"></label>${sel('f-cert', 'Certification', certs)}${num('f-moq', 'MOQ max')}${num('f-price', 'Prix max')}${num('f-lead', 'Délai max (jours)')}
      ${sel('f-inco', 'Incoterm', uniq('incoterms'))}${sel('f-cur', 'Devise', uniq('currency'))}${num('f-score', 'Score performance min')}${sel('f-status', 'Statut', Suppliers.STATUSES)}</div>
      <p class="muted">Quand un filtre numérique est actif, les fournisseurs dont la valeur n'est pas renseignée sont exclus.</p>
      <div class="row"><span id="count" class="muted"></span><span class="grow"></span><button class="btn small outline" id="exp">Exporter CSV</button><button class="btn small" id="cmp">Comparer la sélection (2 à 4)</button></div><div class="tablewrap" id="res"></div>`;
    document.querySelectorAll('.adv select,.adv input').forEach(el => el.oninput = () => this.results());
    $('exp').onclick = () => UI.csv('recherche-fournisseurs.csv', this.res.map(s => ({ Nom: s.name, Pays: s.country, Région: s.region, Secteur: s.sector, Prix: s.unit_price, Devise: s.currency, MOQ: s.moq, 'Délai (j)': s.lead_time_days, Incoterm: s.incoterms, Certifications: s.certifications, Performance: s.performance_score, Statut: s.status })));
    $('cmp').onclick = () => this.compare();
    this.results();
  },

  results() {
    const v = id => $(id).value, n = id => $(id).value === '' ? null : Number($(id).value), q = v('f-q').toLowerCase();
    const moq = n('f-moq'), price = n('f-price'), lead = n('f-lead'), score = n('f-score');
    this.res = this.all.filter(s => (!v('f-country') || s.country === v('f-country')) && (!v('f-region') || s.region === v('f-region')) && (!v('f-sector') || s.sector === v('f-sector')) &&
      (!v('f-cert') || (s.certifications || []).includes(v('f-cert'))) && (!v('f-inco') || s.incoterms === v('f-inco')) && (!v('f-cur') || s.currency === v('f-cur')) && (!v('f-status') || s.status === v('f-status')) &&
      (!q || [s.name, s.company_name, s.products_text, s.category].join(' ').toLowerCase().includes(q)) &&
      (moq === null || (s.moq != null && s.moq <= moq)) && (price === null || (s.unit_price != null && s.unit_price <= price)) &&
      (lead === null || (s.lead_time_days != null && s.lead_time_days <= lead)) && (score === null || (s.performance_score != null && s.performance_score >= score)));
    $('count').textContent = `${this.res.length} fournisseur(s) trouvé(s)`;
    $('res').innerHTML = !this.res.length ? '<p class="empty">Aucun résultat avec ces filtres.</p>' :
      `<table><thead><tr><th></th><th>Nom</th><th>Pays</th><th>Prix</th><th>MOQ</th><th>Délai</th><th>Incoterm</th><th>Perf.</th><th>Risque</th><th>Statut</th></tr></thead><tbody>${this.res.map(s => `<tr>
      <td><input type="checkbox" data-id="${s.id}" ${this.sel.has(s.id) ? 'checked' : ''}></td><td><b>${Utils.esc(s.name)}</b>${UI.demoTag(s)}</td><td>${Utils.esc(s.country || '—')}</td>
      <td>${s.unit_price ?? '—'} ${s.unit_price != null ? Utils.esc(s.currency || '') : ''}</td><td>${s.moq ?? '—'}</td><td>${s.lead_time_days ?? '—'}</td><td>${Utils.esc(s.incoterms || '—')}</td>
      <td>${s.performance_score ?? '—'}</td><td>${UI.riskBadge(s.risk_level)}</td><td>${UI.statusBadge(s.status)}</td></tr>`).join('')}</tbody></table>`;
    $('res').querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => cb.checked ? this.sel.add(cb.dataset.id) : this.sel.delete(cb.dataset.id));
  },

  compare() {
    const list = this.all.filter(s => this.sel.has(s.id));
    if (list.length < 2 || list.length > 4) return Utils.toast('Sélectionne entre 2 et 4 fournisseurs.', 'err');
    const rows = [['Pays', 'country'], ['Ville', 'city'], ['Catégorie', 'category'], ['Prix unitaire', 'unit_price'], ['Devise', 'currency'], ['MOQ', 'moq'], ['Délai (jours)', 'lead_time_days'], ['Incoterm', 'incoterms'],
      ['Paiement', 'payment_terms'], ['Capacité', 'capacity'], ['Certifications', 'certifications'], ['Qualité (0-100)', 'quality_score'], ['Performance (0-100)', 'performance_score'], ['Risque', 'risk_level'], ['Statut', 'status']];
    UI.panel('Comparaison de fournisseurs', `<div class="tablewrap"><table><thead><tr><th></th>${list.map(s => `<th>${Utils.esc(s.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([l, k]) =>
      `<tr><td class="k">${l}</td>${list.map(s => `<td>${Utils.esc(Array.isArray(s[k]) ? s[k].join(', ') || '—' : s[k] ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="note">Comparaison factuelle des données saisies. Les prix en devises différentes ne sont pas convertis. Le classement pondéré (prix, qualité, délai, risque, RSE…) arrivera avec le module « Sélection des fournisseurs ».</div>`);
  }
};
