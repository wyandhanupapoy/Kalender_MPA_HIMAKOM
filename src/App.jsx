import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import './App.css';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
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
  Search,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { db, appId } from './config/firebase-config';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';

// --- Constants & Utilities ---
const CATEGORIES = {
  LEGISLASI: { label: 'Legislasi & Hukum', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '⚖️' },
  PENGAWASAN: { label: 'Pengawasan', color: 'bg-red-100 text-red-700 border-red-200', icon: '👁️' },
  ASPIRASI: { label: 'Aspirasi & Advokasi', color: 'bg-green-100 text-green-700 border-green-200', icon: '📢' },
  INTERNAL: { label: 'Internal & Kesekjenan', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🗂️' },
  ANGGARAN: { label: 'Badan Anggaran', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '💰' },
  UMUM: { label: 'Sidang/Rapat Umum', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '🏛️' }
};

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// --- Reusable Components ---
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

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
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

CategoryBadge.propTypes = {
  category: PropTypes.string.isRequired
};

export default function App() {
  const { currentUser, userProfile, logout, isAdmin, isPengurus, isActive } = useAuth();

  // --- State ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // December 2025
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  // --- Data Fetching (useEffect must be before any early returns) ---
  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'mpa_events');
    const unsubscribe = onSnapshot(q, snapshot => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(loaded);
      setLoading(false);
    }, error => {
      console.error('Error fetching events:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // --- Computed Values (useMemo hooks must be before early returns) ---
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const matchCat = filterCategory === 'ALL' || ev.category === filterCategory;
      const matchSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [events, filterCategory, searchQuery]);

  // Early returns after hooks
  if (!currentUser || !userProfile) {
    return <Login />;
  }

  if (!isActive()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Akun Tidak Aktif</h1>
          <p className="text-gray-600 mb-4">Akun Anda telah dinonaktifkan. Hubungi admin untuk informasi lebih lanjut.</p>
          <button onClick={logout} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Logout</button>
        </div>
      </div>
    );
  }

  // --- Helpers ---
  const getDaysInMonth = date => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const getEventsForDate = date => {
    if (!date) return [];
    const ds = date.toISOString().split('T')[0];
    return filteredEvents.filter(ev => ev.date === ds);
  };

  const renderEventsList = (selectedDate) => {
    const eventsForDate = getEventsForDate(selectedDate);

    if (eventsForDate.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          <p>Tidak ada agenda pada tanggal ini.</p>
          {isPengurus() && (
            <button onClick={() => openAddModal(selectedDate.toISOString().split('T')[0])} className="text-blue-600 text-sm mt-2 hover:underline">+ Tambah Agenda</button>
          )}
        </div>
      );
    }

    const sortedEvents = eventsForDate.toSorted((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <>
        {sortedEvents.map(ev => {
          const getBorderColor = () => {
            if (ev.category === 'LEGISLASI') return '#3b82f6';
            if (ev.category === 'PENGAWASAN') return '#ef4444';
            if (ev.category === 'ASPIRASI') return '#22c55e';
            return '#9ca3af';
          };
          return (
            <div key={ev.id} className="group bg-white border border-l-4 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden" style={{ borderLeftColor: getBorderColor() }}>
              <div className="flex justify-between items-start mb-2">
                <CategoryBadge category={ev.category} />
                {isPengurus() && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(ev)} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit2 size={14} /></button>
                    {isAdmin() && (
                      <button onClick={() => handleDeleteEvent(ev.id)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 size={14} /></button>
                    )}
                  </div>
                )}
              </div>
              <h4 className="font-bold text-gray-800 text-lg leading-snug mb-1">{ev.title}</h4>
              <div className="text-sm text-gray-600 space-y-1 mb-3">
                <div className="flex items-center gap-2"><Clock size={14} /> {ev.startTime} - {ev.endTime} WIB</div>
                {ev.location && (<div className="flex items-center gap-2"><MapPin size={14} /> {ev.location}</div>)}
                {ev.pic && (<div className="flex items-center gap-2 text-gray-500"><Users size={14} /> PIC: {ev.pic}</div>)}
              </div>
              {ev.description && (<div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-dashed">{ev.description}</div>)}
            </div>
          );
        })}
      </>
    );
  };

  // --- Handlers ---
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleDateClick = date => setSelectedDate(date);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: currentDate.toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '10:00',
      location: '',
      category: 'UMUM',
      pic: ''
    });
  };

  const handleSaveEvent = async e => {
    e.preventDefault();
    if (!currentUser || !isPengurus()) return;
    const collRef = collection(db, 'artifacts', appId, 'public', 'data', 'mpa_events');
    try {
      if (editingEvent) {
        await updateDoc(doc(collRef, editingEvent.id), {
          ...formData,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid
        });
      } else {
        await addDoc(collRef, {
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          status: 'approved'
        });
      }
      setIsAddModalOpen(false);
      setEditingEvent(null);
      resetForm();
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Gagal menyimpan agenda. Coba lagi.');
    }
  };

  const handleDeleteEvent = async id => {
    if (!confirm('Apakah Anda yakin ingin menghapus agenda ini?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mpa_events', id));
      if (selectedDate) {
        const remaining = getEventsForDate(selectedDate).filter(e => e.id !== id);
        if (remaining.length === 0) setSelectedDate(null);
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const openAddModal = dateStr => {
    resetForm();
    if (dateStr) setFormData(prev => ({ ...prev, date: dateStr }));
    setEditingEvent(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = ev => {
    setFormData({
      title: ev.title,
      description: ev.description || '',
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      location: ev.location || '',
      category: ev.category,
      pic: ev.pic || ''
    });
    setEditingEvent(ev);
    setIsAddModalOpen(true);
  };

  const handleLogout = async () => {
    if (confirm('Yakin ingin logout?')) await logout();
  };

  // --- Render Helpers ---
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
          if (!date) {
            const emptyKey = `empty-${Math.floor(idx / 7)}-${idx % 7}`;
            return <div key={emptyKey} className="bg-white min-h-[120px]" />;
          }
          const dateEvents = getEventsForDate(date);
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          const isToday = new Date().toDateString() === date.toDateString();
          const dateString = date.toISOString();
          return (
            <div
              key={dateString}
              className={`bg-white min-h-[120px] p-2 transition-all cursor-pointer hover:bg-gray-50 flex flex-col gap-1 relative border-0 group ${isSelected ? 'ring-2 ring-blue-500 inset-0 z-10' : ''}`}
              onClick={() => handleDateClick(date)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDateClick(date);
                }
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>{date.getDate()}</span>
                {isPengurus() && (
                  <button
                    onClick={e => { e.stopPropagation(); openAddModal(date.toISOString().split('T')[0]); }}
                    type="button"
                    className="text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Add event on ${date.toLocaleDateString()}`}
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

  // --- Main Render ---
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
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 border focus-within:ring-2 ring-blue-500 ring-offset-1">
              <Search size={16} className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Cari agenda..."
                className="bg-transparent border-none outline-none text-sm w-48"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Admin Panel */}
            {isAdmin() && (
              <button onClick={() => setIsAdminPanelOpen(true)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-medium hover:from-red-700 hover:to-red-800 transition-all shadow-sm">
                <Settings size={16} />
                <span>Admin Panel</span>
              </button>
            )}
            {/* User Menu */}
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {userProfile?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-800">{userProfile?.displayName || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{userProfile?.role || 'Member'}</p>
                </div>
              </button>
              {showUserMenu && (
                <>
                  <button type="button" className="fixed inset-0 z-40 bg-transparent border-0 cursor-default" onClick={() => setShowUserMenu(false)} aria-label="Close user menu" />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50 py-1">
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm font-medium text-gray-800">{userProfile?.displayName || userProfile?.email}</p>
                      <p className="text-xs text-gray-500">{userProfile?.email}</p>
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full capitalize">{userProfile?.role}</span>
                    </div>
                    {isAdmin() && (
                      <button onClick={() => { setIsAdminPanelOpen(true); setShowUserMenu(false); }} className="sm:hidden w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                        <Settings size={16} /> Admin Panel
                      </button>
                    )}
                    <button onClick={() => { setShowUserMenu(false); handleLogout(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Mobile Search */}
          <div className="md:hidden bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input type="text" placeholder="Cari agenda..." className="flex-1 bg-transparent border-none outline-none text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              )}
            </div>
          </div>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-4">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full border"><ChevronLeft size={20} /></button>
              <h2 className="text-2xl font-bold text-gray-800 w-40 text-center">
                {MONTHS[currentDate.getMonth()]} <span className="text-blue-600">{currentDate.getFullYear()}</span>
              </h2>
              <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full border"><ChevronRight size={20} /></button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setCurrentDate(new Date())} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border transition-colors">Hari Ini</button>
              <button onClick={() => setCurrentDate(new Date(2025, 11, 1))} className="text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg border border-blue-300 transition-colors">Des 2025</button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <Filter size={18} className="text-gray-400 mr-1 flex-shrink-0" />
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
                <option value="ALL">Semua Kategori</option>
                {Object.keys(CATEGORIES).map(key => (
                  <option key={key} value={key}>{CATEGORIES[key].label}</option>
                ))}
              </select>
              {isPengurus() && (
                <button onClick={() => openAddModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all ml-auto">
                  <Plus size={16} /> Agenda Baru
                </button>
              )}
            </div>
          </div>
          {/* Calendar Grid */}
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
        {/* Side Panel */}
        <div className={`lg:w-96 w-full flex-shrink-0 transition-all duration-300 ${selectedDate ? 'opacity-100 translate-x-0' : 'hidden lg:flex lg:opacity-50 lg:pointer-events-none'}`}>
          <div className="bg-white rounded-xl shadow-lg border h-full flex flex-col sticky top-24 max-h-[calc(100vh-8rem)]">
            <div className="p-6 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {selectedDate ? selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Pilih Tanggal'}
                </h3>
                <p className="text-sm text-gray-500">Detail Kegiatan</p>
              </div>
              {selectedDate && (
                <button onClick={() => setSelectedDate(null)} className="lg:hidden p-2 text-gray-500"><X size={20} /></button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedDate ? (
                renderEventsList(selectedDate)
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center">
                  <Calendar size={48} className="mb-2 opacity-20" />
                  <p>Klik tanggal di kalender<br />untuk melihat detail acara.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Form */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={editingEvent ? 'Edit Agenda' : 'Tambah Agenda Baru'}>
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-1">Judul Kegiatan</label>
            <input id="event-title" required type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Contoh: Sidang Pleno I" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-category" className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select id="event-category" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                {Object.keys(CATEGORIES).map(key => (
                  <option key={key} value={key}>{CATEGORIES[key].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input id="event-date" required type="date" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-start-time" className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
              <input id="event-start-time" type="time" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
            </div>
            <div>
              <label htmlFor="event-end-time" className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
              <input id="event-end-time" type="time" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
            <input id="event-location" type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Contoh: Ruang Sidang Lt. 3" />
          </div>
          <div>
            <label htmlFor="event-pic" className="block text-sm font-medium text-gray-700 mb-1">PIC / Penanggung Jawab</label>
            <input id="event-pic" type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.pic} onChange={e => setFormData({ ...formData, pic: e.target.value })} placeholder="Nama Komisi / Orang" />
          </div>
          <div>
            <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Tambahan</label>
            <textarea id="event-description" rows={3} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Detail agenda, link dokumen, dll..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-2">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors">
              {editingEvent ? 'Simpan Perubahan' : 'Tambah Agenda'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Panel */}
      <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
    </div>
  );
}