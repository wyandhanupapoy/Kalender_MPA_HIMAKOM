import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Filter, 
  X, 
  Edit2, 
  Trash2, 
  Users,
  FileText,
  Search,
  MoreHorizontal,
  LayoutGrid,
  List
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyD5iDuDhAFMZuAHtxh_qFSP_BMDEoy6STc",
  authDomain: "kalender-mpa-himakom.firebaseapp.com",
  projectId: "kalender-mpa-himakom",
  storageBucket: "kalender-mpa-himakom.firebasestorage.app",
  messagingSenderId: "976181155248",
  appId: "1:976181155248:web:3395056fdabcc3bf6c3275",
  measurementId: "G-EC7FGEE637"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Constants & Utilities ---
const CATEGORIES = {
  LEGISLASI: { label: 'Legislasi & Hukum', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '⚖️' },
  PENGAWASAN: { label: 'Pengawasan', color: 'bg-red-100 text-red-700 border-red-200', icon: '👁️' },
  ASPIRASI: { label: 'Aspirasi & Advokasi', color: 'bg-green-100 text-green-700 border-green-200', icon: '📢' },
  INTERNAL: { label: 'Internal & Kesekjenan', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: 'uWs' },
  ANGGARAN: { label: 'Badan Anggaran', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '💰' },
  UMUM: { label: 'Sidang/Rapat Umum', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '🏛️' },
};

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const CategoryBadge = ({ category }) => {
  const style = CATEGORIES[category] || CATEGORIES.UMUM;
  return (
    <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 font-medium w-fit ${style.color}`}>
      <span>{style.icon}</span>
      {style.label}
    </span>
  );
};

export default function App() {
  // --- State ---
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1)); // Start Jan 2025
  const [selectedDate, setSelectedDate] = useState(null); // For sidebar details
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '08:00',
    endTime: '10:00',
    location: '',
    category: 'UMUM',
    pic: ''
  });

  // Admin Mode Simulator (In real app, check user claims)
  const [isAdminMode, setIsAdminMode] = useState(false);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth failed", error);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // RULE: Simple query, filter in memory
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'mpa_events');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(loadedEvents);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Logic Helpers ---

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    // Padding for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const matchesCategory = filterCategory === 'ALL' || ev.category === filterCategory;
      const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            ev.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [events, filterCategory, searchQuery]);

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return filteredEvents.filter(ev => ev.date === dateStr);
  };

  // --- Handlers ---

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!user) return;

    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'mpa_events');
    
    try {
      if (editingEvent) {
        await updateDoc(doc(collectionRef, editingEvent.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collectionRef, {
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
      }
      setIsAddModalOpen(false);
      setEditingEvent(null);
      resetForm();
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Gagal menyimpan acara. Coba lagi.");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus agenda ini?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mpa_events', eventId));
      if (selectedDate) {
        // Refresh view check
        const remaining = getEventsForDate(selectedDate).filter(e => e.id !== eventId);
        if (remaining.length === 0) setSelectedDate(null);
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const openAddModal = (dateStr = '') => {
    resetForm();
    if (dateStr) setFormData(prev => ({ ...prev, date: dateStr }));
    setEditingEvent(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (event) => {
    setFormData({
      title: event.title,
      description: event.description || '',
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location || '',
      category: event.category,
      pic: event.pic || ''
    });
    setEditingEvent(event);
    setIsAddModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '10:00',
      location: '',
      category: 'UMUM',
      pic: ''
    });
  };

  // --- Render Sections ---

  const renderCalendarGrid = () => {
    const days = getDaysInMonth(currentDate);

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {DAYS.map(day => (
          <div key={day} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="bg-white min-h-[120px]" />;
          
          const dateEvents = getEventsForDate(date);
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div 
              key={idx}
              onClick={() => handleDateClick(date)}
              className={`bg-white min-h-[120px] p-2 transition-all cursor-pointer hover:bg-gray-50 flex flex-col gap-1 relative ${isSelected ? 'ring-2 ring-blue-500 inset-0 z-10' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                  {date.getDate()}
                </span>
                {isAdminMode && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); openAddModal(date.toISOString().split('T')[0]); }}
                    className="text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
              
              <div className="flex flex-col gap-1 overflow-hidden">
                {dateEvents.slice(0, 3).map(ev => (
                  <div key={ev.id} className={`text-xs p-1 rounded border-l-2 truncate ${CATEGORIES[ev.category]?.color || 'bg-gray-100'} border-opacity-50`}>
                    {ev.startTime} {ev.title}
                  </div>
                ))}
                {dateEvents.length > 3 && (
                  <div className="text-xs text-gray-500 text-center font-medium bg-gray-50 rounded py-1">
                    +{dateEvents.length - 3} agenda lain
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-900 text-white p-2 rounded-lg font-bold text-xl tracking-tighter">MPA</div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Timeline Kerja</h1>
              <p className="text-xs text-gray-500">HIMAKOM POLBAN 2025/2026</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 border focus-within:ring-2 ring-blue-500 ring-offset-1">
                <Search size={16} className="text-gray-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Cari agenda..." 
                  className="bg-transparent border-none outline-none text-sm w-48"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
            <button 
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${isAdminMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              {isAdminMode ? 'Admin Mode: ON' : 'Mode Tamu'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-4">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full border"><ChevronLeft size={20}/></button>
              <h2 className="text-2xl font-bold text-gray-800 w-40 text-center">
                {MONTHS[currentDate.getMonth()]} <span className="text-blue-600">{currentDate.getFullYear()}</span>
              </h2>
              <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full border"><ChevronRight size={20}/></button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <Filter size={18} className="text-gray-400 mr-1 flex-shrink-0" />
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
              >
                <option value="ALL">Semua Kategori</option>
                {Object.keys(CATEGORIES).map(key => (
                  <option key={key} value={key}>{CATEGORIES[key].label}</option>
                ))}
              </select>
              {isAdminMode && (
                <button 
                  onClick={() => openAddModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all ml-auto"
                >
                  <Plus size={16} /> Agenda Baru
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="h-96 flex items-center justify-center text-gray-400">Memuat data...</div>
          ) : (
            renderCalendarGrid()
          )}
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 px-2">
            {Object.entries(CATEGORIES).map(([key, val]) => (
               <div key={key} className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-1.5 rounded-full border shadow-sm">
                  <span>{val.icon}</span> {val.label}
               </div>
            ))}
          </div>

        </div>

        {/* Side Panel (Details) */}
        <div className={`lg:w-96 w-full flex-shrink-0 transition-all duration-300 ${selectedDate ? 'opacity-100 translate-x-0' : 'hidden lg:flex lg:opacity-50 lg:pointer-events-none'}`}>
          <div className="bg-white rounded-xl shadow-lg border h-full flex flex-col sticky top-24 max-h-[calc(100vh-8rem)]">
            <div className="p-6 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {selectedDate ? 
                      selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 
                      'Pilih Tanggal'}
                  </h3>
                  <p className="text-sm text-gray-500">Detail Kegiatan</p>
               </div>
               {selectedDate && (
                 <button onClick={() => setSelectedDate(null)} className="lg:hidden p-2 text-gray-500"><X size={20}/></button>
               )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {!selectedDate ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center">
                    <Calendar size={48} className="mb-2 opacity-20" />
                    <p>Klik tanggal di kalender<br/>untuk melihat detail acara.</p>
                  </div>
               ) : getEventsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <p>Tidak ada agenda pada tanggal ini.</p>
                    {isAdminMode && (
                      <button onClick={() => openAddModal(selectedDate.toISOString().split('T')[0])} className="text-blue-600 text-sm mt-2 hover:underline">
                        + Tambah Agenda
                      </button>
                    )}
                  </div>
               ) : (
                 getEventsForDate(selectedDate).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(ev => (
                   <div key={ev.id} className="group bg-white border border-l-4 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden" style={{ borderLeftColor: ev.category === 'LEGISLASI' ? '#3b82f6' : ev.category === 'PENGAWASAN' ? '#ef4444' : ev.category === 'ASPIRASI' ? '#22c55e' : '#9ca3af' }}>
                      <div className="flex justify-between items-start mb-2">
                        <CategoryBadge category={ev.category} />
                        {isAdminMode && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(ev)} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit2 size={14}/></button>
                            <button onClick={() => handleDeleteEvent(ev.id)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 size={14}/></button>
                          </div>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-800 text-lg leading-snug mb-1">{ev.title}</h4>
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <Clock size={14} /> {ev.startTime} - {ev.endTime} WIB
                        </div>
                        {ev.location && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} /> {ev.location}
                          </div>
                        )}
                        {ev.pic && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Users size={14} /> PIC: {ev.pic}
                          </div>
                        )}
                      </div>
                      {ev.description && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-dashed">
                          {ev.description}
                        </div>
                      )}
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>

      </main>

      {/* Modal Form */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title={editingEvent ? "Edit Agenda" : "Tambah Agenda Baru"}
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Kegiatan</label>
            <input 
              required
              type="text" 
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Contoh: Sidang Pleno I"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select 
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  {Object.keys(CATEGORIES).map(key => (
                    <option key={key} value={key}>{CATEGORIES[key].label}</option>
                  ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input 
                  required
                  type="date" 
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
                <input 
                  type="time" 
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
                <input 
                  type="time" 
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
            <input 
              type="text" 
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="Contoh: Ruang Sidang Lt. 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIC / Penanggung Jawab</label>
            <input 
              type="text" 
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.pic}
              onChange={(e) => setFormData({...formData, pic: e.target.value})}
              placeholder="Nama Komisi / Orang"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Tambahan</label>
            <textarea 
              rows="3"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Detail agenda, link dokumen, dll..."
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-2">
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              {editingEvent ? 'Simpan Perubahan' : 'Tambah Agenda'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}