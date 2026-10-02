// Module Produits : catalogue + fournisseurs associés (relation N:M).
const Products = {
  FIELDS: [
    { name: 'sku', label: 'SKU' }, { name: 'name', label: 'Nom *', required: true }, { name: 'category', label: 'Catégorie' }, { name: 'unit', label: 'Unité (pièce, kg…)' },
    { name: 'unit_cost', label: 'Coût unitaire (MAD)', type: 'number' }, { name: 'moq', label: 'MOQ', type: 'number' },
    { name: 'lead_time_days', label: 'Délai (jours)', type: 'number' }, { name: 'safety_stock', label: 'Stock de sécurité', type: 'number' },
    { name: 'standards', label: 'Normes (séparées par des virgules)', type: 'tags', wide: true },
    { name: 'description', label: 'Description', type: 'textarea', wide: true }, { name: 'specs_text', label: 'Spécifications', type: 'textarea', wide: true }],
  all: [],
  async load() { this.all = UI.ok(await sb.from('products').select('*').order('created_at', { ascending: false })); },
  async init() {
    await UI.page(async (u, c) => {
      await this.load();
      c.innerHTML = `<div class="fade"><div class="row"><h1>Produits</h1><span class="grow"></span><button class="btn" id="add">+ Nouveau produit</button></div>
        <div class="filters"><input id="q" placeholder="Rechercher (SKU, nom, catégorie)"></div><div class="tablewrap" id="tbl"></div></div>`;
      $('q').oninput = () => this.render(); $('add').onclick = () => this.form();
      $('tbl').onclick = e => {
        const b = e.target.closest('button[data-act]'); if (!b) return; const p = this.all.find(x => x.id === b.dataset.id);
        if (b.dataset.act === 'view') this.detail(p.id);
        if (b.dataset.act === 'edit') this.form(p);
        if (b.dataset.act === 'del' && confirm(`Supprimer « ${p.name} » ?`)) sb.from('products').delete().eq('id', p.id).then(async r => { if (r.error) Utils.toast(r.error.message, 'err'); else { await this.load(); this.render(); } });
      };
      this.render();
    });
  },
  render() {
    const q = $('q').value.toLowerCase();
    const rows = this.all.filter(p => !q || [p.sku, p.name, p.category].join(' ').toLowerCase().includes(q));
    $('tbl').innerHTML = !rows.length ? '<p class="empty">Aucun produit. Clique sur « + Nouveau produit ».</p> ' :
      `<table><thead><tr><th>SKU</th><th>Nom</th><th>Catégorie</th><th>Unité</th><th>Coût</th><th>MOQ</th><th>Délai</th><th></th></tr></thead><tbody>${rows.map(p => `<tr>
      <td>${Utils.esc(p.sku || '—')}</td><td><b>${Utils.esc(p.name)}</b>${UI.demoTag(p)}</td><td>${Utils.esc(p.category || '—')}</td><td>${Utils.esc(p.unit || '—')}</td>
      <td>${p.unit_cost != null ? Utils.mad(p.unit_cost) : '—'}</td><td>${p.moq ?? '—'}</td><td>${p.lead_time_days != null ? p.lead_time_days + ' j' : '—'}</td>
      <td class="act"><button class="link-btn" data-act="view" data-id="${p.id}">Fiche</button> <button class="link-btn" data-act="edit" data-id="${p.id}">Modifier</button> <button class="link-btn" data-act="del" data-id="${p.id}">Supprimer</button></td></tr>`).join('')}</tbody></table>`;
  },
  form(p) {
    UI.modal({ title: p ? 'Modifier le produit' : 'Nouveau produit', fields: this.FIELDS, values: p || {},
      onSubmit: async v => { UI.ok(p ? await sb.from('products').update(v).eq('id', p.id) : await sb.from('products').insert(v)); Utils.toast('Produit enregistré.'); await this.load(); this.render(); } });
  },
  async detail(id) {
    const p = this.all.find(x => x.id === id);
    const links = UI.ok(await sb.from('product_suppliers').select('*, suppliers(name)').eq('product_id', id));
    const panel = UI.panel(p.name, `<div class="kv">${[['SKU', p.sku], ['Catégorie', p.category], ['Unité', p.unit], ['Normes', (p.standards || []).join(', ')], ['Description', p.description], ['Spécifications', p.specs_text]]
      .map(([k, v]) => `<div><span class="k">${k}</span><b>${Utils.esc(v ?? '—')}</b></div>`).join('')}</div>
      <div class="sec"><h4>Fournisseurs associés</h4><span class="grow"></span><button class="btn small" id="link">+ Associer un fournisseur</button></div>
      ${links.length ? `<div class="tablewrap"><table><thead><tr><th>Fournisseur</th><th>Prix</th><th>MOQ</th><th>Délai</th><th></th></tr></thead>${links.map(l => `<tr><td><b>${Utils.esc(l.suppliers?.name)}</b></td><td>${l.unit_price ?? '—'}</td><td>${l.moq ?? '—'}</td><td>${l.lead_time_days ?? '—'}</td><td class="act"><button class="link-btn" data-id="${l.id}">Retirer</button></td></tr>`).join('')}</table></div>` : '<p class="muted">Aucun fournisseur associé.</p>'}`);
    const refresh = () => { panel.close(); this.detail(id); };
    panel.el.querySelector('#link').onclick = async () => {
      const sup = UI.ok(await sb.from('suppliers').select('id,name').order('name'));
      if (!sup.length) return Utils.toast("Crée d'abord un fournisseur.", 'err');
      UI.modal({ title: 'Associer un fournisseur', fields: [{ name: 'supplier_id', label: 'Fournisseur', type: 'select', options: sup.map(s => [s.id, s.name]), wide: true },
        { name: 'unit_price', label: 'Prix unitaire', type: 'number' }, { name: 'moq', label: 'MOQ', type: 'number' }, { name: 'lead_time_days', label: 'Délai (jours)', type: 'number' }],
        onSubmit: async v => { UI.ok(await sb.from('product_suppliers').insert({ ...v, product_id: id })); refresh(); } });
    };
    panel.el.querySelectorAll('button[data-id]').forEach(b => b.onclick = async () => { UI.ok(await sb.from('product_suppliers').delete().eq('id', b.dataset.id)); refresh(); });
  }
};
