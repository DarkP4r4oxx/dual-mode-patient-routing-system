import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import {
  Cloud, Copy, ArrowRight, AlertTriangle, ShieldCheck,
  WifiOff, Stethoscope, ChevronLeft, ChevronRight, LogOut, User
} from 'lucide-react';
import { db, auth } from './firebaseClient';
import { collection, addDoc, query, orderBy, serverTimestamp, onSnapshot, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthPage from './AuthPage';
import DoctorAuthPage from './DoctorAuthPage';

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

// Generate time slots for a doctor based on their working hours
function generateSlots(doctor, consultType) {
  const intervalMin = consultType === 'Showing Reports' ? 15 : 30;
  const slots = [];
  let hour = doctor.hours.start;
  let min = 0;
  while (hour < doctor.hours.end) {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const m = min === 0 ? '00' : min;
    slots.push(`${h}:${m} ${ampm}`);
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
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#0ea5e9] border-t-transparent animate-spin" />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans selection:bg-[#0ea5e9] selection:text-white relative">
        <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-[#0ea5e9] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/doctor-login" element={<DoctorAuthPage />} />
          <Route path="/" element={<PatientPortal />} />
          <Route path="/doctor" element={<RequireDoctorAuth><DoctorDashboard /></RequireDoctorAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// ─── Patient Portal ───────────────────────────────────────────────────────────
function PatientPortal() {
  const [currentStep, setCurrentStep] = useState('LANDING');
  const [generatedToken, setGeneratedToken] = useState('');
  const [lang, setLang] = useState('EN');
  const t = LANGS[lang];
  const navigate = useNavigate();
  const user = useAuth(); // may be null (not logged in) or a user object

  // Auth gate: only block when trying to go past landing
  const handleGoToBooking = () => {
    if (!user) {
      navigate('/login');
    } else {
      setCurrentStep('BOOKING');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <>
      <header className="w-full glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#0ea5e9] flex items-center justify-center font-bold text-white shadow-lg shadow-[#0ea5e9]/20">S</div>
          <span className="text-xl font-bold tracking-tight">SyncQ</span>
        </div>
        <div className="flex items-center space-x-3">
          {/* Language Toggle */}
          <div className="hidden sm:flex items-center space-x-1 bg-white/5 rounded-full px-3 py-1.5 border border-white/10 text-sm">
            {['EN', 'MH', 'HI'].map((l, i) => (
              <React.Fragment key={l}>
                {i > 0 && <span className="text-white/20 mx-1">|</span>}
                <button onClick={() => setLang(l)} className={`px-1 transition-all ${lang === l ? 'text-[#0ea5e9] font-bold' : 'text-white/40 hover:text-white'}`}>{l}</button>
              </React.Fragment>
            ))}
          </div>
          <button onClick={() => navigate('/doctor-login')} className="hidden sm:block text-sm font-medium hover:text-[#0ea5e9] transition-colors">{t.checkLive}</button>
          {user ? (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-[#0ea5e9] flex items-center justify-center text-xs font-bold">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs text-slate-300 hidden sm:block max-w-[120px] truncate">{user?.displayName || user?.email?.split('@')[0]}</span>
              <button onClick={handleSignOut} className="text-slate-400 hover:text-red-400 transition-colors ml-1" title="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="flex items-center gap-2 bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 text-[#0ea5e9] px-4 py-1.5 rounded-full text-sm font-semibold transition-all">
              <User size={14} /> Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="w-full max-w-2xl z-10">
          {currentStep === 'LANDING' && <HeroSection t={t} onNext={handleGoToBooking} />}
          {currentStep === 'BOOKING' && <BookingFlow t={t} user={user} onBack={() => setCurrentStep('LANDING')} onNext={(token) => { setGeneratedToken(token); setCurrentStep('SUCCESS'); }} />}
          {currentStep === 'SUCCESS' && <QueueTracker t={t} refCode={generatedToken} onReset={() => setCurrentStep('LANDING')} />}
        </div>
      </main>
    </>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ t, onNext }) {
  const navigate = useNavigate();
  return (
    <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold text-[#0ea5e9] mb-4">
          <ShieldCheck size={14} /><span>{t.badge}</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          {t.headline1} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0ea5e9] to-cyan-300">{t.headline2}</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-md mx-auto">{t.subheadline}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button onClick={onNext} className="group inline-flex items-center justify-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] active:scale-95 w-full sm:w-auto">
          {t.bookBtn} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <button onClick={() => navigate('/doctor-login')} className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-4">{t.doctorPortal}</button>
      </div>
    </div>
  );
}

// ─── Booking Flow (3-Step Wizard) ─────────────────────────────────────────────
function BookingFlow({ t, user, onNext, onBack }) {
  const [step, setStep] = useState(1); // 1=Specialty, 2=Doctor, 3=Details
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [consultType, setConsultType] = useState('');
  const [patientName, setPatientName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filteredDoctors = selectedSpecialty === 'All'
    ? DOCTORS
    : DOCTORS.filter(d => d.specialty === selectedSpecialty);

  const slots = selectedDoctor && consultType ? generateSlots(selectedDoctor, consultType) : [];

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
        time_slot: selectedSlot,
        source: 'Cloud',
        status: 'Waiting',
        created_at: serverTimestamp()
      });
      console.log('✅ Appointment saved:', generatedId);
      onNext(generatedId);
    } catch (err) {
      console.error('❌ Firebase error:', err);
      setError('Could not save. Proceeding offline.');
      onNext(generatedId);
    } finally {
      setIsSubmitting(false);
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
                {[{ val: 'New Checkup', label: t.newCheckup, dur: '30 min', icon: '🏥' },
                { val: 'Showing Reports', label: t.showingReports, dur: '15 min', icon: '⚡' }].map(opt => (
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

            {/* Time Slot Grid */}
            {consultType && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t.selectSlot}</label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
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
function QueueTracker({ t, refCode, onReset }) {
  return (
    <div className="glass-panel rounded-2xl p-8 space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-2 border border-emerald-500/20"><ShieldCheck size={24} /></div>
        <h2 className="text-xl font-bold">{t.successTitle}</h2>
        <p className="text-sm text-slate-400">{t.successSub}</p>
      </div>
      <div className="bg-black/30 border border-white/5 rounded-xl p-6 text-center space-y-6">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">{t.ewt}</p>
          <div className="text-6xl font-black text-white tracking-tighter">18<span className="text-3xl text-slate-400 ml-1">m</span></div>
        </div>
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
          <span className="text-sm font-mono text-slate-300">{t.bookingRef}: {refCode}</span>
          <button onClick={() => navigator.clipboard.writeText(refCode)} className="text-slate-400 hover:text-white p-1"><Copy size={16} /></button>
        </div>
        <button className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 font-semibold py-3 rounded-xl transition-all text-sm">
          {t.whatsapp}
        </button>
      </div>
      <div className="border border-white/10 rounded-xl p-6 flex flex-col items-center space-y-3 bg-white/5">
        <div className="w-24 h-24 bg-white rounded-lg p-2"><div className="w-full h-full border-4 border-black border-dashed opacity-50 flex items-center justify-center"><div className="w-8 h-8 bg-black" /></div></div>
        <span className="text-xs text-slate-400">{t.qrLabel}</span>
      </div>
      <button onClick={onReset} className="w-full text-slate-400 hover:text-white text-sm font-medium transition-colors p-2">{t.cancelBtn}</button>
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

  const currentDoctor = DOCTORS.find(d => d.email === user?.email?.toLowerCase());

  useEffect(() => {
    const q = query(collection(db, 'appointments'), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q,
      (snap) => {
        const cloudData = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
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
    return [...data].sort((a, b) => {
      const aR = (a.consultation_type || '').includes('Showing Reports');
      const bR = (b.consultation_type || '').includes('Showing Reports');
      if (aR && !bR) return -1; if (!aR && bR) return 1;
      return (a.created_at?.toMillis?.() || 0) - (b.created_at?.toMillis?.() || 0);
    });
  }

  const displayQueue = filterDoctor === 'All' ? queue : queue.filter(p => p.doctor === filterDoctor);

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

      {/* Doctor Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 shrink-0">
        <button onClick={() => setFilterDoctor('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterDoctor === 'All' ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}>
          All Patients ({queue.length})
        </button>
        {DOCTORS.map(doc => (
          <button key={doc.id} onClick={() => setFilterDoctor(doc.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border flex items-center gap-1.5 transition-all ${filterDoctor === doc.name ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}>
            <div className={`w-2 h-2 rounded-full ${doc.color}`} />{doc.name.split(' ')[1]} ({queue.filter(p => p.doctor === doc.name).length})
          </button>
        ))}
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
          <div className="grid grid-cols-12 gap-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                <div key={patient.docId || i} className="glass-panel rounded-xl p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 border border-white/5 transition-all">
                  <div className="col-span-1">
                    <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center font-bold font-mono text-sm">{i + 1}</div>
                  </div>
                  <div className="col-span-3">
                    <p className="font-bold truncate">{patient.patient_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400 font-mono">{patient.id || '--'}</p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      {doc && <div className={`w-5 h-5 rounded-md ${doc.color} flex items-center justify-center text-white text-xs font-bold`}>{doc.name.split(' ')[1][0]}</div>}
                      <span className="text-xs text-slate-300 truncate">{patient.doctor || '--'}</span>
                    </div>
                    <p className="text-xs text-slate-500">{patient.specialty || ''}</p>
                  </div>
                  <div className="col-span-2">
                    {isPriority
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">⚡ Reports (15m)</span>
                      : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">🏥 Checkup (30m)</span>
                    }
                  </div>
                  <div className="col-span-2 text-sm text-slate-300">{patient.time_slot || 'Any'}</div>
                  <div className="col-span-2 text-right">
                    <button className="text-sm bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/40 text-[#0ea5e9] border border-[#0ea5e9]/30 px-3 py-1.5 rounded-lg transition-colors font-semibold">Call In</button>
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
