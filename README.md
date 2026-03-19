# MIKIR PIVOT ( •_•)

**Mikir Pivot** adalah platform cerdas untuk membuat kuis secara instan dari materi yang Anda miliki. Cukup unggah dokumen (PDF, TXT, MD) atau ketik topik tertentu, dan AI akan menyusun soal kuis berkualitas tinggi lengkap dengan pembahasan dan petunjuk.

## ✨ Fitur Utama

- **AI Quiz Generator**: Membuat soal otomatis menggunakan Google Gemini AI.
- **Multi-Mode Quiz**:
  - **Classic**: Belajar santai tanpa tekanan.
  - **Time Rush**: Tantang diri Anda dengan batas waktu 20 detik per soal.
- **SRS (Spaced Repetition System)**: Algoritma Neuro-Sync (SM-2) untuk membantu Anda mengingat materi lebih lama.
- **Multiplayer**: Mengerjakan kuis bersama teman secara real-time.
- **Analisis Skill**: Lihat statistik perkembangan belajar Anda.
- **Export to PDF**: Simpan kuis Anda dalam format PDF yang rapi.

## 🚀 Cara Setup

### 1. Mendapatkan API Key Gemini
Aplikasi ini memerlukan API Key dari Google AI Studio untuk menggerakkan fitur AI-nya.

1. Buka [Google AI Studio](https://aistudio.google.com/).
2. Login dengan akun Google Anda.
3. Klik tombol **"Get API key"** di sidebar kiri.
4. Klik **"Create API key in new project"** (atau gunakan project yang sudah ada).
5. Salin API Key yang muncul.

### 2. Konfigurasi Environment Variables
Setelah mendapatkan API Key, Anda perlu memasukkannya ke dalam aplikasi:

1. Buka menu **Settings** (ikon gerigi ⚙️) di pojok kanan atas aplikasi.
2. Cari bagian **Secrets / Environment Variables**.
3. Tambahkan variabel baru:
   - Name: `API_KEY`
   - Value: `(Tempelkan API Key Anda di sini)`
4. Simpan perubahan. Aplikasi akan memuat ulang secara otomatis.

### 3. Konfigurasi Firebase (MANDATORY untuk Cloud Sync & Multiplayer)
Aplikasi ini menggunakan Firebase untuk menyimpan data kuis, riwayat belajar (SRS), dan fitur multiplayer.

#### Langkah-langkah Setup:
1. **Buat Project Firebase**:
   - Buka [Firebase Console](https://console.firebase.google.com/).
   - Klik **"Add project"** dan ikuti langkah-langkahnya.
2. **Aktifkan Authentication**:
   - Di sidebar kiri, pilih **Build > Authentication**.
   - Klik **"Get Started"**.
   - Di tab **Sign-in method**, pilih **Google** dan aktifkan. Masukkan email dukungan proyek Anda.
3. **Aktifkan Firestore Database**:
   - Di sidebar kiri, pilih **Build > Firestore Database**.
   - Klik **"Create database"**.
   - Pilih lokasi server terdekat (misal: `asia-southeast1` untuk Indonesia).
   - Mulai dalam **"Test mode"** untuk pengembangan awal (jangan lupa perbarui `firestore.rules` nanti).
4. **Dapatkan Konfigurasi Aplikasi**:
   - Klik ikon gerigi (Project settings) di sidebar kiri.
   - Di bagian **"Your apps"**, klik ikon `</>` (Web) untuk mendaftarkan aplikasi.
   - Beri nama aplikasi (misal: `Mikir-Pivot-Web`).
   - Salin objek `firebaseConfig` yang muncul.
5. **Update File Konfigurasi**:
   - Buka file `firebase-applet-config.json` di proyek ini.
   - Masukkan nilai dari `firebaseConfig` ke dalam file tersebut. Contoh format:
     ```json
     {
       "apiKey": "AIza...",
       "authDomain": "mikir-pivot.firebaseapp.com",
       "projectId": "mikir-pivot",
       "storageBucket": "mikir-pivot.appspot.com",
       "messagingSenderId": "123456789",
       "appId": "1:123456789:web:abc123",
       "firestoreDatabaseId": "(default)"
     }
     ```
6. **Deploy Security Rules**:
   - Salin isi file `firestore.rules` dari proyek ini ke tab **Rules** di Firestore Database Anda di Firebase Console.


## 🛠️ Pengembangan Lokal

Jika Anda ingin menjalankan proyek ini di komputer lokal:

```bash
# Install dependensi
npm install

# Jalankan server pengembangan
npm run dev
```

## 📄 Lisensi
Proyek ini dilisensikan di bawah **MIT License**. Lihat file [LICENSE](./LICENSE) untuk detail lebih lanjut.

---
*Dibuat dengan ❤️ untuk membantu siapa saja belajar lebih efektif.*
