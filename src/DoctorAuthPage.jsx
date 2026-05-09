import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebaseClient';
import { Stethoscope, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function DoctorAuthPage() {
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
      
      const userEmail = cred.user.email.toLowerCase();
      
      if (userEmail === 'admin@hyq.com') {
        navigate('/admin');
        return;
      }
      
      const q = query(collection(db, 'doctors'), where('email', '==', userEmail));
      const snap = await getDocs(q);
      
      if (snap.empty) {
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

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-amber-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-rose-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-12 h-12 rounded-[0.8rem] bg-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/20 text-2xl group-hover:scale-105 transition-transform">H</div>
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">HyQ</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 uppercase tracking-widest">
            <Stethoscope size={14} /> Doctor Terminal
          </div>
        </div>

        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Stethoscope size={28} className="text-slate-700" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Doctor Sign In</h2>
            <p className="text-sm mt-1 font-medium text-slate-500">Access the HyQ Unified Dashboard</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" required placeholder="Doctor Email (e.g. dr.sharma@hyq.com)"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400 placeholder:font-medium" />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" required placeholder="Password"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400 placeholder:font-medium" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex justify-center items-center gap-2 uppercase tracking-widest text-xs mt-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin relative z-10" />
                : <><span className="relative z-10">Access Dashboard</span><ArrowRight size={15} className="relative z-10 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>

          <div className="rounded-2xl p-4 space-y-3 border border-slate-100 bg-slate-50 shadow-sm">
            {['Authorized medical staff only', 'Account must be pre-registered by admin'].map(txt => (
              <div key={txt} className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <ShieldCheck size={14} className="text-slate-400 shrink-0" />
                <span>{txt}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs font-semibold text-slate-500 pt-2">
            Are you a patient?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold ml-1">Patient Portal →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
