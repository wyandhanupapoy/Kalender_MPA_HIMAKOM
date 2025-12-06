# 📅 MPA Calendar - Timeline Kerja HIMAKOM POLBAN

![MPA Calendar](https://img.shields.io/badge/MPA-Calendar-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=for-the-badge&logo=tailwind-css)

Sistem kalender timeline kerja untuk Majelis Permusyawaratan Anggota (MPA) HIMAKOM POLBAN 2025/2026 dengan fitur autentikasi, manajemen user berbasis role, dan desain responsif.

## ✨ Fitur Utama

### 🔐 Autentikasi & Keamanan
- Login menggunakan email & password
- Role-based access control (Admin, Pengurus, Anggota)
- Members-only access - tidak ada akses publik
- User management melalui Admin Panel
- Firestore security rules yang ketat

### 📅 Kalender & Event Management
- Kalender dimulai dari Desember 2025
- Navigasi tahun dan bulan yang mudah
- Quick jump ke "Hari Ini" dan "Des 2025"
- 6 Kategori event: Legislasi, Pengawasan, Aspirasi, Internal, Anggaran, Umum
- CRUD operations untuk event (create, read, update, delete)
- Filter berdasarkan kategori
- Search/pencarian event real-time
- Event detail sidebar dengan informasi lengkap

### 🎨 UI/UX
- **Fully Responsive**: Optimal di mobile, tablet, dan desktop
- **Modern Design**: Glassmorphism, gradients, smooth animations
- **Beautiful Login**: Animated background dengan glassmorphism effect
- **User-Friendly**: Intuitive navigation dan clean interface
- **Accessible**: Keyboard navigation support & focus indicators
- **Custom Fonts**: Inter & Poppins untuk typography premium

### 👥 Role-Based Permissions
- **Admin**: Full access termasuk user management & delete events
- **Pengurus**: Dapat membuat dan edit semua event
- **Anggota**: Read-only access untuk melihat kalender

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Firebase account

### Installation

1. **Clone repository**
```bash
git clone <repository-url>
cd mpa-calendar
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**
- File `.env` sudah ada dengan konfigurasi Firebase
- Pastikan Firebase project sudah di-setup

4. **Deploy Firestore Rules**
```bash
firebase deploy --only firestore:rules
```

5. **Run development server**
```bash
npm run dev
```

6. **Open browser**
```
http://localhost:5173
```

## 🔧 Setup First Admin User

Karena aplikasi memerlukan autentikasi, Anda perlu membuat user admin pertama secara manual melalui Firebase Console:

### Metode 1: Firebase Console (Recommended)

1. **Buat User di Firebase Authentication**:
   - Buka Firebase Console → Authentication → Users
   - Klik "Add user"
   - Masukkan email dan password (e.g., `admin@himakom.polban.ac.id`)
   - Copy UID user yang baru dibuat

2. **Buat Document di Firestore**:
   - Buka Firebase Console → Firestore Database
   - Buka collection `users`
   - Klik "Add document"
   - Isi dengan data berikut:
   ```json
   {
     "uid": "<UID yang di-copy tadi>",
     "email": "admin@himakom.polban.ac.id",
     "displayName": "Admin MPA",
     "role": "admin",
     "isActive": true,
     "createdAt": <Firestore timestamp>,
     "createdBy": "system"
   }
   ```

3. **Login ke Aplikasi**:
   - Akses aplikasi
   - Login dengan email dan password yang dibuat
   - Sekarang Anda bisa mengakses Admin Panel untuk membuat user lainnya

### Metode 2: Firebase CLI (Alternative)

Jika Anda familiar dengan Firebase CLI, bisa menggunakan script:

```javascript
// run this in Firestore Console or Firebase CLI
const user = await admin.auth().createUser({
  email: 'admin@himakom.polban.ac.id',
  password: 'SecurePassword123',
  displayName: 'Admin MPA'
});

await admin.firestore().collection('users').add({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  role: 'admin',
  isActive: true,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  createdBy: 'system'
});
```

## 📱 Usage

### Login
1. Akses aplikasi
2. Masukkan email dan password yang sudah dibuat admin
3. User harus dalam status "Active" untuk bisa login

### Admin Panel (Admin Only)
1. Klik "Admin Panel" di header atau user menu
2. Lihat semua user yang terdaftar
3. Tambah user baru dengan form
4. Atur role: Admin, Pengurus, atau Anggota
5. Aktifkan/nonaktifkan user

### Manajemen Event
- **Melihat Event**: Klik tanggal di kalender untuk melihat detail
- **Tambah Event** (Pengurus+): Klik tombol "Agenda Baru" atau ikon + di tanggal
- **Edit Event** (Pengurus+): Klik ikon edit pada event card
- **Hapus Event** (Admin only): Klik ikon trash pada event card
- **Filter**: Gunakan dropdown kategori untuk filter
- **Search**: Ketik di search bar untuk mencari event

### Navigasi Kalender
- **Bulan**: Gunakan tombol ← → untuk navigasi bulan
- **Tahun**: Gunakan tombol « » untuk navigasi tahun
- **Quick Jump**: Klik "Hari Ini" atau "Des 2025" untuk quick navigation
- **Select Date**: Klik tanggal manapun untuk melihat detail event

## 🏗️ Project Structure

```
mpa-calendar/
├── src/
│   ├── components/
│   │   ├── Login.jsx           # Login page dengan animated background
│   │   └── AdminPanel.jsx      # User management panel
│   ├── context/
│   │   └── AuthContext.jsx     # Authentication & user state management
│   ├── config/
│   │   └── firebase-config.js  # Firebase configuration
│   ├── App.jsx                 # Main calendar application
│   ├── App.css                 # App-specific styles & animations
│   ├── index.css               # Global styles & CSS variables
│   └── main.jsx                # App entry point
├── public/
│   └── ...                     # Static assets
├── firestore.rules             # Firestore security rules
├── firebase.json               # Firebase configuration
├── .env                        # Environment variables
└── package.json                # Dependencies
```

## 🎨 Tech Stack

- **Frontend**: React 19.2.0
- **Styling**: TailwindCSS 4.1
- **Backend**: Firebase (Firestore + Authentication)
- **Icons**: Lucide React
- **Build Tool**: Vite (Rolldown)
- **Fonts**: Google Fonts (Inter, Poppins)

## 🔒 Security

- ✅ Authentication required untuk semua akses
- ✅ Firestore security rules dengan role-based access
- ✅ User status check (active/inactive)
- ✅ Protected routes
- ✅ Input validation
- ✅ XSS protection via React

## 📱 Responsive Design

Aplikasi dirancang mobile-first dan optimal di semua ukuran layar:

- **Mobile** (< 640px): Touch-optimized, stacked layout, mobile search
- **Tablet** (640px - 1024px): Balanced layout, optimized spacing
- **Desktop** (> 1024px): Full sidebar, wide calendar grid

## 🤝 Contributing

Untuk kontribusi:
1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

--

## 👥 Contact

MPA HIMAKOM POLBAN 2025/2026

---

**Built with ❤️ for HIMAKOM POLBAN**
