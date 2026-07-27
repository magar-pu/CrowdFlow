# Arsitektur & Logika Sistem: Dynamic QR Ticket (Offline PWA + TOTP)

Dokumen ini menjelaskan rancangan sistem tiket dinamis (*Dynamic QR*) berbasis web (PWA) yang menggunakan rotasi kode TOTP secara offline untuk mencegah calo dan kecurangan via tangkapan layar (*screenshot*).

---

## 1. Komponen yang Dibutuhkan

Sistem ini terbagi menjadi 3 bagian fungsional:

### A. Kebutuhan Backend (Server-Side)
Ini adalah "otak" pusat yang mengatur transaksi, menghasilkan kunci, dan melakukan validasi akhir.
*   **Database:** (MySQL, PostgreSQL, MongoDB, dsb.) untuk menyimpan data transaksi, User ID, Ticket ID, Event End Time, dan Secret Key.
*   **API Framework:** (Node.js/Express, Python/Django/FastAPI, Go, PHP/Laravel, dsb.) untuk membuat titik akhir (*endpoint*) API.
*   **TOTP Library:** Library di backend untuk memvalidasi kode yang dihasilkan oleh aplikasi scanner (misalnya `otplib` di Node.js atau `pyotp` di Python).
*   **Email Service Provider (SMTP/API):** (misal: SendGrid, Amazon SES, Mailgun, dsb.) untuk mengirimkan kode OTP secara otomatis ke alamat email pembeli.
*   **Server/Hosting:** Untuk menghosting API dan database.

### B. Kebutuhan Frontend (Client-Side / Web App)
Ini adalah antarmuka tiket yang dibuka oleh pembeli di HP mereka (tidak perlu install APK).
*   **HTML/CSS/JS (Vanilla atau Framework):** Bisa menggunakan React, Vue, Svelte, atau Vanilla JS murni.
*   **Web Cryptography API (SubtleCrypto):** Bawaan browser untuk enkripsi/dekripsi dan menyimpan kunci secara aman (*non-extractable*).
*   **IndexedDB (via library seperti `idb`):** Untuk menyimpan data tiket dan Secret Key terenkripsi agar aman dan bisa diakses *offline*.
*   **Service Worker API:** Bawaan browser untuk meng-cache file statis (HTML, CSS, JS, gambar) sehingga web tetap bisa dimuat sempurna tanpa internet (PWA).
*   **QR Code Library:** (misal `qrcode.js` atau `html5-qrcode`) untuk merender string karakter dari TOTP menjadi gambar matriks QR (biasanya di elemen `<canvas>`).

### C. Kebutuhan Alat Pemindai (Scanner App di Gate)
Aplikasi khusus (bisa berbasis web atau Android native) yang dipegang oleh petugas penjaga pintu masuk (*gate*).
*   **Kamera Scanner:** Harus memiliki kemampuan membaca QR code dengan sangat cepat.
*   **Koneksi Internet:** Pemindai *wajib* terhubung ke jaringan internet/intranet untuk mengecek validitas tiket ke server pusat secara *real-time*.

---

## 2. Alur Kerja Sistem (Workflow)

Logika sistem dibagi menjadi 4 fase utama, dari proses pembelian hingga penonton divalidasi di pintu masuk:

### Fase 1: Pembelian & Persiapan Tiket (Di Backend/Server)
1.  **User Membeli Tiket:** Transaksi pembayaran dinyatakan sukses. Pada tahap ini, pembeli **diwajibkan** mendaftarkan dan memverifikasi alamat email pribadi yang aktif.
2.  **Pembuatan Aset Tiket:** Backend membuat rekaman tiket di database yang berisi:
    *   **Ticket ID** unik (contoh: `TKT-ABC`).
    *   **Secret Key** yang sangat rahasia (string alfanumerik acak).
    *   Waktu kadaluarsa acara (`Event End Time`).
    *   Status tiket: `UNUSED`.
3.  **Pengiriman Link:** Sistem mengirimkan URL unik (mengandung parameter token) ke email pembeli (contoh: `https://tiket.anda.com/v/TKT-ABC`).

### Fase 2: Pengunduhan, Otentikasi Bergesekan Tinggi & Masuk ke Brankas (Di HP Penonton - ONLINE)
*Harus dilakukan saat penonton memiliki koneksi internet yang stabil.*
1.  **Akses Pertama & Tantangan OTP (*High-Friction Login*):** Saat URL diklik, halaman web tidak akan langsung menampilkan tiket. Sistem akan memaksa pengguna melakukan otentikasi dengan mengirimkan OTP secara eksklusif ke email pembeli yang terdaftar di Fase 1. Penggunaan kombinasi *password* statis ditiadakan untuk meminimalkan risiko pengambilalihan akun secara massal dan mudah oleh calo.
2.  **Sesi Permanen:** Setelah OTP dimasukkan dan valid, sistem menerbitkan sesi jangka panjang (*Long-lived JWT/Cookie*) di browser agar pengguna tidak perlu *login* lagi di hari H.
3.  **Service Worker Beraksi:** Web menyimpan file visual (logo, stylesheet) dan skrip (JavaScript) ke dalam *Cache Storage* browser.
4.  **Pertukaran Kunci & Keamanan SubtleCrypto:** 
    *   Frontend (yang sudah terotentikasi) melakukan request API ke `/api/ticket/TKT-ABC`.
    *   Server mengirimkan *Ticket ID*, *Event End Time*, dan *Secret Key* mentah.
    *   **Krusial:** JavaScript frontend *TIDAK* menyimpan kunci mentah. JS menggunakan **SubtleCrypto** untuk membungkus `Secret Key` menjadi objek `CryptoKey` dengan status `extractable: false`. Kunci ini sekarang aman untuk dipakai komputasi, namun string aslinya tidak bisa dibaca atau diekstrak oleh script apapun.
5.  **Penyimpanan Aman:** Objek `CryptoKey` dan detail tiket ditanam ke dalam **IndexedDB**.
6.  **Indikator Sukses:** Layar web menampilkan notifikasi: *"Tiket sudah diamankan. Halaman ini siap dibuka offline di lokasi acara."* (Sertakan juga peringatan agar pengguna tidak melakukan *Clear Data/Cache*).

### Fase 3: Hari H Acara (Di Lokasi - OFFLINE / Tanpa Sinyal)
*Kondisi di mana sinyal seluler hilang akibat padatnya penonton di venue.*
1.  **Buka Tiket Offline:** Penonton mengakses URL tiket atau membuka web dari *Home Screen*. Service Worker langsung melayani permintaan dari *cache*, halaman terbuka instan tanpa loading dari internet. Karena sesi PWA sudah tersimpan, halaman otentikasi dilewati (*bypass*).
2.  **Pengecekan Waktu (Self-Destruct Routine):**
    *   JavaScript membaca parameter `Event End Time` dari IndexedDB.
    *   Jika waktu HP melewati `Event End Time`, JS secara otomatis **menghapus bersih** (wipe) semua data dari IndexedDB dan Cache, lalu memunculkan notifikasi "Tiket Kadaluarsa".
3.  **Proses Rotasi QR (Looping TOTP):**
    *   Jika tiket belum kadaluarsa, JS memanggil `CryptoKey` dari IndexedDB.
    *   JS mengekstrak *Timestamp* dari waktu HP saat itu, lalu membaginya dalam interval (contoh: 15 detik).
    *   Menggunakan algoritma HMAC (via Web Crypto API), JS mengombinasikan interval Timestamp dengan CryptoKey untuk menghasilkan string acak sementara (misal: `987654`).
    *   JS menggabungkan identitas tiket dan string tersebut: `TKT-ABC|987654`.
    *   Library perender QR Code menggambar teks tersebut menjadi bentuk kotak-kotak visual.
    *   Skrip `setInterval()` akan mengulang perhitungan di atas setiap 15 detik. Akibatnya, gambar QR Code di layar pengguna akan terus berkedip mengganti polanya secara periodik (tanpa butuh koneksi server).

### Fase 4: Validasi di Gate (Di Aplikasi Pemindai)
1.  **Scan QR:** Penonton menyodorkan layar HP ke petugas. Kamera pemindai membaca QR dan mengekstrak teks: `TKT-ABC|987654`.
2.  **Kirim ke Server:** Alat pemindai melakukan request *HTTP POST* berisi string tadi ke API Server (`/api/validate-ticket`).
3.  **Server Memvalidasi:**
    *   Server mencari entitas `TKT-ABC` di database dan memeriksa apakah statusnya masih `UNUSED`.
    *   Server mengambil `Secret Key` asli milik tiket tersebut.
    *   Server menghitung nilai TOTP secara mandiri menggunakan jam mesin server.
    *   *(Toleransi Waktu):* Karena jam HP penonton bisa saja meleset, server mengecek kecocokan nilai `987654` dengan TOTP saat ini, atau 1-2 interval sebelumnya/sesudahnya (misal ± 30 detik).
4.  **Pemberian Akses:**
    *   Jika kode cocok dan tiket belum pernah dipakai: Server mengubah status tiket menjadi `USED`.
    *   Pemindai menampilkan layar hijau tanda validasi sukses (Penonton masuk). Identitas asli pembeli (seperti Nama atau NIK) dapat ditampilkan di layar pemindai untuk verifikasi acak dengan KTP asli jika diperlukan.
