export interface CorporateUser {
  email: string;
  name: string;
  picture?: string;
  domain: string;
  role: string;
  mfaVerified?: boolean;
  authenticatedAt?: number;
}

export const ALLOWED_DOMAIN = 'ionsistemas.com.br';

// Migrated to versioned sessionStorage to automatically expire when tab closes
const SESSION_STORAGE_KEY = 'kubecommander_ion_session_v2';
const LEGACY_LOCAL_KEY = 'kubecommander_corporate_auth';

// IMMEDIATELY PURGE ANY LEGACY LOCAL STORAGE UPON MODULE LOAD
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(LEGACY_LOCAL_KEY);
    window.localStorage.removeItem('kubecommander_auth');
  }
} catch {
  // Ignore in sandboxed storage restrictions
}

export function getStoredCorporateUser(): CorporateUser | null {
  try {
    // Purge any residual local storage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LEGACY_LOCAL_KEY);
    }

    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }

    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CorporateUser;

    // Strict validation: must have valid @ionsistemas.com.br domain AND mfaVerified === true
    if (
      parsed &&
      parsed.email &&
      isDomainAuthorized(parsed.email) &&
      parsed.mfaVerified === true
    ) {
      return parsed;
    }

    // Invalid or incomplete session: purge immediately
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function saveCorporateUser(user: CorporateUser): void {
  if (!isDomainAuthorized(user.email)) {
    throw new Error(`Apenas e-mails institucionais @${ALLOWED_DOMAIN} possuem autorização.`);
  }

  // Purge any residual localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LEGACY_LOCAL_KEY);
    }
  } catch {}

  const verifiedSession: CorporateUser = {
    ...user,
    domain: ALLOWED_DOMAIN,
    mfaVerified: true,
    authenticatedAt: Date.now(),
  };

  // Saved strictly in sessionStorage (destroyed on tab close)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(verifiedSession));
  }
}

export function clearCorporateUser(): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem(SESSION_STORAGE_KEY);
      window.localStorage?.removeItem(LEGACY_LOCAL_KEY);
      window.localStorage?.removeItem('kubecommander_auth');
    }
  } catch {}
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
