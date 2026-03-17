import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from './firebaseClient';
import { ShieldCheck, Mail, Lock, User, ArrowRight, Chrome } from 'lucide-react';

export default function AuthPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (mode === 'register') {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(cred.user, { displayName: name });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            navigate('/');
        } catch (err) {
            setError(getFriendlyError(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/');
        } catch (err) {
            setError(getFriendlyError(err.code));
        } finally {
            setLoading(false);
        }
    };

    function getFriendlyError(code) {
        const map = {
            'auth/email-already-in-use': 'This email is already registered. Please login.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/weak-password': 'Password must be at least 6 characters.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
        };
        return map[code] || 'Something went wrong. Please try again.';
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 relative">
            <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-[#0ea5e9] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />

            <div className="w-full max-w-md z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center space-x-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#0ea5e9] flex items-center justify-center font-bold text-white shadow-lg shadow-[#0ea5e9]/30 text-xl">S</div>
                        <span className="text-2xl font-bold tracking-tight">SyncQ</span>
                    </div>
                    <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold text-[#0ea5e9]">
                        <ShieldCheck size={13} />
                        <span>Patient Portal</span>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-8 space-y-6">
                    {/* Tab Toggle */}
                    <div className="flex bg-white/5 rounded-xl p-1">
                        <button
                            onClick={() => { setMode('login'); setError(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-[#0ea5e9] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setMode('register'); setError(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-[#0ea5e9] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Register
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-2.5">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text" required placeholder="Full Name" value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] transition-all text-sm"
                                />
                            </div>
                        )}
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="email" required placeholder="Email Address" value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] transition-all text-sm"
                            />
                        </div>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="password" required placeholder="Password" value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] transition-all text-sm"
                            />
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_rgba(14,165,233,0.3)] flex justify-center items-center gap-2"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <><span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span><ArrowRight size={16} /></>}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                        <div className="relative flex justify-center text-xs text-slate-500 bg-transparent"><span className="px-2 bg-[#0f172a]/50">or continue with</span></div>
                    </div>

                    <button
                        onClick={handleGoogle} disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition-all text-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <p className="text-center text-xs text-slate-500">
                        Are you a doctor?{' '}
                        <Link to="/doctor-login" className="text-[#0ea5e9] hover:underline font-medium">Doctor Login →</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
