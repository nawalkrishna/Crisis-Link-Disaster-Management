import { config } from '../config';

/**
 * SMS PROVIDERS behind one small interface, so the rest of the code doesn't care who
 * actually delivers the message ("ports and adapters"). Swap by changing SMS_PROVIDER.
 *
 * Note for real use in India: commercial SMS must be registered on the TRAI DLT platform
 * (sender ID + message templates) before operators will deliver them. Indian gateways such
 * as MSG91 or Exotel can be added here as another adapter.
 */
export interface SmsProvider {
  readonly name: string;
  /** Resolves with the provider's message id; throws on failure (the worker will retry). */
  send(to: string, body: string): Promise<{ providerId: string }>;
  /** Errors that will never succeed (e.g. invalid number) shouldn't be retried. */
  isPermanentError?(err: unknown): boolean;
}

export class PermanentSmsError extends Error {}

/** Development: print the SMS in the API terminal instead of sending it. Free and instant. */
const consoleProvider: SmsProvider = {
  name: 'console',
  async send(to, body) {
    console.log(`\n[sms -> ${to}]\n${body}\n`);
    return { providerId: `console-${Date.now()}` };
  },
};

/** Twilio's REST API called with plain fetch - no SDK needed for one endpoint. */
const twilioProvider: SmsProvider = {
  name: 'twilio',
  async send(to, body) {
    const { accountSid, authToken, from } = config.sms.twilio;
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
        signal: AbortSignal.timeout(15_000), // never let a slow provider block the worker forever
      },
    );
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      const message = `Twilio ${res.status}: ${data.message ?? 'unknown error'}`;
      // 4xx (bad number, unverified recipient...) won't fix itself; 429/5xx might.
      throw res.status >= 400 && res.status < 500 && res.status !== 429
        ? new PermanentSmsError(message)
        : new Error(message);
    }
    return { providerId: data.sid ?? 'unknown' };
  },
  isPermanentError: (err) => err instanceof PermanentSmsError,
};

export const smsProvider: SmsProvider =
  config.sms.provider === 'twilio' ? twilioProvider : consoleProvider;

/** "9400000001" or "+919400000001" -> "+919400000001" (E.164, what SMS gateways expect). */
export const toE164 = (indianMobile: string) => `+91${indianMobile.replace(/^\+91/, '')}`;

/** "+919400000001" -> "+91 ••••••0001" for logs and admin screens. */
export const maskPhone = (e164: string) => `${e164.slice(0, 3)} ••••••${e164.slice(-4)}`;
