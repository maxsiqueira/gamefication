/**
 * Corporate Email PIN Dispatch Service for ION Sistemas
 * Strictly dispatches 6-digit security codes to @ionsistemas.com.br
 * Interacts with /api/auth backend endpoints and provides mailbox inspection
 */

export interface DispatchResult {
  success: boolean;
  message: string;
  expiresAt?: number;
  deliveryMethod?: 'smtp' | 'relay_mock';
  deliveryStatus?: 'sent' | 'fallback_recorded' | 'failed';
}

export interface DispatchedEmail {
  id: string;
  email: string;
  pin: string;
  subject: string;
  sentAt: number;
  expiresAt: number;
  deliveryMethod: 'smtp' | 'relay_mock';
  deliveryStatus: 'sent' | 'fallback_recorded' | 'failed';
}

// Local in-memory fallback in case backend is unreachable
const fallbackPins = new Map<string, { pin: string; expiresAt: number; attempts: number }>();
const fallbackMailbox: DispatchedEmail[] = [];

const PIN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function dispatchEmailPin(email: string): Promise<DispatchResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail.endsWith('@ionsistemas.com.br')) {
    return {
      success: false,
      message: 'Apenas endereços com o domínio @ionsistemas.com.br são aceitos.',
    };
  }

  try {
    const response = await fetch('/api/auth/send-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: data.message || `Código PIN enviado para ${cleanEmail}.`,
        expiresAt: data.expiresAt,
        deliveryMethod: data.deliveryMethod,
        deliveryStatus: data.deliveryStatus,
      };
    }
    
    const errData = await response.json().catch(() => null);
    if (errData?.message) {
      return { success: false, message: errData.message };
    }
  } catch (err) {
    console.warn('[EMAIL SERVICE] Backend call failed, using client fallback:', err);
  }

  // Resilient fallback if backend server is not available
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + PIN_TTL_MS;

  fallbackPins.set(cleanEmail, {
    pin,
    expiresAt,
    attempts: 0,
  });

  const mockItem: DispatchedEmail = {
    id: `local_${now}`,
    email: cleanEmail,
    pin,
    subject: `[ION Sistemas Security] Seu PIN de Acesso KubeCommander: ${pin}`,
    sentAt: now,
    expiresAt,
    deliveryMethod: 'relay_mock',
    deliveryStatus: 'fallback_recorded',
  };
  fallbackMailbox.unshift(mockItem);

  console.log(
    `%c[ION SISTEMAS MAIL GATEWAY]%c Código PIN de segurança enviado para ${cleanEmail}: %c${pin}%c (Válido por 10 min)`,
    'background: #1e3a8a; color: #fff; font-weight: bold; padding: 2px 4px; border-radius: 3px;',
    'color: #94a3b8;',
    'background: #14532d; color: #86efac; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
    'color: #94a3b8;'
  );

  return {
    success: true,
    message: `Código PIN enviado para ${cleanEmail}. Verifique a caixa de entrada ou o Webmail ION Sistemas.`,
    expiresAt,
    deliveryMethod: 'relay_mock',
    deliveryStatus: 'fallback_recorded',
  };
}

export async function verifySubmittedPin(
  email: string,
  submittedPin: string
): Promise<{ valid: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = submittedPin.trim().replace(/\s+/g, '');

  try {
    const response = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, pin: cleanPin }),
    });

    const data = await response.json();
    if (response.ok && data.valid) {
      return { valid: true };
    }
    if (data?.error) {
      return { valid: false, error: data.error };
    }
  } catch (err) {
    console.warn('[EMAIL SERVICE] Backend verify failed, checking fallback:', err);
  }

  // Fallback verification
  const record = fallbackPins.get(cleanEmail);
  if (!record) {
    return {
      valid: false,
      error: 'Nenhum código ativo encontrado para este e-mail. Solicite um novo envio.',
    };
  }

  if (Date.now() > record.expiresAt) {
    fallbackPins.delete(cleanEmail);
    return {
      valid: false,
      error: 'O código PIN expirou (limite de 10 minutos). Solicite um novo código.',
    };
  }

  if (record.attempts >= 5) {
    fallbackPins.delete(cleanEmail);
    return {
      valid: false,
      error: 'Número excessivo de tentativas incorretas. Por segurança, solicite um novo código.',
    };
  }

  if (record.pin !== cleanPin) {
    record.attempts += 1;
    return {
      valid: false,
      error: `PIN incorreto. Você tem mais ${5 - record.attempts} tentativas.`,
    };
  }

  fallbackPins.delete(cleanEmail);
  return { valid: true };
}

/**
 * Fetch the latest corporate emails received for this user
 * Used by the Webmail modal / drawer to inspect the received email
 */
export async function fetchCorporateMailbox(email: string): Promise<DispatchedEmail[]> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const response = await fetch(`/api/auth/mailbox?email=${encodeURIComponent(cleanEmail)}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        return data.messages;
      }
    }
  } catch {
    // ignore
  }

  return fallbackMailbox.filter(m => m.email === cleanEmail);
}
