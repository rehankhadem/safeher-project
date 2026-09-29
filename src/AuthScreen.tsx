import { FormEvent, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from './auth';

type Props = {
  onClose: () => void;
};

export default function AuthScreen({ onClose }: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setShowPassword(false);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (mode === 'signin') {
      const { error: err } = await signIn(email.trim(), password);
      if (err) {
        setError(err);
      } else {
        onClose();
      }
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setSubmitting(false);
        return;
      }
      const { error: err } = await signUp(email.trim(), password, displayName.trim() || 'User');
      if (err) {
        setError(err);
      } else {
        onClose();
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card auth-modal-card">
        <button className="close-modal" onClick={onClose}><X size={19} /></button>
        <div className="auth-brand">
          <div className="brand-mark"><ShieldCheck size={28} strokeWidth={2.5} /></div>
          <div className="brand-name">SafeHer</div>
          <div className="brand-tagline">Sign in to report an incident</div>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')}>Sign in</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Create account</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <label className="auth-field">
              <User size={17} />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                aria-label="Display name"
                required
              />
            </label>
          )}
          <label className="auth-field">
            <Mail size={17} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              aria-label="Email address"
              required
            />
          </label>
          <label className="auth-field">
            <Lock size={17} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              required
            />
            <button type="button" className="toggle-password" aria-label="Toggle password visibility" onClick={() => setShowPassword((s) => !s)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
