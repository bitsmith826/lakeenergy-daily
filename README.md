# LakeEnergy Multi-Account Automation (Educational Purpose)

> ⚠️ **Disclaimer:** Proyek ini dibuat murni untuk tujuan edukasi (studi kasus integrasi API, otomasi HTTP berbasis Node.js native, pengelolaan token, dan perancangan antarmuka CLI yang rapi). Gunakan secara bertanggung jawab.

---

## 🌟 Fitur Utama
- **Zero Third-Party Dependency:** Menggunakan native `fetch` bawaan Node.js (v18+).
- **Token Caching Otomatis:** Token otorisasi (*Bearer token*) disimpan secara lokal setelah login pertama kali untuk memangkas jumlah request hingga 50% dan menghindari blokir rate-limiter.
- **Smart Rate-Limit Backoff:** Otomatis mendeteksi status throttle/429 (*Too Many Attempts*) dan melakukan cooldown retry.
- **Antarmuka CLI Presisi:** Tampilan real-time table dengan border simetris dan warna ANSI tanpa duplikasi baris.
- **Multi-Akun Support:** Mampu mengelola puluhan akun sekaligus secara terstruktur.

---

## 🚀 Panduan Memulai

### 1. Salin Konfigurasi Akun
Salin template [`accounts.example.json`](./accounts.example.json) menjadi `accounts.json`:
```bash
cp accounts.example.json accounts.json
```
Lalu sesuaikan data email, password, dan status akun Anda di `accounts.json`.

### 2. Jalankan Daily Check-in
Untuk menjalankan otomatisasi check-in seluruh akun:
```bash
npm start
```

### 3. Pendaftaran Akun Baru (Jika Ada)
Untuk akun yang statusnya `"registered": false`:
```bash
npm run register
```

---

## 📁 Struktur Proyek
- `index.js` : Runner utama untuk proses daily check-in multi-akun.
- `register.js` : Wizard pendaftaran akun baru dengan captcha.
- `api.js` : Modul pemanggilan REST API LakeEnergy (`login`, `checkIn`, `getCaptcha`, `register`).
- `ui.js` : Engine tampilan CLI (ANSI colors, kalkulasi visual width, dan border table).
- `accounts.example.json` : Template contoh struktur akun.
- `.gitignore` : Memastikan kredensial pribadi (`accounts.json`, `accounts.csv`, dll) tidak terunggah ke repositori publik.
