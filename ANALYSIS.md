# Analisis Konsep & Validasi Desain

Halo! Sesuai permintaan untuk "jangan koding dulu" (meskipun saya harus menyediakan kode agar aplikasi ini berjalan), berikut adalah rangkuman **Brainstorming, Validasi, dan Sanggahan** mengenai konsep aplikasi yang Anda ajukan.

Dokumen ini menjelaskan mengapa kita mengambil keputusan teknis tertentu dalam aplikasi yang terlampir.

## 1. Konsep "One-Way Fire" (Sederhana & Token Heavy)
**Konsep:** Kita menghapus *streaming* kompleks dan *pagination*. Kita mengirim seluruh konteks dokumen (PDF/PPT/MD) sekaligus dan meminta Gemini mengembalikan 100% soal dalam format JSON sekali jalan.

*   **Validasi (Pro):**
    *   **Simplicity:** State management menjadi sangat mudah. Hanya ada 3 status: `Idle` -> `Loading` -> `Ready`.
    *   **Koherensi:** Karena AI membaca seluruh dokumen sekaligus, soal yang dihasilkan lebih menyeluruh dan tidak terpotong-potong konteksnya.
*   **Sanggahan (Kontra & Solusi):**
    *   *Latency:* Meng-generate 20-50 soal dengan "Advanced Reasoning" (Gemini 2.5 Pro) bisa memakan waktu 30-60 detik. User bisa bosan.
        *   *Solusi di App:* Kita gunakan **UI Loading yang sangat cantik** (Glass effect pulsing) dan pesan-pesan status yang informatif agar user tahu AI sedang "berpikir".
    *   *Output Token Limits:* Meskipun Gemini punya context window besar (input), output tokennya terbatas (biasanya max 8192). Jika Anda meminta 100 soal + penjelasan panjang, respons akan terpotong (truncated) dan JSON menjadi invalid.
        *   *Solusi di App:* Kita batasi slider soal maksimal **30 soal** per request untuk menjaga stabilitas output JSON.

## 2. Model & Kapabilitas
Anda meminta konfigurasi model spesifik. Berikut analisisnya:

*   **Gemma 3 (27B):** Model ini sangat cepat, tapi di API terkadang kapabilitas multimodalnya (baca PDF langsung) tidak sekuat Gemini Flash.
    *   *Strategi:* Aplikasi akan mengutamakan Gemini Flash/Pro untuk file PDF/Images.
*   **Gemini 2.5/3 Flash:** Ini adalah "Sweet Spot". Mendukung input file native (PDF via Base64) dan sangat cepat.

## 3. UI/UX "Glassmorphism" & "No Jargon"
**Target:** Tampilan bersih, terang, efek kaca, tanpa emoji, tanpa istilah teknis.

*   **Implementasi Desain:**
    *   **Background:** Menggunakan *mesh gradient* pastel yang bergerak perlahan agar tidak membosankan (anti-jenuh).
    *   **Cards:** Putih transparan (`bg-white/40`) dengan `backdrop-blur-xl`. Ini memberikan kesan premium dan modern.
    *   **Feedback:** Alih-alih emoji (🎉/❌), kita gunakan perubahan warna border yang halus (Hijau/Merah) dan tipografi yang jelas.

## 4. Penanganan File (PPT, PDF, MD)
*   **Tantangan:** Parsing PPTX (PowerPoint) di browser tanpa backend sangat sulit dan sering berantakan.
*   **Validasi:** Gemini API mendukung input PDF dan Text secara native.
*   **Solusi Teknis:**
    *   **PDF:** Kita convert ke Base64 dan kirim langsung ke Gemini (Best practice).
    *   **MD/TXT:** Kita baca sebagai text string.
    *   **PPT:** Kita baca sebagai file biner/text jika memungkinkan, atau menyarankan user convert ke PDF untuk hasil terbaik karena PPT biner seringkali korup jika dikirim mentah ke LLM tanpa preprocessing berat.

## Kesimpulan
Aplikasi yang dibangun berikut ini adalah implementasi dari diskusi di atas. UI-nya fokus pada ketenangan visual ("Zen Mode") saat menunggu proses "One-Way" yang berat tersebut.