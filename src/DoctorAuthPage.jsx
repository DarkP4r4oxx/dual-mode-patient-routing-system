import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseClient';
import { Stethoscope, Mail, Lock, ArrowRight, ShieldCheck, Sun, Moon } from 'lucide-react';

const APPROVED_DOCTOR_EMAILS = [
  'dr.sharma@syncq.com','dr.patil@syncq.com','dr.mehta@syncq.com','dr.khan@syncq.com',
  'dr.reddy@syncq.com','dr.joshi@syncq.com','dr.nair@syncq.com','dr.singh@syncq.com',
];

export default function DoctorAuthPage({ isDark, toggleTheme }) {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!APPROVED_DOCTOR_EMAILS.includes(cred.user.email.toLowerCase())) {
        await auth.signOut();
        setError('Access denied. This account is not registered as a doctor.');
        return;
      }
      navigate('/doctor');
    } catch (err) {
      setError(({
        'auth/user-not-found':     'No doctor account found with this email.',
        'auth/wrong-password':     'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/invalid-email':      'Please enter a valid email address.',
      })[err.code] || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const S = {
    page:  { background: 'var(--bg)',      color: 'var(--text-1)', minHeight: '100vh' },
    card:  { background: 'var(--surface)', borderColor: 'var(--border)' },
    input: { background: 'var(--bg-2)',    borderColor: 'var(--border)', color: 'var(--text-1)' },
    pill:  { background: 'var(--bg-2)',    borderColor: 'var(--border)' },
    text2: { color: 'var(--text-2)' },
    text3: { color: 'var(--text-3)' },
  };

  return (
    <div style={S.page} className="flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-[#0ea5e9] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />

      {toggleTheme && (
        <button onClick={toggleTheme}
          className="absolute top-5 right-5 p-2 rounded-full border transition-all hover:scale-110 z-10"
          style={S.pill}>
          {isDark ? <Sun size={15} style={S.text2} /> : <Moon size={15} style={S.text2} />}
        </button>
      )}

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-[#0ea5e9] flex items-center justify-center font-bold text-[var(--text-1)] shadow-lg shadow-[#0ea5e9]/30 text-xl">S</div>
            <span className="text-2xl font-bold tracking-tight">SyncQ</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-amber-500 border border-amber-500/25"
            style={{ background: 'rgba(245,158,11,0.08)' }}>
            <Stethoscope size={12} /> Doctor Terminal Access
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-5" style={S.card}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(14,165,233,0.08)', borderColor: 'rgba(14,165,233,0.2)' }}>
              <Stethoscope size={28} className="text-[#0ea5e9]" />
            </div>
            <h2 className="text-lg font-bold">Doctor Sign In</h2>
            <p className="text-sm mt-1" style={S.text3}>Access the SyncQ Unified Dashboard</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={S.text3} />
              <input type="email" required placeholder="Doctor Email (e.g. dr.sharma@syncq.com)"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all"
                style={S.input}
                onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={S.text3} />
              <input type="password" required placeholder="Password"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all"
                style={S.input}
                onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <button type="submit" disabled={loading}
              className="group relative w-full inline-flex justify-center items-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-50 text-[var(--text-1)] font-semibold py-3.5 rounded-xl transition-all shadow-[0_8px_30px_-4px_rgba(14,165,233,0.5)] hover:shadow-[0_12px_45px_-6px_rgba(14,165,233,0.65)] hover:-translate-y-1 active:translate-y-0 overflow-hidden">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-sm mix-blend-overlay"></div>
              {loading
                ? <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--text-1)] rounded-full animate-spin relative z-10" />
                : <><span className="relative z-10">Access Dashboard</span><ArrowRight size={15} className="relative z-10 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>

          <div className="rounded-xl p-4 space-y-2 border" style={{ background: 'var(--glow-1)', borderColor: 'var(--border)' }}>
            {['Authorized medical staff only', 'Account must be pre-registered by admin'].map(txt => (
              <div key={txt} className="flex items-center gap-2 text-xs" style={S.text3}>
                <ShieldCheck size={12} className="text-[#0ea5e9] shrink-0" />
                <span>{txt}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs" style={S.text3}>
            Are you a patient?{' '}
            <Link to="/login" className="text-[#0ea5e9] hover:underline font-medium">Patient Portal →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
