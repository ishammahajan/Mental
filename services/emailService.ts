type SendEmailPayload = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

type SendEmailResponse = {
  success: boolean;
  provider?: string;
  data?: unknown;
};

const EMAIL_CLOUD_FUNCTION_URL = String(import.meta.env.VITE_EMAIL_FUNCTION_URL || '').trim();
const EMAIL_API_URL = String(import.meta.env.VITE_EMAIL_API_URL || '').trim() || (import.meta.env.PROD
  ? 'https://speakup-backend.up.railway.app/api/email/send'
  : 'http://localhost:3001/api/email/send');

const sendViaEndpoint = async (url: string, payload: SendEmailPayload): Promise<SendEmailResponse> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const top = (data as any)?.error;
    const detailRaw = (data as any)?.detail;
    const detail = typeof detailRaw === 'string'
      ? detailRaw
      : detailRaw?.message || detailRaw?.name || JSON.stringify(detailRaw || {});
    throw new Error([top, detail].filter(Boolean).join(': ') || 'Failed to send email');
  }

  return data as SendEmailResponse;
};

export const sendCounselorEmail = async (payload: SendEmailPayload): Promise<SendEmailResponse> => {
  const endpoints = [EMAIL_CLOUD_FUNCTION_URL, EMAIL_API_URL].filter(Boolean);
  if (endpoints.length === 0) {
    throw new Error('No email endpoint configured');
  }

  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      return await sendViaEndpoint(endpoint, payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to send email');
};
