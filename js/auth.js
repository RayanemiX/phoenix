// Authentification : login, inscription, reset, logout, protection des pages.
const Auth = {
  async login(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async register(email, password, fullName) {
    const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) throw error;
  },
  async resetPassword(email) {
    const redirectTo = location.origin + location.pathname.replace(/[^/]*$/, 'login.html');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },
  async updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
  async logout() { await sb.auth.signOut(); location.href = 'login.html'; },
  // À appeler au début de chaque page protégée.
  async requireAuth() {
    const { data } = await sb.auth.getSession();
    if (!data.session) { location.replace('login.html'); return null; }
    return data.session.user;
  }
};
