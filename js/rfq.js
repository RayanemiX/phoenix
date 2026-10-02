// Module RFQ / RFI / RFP : short-list fournisseurs, offres reçues, comparaison factuelle, attribution → commande.
const Rfqs = {
  STEPS: ['brouillon', 'envoyée', 'offres reçues', 'analysée', 'attribuée', 'clôturée'],
  async init() { await UI.page(async (u, c) => { this.c = c; await this.list(); }); },

  async list() {
    const rfqs = UI.ok(await sb.from('rfqs').select('*').order('created_at', { ascending: false }));
    const quotes = UI.ok(await sb.from('supplier_quotes').select('rfq_id'));
    const nq = id => quotes.filter(q => q.rfq_id === id).length;
    this.c.innerHTML = `<div class="fade"><div class="row"><h1>Appels d'offres / RFQ</h1><span class="grow"></span><button class="btn" id="add">+ Nouvelle consultation</button></div>
      <div class="note">Workflow : besoin → RFI → sourcing → RFQ → réception des offres → analyse → négociation → sélection → PO. Une consultation peut être une RFI, une RFQ ou une RFP.</div>
      <div class="tablewrap">${!rfqs.length ? '<p class="empty">Aucune consultation. Crée-en une ici, ou depuis un besoin validé.</p>' :
      `<table><thead><tr><th>Réf.</th><th>Titre</th><th>Type</th><th>Produit</th><th>Qté</th><th>Échéance</th><th>Offres</th><th>Statut</th><th></th></tr></thead><tbody>${rfqs.map(r => `<tr>
      <td>${Utils.esc(r.number)}</td><td><b>${Utils.esc(r.title)}</b>${UI.demoTag(r)}</td><td>${UI.badge(r.type, 'info')}</td><td>${Utils.esc(r.product_name)}</td><td>${r.quantity ?? '—'}</td><td>${Utils.esc(r.deadline || '—')}</td><td>${nq(r.id)}</td>
      <td>${UI.badge(r.status, r.status === 'attribuée' ? 'ok' : r.status === 'clôturée' ? '' : 'warn')}</td><td class="act"><button class="link-btn" data-id="${r.id}">Ouvrir</button></td></tr>`).join('')}</tbody></table>`}</div></div>`;
    $('add').onclick = async () => {
      const reqs = UI.ok(await sb.from('purchase_requests').select('id,number,title'));
      UI.modal({ title: 'Nouvelle consultation', values: { type: 'RFQ' }, fields: [
        { name: 'title', label: 'Titre *', required: true }, { name: 'type', label: 'Type', type: 'select', options: ['RFQ', 'RFI', 'RFP'] },
        { name: 'request_id', label: 'Besoin lié (optionnel)', type: 'select', options: [['', '—'], ...reqs.map(r => [r.id, `${r.number} — ${r.title}`])], wide: true },
        { name: 'product_name', label: 'Produit / service *', required: true }, { name: 'quantity', label: 'Quantité', type: 'number' }, { name: 'unit', label: 'Unité' }, { name: 'deadline', label: "Date limite de réponse", type: 'date' },
        { name: 'specifications', label: 'Spécifications', type: 'textarea', wide: true }],
        onSubmit: async v => { const r = UI.ok(await sb.from('rfqs').insert(v).select().single()); await this.open(r.id); } });
    };
    this.c.querySelectorAll('button[data-id]').forEach(b => b.onclick = () => this.open(b.dataset.id));
  },

  async open(id) {
    const rfq = UI.ok(await sb.from('rfqs').select('*').eq('id', id).single());
    const rs = UI.ok(await sb.from('rfq_suppliers').select('*, suppliers(name)').eq('rfq_id', id).order('created_at'));
    const quotes = UI.ok(await sb.from('supplier_quotes').select('*, suppliers(name)').eq('rfq_id', id).order('created_at'));
    const items = quotes.length ? UI.ok(await sb.from('quote_items').select('*').in('quote_id', quotes.map(q => q.id))) : [];
    const next = this.STEPS[this.STEPS.indexOf(rfq.status) + 1];
    const sameCur = new Set(quotes.map(q => q.currency)).size <= 1;
    const min = quotes.length ? Math.min(...quotes.map(q => q.total_amount ?? Infinity)) : 0;
    const gap = q => !sameCur || !(min > 0) || q.total_amount == null ? '—' : q.total_amount === min ? 'offre la plus basse' : '+' + ((q.total_amount / min - 1) * 100).toFixed(1) + ' %';
    const alerts = q => [q.moq != null && rfq.quantity != null && q.moq > rfq.quantity ? 'MOQ > quantité' : '', q.validity_date && q.validity_date < UI.today() ? 'Offre expirée' : ''].filter(Boolean).map(a => UI.badge(a, 'warn')).join(' ');

    this.c.innerHTML = `<div class="fade"><div class="row"><button class="btn small outline" id="back">← Retour</button><span class="grow"></span><button class="btn small outline" id="del">Supprimer</button></div>
      <h1 style="margin-top:12px">${Utils.esc(rfq.number)} — ${Utils.esc(rfq.title)}${UI.demoTag(rfq)} ${UI.badge(rfq.type, 'info')}</h1>${UI.stepbar(this.STEPS, rfq.status)}
      ${next ? `<button class="btn small" id="next">Passer à « ${next} »</button>` : ''}
      <div class="card" style="max-width:none;margin-top:12px">${UI.kv([['Produit', rfq.product_name], ['Quantité', rfq.quantity != null ? rfq.quantity + ' ' + (rfq.unit || '') : null], ['Date limite', rfq.deadline], ['Spécifications', rfq.specifications]])}</div>
      <div class="sec"><h4>Fournisseurs consultés (short-list)</h4><span class="grow"></span><button class="btn small" id="add-s">+ Ajouter un fournisseur</button></div>
      ${rs.length ? `<div class="tablewrap"><table>${rs.map(s => `<tr><td><b>${Utils.esc(s.suppliers?.name)}</b></td><td>${UI.badge(s.status, s.status === 'a répondu' ? 'ok' : s.status === 'décliné' ? 'bad' : 'info')}</td><td class="act"><button class="link-btn" data-a="s-decline" data-id="${s.id}">Marquer décliné</button> <button class="link-btn" data-a="s-del" data-id="${s.id}">Retirer</button></td></tr>`).join('')}</table></div>` : '<p class="muted">Aucun fournisseur consulté. Ajoute des fournisseurs depuis ta base.</p>'}
      <div class="sec"><h4>Offres reçues & comparaison</h4><span class="grow"></span><button class="btn small" id="add-q">+ Offre reçue</button></div>
      ${quotes.length ? `<div class="tablewrap"><table><thead><tr><th>Fournisseur</th><th>Prix unit.</th><th>Qté</th><th>Transport</th><th>Autres</th><th>Total offre</th><th>Écart vs plus basse</th><th>Délai</th><th>MOQ</th><th>Paiement</th><th>Incoterm</th><th>Validité</th><th>Alertes</th><th>Statut</th><th></th></tr></thead><tbody>${quotes.map(q => { const it = items.find(i => i.quote_id === q.id); return `<tr>
        <td><b>${Utils.esc(q.suppliers?.name)}</b></td><td>${UI.fmt(it?.unit_price)}</td><td>${UI.fmt(it?.quantity)}</td><td>${UI.fmt(q.transport_cost)}</td><td>${UI.fmt(q.other_costs)}</td>
        <td><b>${UI.fmt(q.total_amount)} ${Utils.esc(q.currency || '')}</b></td><td>${gap(q)}</td><td>${q.lead_time_days ?? '—'}</td><td>${q.moq ?? '—'}</td><td>${Utils.esc(q.payment_terms || '—')}</td><td>${Utils.esc(q.incoterm || '—')}</td><td>${Utils.esc(q.validity_date || '—')}</td><td>${alerts(q)}</td>
        <td>${UI.badge(q.status, q.status === 'retenue' ? 'ok' : '')}</td><td class="act"><button class="link-btn" data-a="q-edit" data-id="${q.id}">Modifier</button> ${q.status === 'retenue' ? `<button class="link-btn" data-a="q-order" data-id="${q.id}">Créer la commande</button>` : `<button class="link-btn" data-a="q-retain" data-id="${q.id}">Retenir</button>`} <button class="link-btn" data-a="q-del" data-id="${q.id}">Supprimer</button></td></tr>`; }).join('')}</tbody></table></div>
      <div class="note">Comparaison factuelle : total = prix × quantité + transport + autres frais. ${sameCur ? '' : 'Devises différentes : écarts non calculés. '}Ce n'est pas encore le TCO complet (Phase 4) : « retenir » est une décision que tu prends et que tu peux justifier.</div>` : '<p class="muted">Aucune offre reçue pour le moment.</p>'}</div>`;

    $('back').onclick = () => this.list();
    $('del').onclick = async () => { if (confirm('Supprimer cette consultation et ses offres ?')) { UI.ok(await sb.from('rfqs').delete().eq('id', id)); this.list(); } };
    if (next) $('next').onclick = async () => { UI.ok(await sb.from('rfqs').update({ status: next }).eq('id', id)); this.open(id); };
    $('add-s').onclick = async () => {
      const taken = new Set(rs.map(x => x.supplier_id));
      const sups = UI.ok(await sb.from('suppliers').select('id,name').order('name')).filter(s => !taken.has(s.id));
      if (!sups.length) return Utils.toast('Aucun fournisseur disponible. Crée-en dans le module Fournisseurs.', 'err');
      UI.modal({ title: 'Ajouter à la short-list', fields: [{ name: 'supplier_id', label: 'Fournisseur', type: 'select', options: UI.opts(sups), wide: true }],
        onSubmit: async v => { UI.ok(await sb.from('rfq_suppliers').insert({ ...v, rfq_id: id })); this.open(id); } });
    };
    const quoteForm = q => {
      if (!q && !rs.length) return Utils.toast("Ajoute d'abord des fournisseurs à la short-list.", 'err');
      const it = q ? items.find(i => i.quote_id === q.id) : null;
      UI.modal({ title: q ? "Modifier l'offre" : 'Nouvelle offre reçue', values: q ? { ...q, unit_price: it?.unit_price, quantity: it?.quantity } : { quantity: rfq.quantity, currency: 'MAD' }, fields: [
        { name: 'supplier_id', label: 'Fournisseur', type: 'select', options: rs.map(s => [s.supplier_id, s.suppliers?.name]), wide: true },
        { name: 'unit_price', label: 'Prix unitaire *', type: 'number', required: true }, { name: 'quantity', label: 'Quantité *', type: 'number', required: true },
        { name: 'currency', label: 'Devise', type: 'select', options: Suppliers.CURRENCIES }, { name: 'transport_cost', label: 'Transport', type: 'number' }, { name: 'other_costs', label: 'Autres frais', type: 'number' },
        { name: 'lead_time_days', label: 'Délai (jours)', type: 'number' }, { name: 'moq', label: 'MOQ', type: 'number' }, { name: 'payment_terms', label: 'Conditions de paiement' },
        { name: 'incoterm', label: 'Incoterm', type: 'select', options: Suppliers.INCOTERMS }, { name: 'validity_date', label: "Validité de l'offre", type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
        onSubmit: async v => {
          const { unit_price, quantity, ...h } = v;
          h.total_amount = unit_price * quantity + (h.transport_cost || 0) + (h.other_costs || 0);
          if (q) { UI.ok(await sb.from('supplier_quotes').update(h).eq('id', q.id)); UI.ok(await sb.from('quote_items').update({ quantity, unit_price }).eq('quote_id', q.id)); }
          else {
            const nq = UI.ok(await sb.from('supplier_quotes').insert({ ...h, rfq_id: id }).select().single());
            UI.ok(await sb.from('quote_items').insert({ quote_id: nq.id, description: rfq.product_name, quantity, unit_price }));
            UI.ok(await sb.from('rfq_suppliers').update({ status: 'a répondu' }).eq('rfq_id', id).eq('supplier_id', h.supplier_id));
            if (['brouillon', 'envoyée'].includes(rfq.status)) UI.ok(await sb.from('rfqs').update({ status: 'offres reçues' }).eq('id', id));
          }
          this.open(id);
        } });
    };
    $('add-q').onclick = () => quoteForm(null);
    this.c.onclick = async e => {
      const b = e.target.closest('button[data-a]'); if (!b) return;
      const a = b.dataset.a, q = quotes.find(x => x.id === b.dataset.id);
      if (a === 's-decline') { UI.ok(await sb.from('rfq_suppliers').update({ status: 'décliné' }).eq('id', b.dataset.id)); this.open(id); }
      if (a === 's-del') { UI.ok(await sb.from('rfq_suppliers').delete().eq('id', b.dataset.id)); this.open(id); }
      if (a === 'q-edit') quoteForm(q);
      if (a === 'q-del' && confirm('Supprimer cette offre ?')) { UI.ok(await sb.from('supplier_quotes').delete().eq('id', q.id)); this.open(id); }
      if (a === 'q-retain') {
        UI.ok(await sb.from('supplier_quotes').update({ status: 'reçue' }).eq('rfq_id', id).eq('status', 'retenue'));
        UI.ok(await sb.from('supplier_quotes').update({ status: 'retenue' }).eq('id', q.id));
        UI.ok(await sb.from('rfqs').update({ status: 'attribuée' }).eq('id', id)); Utils.toast('Offre retenue.'); this.open(id);
      }
      if (a === 'q-order') await Utils.withLoading(b, 'Création…', () => this.toOrder(rfq, q, items));
    };
  },

  async toOrder(rfq, q, items) {
    const it = items.find(i => i.quote_id === q.id);
    const po = UI.ok(await sb.from('purchase_orders').insert({ supplier_id: q.supplier_id, rfq_id: rfq.id, quote_id: q.id, currency: q.currency, incoterm: q.incoterm, payment_terms: q.payment_terms, is_demo: q.is_demo }).select().single());
    const lines = [{ po_id: po.id, description: rfq.product_name, quantity: it.quantity, unit_price: it.unit_price }];
    if (q.transport_cost > 0) lines.push({ po_id: po.id, description: 'Transport', quantity: 1, unit_price: q.transport_cost });
    if (q.other_costs > 0) lines.push({ po_id: po.id, description: 'Autres frais', quantity: 1, unit_price: q.other_costs });
    UI.ok(await sb.from('purchase_order_items').insert(lines));
    Utils.toast(`Commande ${po.number} créée (brouillon).`); location.href = 'orders.html';
  }
};
