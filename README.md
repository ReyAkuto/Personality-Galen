# Galen Personality Assessment (Web Edition)

Aplikasi web modern untuk asesmen tes kepribadian berbasis **4 Temperamen Galen** (*Koleris, Sanguinis, Melankolis, Phlegmatis*) dan metodologi **Florence Littauer (Personality Plus)**.

---

## 🌟 Fitur Utama

1. **Desain Bersih & Profesional (Non-AI Slop)**:
   - Tipografi elegan menggunakan *Plus Jakarta Sans*.
   - Palet warna matang dan berwibawa, mencerminkan asesmen psikometri resmi.
   - Tanpa efek neon / gradien berlebihan yang generik.
2. **Alur Kuis Interaktif**:
   - Pendaftaran peserta (Nama lengkap, instansi, kontak).
   - 40 nomor pernyataan diagnostik (1 soal per tampilan dengan progress bar real-time).
   - Dukungan keyboard shortcut: angka `1`, `2`, `3`, `4` atau `A`, `B`, `C`, `D` untuk memilih, `Enter` untuk lanjut.
3. **Analisis Mendalam & Presisi**:
   - Penghitungan persentase keempat temperamen.
   - Penentuan **Karakter Dominan 1** (Primer) dan **Karakter Dominan 2** (Sekunder).
   - Ulasan kombinasi karakter, gaya kepemimpinan, dinamika relasi, dan rekomendasi karir.
4. **Penyimpanan Log Fleksibel (Multi-Backend)**:
   - **LocalStorage**: Otomatis tersimpan di browser secara offline.
   - **Firebase Realtime Database**: Terintegrasi via REST API langsung.
   - **Google Sheets**: Terintegrasi via Google Apps Script Webhook.
   - Panel admin untuk melihat daftar peserta dan tombol **Export ke CSV (Excel)**.
5. **Cetak / Simpan PDF**:
   - Menggunakan `@media print` yang rapi dan profesional untuk mencetak laporan resmi A4.

---

## 📁 Struktur Direktori

```text
GalenPersonalityTest/
├── index.html                   # Halaman utama aplikasi (SPA)
├── css/
│   └── style.css                # Styling modern, bersih, dan responsif
├── js/
│   ├── app.js                   # Logika tes, skoring, & render antarmuka
│   ├── config.js                # Konfigurasi endpoint backend
│   └── storage.js               # Handler penyimpanan (LocalStorage, Firebase, Google Sheets)
├── data/
│   ├── questions.json           # 40 bank soal dalam format JSON murni
│   ├── personality_descriptions.json # Seluruh artikel ulasan temperamen
│   ├── questions.js             # Fallback data offline (protokol file://)
│   └── descriptions.js          # Fallback data offline (protokol file://)
├── assets/                      # Aset gambar diagram & ilustrasi asli
├── google-apps-script.js        # Kode Apps Script untuk integrasi Google Sheets
└── README.md                    # Dokumentasi proyek
```

---

## 🚀 Cara Menjalankan

### Cara 1: Langsung Buka di Browser (Paling Cepat)
Cukup buka file `index.html` dengan dobel-klik atau klik kanan $\rightarrow$ **Open with Google Chrome / Edge**. 
*(Aplikasi dilengkapi fallback JS sehingga bekerja 100% mulus tanpa perlu server).*

### Cara 2: Menjalankan via Local Web Server
Di terminal (VS Code atau PowerShell):
```powershell
# Menggunakan Python
python -m http.server 3000

# Atau menggunakan npx serve / Live Server
npx serve .
```
Buka browser di `http://localhost:3000`.

---

## ☁️ Pengaturan Backend Cloud

### 1. Integrasi Google Sheets (Disarankan & Termudah)
1. Buka Google Sheets baru di Google Drive.
2. Buka menu **Extensions > Apps Script**.
3. Salin seluruh isi file `google-apps-script.js` ke dalam editor Apps Script.
4. Klik **Deploy > New deployment**, pilih jenis **Web app**.
5. Set **Who has access** ke **Anyone** (Siapa saja), lalu klik **Deploy**.
6. Salin URL Web App yang dihasilkan.
7. Di aplikasi web Galen, klik tombol **Riwayat & Backend** di pojok kanan atas, lalu paste URL tersebut ke kolom Google Sheets dan klik **Simpan Pengaturan Backend**.

### 2. Integrasi Firebase Realtime Database
1. Buat project di [Firebase Console](https://console.firebase.google.com).
2. Buat **Realtime Database** (pilih lokasi Asia Tenggara / Singapore).
3. Salin URL Database Anda (contoh: `https://your-app-default-rtdb.asia-southeast1.firebasedatabase.app`).
4. Buka menu **Rules**, pastikan izin tulis aktif:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
5. Masukkan URL tersebut ke kolom Firebase di menu **Riwayat & Backend**.
