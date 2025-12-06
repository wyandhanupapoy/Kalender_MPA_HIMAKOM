# Cara Deploy Firestore Rules

## Error yang Terjadi
Error "Missing or insufficient permissions" terjadi karena Firestore rules yang lama terlalu ketat - user tidak bisa membaca collection `users` saat pertama kali login (chicken-and-egg problem).

## Sudah Diperbaiki di File
File `firestore.rules` sudah diupdate untuk mengizinkan authenticated users membaca collection `users`.

## Cara Deploy Rules ke Firebase

### Opsi 1: Deploy via Firebase Console (RECOMMENDED)

1. **Buka Firebase Console**
   - URL: https://console.firebase.google.com
   - Pilih project: **kalender-mpa-himakom**

2. **Buka Firestore Database**
   - Klik menu "Firestore Database" di sidebar
   - Klik tab "Rules"

3. **Copy Rules Baru**
   - Buka file `firestore.rules` di VS Code
   - Copy SEMUA isinya (Ctrl+A, Ctrl+C)

4. **Paste di Firebase Console**
   - Paste di editor di Firebase Console
   - Klik tombol "Publish"
   - Tunggu sampai status "Published" muncul

### Opsi 2: Deploy via Firebase CLI

Jika sudah install Firebase CLI, jalankan di PowerShell dengan quotes:

```powershell
firebase deploy --only "firestore:rules"
```

**ATAU** jalankan tanpa `--only`:

```powershell
firebase deploy
```

Pilih "Firestore rules" saat diminta.

## Testing

Setelah deploy, coba:
1. Refresh halaman aplikasi (F5)
2. Login dengan akun yang sudah dibuat
3. Seharusnya berhasil tanpa error "Missing or insufficient permissions"

## Rules yang Diupdate

**Sebelum:**
- Users hanya bisa read jika sudah punya profile (chicken-and-egg)

**Sesudah:**
- Semua authenticated users bisa read collection `users`
- Ini diperlukan agar user bisa fetch profile mereka setelah login
- Admin bisa create/update/delete
- User bisa update profile sendiri (tapi tidak bisa ubah role)
