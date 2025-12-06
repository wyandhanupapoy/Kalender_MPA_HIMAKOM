import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  addDoc,
  setDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebase-config';
import { 
  Users, 
  Plus, 
  X, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Mail,
  Lock,
  User,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';

const ROLES = {
  admin: { label: 'Admin', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
  pengurus: { label: 'Pengurus', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
  anggota: { label: 'Anggota', icon: Shield, color: 'text-green-600', bg: 'bg-green-50' }
};

export default function AdminPanel({ isOpen, onClose }) {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'anggota'
  });
  const [formLoading, setFormLoading] = useState(false);

  // Load users
  useEffect(() => {
    if (isOpen && userProfile?.role === 'admin') {
      loadUsers();
    }
  }, [isOpen, userProfile]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
      setErrorMessage('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setFormLoading(true);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Create user document in Firestore - use UID as doc ID
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        isActive: true,
        createdAt: serverTimestamp(),
        createdBy: userProfile.uid
      });

      setSuccessMessage(`Akun ${formData.displayName} berhasil dibuat!`);
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: 'anggota'
      });
      
      setTimeout(() => {
        setShowAddUser(false);
        setSuccessMessage('');
        loadUsers();
      }, 2000);

    } catch (err) {
      console.error('Error creating user:', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Email sudah terdaftar');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Password terlalu lemah (min. 6 karakter)');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('Format email tidak valid');
      } else {
        setErrorMessage('Gagal membuat akun. Silakan coba lagi.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile.uid
      });
      loadUsers();
    } catch (err) {
      console.error('Error updating user status:', err);
      setErrorMessage('Gagal mengubah status pengguna');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <Users size={28} />
            <div>
              <h2 className="text-2xl font-bold">Manajemen Pengguna</h2>
              <p className="text-blue-100 text-sm">Kelola akun anggota MPA</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">Semua Role</option>
            {Object.entries(ROLES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            {showAddUser ? <X size={16} /> : <Plus size={16} />}
            {showAddUser ? 'Tutup' : 'Tambah Pengguna'}
          </button>
        </div>

        {/* Add User Form */}
        {showAddUser && (
          <div className="p-6 border-b bg-blue-50">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tambah Pengguna Baru</h3>
            
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg flex items-start gap-2">
                <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-red-800 text-sm">{errorMessage}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg flex items-start gap-2">
                <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-green-800 text-sm">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="John Doe"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="email@example.com"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Min. 6 karakter"
                    disabled={formLoading}
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  disabled={formLoading}
                >
                  {Object.entries(ROLES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={formLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      <span>Membuat...</span>
                    </>
                  ) : (
                    'Buat Akun'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={32} className="animate-spin text-blue-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-3 opacity-20" />
              <p>Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => {
                const RoleIcon = ROLES[user.role]?.icon || Shield;
                return (
                  <div 
                    key={user.id}
                    className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${ROLES[user.role]?.bg || 'bg-gray-50'}`}>
                        <RoleIcon size={20} className={ROLES[user.role]?.color || 'text-gray-600'} />
                      </div>
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          user.isActive 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>

                    <h4 className="font-bold text-gray-800 mb-1">{user.displayName || 'No Name'}</h4>
                    <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLES[user.role]?.bg} ${ROLES[user.role]?.color}`}>
                        {ROLES[user.role]?.label || user.role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-sm text-gray-600 text-center">
          Total: {filteredUsers.length} pengguna
        </div>
      </div>
    </div>
  );
}
