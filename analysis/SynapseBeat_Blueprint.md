# 🎵 EXPERIMENTAL ANALYSIS: Synapse Beat (Rhythm Quiz Mode)

**Status:** `DRAFT`  
**Target Platform:** Web (React + Canvas + Web Audio API)  
**Original Concept:** Unity/C# Logic  
**Adaptation:** TypeScript/Web Standards

---

## 1. Executive Summary & Kelayakan (Feasibility)

Ide **"Synapse Beat"** sangat layak (Feasible) untuk diimplementasikan di web, namun memiliki tantangan teknis yang berbeda dengan Unity. Browser modern sudah mendukung **Web Audio API** yang presisi dan **HTML5 Canvas** untuk rendering 60fps, yang cukup untuk game ritme kasual hingga semi-hardcore.

**Verdict:** ✅ **GO** (Dengan adaptasi teknologi).

---

## 2. Tantangan Utama (Unity vs Web)

Karena kita tidak menggunakan Unity Engine, kita harus membangun "Mini-Engine" sendiri menggunakan TypeScript.

| Fitur Unity (C#) | Adaptasi Web (TypeScript) | Tantangan |
| :--- | :--- | :--- |
| `AudioSettings.dspTime` | `AudioContext.currentTime` | Browser punya latency audio (terutama Bluetooth). Perlu fitur *Calibration*. |
| `Update()` Loop | `requestAnimationFrame()` | React State update terlalu lambat untuk game loop. Harus bypass React State dan pakai **Ref** + **Canvas**. |
| `Instantiate()` Prefab | Object Pooling (Array) | Garbage Collection di JS bisa bikin *stutter* (lag). Jangan buat object baru tiap detik, gunakan ulang object lama. |
| `GetSpectrumData()` | `AnalyserNode.getByteFrequencyData` | Perlu setup Audio Context graph manual. |

---

## 3. Arsitektur Teknis (The Web Translation)

Berikut adalah terjemahan logika C# Anda ke arsitektur Web:

### A. The Conductor (Web Audio API)
Kita tidak bisa mengandalkan `Date.now()` karena tidak sinkron dengan hardware audio. Kita gunakan `AudioContext`.

**Konsep Implementasi:**
*   Buat satu `AudioContext` global.
*   `startTime` = `audioContext.currentTime` saat lagu mulai.
*   `songPosition` = `audioContext.currentTime - startTime`.
*   Ini menjamin posisi lagu akurat hingga milidetik, terlepas dari lag visual.

### B. The Spawner (Canvas Renderer)
Jangan gunakan elemen HTML `<div>` untuk note (DOM manipulation itu berat). Gunakan `<canvas>`.

**Konsep Implementasi:**
*   Buat class `Note` (bukan GameObject).
*   Simpan semua note dalam array `notes[]`.
*   Dalam loop `requestAnimationFrame`:
    1.  Clear Canvas.
    2.  Update posisi Y semua note: `y = (songPosition - targetTime) * speed`.
    3.  Draw note (fillRect).
    4.  Hapus note yang sudah lewat layar (kembalikan ke pool).

### C. Audio Analysis (Procedural Generation)
Untuk mendeteksi "Kick" secara otomatis dari file MP3 user:

**Konsep Implementasi:**
1.  Load file audio ke `AudioBuffer`.
2.  Sambungkan ke `AnalyserNode`.
3.  Saat lagu main, baca `analyser.getByteFrequencyData(dataArray)`.
4.  Ambil rata-rata frekuensi rendah (Bass) -> `dataArray[0] s/d dataArray[10]`.
5.  Jika `energy > threshold`, spawn note di lane random.

---

## 4. The Game Loop (10 Detik Logic)

Kita akan menggunakan **State Machine** sederhana di dalam Canvas Loop.

### Phase 1: The Hook (0s - 2.5s)
*   **Logic:** `songPosition < 2.5`
*   **Visual:** Canvas menggambar Teks Soal besar.
*   **Input:** Tap diabaikan atau hanya efek visual air (ripple).

### Phase 2: The Rush (2.5s - 8.0s)
*   **Logic:** `songPosition >= 2.5 && songPosition < 8.0`
*   **Visual:** Soal mengecil ke atas.
*   **Spawner:** Aktifkan `AudioAnalysis` untuk spawn note pendek.
*   **Input:** Hit detection (AABB Collision) antara jari user dan note.
    *   Hit = Score Multiplier naik.
    *   Miss = Layar goyang (Screen Shake).

### Phase 3: The Verdict (8.0s - 10.0s)
*   **Logic:** `songPosition >= 8.0`
*   **Visual:** Spawn 4 "Long Notes" (Hold Bars) di semua lane.
*   **Input:**
    *   User harus menahan jari di lane jawaban.
    *   Gunakan `touchstart` dan `touchend`.
    *   Jika user melepas sebelum bar habis -> Gagal.
    *   Jika user menekan lane salah -> Audio Pitch turun (efek kaset rusak).

---

## 5. Rencana Implementasi (Step-by-Step)

Kita akan membuat file terpisah agar tidak merusak aplikasi utama.

1.  **Step 1: The Engine (Tanpa UI)**
    *   Membuat `SynapseEngine.ts` (Class untuk handle AudioContext dan Loop).
    *   Memastikan lagu bisa play dan waktu terhitung akurat.

2.  **Step 2: The Visuals (Canvas)**
    *   Membuat komponen `SynapseCanvas.tsx`.
    *   Implementasi rendering kotak jatuh (Note) yang sinkron dengan lagu.

3.  **Step 3: The Interaction**
    *   Menambahkan Touch/Click listener.
    *   Logika Hit/Miss.

4.  **Step 4: Integration**
    *   Menggabungkan dengan data Quiz dari Supabase/Gemini.

---

## 6. Kesimpulan & Rekomendasi

Ide ini **SANGAT FRESH**. Kebanyakan aplikasi kuis membosankan karena statis. Menambahkan elemen ritme (walaupun prosedural) akan meningkatkan *retention* secara drastis.

**Rekomendasi:**
Gunakan library **Howler.js** untuk manajemen audio yang lebih mudah cross-browser, tapi tetap gunakan native **AnalyserNode** untuk deteksi beat.

Siap untuk mulai prototyping fase 1 (The Engine)?
