import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from './firebaseClient';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Cloud, WifiOff, ArrowLeft, Clock, Search, CheckCircle, Users, Sun, Moon } from 'lucide-react';

const DOCTORS = [
  { id: 'd1', name: 'Dr. Sharma', specialty: 'General Medicine', color: 'bg-sky-500' },
  { id: 'd2', name: 'Dr. Patil',  specialty: 'Cardiology',       color: 'bg-rose-500' },
  { id: 'd3', name: 'Dr. Mehta',  specialty: 'Orthopedics',      color: 'bg-amber-500' },
  { id: 'd4', name: 'Dr. Khan',   specialty: 'Dermatology',      color: 'bg-emerald-500' },
  { id: 'd5', name: 'Dr. Reddy',  specialty: 'Pediatrics',       color: 'bg-purple-500' },
  { id: 'd6', name: 'Dr. Joshi',  specialty: 'ENT',              color: 'bg-orange-500' },
  { id: 'd7', name: 'Dr. Nair',   specialty: 'General Medicine', color: 'bg-teal-500' },
  { id: 'd8', name: 'Dr. Singh',  specialty: 'Cardiology',       color: 'bg-indigo-500' },
];

export default function LiveQueuePage({ isDark, toggleTheme }) {
  const navigate = useNavigate();
  const [queue, setQueue]           = useState([]);
  const [completedPool, setCompletedPool] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [connected, setConnected]   = useState(false);
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

  // ── shared style helpers ──────────────────────────────────────────────────
  const S = {
    page:     { background: 'var(--bg)',      color: 'var(--text-1)',   minHeight: '100vh' },
    header:   { background: 'var(--surface)', borderColor: 'var(--border)' },
    card:     { background: 'var(--surface)', borderColor: 'var(--border)',   color: 'var(--text-1)' },
    cardHi:   { background: 'var(--surface)', borderColor: 'var(--brand)',    color: 'var(--text-1)' },
    input:    { background: 'var(--bg-2)',     borderColor: 'var(--border)',   color: 'var(--text-1)' },
    pill:     { background: 'var(--bg-2)',     borderColor: 'var(--border)' },
    text2:    { color: 'var(--text-2)' },
    text3:    { color: 'var(--text-3)' },
    inner:    { background: 'var(--bg-2)' },
  };

  return (
    <div style={S.page} className="flex flex-col">
      {myBookings.some(b => b.status === 'Called') && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-slate-900 border border-[#0ea5e9]/50 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-[0_0_60px_rgba(14,165,233,0.3)]">
            <div className="w-20 h-20 bg-[#0ea5e9] text-white rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce shadow-[0_0_30px_rgba(14,165,233,0.5)]">
              👋
            </div>
            <div>
              <h2 className="text-3xl font-black text-white mb-2">It's Your Turn!</h2>
              <p className="text-slate-300">The doctor is ready to see you now. Please proceed to the cabin seamlessly.</p>
            </div>
          </div>
        </div>
      )}

      {/* glow blobs */}
      <div className="fixed top-1/4 left-1/4 w-[36rem] h-[36rem] bg-[#0ea5e9] rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.07] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.07] pointer-events-none" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-xl px-5 py-3.5 flex items-center justify-between"
        style={S.header}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="p-2 rounded-xl border transition-all hover:scale-105 active:scale-95"
            style={S.pill}>
            <ArrowLeft size={15} style={S.text2} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={() => navigate('/')}>
            <div className="w-7 h-7 rounded-lg bg-[#0ea5e9] flex items-center justify-center font-bold text-[var(--text-1)] text-xs shadow-lg shadow-[#0ea5e9]/25">H</div>
            <span className="font-bold tracking-tight" style={S.text2}>HyQ</span>
            <span className="text-sm hidden sm:block" style={S.text3}>/ My Queue Status</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs hidden sm:block" style={S.text3}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          {connected
            ? <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <Cloud size={11} className="animate-pulse" /> Live
              </div>
            : <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-red-500/10 text-red-400 border-red-500/20">
                <WifiOff size={11} /> Offline
              </div>
          }
          {toggleTheme && (
            <button onClick={toggleTheme}
              className="p-2 rounded-full border transition-all hover:scale-110 active:scale-95"
              style={S.pill}>
              {isDark ? <Sun size={14} style={S.text2} /> : <Moon size={14} style={S.text2} />}
            </button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-5 max-w-lg mx-auto w-full space-y-4">

        {/* Search / Status card */}
        <div className="neu-panel rounded-2xl p-5 space-y-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={S.text2}>
            {currentUser ? 'Your Queue Status' : 'Check Your Booking'}
          </p>
          {currentUser && !searchRef && (
            <div className="flex items-center gap-2 text-xs py-2 px-3 rounded-xl border"
              style={{ background: 'var(--glow-1)', borderColor: 'var(--border-2)', color: 'var(--brand)' }}>
              <CheckCircle size={12} />
              <span>Logged in as <strong>{currentUser.displayName || currentUser.email}</strong> — auto-detecting your booking</span>
            </div>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={S.text3} />
            <input
              type="text"
              placeholder="Search by ref code e.g. SQ-VT1Z"
              value={searchRef}
              onChange={e => setSearchRef(e.target.value.toUpperCase())}
              className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border font-mono focus:outline-none transition-all"
              style={{ ...S.input, '--tw-ring-color': 'var(--brand)' }}
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          {!currentUser && (
            <p className="text-xs" style={S.text3}>
              Or{' '}
              <button onClick={() => navigate('/login')} className="text-[#0ea5e9] hover:underline font-medium">
                sign in
              </button>{' '}
              to auto-detect your booking.
            </p>
          )}
        </div>

        {/* Loading spinner */}
        {(loading || currentUser === undefined) && (
          <div className="neu-panel rounded-2xl p-12 flex flex-col items-center gap-4" style={{ borderColor: 'var(--border)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-[#0ea5e9] border-t-transparent animate-spin" />
            <p className="text-sm" style={S.text3}>Connecting to live queue…</p>
          </div>
        )}

        {/* My Bookings */}
        {!loading && currentUser !== undefined && myBookings.length > 0 && (
          <div className="space-y-4">
            {/* Header count */}
            <div className="flex items-center gap-2 px-1">
              <CheckCircle size={14} className="text-emerald-500" />
              <p className="text-sm font-semibold" style={S.text2}>
                {myBookings.length} Appointment{myBookings.length > 1 ? 's' : ''} Found
              </p>
              {searchRef && (
                <button onClick={() => setSearchRef('')} className="ml-auto text-xs hover:underline" style={S.text3}>Clear</button>
              )}
            </div>

            {myBookings.map((booking) => (
              <div key={booking.docId} className="neu-panel rounded-2xl p-5 space-y-4 border-2" style={S.cardHi}>
                {/* Ref + doctor */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#0ea5e9]">{booking.id}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    booking.consultation_type?.includes('Showing Reports')
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                  }`}>
                    {booking.consultation_type?.includes('Showing Reports') ? '⚡ Reports (5m)' : '🏥 Checkup (15m)'}
                  </span>
                </div>

                {/* EWT + Slot OR Completed Status */}
                {booking.status === 'Completed' ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl p-4 text-center">
                    <CheckCircle className="mx-auto mb-2 text-emerald-500" size={28} />
                    <div className="text-lg font-bold">Appointment Completed</div>
                    <div className="text-xs mt-1 opacity-80 font-medium">Thank you for visiting!</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3 text-center" style={S.inner}>
                      <div className="flex items-center justify-center gap-1 mb-1" style={S.text3}><Clock size={12} /></div>
                      <div className="text-xl font-bold">{formatEWT(getEWT(booking))}</div>
                      <div className="text-xs" style={S.text3}>Est. Wait</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={S.inner}>
                      <div className="text-xl font-bold truncate">{booking.time_slot || '—'}</div>
                      <div className="text-xs" style={S.text3}>Booked Slot</div>
                    </div>
                  </div>
                )}

                {/* Info rows */}
                {[
                  { label: 'Doctor',   value: booking.doctor },
                  { label: 'Specialty', value: booking.specialty },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <span style={S.text3}>{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Not found */}
        {!loading && currentUser !== undefined && myBookings.length === 0 && (currentUser || searchRef.length >= 4) && (
          <div className="neu-panel rounded-2xl p-8 text-center space-y-3" style={{ borderColor: 'var(--border)' }}>
            <div className="text-4xl">🔍</div>
            <p className="font-semibold">No booking found</p>
            <p className="text-sm" style={S.text3}>
              {currentUser
                ? "You don't have an active booking yet."
                : 'Check your ref code and try again (e.g. SQ-VT1Z).'}
            </p>
            <button onClick={() => navigate('/')}
              className="mt-2 inline-flex items-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_4px_14px_rgba(14,165,233,0.3)]">
              Book Appointment
            </button>
          </div>
        )}


      </main>
    </div>
  );
}
