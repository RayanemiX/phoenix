// Module Besoins & Achats : demandes d'achat + workflow de validation + lancement d'une RFQ.
const Purchases = {
  URGENCIES: ['basse', 'normale', 'haute', 'critique'],
  STEPS: ['brouillon', 'soumise', 'validée', 'en sourcing', 'clôturée'],
  FLOW: { brouillon: [['Soumettre pour validation', 'soumise']], soumise: [['Valider', 'validée'], ['Refuser', 'refusée']], refusée: [['Repasser en brouillon', 'brouillon']],
    validée: [['Créer une RFQ', '__rfq']], 'en sourcing': [['Créer une RFQ', '__rfq'], ['Clôturer le besoin', 'clôturée']], clôturée: [] },
  FIELDS: [
    { name: 'title', label: 'Besoin / intitulé *', required: true, wide: true }, { name: 'requester', label: 'Demandeur' }, { name: 'department', label: 'Département' },
    { name: 'urgency', label: 'Urgence', type: 'select', options: ['basse', 'normale', 'haute', 'critique'] }, { name: 'desired_date', label: 'Date souhaitée', type: 'date' },
    { name: 'budget', label: 'Budget (MAD)', type: 'number' }, { name: 'criteria', label: 'Critères de sélection', type: 'textarea', wide: true }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
  all: [],
  statusBadge(s) { return UI.badge(s, { validée: 'ok', soumise: 'info', refusée: 'bad', 'en sourcing': 'warn' }[s] || ''); },
  async load() { this.all = UI.ok(await sb.from('purchase_requests').select('*').order('created_at', { ascending: false })); },
  async init() {
    await UI.page(async (u, c) => {
      await this.load();
      c.innerHTML = `<div class="fade"><div class="row"><h1>Besoins & Achats</h1><span class="grow"></span><button class="btn" id="add">+ Nouveau besoin</button></div>
        <div class="note">Workflow : besoin → lignes (quantité, spécifications) → budget → validation → sourcing (RFQ).</div><div class="tablewrap" id="tbl"></div></div>`;
      $('add').onclick = () => this.form();
      $('tbl').onclick = e => { const b = e.target.closest('button[data-act]'); if (!b) return; const r = this.all.find(x => x.id === b.dataset.id);
        if (b.dataset.act === 'view') this.detail(r.id); if (b.dataset.act === 'edit') this.form(r);
        if (b.dataset.act === 'del' && confirm(`Supprimer ${r.number} ?`)) sb.from('purchase_requests').delete().eq('id', r.id).then(async x => { if (x.error) Utils.toast(x.error.message, 'err'); else { await this.load(); this.render(); } }); };
      this.render();
    });
  },
  render() {
    $('tbl').innerHTML = !this.all.length ? '<p class="empty">Aucun besoin d\'achat. Clique sur « + Nouveau besoin ».</p>' :
      `<table><thead><tr><th>Réf.</th><th>Besoin</th><th>Demandeur</th><th>Budget</th><th>Urgence</th><th>Souhaité le</th><th>Statut</th><th></th></tr></thead><tbody>${this.all.map(r => `<tr>
      <td>${Utils.esc(r.number)}</td><td><b>${Utils.esc(r.title)}</b>${UI.demoTag(r)}</td><td>${Utils.esc([r.requester, r.department].filter(Boolean).join(' · ') || '—')}</td>
      <td>${r.budget != null ? Utils.mad(r.budget) : '—'}</td><td>${UI.badge(r.urgency, { critique: 'bad', haute: 'warn' }[r.urgency] || '')}</td><td>${Utils.esc(r.desired_date || '—')}</td><td>${this.statusBadge(r.status)}</td>
      <td class="act"><button class="link-btn" data-act="view" data-id="${r.id}">Ouvrir</button> <button class="link-btn" data-act="edit" data-id="${r.id}">Modifier</button> <button class="link-btn" data-act="del" data-id="${r.id}">Supprimer</button></td></tr>`).join('')}</tbody></table>`;
  },
  form(r) {
    UI.modal({ title: r ? 'Modifier le besoin' : 'Nouveau besoin', fields: this.FIELDS, values: r || { urgency: 'normale' },
      onSubmit: async v => { UI.ok(r ? await sb.from('purchase_requests').update(v).eq('id', r.id) : await sb.from('purchase_requests').insert(v)); Utils.toast('Besoin enregistré.'); await this.load(); this.render(); } });
  },
  async detail(id) {
    const r = this.all.find(x => x.id === id);
    const items = UI.ok(await sb.from('purchase_request_items').select('*').eq('request_id', id).order('created_at'));
    const est = items.reduce((t, i) => t + (i.quantity || 0) * (i.estimated_price || 0), 0);
    const p = UI.panel(`${r.number} — ${r.title}`, `${UI.stepbar(this.STEPS, r.status)}${r.status === 'refusée' ? '<div class="note">Ce besoin a été refusé.</div>' : ''}
      ${UI.kv([['Demandeur', r.requester], ['Département', r.department], ['Urgence', r.urgency], ['Date souhaitée', r.desired_date], ['Budget', r.budget != null ? Utils.mad(r.budget) : null], ['Estimation des lignes', est ? Utils.mad(est) : null], ['Critères de sélection', r.criteria], ['Notes', r.notes]])}
      <div class="sec"><h4>Lignes du besoin</h4><span class="grow"></span><button class="btn small" id="add-i">+ Ligne</button></div>
      ${items.length ? `<div class="tablewrap"><table><thead><tr><th>Description</th><th>Qté</th><th>Unité</th><th>Prix estimé</th><th>Spécifications</th><th></th></tr></thead>${items.map(i => `<tr><td><b>${Utils.esc(i.description)}</b></td><td>${i.quantity}</td><td>${Utils.esc(i.unit || '—')}</td><td>${i.estimated_price ?? '—'}</td><td>${Utils.esc(i.specifications || '')}</td><td class="act"><button class="link-btn" data-del="${i.id}">Supprimer</button></td></tr>`).join('')}</table></div>` : '<p class="muted">Aucune ligne. Ajoute au moins une ligne pour pouvoir lancer une RFQ.</p>'}
      <div class="sec"><h4>Workflow</h4></div><div class="row">${UI.workflowBtns(this.FLOW[r.status]) || '<span class="muted">Besoin clôturé.</span>'}</div>`);
    const refresh = async () => { p.close(); await this.load(); this.render(); this.detail(id); };
    p.el.querySelector('#add-i').onclick = async () => {
      const prods = UI.ok(await sb.from('products').select('id,name').order('name'));
      UI.modal({ title: 'Ligne du besoin', fields: [{ name: 'description', label: 'Description *', required: true, wide: true }, { name: 'quantity', label: 'Quantité *', type: 'number', required: true }, { name: 'unit', label: 'Unité' },
        { name: 'estimated_price', label: 'Prix unitaire estimé', type: 'number' }, { name: 'product_id', label: 'Produit du catalogue (optionnel)', type: 'select', options: [['', '—'], ...UI.opts(prods)] },
        { name: 'specifications', label: 'Spécifications', type: 'textarea', wide: true }],
        onSubmit: async v => { UI.ok(await sb.from('purchase_request_items').insert({ ...v, request_id: id })); await refresh(); } });
    };
    p.el.querySelectorAll('button[data-del]').forEach(b => b.onclick = async () => { UI.ok(await sb.from('purchase_request_items').delete().eq('id', b.dataset.del)); await refresh(); });
    p.el.querySelectorAll('button[data-to]').forEach(b => b.onclick = () => Utils.withLoading(b, 'En cours…', async () => {
      if (b.dataset.to === '__rfq') return this.toRfq(r, items);
      UI.ok(await sb.from('purchase_requests').update({ status: b.dataset.to }).eq('id', id)); await refresh();
    }));
  },
  async toRfq(r, items) {
    if (!items.length) return Utils.toast('Ajoute au moins une ligne au besoin.', 'err');
    const i = items[0];
    const rfq = UI.ok(await sb.from('rfqs').insert({ request_id: r.id, title: r.title, type: 'RFQ', product_name: i.description, quantity: i.quantity, unit: i.unit, specifications: i.specifications, is_demo: r.is_demo }).select().single());
    UI.ok(await sb.from('purchase_requests').update({ status: 'en sourcing' }).eq('id', r.id));
    Utils.toast(`RFQ ${rfq.number} créée.`); location.href = 'rfq.html';
  }
};
