import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import {
  Cloud, Copy, ArrowRight, AlertTriangle, ShieldCheck,
  WifiOff, Stethoscope, ChevronLeft, LogOut, User, Sun, Moon,
  Clock, Users, Activity
} from 'lucide-react';
import { db, auth } from './firebaseClient';
import { collection, addDoc, query, orderBy, serverTimestamp, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthPage from './AuthPage';
import DoctorAuthPage from './DoctorAuthPage';
import LiveQueuePage from './LiveQueuePage';

// ─── Doctor Directory ─────────────────────────────────────────────────────────
const DOCTORS = [
  { id: 'd1', name: 'Dr. Sharma', email: 'dr.sharma@syncq.com', specialty: 'General Medicine', status: 'Available', color: 'bg-sky-500', hours: { start: 9, end: 17 } },
  { id: 'd2', name: 'Dr. Patil', email: 'dr.patil@syncq.com', specialty: 'Cardiology', status: 'Available', color: 'bg-rose-500', hours: { start: 10, end: 16 } },
  { id: 'd3', name: 'Dr. Mehta', email: 'dr.mehta@syncq.com', specialty: 'Orthopedics', status: 'In Surgery', color: 'bg-amber-500', hours: { start: 9, end: 14 } },
  { id: 'd4', name: 'Dr. Khan', email: 'dr.khan@syncq.com', specialty: 'Dermatology', status: 'Available', color: 'bg-emerald-500', hours: { start: 11, end: 18 } },
  { id: 'd5', name: 'Dr. Reddy', email: 'dr.reddy@syncq.com', specialty: 'Pediatrics', status: 'Available', color: 'bg-purple-500', hours: { start: 9, end: 15 } },
  { id: 'd6', name: 'Dr. Joshi', email: 'dr.joshi@syncq.com', specialty: 'ENT', status: 'On Leave', color: 'bg-orange-500', hours: { start: 9, end: 17 } },
  { id: 'd7', name: 'Dr. Nair', email: 'dr.nair@syncq.com', specialty: 'General Medicine', status: 'Available', color: 'bg-teal-500', hours: { start: 8, end: 14 } },
  { id: 'd8', name: 'Dr. Singh', email: 'dr.singh@syncq.com', specialty: 'Cardiology', status: 'Available', color: 'bg-indigo-500', hours: { start: 14, end: 20 } },
];

const SPECIALTIES = ['All', 'General Medicine', 'Cardiology', 'Orthopedics', 'Dermatology', 'Pediatrics', 'ENT'];

const SPECIALTY_ICONS = {
  'All': '🏥',
  'General Medicine': '🩺',
  'Cardiology': '❤️',
  'Orthopedics': '🦴',
  'Dermatology': '🔬',
  'Pediatrics': '👶',
  'ENT': '👂',
};

function generateSlots(doctor, consultType, dateStr) {
  const intervalMin = consultType === 'Showing Reports' ? 5 : 15;
  const slots = [];
  let hour = doctor.hours.start;
  let min = 0;
  const now = new Date();
  const isToday = !dateStr || dateStr === now.toISOString().split('T')[0];

  while (hour < doctor.hours.end) {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const m = min === 0 ? '00' : min;
    
    let isPassed = false;
    if (isToday) {
      if (hour < now.getHours() || (hour === now.getHours() && min <= now.getMinutes())) {
        isPassed = true;
      }
    }
    
    if (!isPassed) slots.push(`${h}:${m} ${ampm}`);
    
    min += intervalMin;
    if (min >= 60) { min -= 60; hour++; }
  }
  return slots;
}

// ─── Translations ─────────────────────────────────────────────────────────────
const LANGS = {
  EN: {
    checkLive: 'Check Live Queue', cloudMode: 'Cloud Mode Active', badge: 'Dual Mode Routing System',
    headline1: 'Skip the', headline2: 'Waiting Room',
    subheadline: 'Secure your priority token instantly and arrive exactly when the doctor is ready.',
    bookBtn: 'Book Appointment Now', doctorPortal: 'Staff / Doctor Portal',
    selectSpecialty: 'Select Specialty', selectDoctor: 'Choose Your Doctor',
    bookingDetails: 'Appointment Details', confirmBtn: 'Confirm & Generate ID',
    patientName: 'Patient Name', phone: 'Phone Number',
    consultType: 'Consultation Type', newCheckup: 'New Checkup', showingReports: 'Showing Reports',
    selectSlot: 'Select Time Slot', emergency: '🚨 Medical Emergency? Click here.',
    successTitle: 'Active Queue Status', successSub: 'Arrive by your estimated wait time',
    ewt: 'Estimated Wait Time', bookingRef: 'Booking Ref',
    whatsapp: 'Get Live Updates on WhatsApp', qrLabel: 'Scan at Hospital Edge Node',
    cancelBtn: 'Cancel / Reschedule Appointment',
  },
  MH: {
    checkLive: 'थेट रांग तपासा', cloudMode: 'क्लाउड मोड सक्रिय', badge: 'दुहेरी मोड रुग्ण प्रणाली',
    headline1: 'सोडा', headline2: 'प्रतीक्षालय',
    subheadline: 'त्वरित आपला प्राधान्य टोकन सुरक्षित करा आणि डॉक्टर तयार असताना या.',
    bookBtn: 'अपॉइंटमेंट बुक करा', doctorPortal: 'कर्मचारी / डॉक्टर पोर्टल',
    selectSpecialty: 'विशेषता निवडा', selectDoctor: 'डॉक्टर निवडा',
    bookingDetails: 'अपॉइंटमेंट तपशील', confirmBtn: 'पुष्टी करा व ID तयार करा',
    patientName: 'रुग्णाचे नाव', phone: 'फोन नंबर',
    consultType: 'सल्लामसलत प्रकार', newCheckup: 'नवीन तपासणी', showingReports: 'अहवाल दाखवणे',
    selectSlot: 'वेळ निवडा', emergency: '🚨 वैद्यकीय आणीबाणी? येथे क्लिक करा.',
    successTitle: 'सक्रिय रांग स्थिती', successSub: 'अंदाजित प्रतीक्षा वेळेपर्यंत या',
    ewt: 'अंदाजित प्रतीक्षा वेळ', bookingRef: 'बुकिंग संदर्भ',
    whatsapp: 'WhatsApp वर थेट अपडेट मिळवा', qrLabel: 'हॉस्पिटल एज नोडवर स्कॅन करा',
    cancelBtn: 'अपॉइंटमेंट रद्द / पुनर्निर्धारित करा',
  },
  HI: {
    checkLive: 'लाइव कतार देखें', cloudMode: 'क्लाउड मोड सक्रिय', badge: 'दोहरी मोड रोगी प्रणाली',
    headline1: 'छोड़ें', headline2: 'प्रतीक्षालय',
    subheadline: 'तुरंत अपना प्राथमिकता टोकन सुरक्षित करें और डॉक्टर के तैयार होने पर आएं।',
    bookBtn: 'अपॉइंटमेंट बुक करें', doctorPortal: 'स्टाफ / डॉक्टर पोर्टल',
    selectSpecialty: 'विशेषता चुनें', selectDoctor: 'डॉक्टर चुनें',
    bookingDetails: 'अपॉइंटमेंट विवरण', confirmBtn: 'पुष्टि करें और ID बनाएं',
    patientName: 'मरीज़ का नाम', phone: 'फ़ोन नंबर',
    consultType: 'परामर्श प्रकार', newCheckup: 'नई जांच', showingReports: 'रिपोर्ट दिखाना',
    selectSlot: 'समय चुनें', emergency: '🚨 चिकित्सा आपातकाल? यहाँ क्लिक करें।',
    successTitle: 'सक्रिय कतार स्थिति', successSub: 'अनुमानित प्रतीक्षा समय तक पहुंचें',
    ewt: 'अनुमानित प्रतीक्षा समय', bookingRef: 'बुकिंग संदर्भ',
    whatsapp: 'WhatsApp पर लाइव अपडेट प्राप्त करें', qrLabel: 'हॉस्पिटल एज नोड पर स्कैन करें',
    cancelBtn: 'अपॉइंटमेंट रद्द / पुनर्निर्धारित करें',
  }
};

// ─── Auth Context ─────────────────────────────────────────────────────────────
function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return unsub;
  }, []);
  return user;
}

// Protected route wrapper
function RequireAuth({ children }) {
  const user = useAuth();
  if (user === undefined) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireDoctorAuth({ children }) {
  const user = useAuth();
  if (user === undefined) return <LoadingScreen />;
  if (!user) return <Navigate to="/doctor-login" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--bg)'}}>
      <div className="w-8 h-8 rounded-full border-2 border-[#0ea5e9] border-t-transparent animate-spin" />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('syncq-theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) { root.classList.remove('light'); } else { root.classList.add('light'); }
    localStorage.setItem('syncq-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(d => !d);

  return (
    <BrowserRouter>
      <div className="w-full min-h-screen flex flex-col font-sans selection:bg-[#0ea5e9] selection:text-white relative overflow-x-hidden" style={{background:'var(--bg)',color:'var(--text-1)'}}>
        <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-[#0ea5e9] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
        <Routes>
          <Route path="/login"        element={<AuthPage isDark={isDark} toggleTheme={toggleTheme} />} />
          <Route path="/doctor-login" element={<DoctorAuthPage isDark={isDark} toggleTheme={toggleTheme} />} />
          <Route path="/queue"        element={<LiveQueuePage isDark={isDark} toggleTheme={toggleTheme} />} />
          <Route path="/"             element={<PatientPortal isDark={isDark} toggleTheme={toggleTheme} />} />
          <Route path="/doctor"       element={<RequireDoctorAuth><DoctorDashboard isDark={isDark} toggleTheme={toggleTheme} /></RequireDoctorAuth>} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// ─── Patient Portal ───────────────────────────────────────────────────────────
function PatientPortal({ isDark, toggleTheme }) {
  const [currentStep, setCurrentStep] = useState('LANDING');
  const [generatedToken, setGeneratedToken] = useState('');
  const [bookedSlot, setBookedSlot] = useState('');
  const [bookedDate, setBookedDate] = useState('');
  const [lang, setLang] = useState('EN');
  const t = LANGS[lang];
  const navigate = useNavigate();
  const user = useAuth();

  const handleGoToBooking = () => {
    if (!user) { navigate('/login'); } else { setCurrentStep('BOOKING'); }
  };
  const handleSignOut = async () => { await signOut(auth); navigate('/login'); };

  return (
    <>
      <header className="w-full glass-panel border-b px-6 py-3.5 flex items-center justify-between sticky top-0 z-50" style={{borderColor:'var(--border)'}}>
        <div className="flex items-center space-x-2 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-[#0ea5e9] flex items-center justify-center font-bold text-[var(--text-1)] shadow-lg shadow-[#0ea5e9]/20 text-sm">S</div>
          <span className="text-lg font-bold tracking-tight" style={{color:'var(--text-1)'}}>SyncQ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center space-x-1 rounded-full px-3 py-1.5 border text-xs" style={{background:'var(--bg-2)',borderColor:'var(--border)'}}>
            {['EN', 'MH', 'HI'].map((l, i) => (
              <React.Fragment key={l}>
                {i > 0 && <span className="mx-1" style={{color:'var(--text-3)'}}>|</span>}
                <button onClick={() => setLang(l)} className="px-1 transition-all font-semibold"
                  style={{color: lang === l ? 'var(--brand)' : 'var(--text-3)'}}>{l}</button>
              </React.Fragment>
            ))}
          </div>
          <button onClick={() => navigate('/queue')} className="hidden sm:block text-sm font-medium transition-colors hover:text-[#0ea5e9]" style={{color:'var(--text-2)'}}>{t.checkLive}</button>
          <button onClick={toggleTheme} title="Toggle theme"
            className="p-2 rounded-full border transition-all hover:scale-110 active:scale-95"
            style={{background:'var(--bg-2)', borderColor:'var(--border)', color:'var(--text-2)'}}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {user ? (
            <div className="flex items-center gap-2 border rounded-full px-3 py-1.5" style={{background:'var(--bg-2)',borderColor:'var(--border)'}}>
              <div className="w-6 h-6 rounded-full bg-[#0ea5e9] flex items-center justify-center text-xs font-bold text-white">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs hidden sm:block max-w-[100px] truncate" style={{color:'var(--text-2)'}}>{user?.displayName || user?.email?.split('@')[0]}</span>
              <button onClick={handleSignOut} className="hover:text-red-400 transition-colors ml-1" style={{color:'var(--text-3)'}}><LogOut size={14} /></button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-[#0ea5e9] border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 px-3 py-1.5 rounded-full text-sm font-semibold transition-all">
              <User size={14} /> Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="w-full max-w-2xl z-10">
          {currentStep === 'LANDING' && <HeroSection t={t} onNext={handleGoToBooking} />}
          {currentStep === 'BOOKING' && <BookingFlow t={t} user={user} onBack={() => setCurrentStep('LANDING')} onNext={(token, slot, date) => { setGeneratedToken(token); setBookedSlot(slot); setBookedDate(date); setCurrentStep('SUCCESS'); }} />}
          {currentStep === 'SUCCESS'  && <QueueTracker t={t} refCode={generatedToken} bookedSlot={bookedSlot} bookedDate={bookedDate} onReset={() => setCurrentStep('LANDING')} />}
        </div>
      </main>
    </>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ t, onNext }) {
  const navigate = useNavigate();
  return (
    <div className="text-center space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 border px-4 py-1.5 rounded-full text-xs font-bold text-[#0ea5e9] mb-2" style={{background:'var(--glow-1)',borderColor:'var(--border-2)'}}>
        <Activity size={13} className="animate-pulse" />
        <span>Live Queue System • AI-Powered Scheduling</span>
      </div>

      {/* Headline */}
      <div className="space-y-3 px-2">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-balance" style={{color:'var(--text-1)'}}>
          Your Doctor Is Ready —{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0ea5e9] via-cyan-400 to-sky-300">
            Are You?
          </span>
        </h1>
        <p className="text-sm md:text-lg max-w-lg mx-auto leading-relaxed" style={{color:'var(--text-2)'}}>
          SyncQ eliminates waiting rooms. Book your slot, track your position live,
          and walk in <strong style={{color:'var(--text-1)'}}>exactly when the doctor is ready</strong> for you.
        </p>
      </div>

      {/* Stats Row */}
      <div className="flex justify-center flex-wrap gap-4 sm:gap-8 py-1">
        {[{icon:'⚡', val:'< 2 min', label:'Token Generation'}, {icon:'📍', val:'Real-Time', label:'Queue Tracking'}, {icon:'🏥', val:'8 Doctors', label:'6 Specialties'}].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-lg md:text-xl mb-0.5">{s.icon}</div>
            <div className="text-xs md:text-sm font-bold" style={{color:'var(--text-1)'}}>{s.val}</div>
            <div className="text-[10px] md:text-xs" style={{color:'var(--text-3)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button onClick={onNext} className="group relative inline-flex items-center justify-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-[var(--text-1)] px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_8px_30px_-4px_rgba(14,165,233,0.5)] hover:shadow-[0_12px_45px_-6px_rgba(14,165,233,0.65)] hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto overflow-hidden">
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-sm mix-blend-overlay"></div>
          <span className="relative z-10">{t.bookBtn}</span>
          <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1.5 transition-transform duration-300" />
        </button>
        <button onClick={() => navigate('/doctor-login')} className="px-6 py-4 rounded-xl text-sm font-semibold transition-colors hover:bg-white/5 border border-transparent hover:border-[var(--border)]" style={{color:'var(--text-2)'}}>
          {t.doctorPortal}
        </button>
      </div>
    </div>
  );
}

// ─── Booking Flow (3-Step Wizard) ─────────────────────────────────────────────
function BookingFlow({ t, user, onNext, onBack }) {
  const [step, setStep] = useState(1); // 1=Specialty, 2=Doctor, 3=Details
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [consultType, setConsultType] = useState('');
  const [patientName, setPatientName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filteredDoctors = selectedSpecialty === 'All'
    ? DOCTORS
    : DOCTORS.filter(d => d.specialty === selectedSpecialty);

  const slots = selectedDoctor && consultType && selectedDate ? generateSlots(selectedDoctor, consultType, selectedDate) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) { setError('Please select a time slot.'); return; }
    setIsSubmitting(true);
    setError('');
    const generatedId = 'SQ-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    try {
      await addDoc(collection(db, 'appointments'), {
        id: generatedId,
        patient_name: patientName,
        patient_uid: user?.uid || null,
        phone_number: phone,
        doctor: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        consultation_type: consultType,
        booking_date: selectedDate,
        time_slot: selectedSlot,
        source: 'Cloud',
        status: 'Waiting',
        created_at: serverTimestamp()
      });
      console.log('✅ Appointment saved:', generatedId);
      onNext(generatedId, selectedSlot, selectedDate);
    } catch (err) {
      console.error('❌ Firebase error:', err);
      if (err?.code === 'permission-denied') {
        setError('❌ Firebase rules are blocking the save. Please update Firestore Security Rules in Firebase Console first.');
      } else {
        setError('Could not save appointment. Check your connection and try again.');
      }
      setIsSubmitting(false);
      return; // Don't proceed — force user to fix the issue
    }
  };

  // Step progress bar
  const stepLabels = [t.selectSpecialty, t.selectDoctor, t.bookingDetails];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all shrink-0">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 ${s <= step ? 'text-[#0ea5e9]' : 'text-slate-500'} transition-colors`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${s < step ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white' : s === step ? 'border-[#0ea5e9] text-[#0ea5e9]' : 'border-slate-600 text-slate-600'}`}>
                  {s < step ? '✓' : s}
                </div>
                <span className="text-xs hidden sm:block">{stepLabels[s - 1]}</span>
              </div>
              {s < 3 && <div className={`flex-1 h-px transition-all ${s < step ? 'bg-[#0ea5e9]' : 'bg-slate-700'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Specialty */}
      {step === 1 && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold">{t.selectSpecialty}</h2>
            <p className="text-sm text-slate-400 mt-1">Choose a medical specialty to find the right doctor</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {SPECIALTIES.filter(s => s !== 'All').map(spec => (
              <button
                key={spec}
                onClick={() => { setSelectedSpecialty(spec); setStep(2); setSelectedDoctor(null); setSelectedSlot(''); }}
                className="p-4 rounded-xl border border-white/10 bg-white/3 hover:bg-[#0ea5e9]/10 hover:border-[#0ea5e9]/40 transition-all text-left group"
              >
                <div className="text-2xl mb-2">{SPECIALTY_ICONS[spec]}</div>
                <div className="text-sm font-semibold text-white group-hover:text-[#0ea5e9] transition-colors">{spec}</div>
                <div className="text-xs text-slate-500 mt-0.5">{DOCTORS.filter(d => d.specialty === spec).length} doctors</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Doctor */}
      {step === 2 && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{t.selectDoctor}</h2>
              <p className="text-sm text-slate-400 mt-1">{selectedSpecialty} • {filteredDoctors.length} available</p>
            </div>
            <button onClick={() => { setSelectedSpecialty('All'); setStep(1); }}
              className="text-xs text-[#0ea5e9] hover:underline">Change Specialty</button>
          </div>
          <div className="space-y-3">
            {filteredDoctors.map(doc => (
              <button
                key={doc.id}
                onClick={() => { if (doc.status !== 'On Leave') { setSelectedDoctor(doc); setStep(3); setSelectedSlot(''); setConsultType(''); } }}
                disabled={doc.status === 'On Leave'}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left
                  ${doc.status === 'On Leave' ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/2' :
                    'border-white/10 bg-white/3 hover:bg-[#0ea5e9]/10 hover:border-[#0ea5e9]/40 group'}`}
              >
                <div className={`w-12 h-12 rounded-xl ${doc.color} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg`}>
                  {doc.name.split(' ')[1][0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white group-hover:text-[#0ea5e9] transition-colors">{doc.name}</div>
                  <div className="text-xs text-slate-400">{doc.specialty}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {doc.hours.start}:00 — {doc.hours.end}:00
                  </div>
                </div>
                <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0
                  ${doc.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    doc.status === 'In Surgery' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {doc.status}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Details + Time Slot */}
      {step === 3 && selectedDoctor && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          {/* Selected doctor summary */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className={`w-10 h-10 rounded-xl ${selectedDoctor.color} flex items-center justify-center text-white font-bold shrink-0`}>
              {selectedDoctor.name.split(' ')[1][0]}
            </div>
            <div>
              <div className="font-bold">{selectedDoctor.name}</div>
              <div className="text-xs text-slate-400">{selectedDoctor.specialty}</div>
            </div>
            <button onClick={() => setStep(2)} className="ml-auto text-xs text-[#0ea5e9] hover:underline">Change</button>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-2">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Consultation Type First (needed for slot generation) */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t.consultType}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[{ val: 'New Checkup', label: t.newCheckup, dur: '15 min', icon: '🏥' },
                { val: 'Showing Reports', label: t.showingReports, dur: '5 min', icon: '⚡' }].map(opt => (
                  <button type="button" key={opt.val}
                    onClick={() => { setConsultType(opt.val); setSelectedSlot(''); }}
                    className={`p-3 rounded-xl border text-left transition-all ${consultType === opt.val ? 'bg-[#0ea5e9]/20 border-[#0ea5e9] text-white' : 'border-white/10 bg-white/3 text-slate-300 hover:border-white/30'}`}
                  >
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-slate-500">{opt.dur}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            {consultType && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Select Date</label>
                <input type="date" min={new Date().toISOString().split('T')[0]} value={selectedDate} 
                  onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(''); }}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] text-sm [color-scheme:dark] transition-all" />
              </div>
            )}

            {/* Time Slot Grid */}
            {consultType && selectedDate && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.selectSlot}</label>
                  {slots.length === 0 && <span className="text-xs text-amber-400">No remaining slots for today</span>}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                  {slots.map(slot => (
                    <button type="button" key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-1 rounded-lg text-xs font-medium border transition-all text-center ${selectedSlot === slot ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white' : 'border-white/10 bg-white/3 text-slate-300 hover:border-[#0ea5e9]/40 hover:text-white'}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Patient Details */}
            <div className="space-y-3">
              <input type="text" required placeholder={t.patientName} value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] text-sm" />
              <input type="tel" required placeholder={t.phone} value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] text-sm" />
            </div>

            <button type="submit" disabled={isSubmitting || !selectedSlot || !consultType}
              className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_rgba(14,165,233,0.3)] flex justify-center items-center gap-2">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t.confirmBtn}
            </button>

            <div className="text-center">
              <a href="#" className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                <AlertTriangle size={13} />{t.emergency}
              </a>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Queue Tracker ───────────────────────────────────────────────────────────
function QueueTracker({ t, refCode, onReset, bookedSlot, bookedDate }) {
  const [ewt, setEwt] = useState(0);

  useEffect(() => {
    const calcEWT = () => {
      if (!bookedSlot || bookedSlot === 'Any' || !bookedDate) return 0;
      const match = bookedSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let [_, h, m, ampm] = match;
      h = parseInt(h, 10);
      m = parseInt(m, 10);
      if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
      
      const now = new Date();
      
      // Attempt to parse YYYY-MM-DD correctly in local time
      const [yy, mm, dd] = bookedDate.split('-');
      const target = new Date(parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
      target.setHours(h, m, 0, 0);

      let diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
      return diffMin > 0 ? diffMin : 0;
    };
    
    setEwt(calcEWT());
    const val = setInterval(() => setEwt(calcEWT()), 60000);
    return () => clearInterval(val);
  }, [bookedSlot, bookedDate]);

  function formatEWT(minutes) {
    if (minutes <= 0) return '0m';
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = minutes % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border mb-2" style={{ background: 'var(--glow-1)', borderColor: 'var(--border-2)', color: 'var(--brand)' }}>
          <ShieldCheck size={24} />
        </div>
        <h2 className="text-xl font-bold">{t.successTitle}</h2>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{t.successSub}</p>
      </div>
      <div className="rounded-xl p-6 text-center space-y-4 border" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{t.ewt}</p>
          <div className="text-5xl font-black tracking-tighter" style={{ color: 'var(--text-1)' }}>{formatEWT(ewt)}</div>
        </div>
        <div className="flex items-center justify-between border rounded-lg p-3" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <span className="text-sm font-mono" style={{ color: 'var(--text-2)' }}>{t.bookingRef}: {refCode}</span>
          <button onClick={() => navigator.clipboard.writeText(refCode)} className="p-1 transition-colors hover:text-[#0ea5e9]" style={{ color: 'var(--text-3)' }}>
            <Copy size={16} />
          </button>
        </div>
      </div>
      <button onClick={onReset} className="w-full text-sm font-medium transition-colors hover:text-red-400 p-2" style={{ color: 'var(--text-3)' }}>
        {t.cancelBtn}
      </button>
    </div>
  );
}

// ─── Doctor Dashboard ─────────────────────────────────────────────────────────
function DoctorDashboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [queue, setQueue] = useState([]);
  const [connectionState, setConnectionState] = useState('SYNCING');
  const [loading, setLoading] = useState(true);
  const [filterDoctor, setFilterDoctor] = useState('All');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const currentDoctor = DOCTORS.find(d => d.email === user?.email?.toLowerCase());

  useEffect(() => {
    const q = query(collection(db, 'appointments'), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q,
      (snap) => {
        const cloudData = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() })).filter(d => d.status !== 'Completed');
        fetch('http://192.168.4.1/local-data', { signal: AbortSignal.timeout(2000) })
          .then(r => r.json()).then(local => setQueue(applysjf([...cloudData, ...(local || [])])))
          .catch(() => setQueue(applysjf(cloudData)));
        setConnectionState('ONLINE'); setLoading(false);
      },
      (err) => { console.error(err); setConnectionState('OFFLINE'); setLoading(false); }
    );
    return () => unsub();
  }, []);

  function applysjf(data) {
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

    return result.map(p => {
      const clone = { ...p };
      delete clone._timeMin;
      delete clone._block;
      delete clone._interleave;
      return clone;
    });
  }

  const displayQueue = queue.filter(p => {
    const pDate = p.booking_date || new Date().toISOString().split('T')[0];
    if (pDate !== filterDate) return false;
    return filterDoctor === 'All' ? true : p.doctor === filterDoctor;
  });

  const handleUpdateStatus = async (docId, newStatus) => {
    try {
      await updateDoc(doc(db, 'appointments', docId), { status: newStatus });
    } catch (e) {
      console.error(e);
      if (e?.code === 'permission-denied') {
        alert('❌ Firebase rules are blocking the update. Please update Firestore Security Rules in the Firebase Console to allow updates, or ensure you have appropriate authentication privileges.');
      } else {
        alert('Could not update status: ' + e.message);
      }
    }
  };

  const handleSignOut = async () => { await signOut(auth); navigate('/doctor-login'); };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full z-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-white/10 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[#0ea5e9]"><Stethoscope size={20} /></div>
          <div>
            <h1 className="text-2xl font-bold">SyncQ Unified Dashboard</h1>
            <p className="text-slate-400 text-sm">
              {currentDoctor ? `${currentDoctor.name} · ${currentDoctor.specialty}` : 'Doctor Terminal (SJF Protocol)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {connectionState === 'ONLINE' && <div className="flex items-center gap-1.5 bg-sky-500/10 text-sky-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-sky-500/20"><Cloud size={13} />🌐 Cloud Connected</div>}
          {connectionState === 'OFFLINE' && <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-500/20"><WifiOff size={13} />📡 Local Only</div>}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <User size={13} className="text-slate-400" />
            <span className="text-xs text-slate-300">{user?.email?.split('@')[0]}</span>
          </div>
          <button onClick={handleSignOut} className="text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors">
            <LogOut size={12} />Sign Out
          </button>
        </div>
      </div>

      {/* Filters: Date & DoctorTabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0">
          <button onClick={() => setFilterDoctor('All')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterDoctor === 'All' ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}>
            All Patients ({queue.filter(q => (q.booking_date || new Date().toISOString().split('T')[0]) === filterDate).length})
          </button>
          {DOCTORS.map(doc => {
            const count = queue.filter(p => p.doctor === doc.name && (p.booking_date || new Date().toISOString().split('T')[0]) === filterDate).length;
            if (count === 0 && filterDoctor !== doc.name) return null; // hide empty doctors unless selected
            return (
              <button key={doc.id} onClick={() => setFilterDoctor(doc.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border flex items-center gap-1.5 transition-all ${filterDoctor === doc.name ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}>
                <div className={`w-2 h-2 rounded-full ${doc.color}`} />{doc.name.split(' ')[1]} ({count})
              </button>
            );
          })}
        </div>
        
        <div className="shrink-0">
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] text-sm [color-scheme:dark]" />
        </div>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-slate-400 border-t-transparent animate-spin mb-4" />
          <p>Fetching live queue from Firebase...</p>
        </div>
      ) : displayQueue.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
          <p className="text-lg font-medium">No patients in queue.</p>
          <p className="text-sm mt-2">Queue updates automatically as patients book.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* DESKTOP HEADER */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <div className="col-span-1">Pos</div>
            <div className="col-span-3">Patient</div>
            <div className="col-span-2">Doctor</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Time Slot</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          <div className="space-y-3">
            {displayQueue.map((patient, i) => {
              const isPriority = (patient.consultation_type || '').includes('Showing Reports');
              const doc = DOCTORS.find(d => d.name === patient.doctor);
              return (
                <div key={patient.docId || i} className="glass-panel rounded-xl p-4 hover:bg-white/5 border border-white/5 transition-all">
                  
                  {/* MOBILE VIEW */}
                  <div className="md:hidden flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="min-w-[2rem] h-8 rounded-full bg-black/30 flex items-center justify-center font-bold font-mono text-sm">{i + 1}</div>
                        <div>
                          <p className="font-bold leading-tight">{patient.patient_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{patient.id || '--'} • {patient.time_slot || 'Any'}</p>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isPriority
                          ? <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">⚡ 5m</span>
                          : <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">🏥 15m</span>
                        }
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-black/10 rounded-lg p-2 mt-1">
                       <div className="flex items-center gap-2">
                         {doc && <div className={`w-5 h-5 rounded-md ${doc.color} flex items-center justify-center text-[var(--text-1)] text-xs font-bold`}>{doc.name.split(' ')[1][0]}</div>}
                         <span className="text-xs text-slate-300 truncate">{patient.doctor} <span className="text-slate-500 hidden sm:inline">• {patient.specialty}</span></span>
                       </div>
                    </div>
                    <div className="flex justify-end w-full pt-1">
                      {patient.status === 'Called' ? (
                        <button onClick={() => handleUpdateStatus(patient.docId, 'Completed')} className="w-full text-sm bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg transition-colors font-semibold">Complete Appointment</button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(patient.docId, 'Called')} className="w-full text-sm bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/40 text-[#0ea5e9] border border-[#0ea5e9]/30 px-3 py-2 rounded-lg transition-colors font-semibold">Call Patient In</button>
                      )}
                    </div>
                  </div>

                  {/* DESKTOP VIEW */}
                  <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center font-bold font-mono text-sm">{i + 1}</div>
                    </div>
                    <div className="col-span-3">
                      <p className="font-bold truncate">{patient.patient_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400 font-mono">{patient.id || '--'}</p>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        {doc && <div className={`w-5 h-5 rounded-md ${doc.color} flex items-center justify-center text-[var(--text-1)] text-xs font-bold`}>{doc.name.split(' ')[1][0]}</div>}
                        <span className="text-xs text-slate-300 truncate">{patient.doctor || '--'}</span>
                      </div>
                      <p className="text-xs text-slate-500">{patient.specialty || ''}</p>
                    </div>
                    <div className="col-span-2">
                      {isPriority
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">⚡ Reports (5m)</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">🏥 Checkup (15m)</span>
                      }
                    </div>
                    <div className="col-span-2 text-sm text-slate-300">{patient.time_slot || 'Any'}</div>
                    <div className="col-span-2 text-right">
                      {patient.status === 'Called' ? (
                        <button onClick={() => handleUpdateStatus(patient.docId, 'Completed')} className="text-sm bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors font-semibold">Complete</button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(patient.docId, 'Called')} className="text-sm bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/40 text-[#0ea5e9] border border-[#0ea5e9]/30 px-3 py-1.5 rounded-lg transition-colors font-semibold">Call In</button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
