# Arsitektur Navigasi & Daftar Fitur: CrowdFlow (Desktop, Tablet, & Mobile)

Dokumen ini merangkum penyesuaian tata letak antarmuka (UI) CrowdFlow, dengan penambahan perilaku responsif khusus untuk perangkat Tablet (*Hamburger Menu*).

## 1. Arsitektur Navigasi Responsif (3 Breakpoints)

Platform beradaptasi secara otomatis berdasarkan ukuran layar perangkat pengguna menjadi tiga mode utama:

*   **Tampilan Desktop (Layar Besar):**
    Menggunakan **Sidebar Navigation** statis di sebelah kiri layar yang selalu terbuka. Mencakup menu lengkap dan tombol "Create Event".
*   **Tampilan Tablet (Layar Menengah / Tab):**
    Sidebar statis disembunyikan untuk memaksimalkan area konten. Sebagai gantinya, terdapat **Hamburger Menu** (ikon tiga garis horizontal ☰) di sudut kiri atas (kiri *Top Bar*). 
    *   *Interaksi:* Saat ikon Hamburger diklik, *Sidebar* akan muncul dari samping (Slide-out/Off-canvas menu) atau sebagai *dropdown* yang berisi daftar navigasi lengkap seperti di versi Desktop.
*   **Tampilan Mobile/HP (Layar Kecil):**
    Menggunakan **Bottom Navigation Bar** (Bilah Navigasi Bawah) yang menempel (fixed) di bagian bawah layar yang berisi maksimal 5-6 ikon menu esensial untuk akses jempol yang mudah.

---

## 2. Struktur Navigasi Tablet (Tab View)

### A. Top Bar (Header Navigasi Atas)
*   **Hamburger Menu Icon (☰)**: Berfungsi untuk membuka/menutup menu utama (Sidebar).
*   **Global Search Bar**: Kolom pencarian universal.
*   **System Status Badge**: Indikator status sistem (misal: *Operational*).
*   **Help & Notification Icons**: Pusat bantuan dan notifikasi (dengan *badge* angka).
*   **User Avatar**: Akses profil dan pengaturan.

### B. Slide-out Sidebar (Menu Hamburger)
Menu yang muncul saat ikon Hamburger ditekan, berisi:
*   Dashboard
*   Events
*   Orders
*   Attendees
*   Finance
*   Reports
*   Settings
*   *Tombol aksi*: "+ Create Event"

---

## 3. Struktur Navigasi Mobile (Tampilan HP)

### A. Bottom Navigation Bar (Bilah Bawah)
Menu utama yang menempel di bagian bawah layar (menggantikan Sidebar/Hamburger menu):
1.  **Home** (Ikon Grid)
2.  **Analytics** (Ikon Bar Chart)
3.  **Events** (Ikon Kalender)
4.  **Users** (Ikon Orang)
5.  **Finance** (Ikon Simbol Dolar)
6.  **Settings** (Ikon Pengaturan)

---

## 4. Rincian Fitur Halaman (Berdasarkan Pratinjau)

### A. Halaman Admin Dashboard (Mobile / Tablet View)
*   **Header Halaman**: Judul "Admin Dashboard" dengan deskripsi dan keterangan waktu pembaruan (Updated YYYY-MM-DD).
*   **Force Sync DB Button**: Tombol aksi untuk menyinkronkan basis data secara manual.
*   **Quick Metric Cards (Widget Data)**:
    *   **Total Users**: Metrik total pengguna dengan grafik *sparkline*.
    *   **Active Events**: Jumlah event yang sedang berjalan.
    *   **Tickets Sold**: Total tiket terjual.
    *   **Gross Sales**: Pendapatan kotor platform (dalam jutaan/M).
    *   **Verification Queue**: Antrean verifikasi yang butuh tindakan.
    *   **Active Resale**: Status aktivitas *resale* tiket.

### B. Halaman Attendees (Desktop / Tablet Content View)
*   **Top Bar Konteks**: Menampilkan nama portal, *Organization Switcher*, dan pembaruan data.
*   **Attendees List (Daftar Hadirin)**: 
    *   Kolom pencarian tamu (*Search guests...*).
    *   **Kartu Informasi Tamu (Guest Cards)**: Menampilkan nama, ID, Email, Telepon, Nama Event, dan Jenis Tiket (VIP/General).
    *   **Status Check-in**: *Badge* status (Checked-in / Registered).