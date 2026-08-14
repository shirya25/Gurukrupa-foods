'use client';
import { useState } from 'react';
import { login } from '@/lib/auth/actions';

export default function LoginForm() {
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await login(fd);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <div className="login-error">{error}</div>}
      <label className="login-label">Phone Number</label>
      <input
        className="login-input"
        type="tel"
        name="phone"
        placeholder="9876543210"
        pattern="[0-9]{10}"
        maxLength={10}
        required
        autoComplete="tel"
      />
      <label className="login-label">Password</label>
      <input
        className="login-input"
        type="password"
        name="password"
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />
      <button className="login-btn" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
