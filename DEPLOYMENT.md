
# Panduan Setup Mikir ( •_•)

## 1. Wajib: API Key (Otak AI)
Aplikasi ini butuh otak. Pilih salah satu atau keduanya:

### A. Google Gemini (Gratis & Cepat)
1.  Buka [Google AI Studio](https://aistudio.google.com/).
2.  Klik **"Get API key"**.
3.  Copy kuncinya.
4.  Masukkan di menu **Settings > AI Keys** di aplikasi.

### B. Groq (Super Cepat)
1.  Buka [Groq Console](https://console.groq.com/keys).
2.  Buat API Key baru.
3.  Masukkan di menu **Settings > AI Keys** di aplikasi.

---

## 2. Opsional: Integrasi Supabase (Penyimpanan & Catatan)
Agar riwayat kuis tersimpan di Cloud dan bisa mengambil data dari aplikasi Catatan kamu.

### Langkah 1: Dapatkan Kunci
1.  Buka Project Supabase kamu.
2.  Ke **Settings > API**.
3.  Copy **Project URL** dan **anon public Key**.

### Langkah 2: Siapkan Tabel (Wajib dilakukan sekali)
1.  Buka menu **SQL Editor** di Supabase.
2.  Buat Query baru, lalu copy-paste isi file `supabase_schema.sql` yang ada di folder project ini.
3.  Klik **Run**.
4.  Pastikan tidak ada error. Schema ini akan membuat tabel `generated_quizzes`, tabel `notes`, dan membuka izin akses (RLS Policies).

### Langkah 3: Koneksikan
1.  Buka Aplikasi Mikir.
2.  Ke **Settings > Storage**.
3.  Pilih **Supabase**.
4.  Paste URL dan Key tadi.
5.  Klik Simpan.

---

## Troubleshooting

*   **Error "Permission denied" saat simpan/load:** 
    Cek langkah SQL Editor. Pastikan bagian `create policy` sudah dijalankan. Tanpa policy ini, Supabase akan memblokir akses dari browser.

*   **Cloud Notes kosong:**
    Pastikan tabel di Supabase kamu namanya `notes` dan memiliki kolom `title` dan `content`. Jika namnaya beda, ubah query di `services/storageService.ts` atau rename tabel kamu.
