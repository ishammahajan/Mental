import React, { useState } from 'react';
import { User } from '../types';
import { signInWithGoogle, signInWithEmailPassword } from '../services/authService';
import { getOrCreateUserProfile } from '../services/userService';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

/** Google "G" logo SVG */
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

type LoginTab = 'student' | 'staff';
type Step = 'splash' | 'form';

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [step, setStep] = useState<Step>('splash');
  const [tab, setTab] = useState<LoginTab>('student');

  // Google tab state
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Email/Password tab state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const fbUser = await signInWithGoogle();
      const profile = await getOrCreateUserProfile(fbUser);
      onLogin(profile);
    } catch (err: any) {
      setGoogleError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!email.trim()) { setEmailError('Please enter your email.'); return; }
    if (!password.trim()) { setEmailError('Please enter your password.'); return; }
    if (!email.endsWith('@spjimr.org')) {
      setEmailError('Only @spjimr.org email accounts are allowed.');
      return;
    }

    setEmailLoading(true);
    try {
      const fbUser = await signInWithEmailPassword(email.trim(), password);
      const profile = await getOrCreateUserProfile(fbUser);
      onLogin(profile);
    } catch (err: any) {
      setEmailError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Splash Screen ───────────────────────────────────────────────────────────
  if (step === 'splash') {
    return (
      <div
        onClick={() => setStep('form')}
        className="h-screen w-full app-shell flex flex-col items-center justify-center cursor-pointer animate-in fade-in duration-700"
      >
        <div className="relative w-48 h-48 mb-8">
          <div className="absolute inset-0 bg-[#8a6b5c] rounded-full opacity-15 animate-ping" />
          <div className="absolute inset-4 bg-[#8a6b5c] rounded-full opacity-30 animate-pulse" />
          <div className="absolute inset-8 bg-[#8a6b5c] rounded-full flex items-center justify-center shadow-xl">
            <span className="text-white text-5xl font-bold">S</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-[var(--color-text)] tracking-wider mb-2">SPeakUp</h1>
        <p className="text-[var(--color-secondary)] text-sm uppercase tracking-widest">SPJIMR Ecosystem</p>
        <p className="mt-12 text-[var(--color-text-secondary)] text-sm animate-bounce">Tap to Begin</p>
        <div className="absolute bottom-6 left-0 right-0 text-center px-8">
          <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
            ⚕️ <strong>Medical Disclaimer:</strong> SPeakUp is a wellness support tool. It is <em>not</em> a clinical diagnosis tool and does <em>not</em> replace professional medical advice. In a crisis, call <strong>iCall: 9152987821</strong>.
          </p>
        </div>
      </div>
    );
  }

  // ── Two-Tab Login Form ──────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full app-shell flex items-center justify-center p-6">
      <div className="ui-panel p-8 w-full max-w-sm animate-in zoom-in duration-300">

        {/* Title */}
        <h2 className="text-2xl font-bold text-[var(--color-text)] mb-1 text-center">Welcome to SPeakUp</h2>
        <p className="text-center text-[var(--color-text-secondary)] text-xs mb-6">Sign in with your SPJIMR account</p>

        {/* Tab switcher */}
        <div className="flex rounded-2xl p-1 mb-6 gap-1 bg-[var(--color-elevated)] border border-[var(--border-subtle)]">
          <button
            onClick={() => { setTab('student'); setGoogleError(''); setEmailError(''); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'student'
                ? 'bg-white text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
          >
            🎓 Student
          </button>
          <button
            onClick={() => { setTab('staff'); setGoogleError(''); setEmailError(''); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'staff'
                ? 'bg-white text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
          >
            🏫 Staff
          </button>
        </div>

        {/* ── STUDENT TAB — Google Sign-In ─────────────────────────────────── */}
        {tab === 'student' && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-2xl text-center bg-[#f1e6df] border border-[var(--border-subtle)]">
              <p className="text-[var(--color-text)] text-sm font-medium">
                Use your personal <span className="font-bold">@spjimr.org</span> Google account
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold transition-all active:scale-95 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed bg-white border border-[var(--border-subtle)] text-[#5b5350] shadow-sm"
            >
              {googleLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#8a6b5c] border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <GoogleLogo />
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {googleError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-600 text-center">{googleError}</p>
              </div>
            )}
          </div>
        )}

        {/* ── STAFF TAB — Email + Password ────────────────────────────────── */}
        {tab === 'staff' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="px-4 py-3 rounded-2xl text-center bg-[#f1e6df] border border-[#e6dad1]">
              <p className="text-[var(--color-text)] text-xs font-medium">
                For Counselors &amp; Admins — use your staff credentials
              </p>
            </div>

            {/* Email field */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] ml-2 mb-1 uppercase tracking-wide">
                Staff Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. dimple.wagle@spjimr.org"
                  disabled={emailLoading}
                  className="ui-input w-full pl-9 pr-4 py-3.5 text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] ml-2 mb-1 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={emailLoading}
                  className="ui-input w-full pl-9 pr-11 py-3.5 text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {emailError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-600 text-center">{emailError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full flex items-center justify-center gap-2 ui-btn-primary py-4 font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {emailLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {/* Footer notes */}
        <div className="mt-5 space-y-2">
          <div className="p-3 bg-[#f1e6df] border border-[#e6dad1] rounded-xl text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
            <p className="font-bold mb-0.5">⚕️ Medical Disclaimer</p>
            <p>SPeakUp is a <strong>wellness companion</strong>, not a clinical tool. For urgent support: <strong>iCall 9152987821</strong> (Mon–Sat, 8am–10pm).</p>
          </div>
          <div className="p-2 bg-[var(--color-elevated)] border border-[var(--border-subtle)] rounded-xl text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1.5">
            <span>🔒</span>
            <span>Sessions secured by Firebase. All sensitive data is encrypted.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginScreen;







