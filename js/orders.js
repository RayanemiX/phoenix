// Module Commandes : Purchase Orders, statuts, lignes, totaux HT/TVA/TTC, réceptions.
const Orders = {
  STEPS: ['BROUILLON', 'EN ATTENTE', 'VALIDÉE', 'ENVOYÉE', 'PARTIELLEMENT REÇUE', 'REÇUE'],
  FLOW: { BROUILLON: [['Soumettre à validation', 'EN ATTENTE']], 'EN ATTENTE': [['Valider', 'VALIDÉE'], ['Repasser en brouillon', 'BROUILLON']], 'VALIDÉE': [['Marquer comme envoyée', 'ENVOYÉE']] },
  all: [],
  badge(s) { return UI.badge(s, { 'REÇUE': 'ok', 'ANNULÉE': 'bad', 'ENVOYÉE': 'info', 'VALIDÉE': 'info' }[s] || 'warn'); },
  ht(items) { return (items || []).reduce((t, i) => t + i.quantity * i.unit_price, 0); },
  late(o) { return o.expected_date && o.expected_date < UI.today() && !['REÇUE', 'ANNULÉE', 'BROUILLON'].includes(o.status); },
  async load() { this.all = UI.ok(await sb.from('purchase_orders').select('*, suppliers(name), purchase_order_items(quantity, unit_price)').order('created_at', { ascending: false })); },
  async init() {
    await UI.page(async (u, c) => {
      await this.load();
      c.innerHTML = `<div class="fade"><div class="row"><h1>Commandes</h1><span class="grow"></span><button class="btn" id="add">+ Nouvelle commande</button></div><div class="tablewrap" id="tbl"></div></div>`;
      $('add').onclick = () => this.form();
      $('tbl').onclick = e => { const b = e.target.closest('button[data-act]'); if (!b) return; const o = this.all.find(x => x.id === b.dataset.id);
        if (b.dataset.act === 'view') this.detail(o.id); if (b.dataset.act === 'edit') this.form(o);
        if (b.dataset.act === 'del' && confirm(`Supprimer ${o.number} ?`)) sb.from('purchase_orders').delete().eq('id', o.id).then(async x => { if (x.error) Utils.toast(x.error.message, 'err'); else { await this.load(); this.render(); } }); };
      this.render();
    });
  },
  render() {
    $('tbl').innerHTML = !this.all.length ? '<p class="empty">Aucune commande. Crée-en une ou génère-la depuis une offre retenue (module RFQ).</p>' :
      `<table><thead><tr><th>N° PO</th><th>Fournisseur</th><th>Statut</th><th>Total HT</th><th>Total TTC</th><th>Livraison prévue</th><th></th></tr></thead><tbody>${this.all.map(o => { const ht = this.ht(o.purchase_order_items); return `<tr>
      <td><b>${Utils.esc(o.number)}</b>${UI.demoTag(o)}</td><td>${Utils.esc(o.suppliers?.name || '(fournisseur supprimé)')}</td><td>${this.badge(o.status)}</td>
      <td>${UI.fmt(ht)} ${Utils.esc(o.currency || '')}</td><td>${UI.fmt(ht * (1 + (o.tax_rate || 0) / 100))} ${Utils.esc(o.currency || '')}</td>
      <td>${Utils.esc(o.expected_date || '—')} ${this.late(o) ? UI.badge('En retard', 'bad') : ''}</td>
      <td class="act"><button class="link-btn" data-act="view" data-id="${o.id}">Ouvrir</button> <button class="link-btn" data-act="edit" data-id="${o.id}">Modifier</button> <button class="link-btn" data-act="del" data-id="${o.id}">Supprimer</button></td></tr>`; }).join('')}</tbody></table>`;
  },
  async form(o) {
    const sups = UI.ok(await sb.from('suppliers').select('id,name').order('name'));
    if (!sups.length) return Utils.toast("Crée d'abord un fournisseur.", 'err');
    UI.modal({ title: o ? 'Modifier la commande' : 'Nouvelle commande', values: o || { currency: 'MAD', tax_rate: 20 }, fields: [
      { name: 'supplier_id', label: 'Fournisseur', type: 'select', options: UI.opts(sups), wide: true }, { name: 'currency', label: 'Devise', type: 'select', options: Suppliers.CURRENCIES },
      { name: 'incoterm', label: 'Incoterm', type: 'select', options: Suppliers.INCOTERMS }, { name: 'payment_terms', label: 'Conditions de paiement' },
      { name: 'expected_date', label: 'Livraison prévue', type: 'date' }, { name: 'tax_rate', label: 'TVA (%) — modifiable', type: 'number' },
      { name: 'delivery_address', label: 'Adresse de livraison', type: 'textarea', wide: true }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
      onSubmit: async v => { const r = o ? await sb.from('purchase_orders').update(v).eq('id', o.id) : await sb.from('purchase_orders').insert(v).select().single(); const d = UI.ok(r);
        Utils.toast('Commande enregistrée.'); await this.load(); this.render(); if (!o) this.detail(d.id); } });
  },
  async detail(id) {
    const o = UI.ok(await sb.from('purchase_orders').select('*, suppliers(name)').eq('id', id).single());
    const items = UI.ok(await sb.from('purchase_order_items').select('*').eq('po_id', id).order('created_at'));
    const rec = UI.ok(await sb.from('goods_receipts').select('*, purchase_order_items(description)').eq('po_id', id).order('receipt_date', { ascending: false }));
    const ht = this.ht(items), tva = ht * (o.tax_rate || 0) / 100, cur = Utils.esc(o.currency || ''), draft = o.status === 'BROUILLON';
    const canReceive = ['ENVOYÉE', 'PARTIELLEMENT REÇUE'].includes(o.status), canCancel = !['REÇUE', 'ANNULÉE'].includes(o.status);
    const p = UI.panel(`${o.number} — ${o.suppliers?.name || '(fournisseur supprimé)'}`, `${o.status === 'ANNULÉE' ? '<div class="note">Commande annulée.</div>' : UI.stepbar(this.STEPS, o.status)}
      ${UI.kv([['Statut', o.status], ['Incoterm', o.incoterm], ['Paiement', o.payment_terms], ['Livraison prévue', o.expected_date], ['Adresse de livraison', o.delivery_address], ['Notes', o.notes]])}
      <div class="sec"><h4>Lignes</h4><span class="grow"></span>${draft ? '<button class="btn small" id="add-i">+ Ligne</button>' : ''}</div>
      ${items.length ? `<div class="tablewrap"><table><thead><tr><th>Description</th><th>Qté</th><th>PU</th><th>Total</th><th>Reçu</th><th>Reste</th><th></th></tr></thead>${items.map(i => `<tr><td><b>${Utils.esc(i.description)}</b></td><td>${i.quantity}</td><td>${UI.fmt(i.unit_price)}</td><td>${UI.fmt(i.quantity * i.unit_price)}</td><td>${i.received_quantity}</td><td>${i.quantity - i.received_quantity}</td><td class="act">${draft ? `<button class="link-btn" data-del="${i.id}">Supprimer</button>` : ''}</td></tr>`).join('')}</table></div>
      <p style="text-align:right">Total HT : <b>${UI.fmt(ht)} ${cur}</b> · TVA ${o.tax_rate ?? 0} % : <b>${UI.fmt(tva)} ${cur}</b> · Total TTC : <b>${UI.fmt(ht + tva)} ${cur}</b></p>` : '<p class="muted">Aucune ligne. Ajoute des lignes (la commande doit être en brouillon).</p>'}
      ${rec.length ? `<div class="sec"><h4>Réceptions</h4></div><div class="tablewrap"><table>${rec.map(r => `<tr><td>${Utils.esc(r.receipt_date)}</td><td>${Utils.esc(r.purchase_order_items?.description)}</td><td><b>${r.quantity}</b></td><td>${Utils.esc(r.notes || '')}</td></tr>`).join('')}</table></div>` : ''}
      <div class="sec"><h4>Actions</h4></div><div class="row">${UI.workflowBtns(this.FLOW[o.status])}${canReceive ? '<button class="btn small" id="recv">Enregistrer une réception</button>' : ''}${canCancel ? '<button class="btn small outline" data-to="ANNULÉE">Annuler la commande</button>' : ''}</div>`);
    const refresh = async () => { p.close(); await this.load(); this.render(); this.detail(id); };
    p.el.querySelectorAll('button[data-to]').forEach(b => b.onclick = async () => {
      if (b.dataset.to === 'EN ATTENTE' && !items.length) return Utils.toast('Ajoute au moins une ligne.', 'err');
      if (b.dataset.to === 'ANNULÉE' && !confirm('Annuler cette commande ?')) return;
      UI.ok(await sb.from('purchase_orders').update({ status: b.dataset.to }).eq('id', id)); await refresh(); });
    if (draft) {
      p.el.querySelector('#add-i').onclick = () => UI.modal({ title: 'Ligne de commande', fields: [{ name: 'description', label: 'Description *', required: true, wide: true }, { name: 'quantity', label: 'Quantité *', type: 'number', required: true }, { name: 'unit_price', label: 'Prix unitaire *', type: 'number', required: true }],
        onSubmit: async v => { UI.ok(await sb.from('purchase_order_items').insert({ ...v, po_id: id })); await refresh(); } });
      p.el.querySelectorAll('button[data-del]').forEach(b => b.onclick = async () => { UI.ok(await sb.from('purchase_order_items').delete().eq('id', b.dataset.del)); await refresh(); });
    }
    if (canReceive) p.el.querySelector('#recv').onclick = () => {
      const open = items.filter(i => i.received_quantity < i.quantity);
      if (!open.length) return Utils.toast('Tout est déjà reçu.', 'err');
      UI.modal({ title: 'Réception de marchandises', values: { receipt_date: UI.today() }, fields: [
        { name: 'po_item_id', label: 'Article', type: 'select', options: open.map(i => [i.id, `${i.description} (reste ${i.quantity - i.received_quantity})`]), wide: true },
        { name: 'quantity', label: 'Quantité reçue *', type: 'number', required: true }, { name: 'receipt_date', label: 'Date', type: 'date' }, { name: 'notes', label: 'Notes (écarts, dommages…)', type: 'textarea', wide: true }],
        onSubmit: async v => {
          const it = items.find(i => i.id === v.po_item_id), rest = it.quantity - it.received_quantity;
          if (!(v.quantity > 0) || v.quantity > rest) throw new Error(`Quantité invalide (reste ${rest}).`);
          UI.ok(await sb.from('goods_receipts').insert({ ...v, po_id: id }));
          UI.ok(await sb.from('purchase_order_items').update({ received_quantity: it.received_quantity + v.quantity }).eq('id', it.id));
          const totQ = items.reduce((t, i) => t + i.quantity, 0), totR = items.reduce((t, i) => t + i.received_quantity, 0) + v.quantity;
          UI.ok(await sb.from('purchase_orders').update({ status: totR >= totQ ? 'REÇUE' : 'PARTIELLEMENT REÇUE' }).eq('id', id));
          Utils.toast('Réception enregistrée.'); await refresh();
        } });
    };
  }
};
