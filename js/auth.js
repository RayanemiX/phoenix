// Authentification : login, inscription, reset, logout, protection des pages.
const Auth = {
  loginUrl() { return location.origin + location.pathname.replace(/[^/]*$/, 'login.html'); },
  async login(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async register(email, password, fullName) {
    const { data, error } = await sb.auth.signUp({ email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: this.loginUrl() } });
    if (error) throw error;
    return data; // data.session existe seulement si la confirmation email est désactivée
  },
  async resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: this.loginUrl() });
    if (error) throw error;
  },
  async updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
  async logout() { Utils.showLoader('Déconnexion…'); await sb.auth.signOut(); location.href = 'login.html'; },
  async requireAuth() {
    const { data } = await sb.auth.getSession();
    if (!data.session) { location.replace('login.html'); return null; }
    return data.session.user;
  }
};
