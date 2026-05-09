import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from './firebaseClient';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Cloud, WifiOff, ArrowLeft, Clock, Search, CheckCircle, Users, AlertTriangle } from 'lucide-react';

import { useDoctors } from './App';

export default function LiveQueuePage() {
  const navigate = useNavigate();
  const [queue, setQueue]           = useState([]);
  const [completedPool, setCompletedPool] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [connected, setConnected]   = useState(false);
  const DOCTORS = useDoctors();
  const [searchRef, setSearchRef]   = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUser, setCurrentUser] = useState(undefined);

  // Proper auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setCurrentUser(u || null));
    return unsub;
  }, []);

  // Firestore live listener
  useEffect(() => {
    const q = query(collection(db, 'appointments'), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q,
      snap => {
        const rawData = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        const data = rawData.filter(d => d.status !== 'Completed');
        setCompletedPool(rawData.filter(d => d.status === 'Completed'));
        const parseTime = (timeStr) => {
          if (!timeStr || timeStr === 'Any') return Infinity;
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return Infinity;
          let [_, h, m, ampm] = match;
          h = parseInt(h, 10);
          m = parseInt(m, 10);
          if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12;
          if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
          return h * 60 + m;
        };

        const tagged = data.map(p => {
          const min = parseTime(p.time_slot);
          return { ...p, _timeMin: min, _block: min === Infinity ? Infinity : Math.floor(min / 15) };
        });

        const processGroup = {};
        for (const p of tagged) {
          const doc = p.doctor || 'Unknown';
          const b = p._block;
          if (!processGroup[doc]) processGroup[doc] = {};
          if (!processGroup[doc][b]) processGroup[doc][b] = { r: [], c: [] };
          
          if ((p.consultation_type || '').includes('Showing Reports')) {
            processGroup[doc][b].r.push(p);
          } else {
            processGroup[doc][b].c.push(p);
          }
        }

        const result = [];
        for (const doc in processGroup) {
          for (const b in processGroup[doc]) {
            const g = processGroup[doc][b];
            g.r.sort((x, y) => (x.created_at?.toMillis?.() || 0) - (y.created_at?.toMillis?.() || 0));
            g.c.sort((x, y) => (x.created_at?.toMillis?.() || 0) - (y.created_at?.toMillis?.() || 0));
            
            const max = Math.max(g.r.length, g.c.length);
            for (let i = 0; i < max; i++) {
              if (i < g.r.length) {
                g.r[i]._interleave = i * 2;
                result.push(g.r[i]);
              }
              if (i < g.c.length) {
                g.c[i]._interleave = i * 2 + 1;
                result.push(g.c[i]);
              }
            }
          }
        }

        result.sort((a, b) => {
          if (a._block !== b._block) return a._block - b._block;
          return a._interleave - b._interleave;
        });

        const sorted = result.map(p => {
          const clone = { ...p };
          delete clone._timeMin;
          delete clone._block;
          delete clone._interleave;
          return clone;
        });
        setQueue(sorted);
        setConnected(true);
        setLoading(false);
        setLastUpdated(new Date());
      },
      () => { setConnected(false); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // Return ALL bookings for this user (or matching ref)
  const combinedData = [...queue, ...completedPool];
  const myBookings = searchRef.trim()
    ? combinedData.filter(p => p.id?.toLowerCase() === searchRef.trim().toLowerCase())
    : currentUser
    ? combinedData.filter(p => p.patient_uid === currentUser.uid)
    : [];

  const getEWT = (booking) => {
    if (!booking.time_slot || booking.time_slot === 'Any') {
      const pos = queue.indexOf(booking) + 1;
      return pos * (booking.consultation_type?.includes('Showing Reports') ? 5 : 15);
    }
    const match = booking.time_slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let [_, h, m, ampm] = match;
    h = parseInt(h, 10);
    m = parseInt(m, 10);
    if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
    
    const now = new Date();
    let target = new Date();
    
    if (booking.booking_date) {
      const [yy, mm, dd] = booking.booking_date.split('-');
      target = new Date(parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
    }
    target.setHours(h, m, 0, 0);

    let diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
    return diffMin > 0 ? diffMin : 0;
  };

  const formatEWT = (minutes) => {
    if (minutes <= 0) return '0m';
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = minutes % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {myBookings.some(b => b.status === 'Called') && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-white/60 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto text-4xl animate-bounce shadow-inner border border-emerald-100">
              👋
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">It's Your Turn!</h2>
              <p className="text-sm font-medium text-slate-500">The doctor is ready to see you now. Please proceed to the cabin seamlessly.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="absolute top-0 left-0 w-full px-6 lg:px-12 py-6 flex items-center justify-between z-50 bg-transparent">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')}
            className="p-2.5 rounded-full border border-slate-200 bg-white/50 backdrop-blur-md transition-all hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <Cloud size={28} strokeWidth={1.5} className="text-slate-800 group-hover:scale-105 transition-transform" />
            <span className="text-[22px] font-light tracking-wide text-slate-800">HyQ</span>
            <span className="text-xs hidden sm:block font-bold uppercase tracking-widest text-slate-400 mt-1 ml-2">/ My Queue Status</span>
          </div>
        </div>

        <div className="flex items-center bg-slate-100/90 backdrop-blur-md rounded-full p-1.5 shadow-sm border border-slate-200/50">
          <div className="flex items-center gap-3 px-3">
            {lastUpdated && (
              <span className="text-[10px] hidden sm:block font-bold text-slate-500 uppercase tracking-widest">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {connected
              ? <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest shadow-sm">
                  <Cloud size={12} className="animate-pulse" /> Live
                </div>
              : <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-widest shadow-sm">
                  <WifiOff size={12} /> Offline
                </div>
            }
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-5 pt-32 max-w-lg mx-auto w-full space-y-5 relative z-10">

        {/* Search / Status card */}
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-6 space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {currentUser ? 'Your Queue Status' : 'Check Your Booking'}
          </p>
          {currentUser && !searchRef && (
            <div className="flex items-center gap-3 text-xs py-3 px-4 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 font-semibold shadow-sm">
              <CheckCircle size={14} />
              <span>Logged in as <strong>{currentUser.displayName || currentUser.email}</strong> — auto-detecting your booking</span>
            </div>
          )}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ref code e.g. SQ-VT1Z"
              value={searchRef}
              onChange={e => setSearchRef(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400 placeholder:font-sans placeholder:font-medium"
            />
          </div>
          {!currentUser && (
            <p className="text-xs font-semibold text-slate-500 pl-1">
              Or{' '}
              <button onClick={() => navigate('/login')} className="text-blue-600 hover:text-blue-700 font-bold">
                sign in
              </button>{' '}
              to auto-detect your booking.
            </p>
          )}
        </div>

        {/* Loading spinner */}
        {(loading || currentUser === undefined) && (
          <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-12 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500">Connecting to live queue…</p>
          </div>
        )}

        {/* My Bookings */}
        {!loading && currentUser !== undefined && myBookings.length > 0 && (
          <div className="space-y-4">
            {/* Header count */}
            <div className="flex items-center gap-2 px-2">
              <CheckCircle size={16} className="text-emerald-500" />
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                {myBookings.length} Appointment{myBookings.length > 1 ? 's' : ''} Found
              </p>
              {searchRef && (
                <button onClick={() => setSearchRef('')} className="ml-auto text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-full">Clear</button>
              )}
            </div>

            {myBookings.map((booking) => {
              const docInfo = DOCTORS.find(d => d.name === booking.doctor) || {};
              return (
              <div key={booking.docId} className="bg-white border border-slate-200 shadow-lg shadow-slate-200/50 rounded-3xl p-6 space-y-5 relative">
                {docInfo.isDelayed && (
                   <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3 mb-2 shadow-sm">
                      <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-700">Doctor Delayed</p>
                        <p className="text-xs font-medium text-red-600 mt-1">{docInfo.delayMessage || 'This doctor is currently unavailable or delayed.'}</p>
                      </div>
                   </div>
                )}
                {/* Ref + doctor */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-black tracking-tight text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{booking.id}</span>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border shadow-sm ${
                    booking.consultation_type?.includes('Showing Reports')
                      ? 'bg-amber-50 text-amber-600 border-amber-100'
                      : 'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                    {booking.consultation_type?.includes('Showing Reports') ? '⚡ Reports (5m)' : '🏥 Checkup (15m)'}
                  </span>
                </div>

                {/* EWT + Slot OR Completed Status */}
                {booking.status === 'Completed' ? (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl p-5 text-center shadow-inner">
                    <CheckCircle className="mx-auto mb-2 text-emerald-500" size={32} />
                    <div className="text-lg font-black tracking-tight">Appointment Completed</div>
                    <div className="text-xs mt-1 font-semibold text-emerald-600">Thank you for visiting!</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4 text-center bg-slate-50 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-center gap-1.5 mb-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest"><Clock size={12} strokeWidth={2.5} /></div>
                      <div className="text-3xl font-black text-slate-900 tracking-tighter">{formatEWT(getEWT(booking))}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Est. Wait</div>
                    </div>
                    <div className="rounded-2xl p-4 text-center bg-slate-50 border border-slate-100 shadow-sm flex flex-col justify-center">
                      <div className="text-xl font-black text-slate-900 truncate tracking-tight">{booking.time_slot || '—'}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Booked Slot</div>
                    </div>
                  </div>
                )}

                {/* Info rows */}
                {[
                  { label: 'Doctor',   value: booking.doctor },
                  { label: 'Specialty', value: booking.specialty },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm border-t border-slate-100 pt-4">
                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">{row.label}</span>
                    <span className="font-bold text-slate-800">{row.value}</span>
                  </div>
                ))}
              </div>
              );
            })}
          </div>
        )}

        {/* Not found */}
        {!loading && currentUser !== undefined && myBookings.length === 0 && (currentUser || searchRef.length >= 4) && (
          <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-8 text-center space-y-4">
            <div className="text-5xl mb-2">🔍</div>
            <p className="font-black text-xl text-slate-900 tracking-tight">No booking found</p>
            <p className="text-sm font-semibold text-slate-500 pb-2">
              {currentUser
                ? "You don't have an active booking yet."
                : 'Check your ref code and try again (e.g. SQ-VT1Z).'}
            </p>
            <button onClick={() => navigate('/')}
              className="mt-2 inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3.5 rounded-xl text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-[0.98]">
              Book Appointment
            </button>
          </div>
        )}


      </main>
    </div>
  );
}
