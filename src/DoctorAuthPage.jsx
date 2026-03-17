import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseClient';
import { Stethoscope, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

// Pre-approved doctor emails (must match emails created in Firebase Auth Console)
const APPROVED_DOCTOR_EMAILS = [
    'dr.sharma@syncq.com',
    'dr.patil@syncq.com',
    'dr.mehta@syncq.com',
    'dr.khan@syncq.com',
    'dr.reddy@syncq.com',
    'dr.joshi@syncq.com',
    'dr.nair@syncq.com',
    'dr.singh@syncq.com',
];

export default function DoctorAuthPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            if (!APPROVED_DOCTOR_EMAILS.includes(cred.user.email.toLowerCase())) {
                await auth.signOut();
                setError('Access denied. This account is not registered as a doctor.');
                return;
            }
            navigate('/doctor');
        } catch (err) {
            const map = {
                'auth/user-not-found': 'No doctor account found with this email.',
                'auth/wrong-password': 'Incorrect password.',
                'auth/invalid-credential': 'Invalid email or password.',
                'auth/invalid-email': 'Please enter a valid email address.',
            };
            setError(map[err.code] || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 relative">
            <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-[#0ea5e9] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center space-x-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#0ea5e9] flex items-center justify-center font-bold text-white shadow-lg shadow-[#0ea5e9]/30 text-xl">S</div>
                        <span className="text-2xl font-bold tracking-tight">SyncQ</span>
                    </div>
                    <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold text-amber-400">
                        <Stethoscope size={13} />
                        <span>Doctor Terminal Access</span>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-8 space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 flex items-center justify-center mx-auto mb-4">
                            <Stethoscope size={32} className="text-[#0ea5e9]" />
                        </div>
                        <h2 className="text-xl font-bold">Doctor Sign In</h2>
                        <p className="text-slate-400 text-sm mt-1">Access the SyncQ Unified Dashboard</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-2.5">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="email" required placeholder="Doctor Email (e.g. dr.sharma@syncq.com)"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] transition-all text-sm"
                            />
                        </div>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="password" required placeholder="Password"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] transition-all text-sm"
                            />
                        </div>
                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_rgba(14,165,233,0.3)] flex justify-center items-center gap-2"
                        >
                            {loading
                                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <><span>Access Dashboard</span><ArrowRight size={16} /></>}
                        </button>
                    </form>

                    <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <ShieldCheck size={13} className="text-[#0ea5e9]" />
                            <span>Authorized medical staff only</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <ShieldCheck size={13} className="text-[#0ea5e9]" />
                            <span>Account must be pre-registered by admin</span>
                        </div>
                    </div>

                    <p className="text-center text-xs text-slate-500">
                        Are you a patient?{' '}
                        <Link to="/login" className="text-[#0ea5e9] hover:underline font-medium">Patient Portal →</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
