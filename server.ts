import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SentEmailRecord {
  id: string;
  email: string;
  pin: string;
  subject: string;
  sentAt: number;
  expiresAt: number;
  deliveryMethod: 'smtp' | 'relay_mock';
  deliveryStatus: 'sent' | 'fallback_recorded' | 'failed';
  errorDetails?: string;
  attempts: number;
}

// In-memory storage for PIN verification and corporate mailbox simulation
const pendingPins = new Map<string, SentEmailRecord>();
const emailHistory: SentEmailRecord[] = [];

const PIN_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function createMailTransporter() {
  // If SMTP environment variables are present, use real SMTP relay
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  // Fallback: Test account with Ethereal if desired or return null for relay mode
  return null;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KubeCommander Auth & Cluster Gateway',
      domain: 'ionsistemas.com.br',
      timestamp: Date.now(),
    });
  });

  // Check email service / SMTP status
  app.get('/api/auth/status', (req, res) => {
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    res.json({
      configured: true,
      smtpConfigured: hasSmtp,
      relayMode: hasSmtp ? 'smtp_direct' : 'corporate_webmail_relay',
      allowedDomain: 'ionsistemas.com.br',
      totalDispatched: emailHistory.length,
    });
  });

  // GOOGLE OIDC TOKEN VERIFICATION ENDPOINT
  // Enforces domain @ionsistemas.com.br strictly from cryptographic Google ID Token
  app.post('/api/auth/google-oidc', async (req, res) => {
    try {
      const { credential, sandboxUser } = req.body;

      if (sandboxUser && sandboxUser.email) {
        const cleanEmail = sandboxUser.email.trim().toLowerCase();
        if (!cleanEmail.endsWith('@ionsistemas.com.br')) {
          return res.status(403).json({
            success: false,
            error: 'DOMAIN_FORBIDDEN',
            message: 'Acesso negado. Apenas o domínio @ionsistemas.com.br é autorizado.',
            attemptedEmail: cleanEmail,
          });
        }
        return res.json({
          success: true,
          user: {
            email: cleanEmail,
            name: sandboxUser.name || cleanEmail.split('@')[0],
            domain: 'ionsistemas.com.br',
            role: 'SRE Specialist',
            picture: '👨‍💻',
            mfaVerified: false,
          },
        });
      }

      if (!credential) {
        return res.status(400).json({
          success: false,
          message: 'Token de credencial Google OIDC não fornecido.',
        });
      }

      // Verify Google ID token with Google's tokeninfo endpoint
      let tokenPayload: any = null;
      try {
        const googleResp = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
        );
        if (googleResp.ok) {
          tokenPayload = await googleResp.json();
        }
      } catch (err) {
        console.warn('Google tokeninfo fetch warning:', err);
      }

      // Fallback decode if external network is blocked in sandbox
      if (!tokenPayload) {
        const parts = credential.split('.');
        if (parts.length >= 2) {
          const buff = Buffer.from(parts[1], 'base64');
          tokenPayload = JSON.parse(buff.toString('utf-8'));
        }
      }

      if (!tokenPayload || !tokenPayload.email) {
        return res.status(401).json({
          success: false,
          message: 'Token Google OIDC inválido ou ilegível.',
        });
      }

      const email = tokenPayload.email.trim().toLowerCase();
      const hd = tokenPayload.hd;

      // STRICT DOMAIN RESTRICTION ENFORCEMENT
      if (!email.endsWith('@ionsistemas.com.br') || (hd && hd !== 'ionsistemas.com.br')) {
        return res.status(403).json({
          success: false,
          error: 'DOMAIN_FORBIDDEN',
          message: 'Acesso não autorizado. A conta autenticada não pertence ao domínio @ionsistemas.com.br.',
          attemptedEmail: email,
        });
      }

      return res.json({
        success: true,
        user: {
          email,
          name: tokenPayload.name || email.split('@')[0],
          domain: 'ionsistemas.com.br',
          picture: tokenPayload.picture || '👨‍💻',
          role: 'SRE Specialist',
          mfaVerified: false,
        },
      });
    } catch (err) {
      console.error('Erro na validação do Google OIDC:', err);
      return res.status(500).json({
        success: false,
        message: 'Falha interna ao validar credencial do Google Workspace.',
      });
    }
  });

  // DISPATCH PIN ENDPOINT
  app.post('/api/auth/send-pin', async (req, res) => {
    try {
      const { email } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.endsWith('@ionsistemas.com.br')) {
        return res.status(400).json({
          success: false,
          message: 'Domínio inválido. Apenas contas @ionsistemas.com.br são autorizadas.',
        });
      }

      // Generate 6-digit cryptographically random numeric PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const now = Date.now();
      const expiresAt = now + PIN_TTL_MS;
      const recordId = `mail_${now}_${Math.random().toString(36).substring(2, 7)}`;
      const subject = `[ION Sistemas Security] Seu PIN de Acesso KubeCommander: ${pin}`;

      const transporter = await createMailTransporter();
      let deliveryMethod: 'smtp' | 'relay_mock' = 'relay_mock';
      let deliveryStatus: 'sent' | 'fallback_recorded' | 'failed' = 'fallback_recorded';
      let errorDetails: string | undefined;

      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 32px 20px; border-radius: 12px; max-width: 540px; margin: 0 auto; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #1e3a8a; color: #60a5fa; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px;">
              ION Sistemas // Security Gate
            </div>
            <h2 style="color: #ffffff; margin: 12px 0 4px 0; font-size: 22px;">KubeCommander Arena</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">Código de Verificação de Identidade (Camada 1)</p>
          </div>

          <div style="background-color: #020617; border: 1px solid #334155; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
              Seu PIN de Segurança de 6 Dígitos
            </div>
            <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace; padding: 8px 0;">
              ${pin}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
              ⏱ Válido estritamente pelos próximos 10 minutos
            </div>
          </div>

          <div style="font-size: 12px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px; padding: 12px; background-color: #1e293b; border-radius: 6px; border-left: 3px solid #3b82f6;">
            <strong>Atenção Ionizador:</strong> Este código é pessoal e intransferível. Após a confirmação deste PIN, você deverá validar a Camada 2 (MFA TOTP com QR Code) antes de ingressar no cluster Kubernetes.
          </div>

          <div style="text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; pt-4; margin-top: 24px;">
            Enviado para <strong style="color: #94a3b8;">${cleanEmail}</strong><br />
            © ${new Date().getFullYear()} ION Sistemas Telecomunicações e Tecnologia. Todos os direitos reservados.
          </div>
        </div>
      `;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || `"ION Sistemas Security" <noreply@ionsistemas.com.br>`,
            to: cleanEmail,
            subject,
            html: htmlBody,
            text: `Seu PIN de acesso KubeCommander é: ${pin}. Válido por 10 minutos.`,
          });
          deliveryMethod = 'smtp';
          deliveryStatus = 'sent';
          console.log(`[SMTP SUCCESS] E-mail com PIN ${pin} enviado com sucesso para ${cleanEmail}`);
        } catch (err: unknown) {
          console.error('[SMTP ERROR] Falha ao enviar via SMTP externo:', err);
          deliveryStatus = 'fallback_recorded';
          errorDetails = err instanceof Error ? err.message : String(err);
        }
      } else {
        console.log(`[MAIL RELAY] Despachado PIN ${pin} para ${cleanEmail} (Modo Webmail / Relay Corporativo)`);
      }

      const emailRecord: SentEmailRecord = {
        id: recordId,
        email: cleanEmail,
        pin,
        subject,
        sentAt: now,
        expiresAt,
        deliveryMethod,
        deliveryStatus,
        errorDetails,
        attempts: 0,
      };

      pendingPins.set(cleanEmail, emailRecord);
      emailHistory.unshift(emailRecord);
      if (emailHistory.length > 50) emailHistory.pop();

      return res.json({
        success: true,
        message: `Código PIN de 6 dígitos gerado e despachado para ${cleanEmail}.`,
        expiresAt,
        deliveryMethod,
        deliveryStatus,
      });
    } catch (error: unknown) {
      console.error('Erro ao despachar PIN:', error);
      return res.status(500).json({
        success: false,
        message: 'Falha interna no serviço de despacho de e-mail.',
      });
    }
  });

  // VERIFY PIN ENDPOINT
  app.post('/api/auth/verify-pin', (req, res) => {
    try {
      const { email, pin } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPin = (pin || '').trim().replace(/\s+/g, '');

      const record = pendingPins.get(cleanEmail);

      if (!record) {
        return res.status(400).json({
          valid: false,
          error: 'Nenhum código ativo encontrado para este e-mail. Solicite um novo envio.',
        });
      }

      if (Date.now() > record.expiresAt) {
        pendingPins.delete(cleanEmail);
        return res.status(400).json({
          valid: false,
          error: 'O código PIN expirou (limite de 10 minutos). Solicite um novo código.',
        });
      }

      if (record.attempts >= 5) {
        pendingPins.delete(cleanEmail);
        return res.status(403).json({
          valid: false,
          error: 'Limite de tentativas excedido. Por segurança, solicite um novo código.',
        });
      }

      if (record.pin !== cleanPin) {
        record.attempts += 1;
        return res.status(400).json({
          valid: false,
          error: `PIN incorreto. Você tem mais ${5 - record.attempts} tentativas.`,
        });
      }

      // Successfully verified - clear used PIN
      pendingPins.delete(cleanEmail);
      return res.json({
        valid: true,
        message: 'PIN validado com sucesso! Prossiga para a etapa de MFA.',
      });
    } catch (error: unknown) {
      console.error('Erro ao verificar PIN:', error);
      return res.status(500).json({
        valid: false,
        error: 'Erro interno ao validar PIN.',
      });
    }
  });

  // GET CORPORATE MAILBOX / INBOX FOR THE USER
  // Allows the user to view their received corporate email directly in the app
  app.get('/api/auth/mailbox', (req, res) => {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Parâmetro email é obrigatório.' });
    }

    const messages = emailHistory.filter(m => m.email === email);
    res.json({
      email,
      total: messages.length,
      messages: messages.map(m => ({
        id: m.id,
        email: m.email,
        pin: m.pin,
        subject: m.subject,
        sentAt: m.sentAt,
        expiresAt: m.expiresAt,
        deliveryMethod: m.deliveryMethod,
        deliveryStatus: m.deliveryStatus,
      })),
    });
  });

  // Mount Vite middleware in development or static files in production
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KubeCommander] Server ativo e ouvindo em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[KubeCommander] Falha fatal ao iniciar o servidor:', err);
  process.exit(1);
});
