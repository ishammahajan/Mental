const { onRequest } = require('firebase-functions/v2/https');

exports.sendCounselorEmail = onRequest(
  {
    cors: true,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { to, subject, html, text } = req.body || {};

      if (!to || !subject) {
        return res.status(400).json({ error: 'to and subject are required' });
      }

      const recipients = Array.isArray(to)
        ? to.map((email) => String(email).trim()).filter(Boolean)
        : [String(to).trim()].filter(Boolean);

      if (recipients.length === 0) {
        return res.status(400).json({ error: 'At least one valid recipient is required' });
      }

      const contentText = String(text || '').trim();
      const contentHtml = String(html || '').trim();
      if (!contentText && !contentHtml) {
        return res.status(400).json({ error: 'Either text or html body is required' });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      const emailFrom = process.env.EMAIL_FROM || 'Maker Lab <no-reply@tasks-no-reply.isham.in>';

      if (!resendApiKey) {
        return res.status(500).json({ error: 'RESEND_API_KEY is not configured in Cloud Functions' });
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: recipients,
          subject: String(subject),
          ...(contentHtml ? { html: contentHtml } : {}),
          ...(contentText ? { text: contentText } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Email provider request failed',
          detail: data,
        });
      }

      return res.json({ success: true, provider: 'resend', data });
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
