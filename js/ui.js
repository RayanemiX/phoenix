// Composants d'interface partagés : page protégée, modal/formulaire, badges, export CSV.
const $ = id => document.getElementById(id);
const UI = {
  ok(r) { if (r.error) throw r.error; return r.data; },     // lève l'erreur Supabase s'il y en a une

  async page(init) {   // page protégée : loader + auth + sidebar + contenu
    Utils.showLoader('Chargement…');
    const user = await Auth.requireAuth(); if (!user) return;
    Layout.render(user);
    try { await init(user, $('content')); } catch (e) { Utils.toast(Utils.translateError(e.message), 'err'); }
    Utils.hideLoader();
  },

  badge(t, kind = '') { return `<span class="b ${kind}">${Utils.esc(t)}</span>`; },
  statusBadge(s) { return s ? UI.badge(s, { actif: 'ok', prospect: 'info', suspendu: 'warn' }[s] || '') : '—'; },
  riskBadge(r) { return r ? UI.badge(r, { faible: 'ok', moyen: 'warn', 'élevé': 'bad' }[r]) : '—'; },
  demoTag(row) { return row && row.is_demo ? ' <span class="b warn">SIMULATION</span>' : ''; },

  panel(title, html) {
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = `<div class="modal"><div class="mh"><h3>${Utils.esc(title)}</h3><button class="x" type="button">×</button></div><div class="mb">${html}</div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('.x').onclick = close;
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    return { el: ov, close };
  },

  // Formulaire généré depuis une liste de champs : {name,label,type(text|number|date|email|textarea|select|tags),options,required,wide}
  modal({ title, fields, values = {}, onSubmit }) {
    const html = fields.map(fd => {
      const raw = values[fd.name] ?? ''; const val = Array.isArray(raw) ? raw.join(', ') : raw;
      let input;
      if (fd.type === 'select') input = `<select name="${fd.name}">${(fd.options || []).map(o => { const [v, l] = Array.isArray(o) ? o : [o, o || '—']; return `<option value="${Utils.esc(v)}" ${v === val ? 'selected' : ''}>${Utils.esc(l)}</option>`; }).join('')}</select>`;
      else if (fd.type === 'textarea') input = `<textarea name="${fd.name}" rows="3">${Utils.esc(val)}</textarea>`;
      else input = `<input name="${fd.name}" type="${fd.type === 'tags' || !fd.type ? 'text' : fd.type}" ${fd.type === 'number' ? 'step="any"' : ''} value="${Utils.esc(val)}" ${fd.required ? 'required' : ''}>`;
      return `<label class="${fd.wide ? 'wide' : ''}">${Utils.esc(fd.label)}${input}</label>`;
    }).join('');
    const p = UI.panel(title, `<form class="mform">${html}<div class="wide row"><span class="grow"></span><button type="button" class="btn outline cancel">Annuler</button><button class="btn save">Enregistrer</button></div></form>`);
    p.el.querySelector('.cancel').onclick = p.close;
    p.el.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const out = {};
      fields.forEach(fd => {
        let v = e.target.elements[fd.name].value.trim();
        if (fd.type === 'number') v = v === '' ? null : Number(v);
        else if (fd.type === 'tags') v = v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
        else if (v === '') v = null;
        out[fd.name] = v;
      });
      await Utils.withLoading(e.target.querySelector('.save'), 'Enregistrement…', async () => {
        try { await onSubmit(out); p.close(); }
        catch (err) { Utils.toast(Utils.translateError(err.message.includes('duplicate') ? 'Cet élément existe déjà.' : err.message), 'err'); }
      });
    };
    return p;
  },

  csv(filename, rows) {   // séparateur ";" + BOM : s'ouvre correctement dans Excel FR
    if (!rows.length) return Utils.toast('Rien à exporter.', 'err');
    const keys = Object.keys(rows[0]), q = v => '"' + String(Array.isArray(v) ? v.join(' | ') : v ?? '').replace(/"/g, '""') + '"';
    const txt = '\ufeff' + [keys.join(';'), ...rows.map(r => keys.map(k => q(r[k])).join(';'))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = filename; a.click();
  }
};
