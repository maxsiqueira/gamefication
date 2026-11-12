export interface CorporateUser {
  email: string;
  name: string;
  picture?: string;
  domain: string;
  role: string;
}

export const ALLOWED_DOMAIN = 'ionsistemas.com.br';
const AUTH_STORAGE_KEY = 'kubecommander_corporate_auth';

export function getStoredCorporateUser(): CorporateUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CorporateUser;
    if (parsed && parsed.email && isDomainAuthorized(parsed.email)) {
      return parsed;
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function saveCorporateUser(user: CorporateUser): void {
  if (!isDomainAuthorized(user.email)) {
    throw new Error(`Apenas emails @${ALLOWED_DOMAIN} podem ser salvos.`);
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearCorporateUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isDomainAuthorized(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean.endsWith(`@${ALLOWED_DOMAIN}`);
}

// Decode Google JWT payload safely from Google Identity Services token
export function parseJwtPayload(token: string): { 
  email?: string; 
  name?: string; 
  picture?: string; 
  hd?: string; 
  given_name?: string;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('Erro ao decodificar token JWT do Google:', err);
    return null;
  }
}
