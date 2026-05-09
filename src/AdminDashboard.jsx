import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth, auth } from './firebaseClient';
import { useDoctors } from './App';
import { Plus, Trash2, LogOut, UserCheck } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const doctors = useDoctors();
  const navigate = useNavigate();
  
  const [newDoc, setNewDoc] = useState({ name: '', email: '', password: '', specialty: 'General Medicine', color: 'bg-blue-600' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colors = ['bg-blue-600', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500'];
  const specialties = ['General Medicine', 'Cardiology', 'Orthopedics', 'Dermatology', 'Pediatrics', 'ENT'];

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      // 1. Create Auth Account using Secondary Auth (so admin is not logged out)
      await createUserWithEmailAndPassword(secondaryAuth, newDoc.email.toLowerCase(), newDoc.password);
      
      // 2. Add to Firestore doctors collection
      await addDoc(collection(db, 'doctors'), {
        name: newDoc.name,
        email: newDoc.email.toLowerCase(),
        specialty: newDoc.specialty,
        color: newDoc.color,
        status: 'Available',
        isDelayed: false,
        delayMessage: '',
        hours: { start: 9, end: 17 }
      });
      
      setNewDoc({ name: '', email: '', password: '', specialty: 'General Medicine', color: 'bg-blue-600' });
      alert("Doctor successfully added!");
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDoctor = async (docId) => {
    if(!window.confirm("Are you sure you want to remove this doctor? They will lose access immediately.")) return;
    try {
      await deleteDoc(doc(db, 'doctors', docId));
    } catch(err) {
      alert("Error removing doctor: " + err.message);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/doctor-login');
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto font-sans bg-slate-50">
      <div className="flex items-center justify-between mb-8 bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[0.8rem] bg-slate-900 flex items-center justify-center font-black text-white text-2xl shadow-inner">H</div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">HyQ SuperAdmin</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manage Doctors & Clinic Infrastructure</p>
          </div>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-full hover:bg-red-100 font-bold border border-red-100 text-xs uppercase tracking-widest transition-colors shadow-sm">
           <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* ADD DOCTOR FORM */}
        <div className="md:col-span-1 bg-white p-8 rounded-3xl h-fit border border-slate-100 shadow-xl shadow-slate-200/50">
          <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-900 tracking-tight">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><UserCheck size={20} /></div>
            Register Doctor
          </h2>
          {error && <div className="bg-red-50 text-red-600 text-xs font-semibold p-3 rounded-xl mb-6 border border-red-100 shadow-sm">{error}</div>}
          
          <form onSubmit={handleAddDoctor} className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Doctor Name</label>
              <input type="text" required value={newDoc.name} onChange={e=>setNewDoc({...newDoc, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all shadow-sm placeholder:text-slate-400" placeholder="e.g. Dr. Sharma" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Email Login</label>
              <input type="email" required value={newDoc.email} onChange={e=>setNewDoc({...newDoc, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all shadow-sm placeholder:text-slate-400" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Secure Password</label>
              <input type="password" required value={newDoc.password} onChange={e=>setNewDoc({...newDoc, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all shadow-sm placeholder:text-slate-400" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Specialty</label>
              <input type="text" list="specialtiesList" required value={newDoc.specialty} onChange={e=>setNewDoc({...newDoc, specialty: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all shadow-sm placeholder:text-slate-400" placeholder="e.g. General Medicine" />
              <datalist id="specialtiesList">
                 {specialties.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Theme Color</label>
              <div className="flex gap-2.5 flex-wrap p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-inner">
                 {colors.map(c => (
                   <button key={c} type="button" onClick={() => setNewDoc({...newDoc, color: c})} className={`w-7 h-7 rounded-full shadow-sm transition-all ${c} ${newDoc.color === c ? 'ring-4 ring-slate-800 ring-offset-2 ring-offset-slate-50 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`} />
                 ))}
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 mt-4 uppercase tracking-widest text-xs">
               {loading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" /> : <Plus size={16} strokeWidth={3} />}
               {loading ? 'Registering...' : 'Add Doctor'}
            </button>
          </form>
        </div>

        {/* DIRECTORY LIST */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Directory</h2>
            <div className="px-3 py-1 bg-slate-100 text-slate-600 font-bold rounded-full text-xs uppercase tracking-widest shadow-inner border border-slate-200">
              {doctors.length} Registered
            </div>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
             {doctors.map(doc => (
               <div key={doc.id} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${doc.color} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                       {doc.name.split(' ')[1]?.[0] || doc.name[0]}
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-900">{doc.name}</h3>
                       <p className="text-xs font-semibold text-slate-500 mt-0.5">{doc.specialty} • <span className="font-mono text-slate-400">{doc.email}</span></p>
                    </div>
                 </div>
                 <button onClick={() => handleRemoveDoctor(doc.id)} className="text-slate-400 bg-white border border-slate-200 p-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                 </button>
               </div>
             ))}
             
             {doctors.length === 0 && (
               <div className="text-center text-slate-400 font-bold text-sm uppercase tracking-widest py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  No doctors registered yet.
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
