// Fonctions utilitaires : échappement HTML, formats, toasts, loader, boutons "en cours".
const Utils = {
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  mad(n) { return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(n || 0); },

  toast(msg, type = 'ok') {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = `<span class="ti">${type === 'err' ? '!' : '✓'}</span><span>${this.esc(msg)}</span>`;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3500);
  },

  showLoader(text = 'Chargement…') {
    let l = document.getElementById('loader');
    if (!l) { l = document.createElement('div'); l.id = 'loader'; l.innerHTML = '<div class="loader-ring"></div><p></p>'; document.body.appendChild(l); }
    l.querySelector('p').textContent = text; l.classList.remove('hide');
  },
  hideLoader() {
    const l = document.getElementById('loader');
    if (l) { l.classList.add('hide'); setTimeout(() => l.remove(), 400); }
  },

  // Désactive le bouton + spinner pendant l'action, puis le remet comme avant.
  async withLoading(btn, label, fn) {
    const old = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>${label}`;
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
  },

  // Messages d'erreur Supabase en français.
  translateError(msg = '') {
    const m = msg.toLowerCase();
    if (m.includes('invalid login')) return 'Email ou mot de passe incorrect.';
    if (m.includes('not confirmed')) return "Email non confirmé : clique sur le lien reçu par email.";
    if (m.includes('already registered')) return 'Un compte existe déjà avec cet email.';
    if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patiente quelques minutes.';
    if (m.includes('at least')) return 'Mot de passe trop court (8 caractères minimum).';
    if (m.includes('failed to fetch')) return 'Connexion impossible. Vérifie ta connexion internet.';
    return msg;
  }
};
