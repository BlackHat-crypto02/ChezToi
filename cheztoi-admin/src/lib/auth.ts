export const TOKEN_KEY = "cheztoi_admin_token";
export const USER_KEY = "cheztoi_admin_user";

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export function lireToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function enregistrerSession(token: string, utilisateur: AdminUser): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(utilisateur));
}

export function effacerSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
