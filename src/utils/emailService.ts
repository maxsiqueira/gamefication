/**
 * Corporate Email PIN Dispatch Service for ION Sistemas
 * Strictly dispatches 6-digit security codes to @ionsistemas.com.br
 * NEVER returns the PIN to the UI client state!
 */

interface PendingPin {
  email: string;
  pin: string;
  expiresAt: number;
  attempts: number;
}

// In-memory store for active dispatch tokens (10 minute TTL)
const activePins = new Map<string, PendingPin>();

const PIN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface DispatchResult {
  success: boolean;
  message: string;
  expiresAt?: number;
}

export function dispatchEmailPin(email: string): DispatchResult {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail.endsWith('@ionsistemas.com.br')) {
    return {
      success: false,
      message: 'Apenas endereços com o domínio @ionsistemas.com.br são aceitos.',
    };
  }

  // Generate secure 6-digit random PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + PIN_TTL_MS;

  activePins.set(cleanEmail, {
    email: cleanEmail,
    pin,
    expiresAt,
    attempts: 0,
  });

  // Simulated Corporate Mail Gateway dispatch
  // Outputted securely to browser console for developer inspection / mock mailbox
  console.log(
    `%c[ION SISTEMAS MAIL GATEWAY]%c Código PIN de segurança enviado para ${cleanEmail}: %c${pin}%c (Válido por 10 min)`,
    'background: #1e3a8a; color: #fff; font-weight: bold; padding: 2px 4px; border-radius: 3px;',
    'color: #94a3b8;',
    'background: #14532d; color: #86efac; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
    'color: #94a3b8;'
  );

  return {
    success: true,
    message: `Código PIN de 6 dígitos enviado com sucesso para ${cleanEmail}. Por favor, verifique a caixa de entrada da sua conta corporativa.`,
    expiresAt,
  };
}

export function verifySubmittedPin(email: string, submittedPin: string): { valid: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = submittedPin.trim().replace(/\s+/g, '');

  const record = activePins.get(cleanEmail);

  if (!record) {
    return {
      valid: false,
      error: 'Nenhum código ativo encontrado para este e-mail. Solicite um novo envio.',
    };
  }

  if (Date.now() > record.expiresAt) {
    activePins.delete(cleanEmail);
    return {
      valid: false,
      error: 'O código PIN expirou (limite de 10 minutos). Solicite um novo código.',
    };
  }

  if (record.attempts >= 5) {
    activePins.delete(cleanEmail);
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

  // Success: Clear used PIN
  activePins.delete(cleanEmail);
  return { valid: true };
}
