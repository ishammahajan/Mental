import React from 'react';

export default function NoApiKeyFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '480px',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
        <h1 style={{ color: 'var(--color-error)', marginBottom: '12px', fontSize: '22px' }}>
          API Key Missing
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
          The app requires a <strong>Gemini API key</strong> to run. Please create a{' '}
          <code style={{ background: 'rgba(11,11,12,0.06)', padding: '2px 6px', borderRadius: '4px' }}>.env</code>{' '}
          file in the project root with:
        </p>
        <pre style={{
          background: 'rgba(11,11,12,0.06)',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'left',
          fontSize: '13px',
          color: 'var(--color-text)',
          overflowX: 'auto',
        }}>
          {`VITE_GEMINI_API_KEY=your_key_here`}
        </pre>
        <p style={{ color: 'var(--color-muted)', fontSize: '13px', marginTop: '20px' }}>
          Get a free key at{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            style={{ color: 'var(--color-primary)' }}>
            aistudio.google.com
          </a>
        </p>
      </div>
    </div>
  );
}



