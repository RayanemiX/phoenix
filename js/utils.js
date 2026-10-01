// Petites fonctions utilitaires partagées.
const Utils = {
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  mad(n) { return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(n || 0); },
  toast(msg, type = 'ok') {
    const t = document.createElement('div');
    t.className = 'toast ' + type; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
  }
};
