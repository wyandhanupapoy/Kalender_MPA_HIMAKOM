# 🔐 Setup Admin User Pertama - MPA Calendar

## Langkah-langkah Setup

Karena aplikasi memerlukan autentikasi, Anda perlu membuat user admin pertama melalui Firebase Console.

### 1️⃣ Buka Firebase Console

1. Buka: https://console.firebase.google.com
2. Pilih project: **kalender-mpa-himakom**
3. Login dengan akun Google yang memiliki akses

### 2️⃣ Buat User di Authentication

1. **Klik menu "Authentication"** di sidebar kiri
2. **Klik tab "Users"**
3. **Klik tombol "Add user"**
4. **Isi form:**
   - Email: `admin@himakom.polban.ac.id` (atau email lain yang Anda inginkan)
   - Password: Buat password yang kuat (minimal 6 karakter)
5. **Klik "Add user"**
6. **PENTING:** Copy **UID** user yang baru dibuat (string panjang seperti `AbC123dEf...`)

### 3️⃣ Buat Document di Firestore

1. **Klik menu "Firestore Database"** di sidebar kiri
2. **Buka collection "users"**
   - Jika belum ada, klik "Start collection" dan beri nama `users`
3. **Klik "Add document"**
4. **Isi data sebagai berikut:**

   **Document ID:** Biarkan auto-generate atau isi manual
   
   **Fields:**
   ```
   Field               Type        Value
   ----               -----       -----
   uid                string      <UID yang di-copy dari step 2>
   email              string      admin@himakom.polban.ac.id
   displayName        string      Admin MPA
   role               string      admin
   isActive           boolean     true
   createdAt          timestamp   <Click "Add timestamp" untuk auto-fill>
   createdBy          string      system
   ```

   **Contoh screenshot fields:**
   ```
   uid: "AbC123dEf456GhI789..."
   email: "admin@himakom.polban.ac.id"
   displayName: "Admin MPA"
   role: "admin"
   isActive: true
   createdAt: December 6, 2025 at 4:00:00 PM UTC+7
   createdBy: "system"
   ```

5. **Klik "Save"**

### 4️⃣ Login ke Aplikasi

1. Buka aplikasi di browser: http://localhost:5173
2. Login dengan:
   - Email: `admin@himakom.polban.ac.id` (atau email yang Anda buat)
   - Password: Password yang Anda buat di step 2
3. ✅ Berhasil! Anda sekarang login sebagai Admin

### 5️⃣ Buat User Lainnya

Setelah login sebagai admin:

1. **Klik tombol "Admin Panel"** di header (atau di user menu)
2. **Klik "Tambah Pengguna"**
3. **Isi form:**
   - Nama Lengkap: Nama lengkap user
   - Email: Email user
   - Password: Password untuk user (minimal 6 karakter)
   - Role: Pilih Admin, Pengurus, atau Anggota
4. **Klik "Buat Akun"**
5. User baru sekarang bisa login!

## 📝 Catatan Penting

- **Admin** = Full access (create/edit/delete events, manage users)
- **Pengurus** = Create & edit events
- **Anggota** = View only (read-only)
- User harus dalam status "Active" untuk bisa login
- Gunakan password yang kuat untuk keamanan

## ❓ Troubleshooting

**Problem:** Tidak bisa login setelah membuat user
- **Solusi:** Pastikan field `uid` di Firestore sama persis dengan UID di Authentication
- **Solusi:** Pastikan `isActive` bernilai `true`
- **Solusi:** Pastikan `role` bernilai `admin`, `pengurus`, atau `anggota` (lowercase)

**Problem:** Error "auth/invalid-credential"
- **Solusi:** Pastikan email dan password yang dimasukkan benar
- **Solusi:** Pastikan user sudah dibuat di Authentication

**Problem:** Login berhasil tapi redirect ke "Akun Tidak Aktif"
- **Solusi:** Set `isActive` menjadi `true` di Firestore

## 🎉 Selesai!

Setelah setup admin pertama, Anda bisa:
- ✅ Mengelola semua user melalui Admin Panel
- ✅ Membuat, edit, dan hapus event
- ✅ Filter dan search event
- ✅ Navigasi tahun dan bulan dengan mudah

**Happy planning! 📅**
