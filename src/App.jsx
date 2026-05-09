import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import {
  Cloud, Copy, ArrowRight, AlertTriangle, ShieldCheck,
  WifiOff, Stethoscope, ChevronLeft, LogOut, User, Sun, Moon,
  Clock, Users, Activity, CheckCircle
} from 'lucide-react';
import { db, auth } from './firebaseClient';
import { collection, addDoc, query, orderBy, serverTimestamp, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthPage from './AuthPage';
import DoctorAuthPage from './DoctorAuthPage';
import LiveQueuePage from './LiveQueuePage';
import AdminDashboard from './AdminDashboard';

export function useDoctors() {
  const [doctors, setDoctors] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'doctors'), (snap) => {
      setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);
  return doctors;
}

const SPECIALTY_ICONS = {
  'All': '🏥',
  'General Medicine': '🩺',
  'Cardiology': '❤️',
  'Orthopedics': '🦴',
  'Dermatology': '🔬',
  'Pediatrics': '👶',
  'ENT': '👂',
};

// Fallback icon for dynamically added specialties
const getIcon = (specialty) => SPECIALTY_ICONS[specialty] || '🩺';

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
  // Theme is strictly light now.

  return (
    <BrowserRouter>
      <div className="w-full min-h-screen flex flex-col font-sans selection:bg-[#0ea5e9] selection:text-white relative overflow-x-hidden" style={{background:'var(--bg)',color:'var(--text-1)'}}>
        <div className="fixed top-1/4 left-1/4 w-[40rem] h-[40rem] bg-[#0ea5e9] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none" />
        <Routes>
          <Route path="/login"        element={<AuthPage />} />
          <Route path="/doctor-login" element={<DoctorAuthPage />} />
          <Route path="/queue"        element={<LiveQueuePage />} />
          <Route path="/"             element={<PatientPortal />} />
          <Route path="/doctor"       element={<RequireDoctorAuth><DoctorDashboard /></RequireDoctorAuth>} />
          <Route path="/admin"        element={<RequireDoctorAuth><AdminDashboard /></RequireDoctorAuth>} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// ─── Patient Portal ───────────────────────────────────────────────────────────
function PatientPortal() {
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
      <header className="absolute top-0 left-0 w-full px-6 lg:px-12 py-6 flex items-center justify-between z-50 bg-transparent">
        {/* Left: Logo */}
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => { setCurrentStep('LANDING'); navigate('/'); }}>
          <Cloud size={28} strokeWidth={1.5} className="text-slate-800 group-hover:scale-105 transition-transform" />
          <span className="text-[22px] font-light tracking-wide text-slate-800">HyQ</span>
        </div>

        {/* Right: Unified Pill */}
        <div className="flex items-center bg-slate-100/90 backdrop-blur-md rounded-full p-1.5 shadow-sm border border-slate-200/50">
          
          {/* Navigation Links inside Pill */}
          <div className="flex items-center px-3 sm:px-4 gap-3 sm:gap-6 text-[10px] sm:text-[11px] font-bold tracking-widest text-slate-600">
            <button onClick={() => navigate('/queue')} className="hover:text-slate-900 transition-colors uppercase whitespace-nowrap">
              <span className="hidden sm:inline">Live </span>Queue
            </button>
            <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-3 sm:pl-0 sm:border-0">
              {['EN', 'HI'].map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`transition-colors uppercase ${lang === l ? 'text-slate-900' : 'hover:text-slate-900'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button inside Pill */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 rounded-full pl-2 sm:pl-3 pr-2 sm:pr-4 py-1.5 sm:py-2 bg-slate-800 text-white shadow-sm ml-1 sm:ml-2">
              <div className="text-[10px] sm:text-xs font-bold truncate max-w-[60px] sm:max-w-[100px]">{user?.displayName || user?.email?.split('@')[0]}</div>
              <button onClick={handleSignOut} className="text-slate-300 hover:text-white transition-colors" title="Sign Out"><LogOut size={14} /></button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="bg-slate-800 hover:bg-slate-900 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[9px] sm:text-[11px] font-bold tracking-widest uppercase transition-all ml-1 sm:ml-2 shadow-sm whitespace-nowrap">
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative">
        <div className={`w-full z-10 transition-all duration-500 ${currentStep === 'LANDING' ? 'max-w-6xl' : 'max-w-2xl'}`}>
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
    <div className="flex flex-col lg:flex-row items-center justify-between gap-12 py-10 z-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Left Column: Text */}
      <div className="flex-1 text-left space-y-8">
        <div className="space-y-5">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[1.05] text-slate-900 text-balance">
            Transforming the <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-500">
              Medical Paradigm.
            </span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-slate-500 font-medium max-w-xl">
            Experience seamless healthcare. Book your exact time slot and walk in the moment your doctor is ready. Zero waiting rooms.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button onClick={onNext} className="group relative inline-flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-bold text-sm tracking-widest uppercase transition-all shadow-xl hover:shadow-slate-500/25 active:scale-[0.98] w-full sm:w-auto overflow-hidden">
            <div className="absolute inset-0 w-full h-full bg-white/10 blur-md transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <span className="relative z-10">{t.bookBtn}</span>
            <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={() => navigate('/doctor-login')} className="px-8 py-4 rounded-full text-xs uppercase tracking-widest font-bold transition-all hover:bg-slate-50 text-slate-500 hover:text-slate-900 w-full sm:w-auto shadow-sm border border-transparent hover:border-slate-200">
            {t.doctorPortal}
          </button>
        </div>

        {/* Stats Row underneath */}
        <div className="flex flex-wrap gap-10 pt-8 border-t border-slate-200">
          {[{val:'< 2 min', label:'Token Generation'}, {val:'Real-Time', label:'Queue Tracking'}, {val:'Seamless', label:'Check-ins'}].map((s, i) => (
            <div key={s.label}>
              <div className="text-2xl font-black text-blue-600 mb-1">{s.val}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Image */}
      <div className="flex-1 relative w-full max-w-lg lg:max-w-none">
        <div className="absolute inset-0 bg-blue-500/20 rounded-[3rem] blur-3xl transform rotate-3"></div>
        <img 
          src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=800&auto=format&fit=crop" 
          alt="Medical Professional" 
          className="relative z-10 w-full h-auto rounded-[2rem] shadow-2xl object-cover border border-white/10"
        />
        
        {/* Floating elements */}
        <div className="absolute -bottom-6 -left-6 sm:-bottom-8 sm:-left-8 z-20 bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-bounce" style={{animationDuration: '3s'}}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <CheckCircle size={22} strokeWidth={2.5} />
            </div>
            <div className="pr-3">
              <div className="text-sm font-black text-slate-900 tracking-tight">Available Now</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Dr. Sarah Jenkins</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Booking Flow (3-Step Wizard) ─────────────────────────────────────────────
function BookingFlow({ t, user, onBack, onNext }) {
  const DOCTORS = useDoctors();
  
  // Dynamically compute available specialties from active doctors
  const SPECIALTIES = ['All', ...new Set(DOCTORS.map(d => d.specialty))];
  
  const [step, setStep] = useState(1);
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
      return;
    }
  };

  const stepLabels = [t.selectSpecialty, t.selectDoctor, t.bookingDetails];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)} className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition-all shrink-0 shadow-sm">
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${s <= step ? 'text-blue-600' : 'text-slate-400'} transition-colors`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${s < step ? 'bg-blue-600 border-blue-600 text-white' : s === step ? 'border-blue-600 text-blue-600' : 'border-slate-200 text-slate-400'}`}>
                  {s < step ? '✓' : s}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">{stepLabels[s - 1]}</span>
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 rounded-full transition-all ${s < step ? 'bg-blue-600' : 'bg-slate-100'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.selectSpecialty}</h2>
            <p className="text-sm text-slate-500 mt-1">Choose a medical specialty to find the right doctor</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {SPECIALTIES.filter(s => s !== 'All').map(spec => (
              <button
                key={spec}
                onClick={() => { setSelectedSpecialty(spec); setStep(2); setSelectedDoctor(null); setSelectedSlot(''); }}
                className="p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-left group shadow-sm hover:shadow-md"
              >
                <div className="text-2xl mb-3">{getIcon(spec)}</div>
                <div className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{spec}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{DOCTORS.filter(d => d.specialty === spec).length} doctors</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t.selectDoctor}</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">{selectedSpecialty} • {filteredDoctors.length} available</p>
            </div>
            <button onClick={() => { setSelectedSpecialty('All'); setStep(1); }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-full">Change Specialty</button>
          </div>
          <div className="space-y-3">
            {filteredDoctors.map(doc => (
              <button
                key={doc.id}
                onClick={() => { if (doc.status !== 'On Leave') { setSelectedDoctor(doc); setStep(3); setSelectedSlot(''); setConsultType(''); } }}
                disabled={doc.status === 'On Leave'}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left shadow-sm
                  ${doc.status === 'On Leave' ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' :
                    'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-md group'}`}
              >
                <div className={`w-12 h-12 rounded-xl ${doc.color} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-inner`}>
                  {doc.name.split(' ')[1]?.[0] || doc.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{doc.name}</div>
                  <div className="text-xs font-semibold text-slate-500">{doc.specialty}</div>
                  <div className="text-xs text-slate-400 mt-1 font-medium">
                    {doc.hours?.start || 9}:00 — {doc.hours?.end || 17}:00
                  </div>
                </div>
                <div className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-full border shrink-0
                  ${doc.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    doc.status === 'In Surgery' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-red-50 text-red-600 border-red-100'}`}>
                  {doc.status}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && selectedDoctor && (
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className={`w-12 h-12 rounded-xl ${selectedDoctor.color} flex items-center justify-center text-white font-bold shrink-0 shadow-inner`}>
              {selectedDoctor.name.split(' ')[1]?.[0] || selectedDoctor.name[0]}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg">{selectedDoctor.name}</div>
              <div className="text-xs font-semibold text-slate-500">{selectedDoctor.specialty}</div>
            </div>
            <button onClick={() => setStep(2)} className="ml-auto text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors">Change</button>
          </div>

          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl px-4 py-3">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">{t.consultType}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[{ val: 'New Checkup', label: t.newCheckup, dur: '15 min', icon: '🏥' },
                { val: 'Showing Reports', label: t.showingReports, dur: '5 min', icon: '⚡' }].map(opt => (
                  <button type="button" key={opt.val}
                    onClick={() => { setConsultType(opt.val); setSelectedSlot(''); }}
                    className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${consultType === opt.val ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300'}`}
                  >
                    <div className="text-2xl mb-2">{opt.icon}</div>
                    <div className="text-sm font-bold">{opt.label}</div>
                    <div className={`text-xs mt-1 font-medium ${consultType === opt.val ? 'text-slate-300' : 'text-slate-500'}`}>{opt.dur}</div>
                  </button>
                ))}
              </div>
            </div>

            {consultType && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Select Date</label>
                <input type="date" min={new Date().toISOString().split('T')[0]} value={selectedDate} 
                  onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all shadow-sm" />
              </div>
            )}

            {consultType && selectedDate && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                {selectedDoctor.isDelayed && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 mb-5 shadow-sm">
                     <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                     <div>
                       <p className="text-sm font-bold text-red-700">Doctor Delayed</p>
                       <p className="text-xs font-medium text-red-600 mt-1">{selectedDoctor.delayMessage || 'This doctor is currently unavailable or delayed.'}</p>
                     </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.selectSlot}</label>
                  {slots.length === 0 && <span className="text-xs font-bold text-amber-500">No remaining slots</span>}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                  {slots.map(slot => (
                    <button type="button" key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center shadow-sm ${selectedSlot === slot ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300 hover:text-slate-900'}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Patient Details */}
            <div className="space-y-4 pt-2">
              <input type="text" required placeholder={t.patientName} value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 placeholder:text-slate-400 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all shadow-sm" />
              <input type="tel" required placeholder={t.phone} value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 placeholder:text-slate-400 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all shadow-sm" />
            </div>

            <button type="submit" disabled={isSubmitting || !selectedSlot || !consultType}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex justify-center items-center gap-2 uppercase tracking-widest text-xs mt-4">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" /> : t.confirmBtn}
            </button>
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
    <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-8 space-y-8 animate-in slide-in-from-right-8 duration-500 max-w-md mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mb-2 shadow-inner border border-emerald-100">
          <ShieldCheck size={28} strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.successTitle}</h2>
        <p className="text-sm font-medium text-slate-500">{t.successSub}</p>
      </div>
      <div className="rounded-2xl p-6 text-center space-y-6 bg-slate-50 border border-slate-100 shadow-sm">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">{t.ewt}</p>
          <div className="text-6xl font-black tracking-tighter text-slate-900">{formatEWT(ewt)}</div>
        </div>
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <span className="text-sm font-bold text-slate-700 tracking-wide pl-2">{t.bookingRef}: {refCode}</span>
          <button onClick={() => navigator.clipboard.writeText(refCode)} className="p-2 bg-slate-50 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 text-slate-500">
            <Copy size={16} />
          </button>
        </div>
      </div>
      <button onClick={onReset} className="w-full text-xs font-bold uppercase tracking-widest transition-colors text-slate-400 hover:text-red-500 p-3 hover:bg-red-50 rounded-xl">
        {t.cancelBtn}
      </button>
    </div>
  );
}

// ─── Analytics / Reports Component ──────────────────────────────────────────
function AnalyticsTab({ currentDoctor }) {
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentDoctor) return;
    const q = query(collection(db, 'appointments'), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ ...d.data() }))
        .filter(d => d.doctor === currentDoctor.name && d.status === 'Completed');
      setCompleted(data);
      setLoading(false);
    });
    return () => unsub();
  }, [currentDoctor]);

  if (loading) return <div className="text-center p-16"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin mx-auto"/></div>;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = completed.filter(c => (c.booking_date || new Date(c.created_at).toISOString().split('T')[0]) === todayStr).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
       <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-900 tracking-tight">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><Activity size={20} strokeWidth={2.5}/></div>
            Performance Analytics
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
             <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">Patients Seen Today</p>
                <div className="text-5xl font-black tracking-tighter text-blue-600">{todayCount}</div>
             </div>
             <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">Total Lifetime Patients</p>
                <div className="text-5xl font-black tracking-tighter text-emerald-600">{completed.length}</div>
             </div>
          </div>
       </div>
    </div>
  );
}

// ─── Doctor Dashboard ─────────────────────────────────────────────────────────
function DoctorDashboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const DOCTORS = useDoctors();
  const [queue, setQueue] = useState([]);
  const [connectionState, setConnectionState] = useState('SYNCING');
  const [loading, setLoading] = useState(true);
  const [filterDoctor, setFilterDoctor] = useState('All');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [activeTab, setActiveTab] = useState('LIVE'); // 'LIVE' | 'OFFLINE' | 'REPORTS'
  const [offlineHubQueue, setOfflineHubQueue] = useState([]);

  const currentDoctor = DOCTORS.find(d => d.email === user?.email?.toLowerCase());

  // Removed volatile fetching; we now rely on manual robust syncing to avoid ghost-doc crashes.
  useEffect(() => {
    const q = query(collection(db, 'appointments'), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q,
      (snap) => {
        const cloudData = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() })).filter(d => d.status !== 'Completed');
        setQueue(applysjf(cloudData));
        setConnectionState('ONLINE'); setLoading(false);
      },
      (err) => { console.error(err); setConnectionState('OFFLINE'); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const [syncingNode, setSyncingNode] = useState(false);

  const handleSyncNodeMCU = async () => {
    try {
      setSyncingNode(true);
      const res = await fetch('http://192.168.4.1/local-data');
      if (!res.ok) throw new Error("Could not connect to local NodeMCU API.");
      const localData = await res.json();
      
      setOfflineHubQueue(localData || []);
      setActiveTab('OFFLINE');
    } catch (e) {
      alert("⚠️ NodeMCU Connection Error: Please ensure you are connected to the NodeMCU Wi-Fi network. " + e.message);
    } finally {
      setSyncingNode(false);
    }
  };

  const handleOfflineAction = async (id, action) => {
    try {
       if (action === 'delete') {
         await fetch('http://192.168.4.1/delete', { method: 'POST', body: JSON.stringify({id}) });
       } else {
         await fetch('http://192.168.4.1/update-status', { method: 'POST', body: JSON.stringify({id, status: action}) });
       }
       // Auto refresh hub
       handleSyncNodeMCU();
    } catch(err) {
       alert("Failed to reach NodeMCU to execute action. Ensure you are connected to its WiFi! " + err.message);
    }
  };

  const handlePurgeNodeMCU = async () => {
    if(!window.confirm("WARNING: This will permanently erase the NodeMCU device's backup memory cache! Are you sure?")) return;
    try { 
      await fetch('http://192.168.4.1/clear-data', { method: 'POST' }); 
      setOfflineHubQueue([]);
      alert("NodeMCU memory successfully erased.");
    } catch(err) { alert("Purge failed. Connect to NodeMCU network first."); }
  };

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
    <div className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full z-10 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-5 border-b border-slate-200 gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-[0.8rem] bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm"><Stethoscope size={24} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">HyQ Unified Dashboard</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {currentDoctor ? `${currentDoctor.name} · ${currentDoctor.specialty}` : 'Doctor Terminal'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {currentDoctor && (
             <button onClick={async () => {
                const newStatus = !currentDoctor.isDelayed;
                let msg = '';
                if (newStatus) {
                   msg = prompt("Enter delay reason (e.g. In emergency surgery, Returning in 2 hrs):");
                   if (msg === null) return;
                }
                await updateDoc(doc(db, 'doctors', currentDoctor.id), { isDelayed: newStatus, delayMessage: msg || '' });
             }} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all uppercase tracking-widest shadow-sm ${currentDoctor.isDelayed ? 'bg-red-50 text-red-600 border-red-100 shadow-red-500/10' : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800'}`}>
                <AlertTriangle size={14} /> {currentDoctor.isDelayed ? 'Mark Available' : 'Set Unavailable/Delay'}
             </button>
          )}
          {connectionState === 'ONLINE' && <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] font-bold border border-blue-100 uppercase tracking-widest shadow-sm"><Cloud size={14} />🌐 Cloud Connected</div>}
          {connectionState === 'OFFLINE' && <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-4 py-2 rounded-full text-[10px] font-bold border border-amber-100 uppercase tracking-widest shadow-sm"><WifiOff size={14} />📡 Local Only</div>}
          
          <button onClick={handleSyncNodeMCU} disabled={syncingNode} className="flex items-center gap-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all shadow-sm disabled:opacity-50">
            {syncingNode ? <div className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"/> : <Activity size={14}/>}
            {syncingNode ? 'Connecting...' : 'Connect to NodeMCU Server'}
          </button>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 shadow-inner rounded-full px-4 py-2">
            <User size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user?.email?.split('@')[0]}</span>
          </div>
          <button onClick={handleSignOut} className="text-[10px] font-bold uppercase tracking-widest bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors shadow-sm">
            <LogOut size={14} />Sign Out
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-6 mb-6 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveTab('LIVE')} className={`px-2 py-2 font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'LIVE' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-700'}`}>Live Cloud Queue</button>
        <button onClick={() => setActiveTab('OFFLINE')} className={`px-2 py-2 font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'OFFLINE' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-700'} flex items-center gap-2`}>
          Local Offline Hub {offlineHubQueue.length > 0 && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px]">{offlineHubQueue.length}</span>}
        </button>
        <button onClick={() => setActiveTab('REPORTS')} className={`px-2 py-2 font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'REPORTS' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-700'}`}>Analytics & Reports</button>
      </div>

      {activeTab === 'REPORTS' ? <AnalyticsTab currentDoctor={currentDoctor} /> : activeTab === 'LIVE' ? (
        <>
          {/* Filters: Date & DoctorTabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-2.5 overflow-x-auto pb-2 shrink-0">
              <button onClick={() => setFilterDoctor('All')}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border transition-all shadow-sm ${filterDoctor === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50'}`}>
                All Patients ({queue.filter(q => (q.booking_date || new Date().toISOString().split('T')[0]) === filterDate).length})
              </button>
          {DOCTORS.map(doc => {
            const count = queue.filter(p => p.doctor === doc.name && (p.booking_date || new Date().toISOString().split('T')[0]) === filterDate).length;
            if (count === 0 && filterDoctor !== doc.name) return null; // hide empty doctors unless selected
            return (
              <button key={doc.id} onClick={() => setFilterDoctor(doc.name)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border flex items-center gap-2 transition-all shadow-sm ${filterDoctor === doc.name ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${doc.color} shadow-inner`} />{doc.name.split(' ')[1]} ({count})
              </button>
            );
          })}
        </div>
        
        <div className="shrink-0">
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm font-bold shadow-sm" />
        </div>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-16 flex flex-col items-center text-slate-500">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin mb-4" />
          <p className="font-bold text-sm tracking-wide">Fetching live queue from Firebase...</p>
        </div>
      ) : displayQueue.length === 0 ? (
        <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400">
          <p className="text-xl font-black text-slate-800 tracking-tight">No patients in queue.</p>
          <p className="text-xs font-bold uppercase tracking-widest mt-2">Queue updates automatically as patients book.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* DESKTOP HEADER */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <div className="col-span-1">Pos</div>
            <div className="col-span-3">Patient</div>
            <div className="col-span-2">Doctor</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Time Slot</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          <div className="space-y-4">
            {displayQueue.map((patient, i) => {
              const isPriority = (patient.consultation_type || '').includes('Showing Reports');
              const doc = DOCTORS.find(d => d.name === patient.doctor);
              return (
                <div key={patient.docId || i} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 hover:shadow-md hover:border-slate-200 transition-all">
                  
                  {/* MOBILE VIEW */}
                  <div className="md:hidden flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="min-w-[2.5rem] h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-black font-mono text-lg shadow-inner text-slate-900">{i + 1}</div>
                        <div>
                          <p className="font-black text-slate-900 tracking-tight leading-tight">{patient.patient_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400 font-mono font-bold mt-0.5">{patient.id || '--'} • {patient.time_slot || 'Any'}</p>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isPriority
                          ? <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">⚡ 5m</span>
                          : <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">🏥 15m</span>
                        }
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-100 shadow-inner">
                       <div className="flex items-center gap-3">
                         {doc && <div className={`w-7 h-7 rounded-lg ${doc.color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>{doc.name.split(' ')[1][0]}</div>}
                         <span className="text-xs font-bold text-slate-700 truncate">{patient.doctor} <span className="text-slate-400 hidden sm:inline font-semibold">• {patient.specialty}</span></span>
                       </div>
                    </div>
                    <div className="flex justify-end w-full pt-1">
                      {patient.status === 'Called' ? (
                        <button onClick={() => handleUpdateStatus(patient.docId, 'Completed')} className="w-full text-xs uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 px-4 py-3 rounded-xl transition-colors font-bold shadow-sm">Complete Appointment</button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(patient.docId, 'Called')} className="w-full text-xs uppercase tracking-widest bg-slate-800 hover:bg-slate-900 text-white border border-slate-800 px-4 py-3 rounded-xl transition-colors font-bold shadow-md active:scale-[0.98]">Call Patient In</button>
                      )}
                    </div>
                  </div>

                  {/* DESKTOP VIEW */}
                  <div className="hidden md:grid grid-cols-12 gap-4 items-center px-2">
                    <div className="col-span-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-black font-mono text-lg shadow-inner text-slate-900">{i + 1}</div>
                    </div>
                    <div className="col-span-3 pl-2">
                      <p className="font-black text-slate-900 tracking-tight">{patient.patient_name || 'Unknown'}</p>
                      <p className="text-[11px] text-slate-400 font-mono font-bold mt-0.5">{patient.id || '--'}</p>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2.5">
                        {doc && <div className={`w-6 h-6 rounded-lg ${doc.color} flex items-center justify-center text-white text-[10px] font-bold shadow-sm`}>{doc.name.split(' ')[1][0]}</div>}
                        <span className="text-xs font-bold text-slate-700 truncate">{patient.doctor || '--'}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-8">{patient.specialty || ''}</p>
                    </div>
                    <div className="col-span-2">
                      {isPriority
                        ? <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">⚡ Reports (5m)</span>
                        : <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">🏥 Checkup (15m)</span>
                      }
                    </div>
                    <div className="col-span-2 text-sm font-bold text-slate-700">{patient.time_slot || 'Any'}</div>
                    <div className="col-span-2 text-right">
                      {patient.status === 'Called' ? (
                        <button onClick={() => handleUpdateStatus(patient.docId, 'Completed')} className="text-[10px] uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl transition-colors font-bold shadow-sm">Complete</button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(patient.docId, 'Called')} className="text-[10px] uppercase tracking-widest bg-slate-800 hover:bg-slate-900 text-white border border-slate-800 px-4 py-2 rounded-xl transition-colors font-bold shadow-md active:scale-[0.98]">Call In</button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="bg-emerald-50 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-emerald-100 shadow-sm">
              <div>
                <h3 className="text-xl font-black text-emerald-700 tracking-tight">Independent Local Server Hub</h3>
                <p className="text-xs font-bold text-emerald-600/80 uppercase tracking-widest mt-1">Connect to the NodeMCU WiFi to directly control the local queuing system. Patients' phones will blink locally!</p>
              </div>
              <div className="flex gap-3">
                 <button onClick={handleSyncNodeMCU} className="text-[10px] bg-emerald-600 text-white font-bold uppercase tracking-widest px-5 py-3 rounded-xl whitespace-nowrap shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all">
                    Refresh Local Node
                 </button>
                 <button onClick={handlePurgeNodeMCU} className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-xl whitespace-nowrap hover:bg-red-100 transition-all font-bold uppercase tracking-widest shadow-sm">
                    Emergency Wipe Device RAM
                 </button>
              </div>
           </div>
           
           {offlineHubQueue.length === 0 ? (
             <div className="bg-slate-50/50 p-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
               <Activity size={48} className="mx-auto mb-4 opacity-20" />
               <p className="font-bold uppercase tracking-widest text-xs">No offline patients on the NodeMCU. Click "Refresh Local Node".</p>
             </div>
           ) : (
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
               {offlineHubQueue.map((p, index) => {
                  const isCalled = p.status === 'Called';
                  return (
                    <div key={p.id} className={`bg-white p-6 rounded-3xl border transition-all relative overflow-hidden group shadow-sm hover:shadow-md ${isCalled ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100 hover:border-slate-200'}`}>
                      {isCalled && <div className="absolute top-0 right-0 p-2 opacity-10 blur-[20px] bg-amber-500 w-32 h-32 rounded-full animate-pulse transition-opacity"></div>}
                       <div className="flex justify-between items-start mb-2">
                          <h4 className={`text-xl font-black tracking-tight ${isCalled ? 'text-amber-600' : 'text-slate-900'}`}># {p.patient_name}</h4>
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest shadow-sm ${isCalled ? 'bg-amber-100 text-amber-700 animate-pulse border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{p.status || 'Waiting'}</span>
                       </div>
                       
                       <div className="flex items-center gap-2 mb-4">
                          <span className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-[10px] uppercase font-bold text-slate-500 tracking-widest shadow-inner">{p.type}</span>
                          <span className="text-[11px] font-bold font-mono text-slate-400">{p.id}</span>
                       </div>
                       <div className="space-y-2 mb-6 text-sm text-slate-600 relative z-10">
                          {p.phone && <div className="flex items-center gap-3">📞 <span className="font-mono text-xs font-bold">{p.phone}</span></div>}
                          <div className="flex items-center gap-3">👨‍⚕️ <span className="font-bold text-slate-900">{p.doctor || 'Unknown'}</span></div>
                          <div className="flex items-center gap-3">🧠 <span className="font-semibold text-slate-700">{p.consultation_type || 'General'}</span></div>
                       </div>
                       
                       <div className="flex gap-3 relative z-10">
                          {!isCalled ? (
                            <button onClick={() => handleOfflineAction(p.id, 'Called')} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest z-10">
                               <ShieldCheck size={14} /> Call Patient
                            </button>
                          ) : (
                            <>
                              <button onClick={() => handleOfflineAction(p.id, 'Waiting')} className="flex-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-sm">
                                 Undo
                              </button>
                              <button onClick={() => handleOfflineAction(p.id, 'delete')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest group">
                                 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /> Completed
                              </button>
                            </>
                          )}
                       </div>
                    </div>
                  );
               })}
             </div>
           )}
        </div>
      )}
    </div>
  );
}
