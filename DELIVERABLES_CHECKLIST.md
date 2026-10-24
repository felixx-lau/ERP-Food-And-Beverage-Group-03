# CHECKLIST DOKUMEN & PANDUAN PENGUMPULAN
## Proyek ERP Rasa Aruna Kitchen (PT Rasa Aruna Bersama)
**Referensi:** Dokumen Tugas *24SI1 - Group 03 - Food and Beverage.pdf* (Halaman 31–34)  
**Format Penamaan File:** `GroupXX_Class_FnB_ItemName` (Contoh: `Group03_24SI1_FnB_TestResults.pdf`)

---

### 1. Status Kelengkapan Paket Penyerahan (Halaman 32 PDF)

| Komponen Paket | Deskripsi Persyaratan PDF | Status Kelengkapan | Lokasi Berkas / Keterangan |
| :--- | :--- | :---: | :--- |
| **Aplikasi Berfungsi** | Web application aktif dengan data persisten setelah refresh, 6 akun uji sesuai role, baseline seed terpasang. | **SIAP (Lokal)** / *Pending Deploy Publik* | Berjalan di lingkungan lokal (`npm run dev` / `npm start`). Deployment URL publik perlu di-host oleh mahasiswa ke Vercel/Railway sesuai batasan privasi tugas. |
| **Source Code Repository** | Repositori bersih berisi source code lengkap, dokumentasi, script pengujian, dan riwayat commit. | **LENGKAP** | Repositori git lokal terstruktur rapi dengan seluruh implementasi dan test suite. |
| **README Proyek** | Panduan instalasi, konfigurasi, cara menjalankan aplikasi, panduan akun uji, dan catatan AI-tool usage. | **TERSEDIA** | `README.md` |
| **Decision Log** | Dokumentasi resolusi seluruh konflik aturan bisnis (SR-xx) dengan opsi, keputusan, trade-off, dan bukti. | **TERSEDIA** | `DECISION_LOG.md` |
| **Test Results** | Hasil pengujian tiap T-xx (Given/When/Then, expected vs actual, status Pass/Fail, bukti pengujian). | **TERSEDIA** | `TEST_RESULTS.md` |
| **AI Tool Usage Note** | Pengungkapan alat AI yang digunakan, peran AI dalam coding, dan telaah verifikasi manusia. | **TERSEDIA** | Tercakup di dalam `README.md` bagian AI Disclosure. |
| **Role Assignment & Team Agreement** | Matriks peran tim (M1–M4), modul ownership, dan aturan kerja kelompok. | **TERSEDIA** | Tercakup di dalam `README.md`. |
| **Screenshot Bukti Uji (S-01 s.d. S-16)** | Tangkapan layar antarmuka dari 16 wireframe dan skenario pengujian T-01 s.d. T-32. | **PERLU DIAMBIL MANUAL OLEH MAHASISWA** | Panduan daftar screenshot terinci pada Bagian 2 di bawah. |
| **Video Demonstrasi (≤ 10 Menit)** | Video rekaman demonstrasi dua alur end-to-end dan penanganan aturan SR-xx. | **PERLU DIREKAM MANUAL OLEH MAHASISWA** | Panduan naskah dan alur video terinci pada Bagian 3 di bawah. |
| **Slide Presentasi (15 Menit + 10 Menit Q&A)** | Slide presentasi berisi konteks bisnis, dampak, solusi modul, Decision Defense, dan rekomendasi. | **PERLU DISIAPKAN MANUAL OLEH MAHASISWA** | Panduan struktur slide terinci pada Bagian 4 di bawah. |

---

### 2. Daftar Screenshot yang Diwajibkan PDF (S-01 sampai S-16)

Untuk melengkapi laporan tugas, mahasiswa perlu mengambil tangkapan layar (*screenshot*) dari browser saat aplikasi berjalan (`http://localhost:3000`):

| No. Wireframe | Halaman Aplikasi | Skenario yang Perlu Ditangkap Layar | Test Terkait | Keterangan Elemen Penting |
| :---: | :--- | :--- | :---: | :--- |
| **S-01** | `/` (Beranda) | 1. Tampilan Home dengan 8 tombol navigasi modul saat login sebagai `OWNER`.<br>2. Modal penolakan akses saat `CASHIER` mencoba klik General Ledger.<br>3. Drawer Audit Trail yang mencatat event penolakan akses. | `T-01`, `T-02` | Tampilkan identitas PT Rasa Aruna Bersama dan role badge. |
| **S-02** | `/sales/contacts` | 1. Kartu kontak C01 & C02 dengan rincian credit limit, open AR, dan headroom.<br>2. Pesan validasi error saat order C02 melebihi headroom Rp 50.000. | `T-03`, `T-04` | Perlihatkan status headroom Rp 50.000 terlindungi. |
| **S-03** | `/inventory/products` | 1. Formulir produk RICE-CHICK-S dengan stok terpisah WH (40) dan CAFE (12).<br>2. Perubahan stok varian Hot yang tidak mempengaruhi varian Iced. | `T-05`, `T-06` | Bukti independensi SKU varian. |
| **S-04** | `/crm/leads` | 1. Papan Kanban CRM dengan lead LD0003 di tahap Qualified (Rp 1.200.000).<br>2. Validasi penolakan pemindahan lead tanpa nilai ke Proposition. | `T-07`, `T-08` | Bukti validasi data minimum CRM. |
| **S-05** | `/sales/orders` | 1. Sales Order S00007 (Net Rp 316.000 + PBJT Rp 31.600 = Gross Rp 347.600).<br>2. Dialog approval diskon 20% oleh Owner dan status Price Lock. | `T-09`, `T-10` | Bukti badge "Price Locked" pasca-konfirmasi. |
| **S-06** | `/inventory/delivery` | 1. Validasi surat jalan 5 unit dan Backorder otomatis 3 unit (`WH/OUT/0010`).<br>2. Penolakan pengiriman 38 unit saat stok tersedia hanya 34. | `T-11`, `T-12` | Bukti stok tidak pernah bernilai negatif. |
| **S-07** | `/inventory/transfers` | 1. Dokumen Internal Transfer 4 unit dari WH-JKT ke CAFE-JKT.<br>2. Penolakan transfer saat kuantitas melebihi stok on-hand gudang. | `T-13`, `T-14` | Bukti total persediaan perusahaan tetap 43 unit. |
| **S-08** | `/purchase/orders` | 1. Purchase Order P00007 berstatus Confirmed senilai Rp 120.000 (Tax 0%).<br>2. Konfirmasi ulang PO yang membuktikan tidak ada dokumen duplikat. | `T-15`, `T-16` | Bukti komitmen pengadaan tanpa menambah stok fisik. |
| **S-09** | `/inventory/receipts` | 1. Dokumen Goods Receipt WH/IN/0007 dengan 8 Accepted dan 2 Rejected.<br>2. Jurnal persediaan Dr 1030 Rp 96.000 = Cr 1040 GRNI Rp 96.000. | `T-17`, `T-18` | Bukti barang ditolak tidak menambah persediaan. |
| **S-10** | `/accounting/invoices` | 1. Customer Invoice INV/2026/0007 untuk 5 unit terkirim (Gross Rp 264.000).<br>2. Penolakan penagihan 8 unit saat barang baru dikirim 5 unit. | `T-19`, `T-20` | Bukti Delivery-based invoicing & PBJT 10%. |
| **S-11** | `/accounting/vendor-bills` | 1. Vendor Bill BILL/2026/0007 senilai Rp 96.000 dan clearing akun GRNI ke Rp 0.<br>2. Penolakan penagihan duplikat untuk unit yang sama. | `T-21`, `T-22` | Bukti Three-Way Matching valid. |
| **S-12** | `/accounting/payments` | 1. Formulir Register Payment parsial Rp 100.000 (Sisa outstanding Rp 164.000).<br>2. Penolakan pembayaran berlebih (Rp 300.000 > Rp 264.000). | `T-23`, `T-24` | Bukti Overpayment guard aktif. |
| **S-13** | `/accounting/journal-entries`| 1. Daftar jurnal umum dengan saldo Debit = Kredit (Rp 394.000).<br>2. Jurnal pengakuan COGS saat delivery (Dr 5010 COGS, Cr 1030 Stock). | `T-25`, `T-26` | Bukti prinsip pembukuan berpasangan seimbang. |
| **S-14** | `/pos` | 1. Layar kasir POS dengan basket pesanan dan struk pembayaran QRIS.<br>2. Penolakan order kasir saat kuantitas melebihi stok CAFE-JKT.<br>3. Penutupan sesi POS01 dengan ringkasan penjualan kasir. | `T-27`, `T-28` | Bukti integrasi POS ke stok, pajak, dan kas. |
| **S-15** | `/inventory/returns` | 1. Pengajuan retur dengan status inspeksi `ACCEPTED` dan Credit Note terbit.<br>2. Penolakan restok barang retur jika status inspeksi masih `PENDING`. | `T-29`, `T-30` | Bukti kontrol kualitas retur barang. |
| **S-16** | `/dashboard` | 1. Dashboard operasional dengan 8 kartu KPI cocok dengan baseline seed.<br>2. Simulasi selisih +1 unit yang menampilkan banner peringatan `MISMATCH` dan pemblokiran auto-post (`autoPostBlocked = true`). | `T-31`, `T-32` | Bukti kepatuhan SR-20 dan rekonsiliasi GL. |

---

### 3. Panduan Naskah & Alur Video Demonstrasi (Maksimal 10 Menit)

Struktur demonstrasi video yang direkomendasikan sesuai Halaman 32–33 PDF:
1. **Menit 0:00 – 1:30 | Pendahuluan & Identitas Perusahaan:**
   * Tunjukkan profil PT Rasa Aruna Bersama, 2 lokasi internal (WH-JKT dan CAFE-JKT), dan login menggunakan role `OWNER`.
   * Tunjukkan 8 modul aktif pada App Switcher.
   * Demonstrasikan restriksi kasir saat login sebagai `CASHIER` mencoba mengakses General Ledger (T-02).
2. **Menit 1:30 – 4:30 | Alur 1: Order to Cash & Kontrol Bisnis:**
   * Tunjukkan Master Produk 15 SKU dan independensi varian Hot vs Iced (T-05, T-06).
   * Tunjukkan kontak C01 & C02 serta penolakan order C02 yang melebihi credit headroom (T-04).
   * Buat Quotation untuk C01, demonstrasikan approval diskon > 10% oleh Owner, lalu konfirmasi menjadi Sales Order (T-09, T-10).
   * Proses Delivery Order 5 dari 8 unit di Gudang; tunjukkan pembentukan Backorder 3 unit secara otomatis dan pengakuan COGS (T-11).
   * Buka modul Invoicing; buktikan sistem menolak penagihan 8 unit (T-20) dan hanya mengizinkan penagihan 5 unit terkirim dengan pajak PBJT 10% (T-19).
   * Lakukan pembayaran parsial Rp 100.000 dan tunjukkan penolakan pembayaran berlebih (T-23, T-24).
3. **Menit 4:30 – 7:00 | Alur 2: Procure to Pay & Three-Way Match:**
   * Buat RFQ dan konfirmasi PO untuk vendor V03 (T-15).
   * Terima barang di Gudang dengan pemisahan 8 Accepted dan 2 Rejected; tunjukkan hanya 8 unit yang masuk stok dan jurnal GRNI (T-17).
   * Buat Vendor Bill; demonstrasikan Three-Way Match menolak penagihan 10 unit (T-18) dan hanya mengizinkan 8 unit (T-21) serta clearing GRNI.
4. **Menit 7:00 – 8:30 | Alur Khusus: Point of Sale, Retur & Internal Transfer:**
   * Buka sesi POS01 di CAFE-JKT; proses transaksi takeaway dengan QRIS; tunjukkan pengurangan stok gerai seketika (T-27).
   * Uji coba checkout melebihi stok CAFE-JKT untuk membuktikan anti-stok negatif (T-28).
   * Lakukan Internal Transfer 4 unit dari WH-JKT ke CAFE-JKT (T-13).
   * Ajukan retur penjualan dengan inspeksi kualitas; buktikan restok dan credit note hanya terbit jika inspeksi `ACCEPTED` (T-29, T-30).
5. **Menit 8:30 – 10:00 | Dashboard Rekonsiliasi & Penutup:**
   * Buka `/dashboard`; tunjukkan kesesuaian 8 KPI operasional langsung dari database persisten (T-31).
   * Klik tombol simulasi selisih +1 unit; tunjukkan banner peringatan `MISMATCH` dan bukti sistem menolak auto-posting jurnal palsu demi memenuhi SR-20 (T-32).

---

### 4. Struktur Slide Presentasi (15 Menit + 10 Menit Tanya Jawab)

Susunan slide wajib mengacu pada tabel urutan Halaman 32–33 PDF:
* **Slide 1–2 (±2 menit):** Konteks & Masalah Bisnis (Profil PT Rasa Aruna Bersama, masalah pencatatan spreadsheet manual, reservasi bentrok, ketegangan antar-stakeholder).
* **Slide 3–4 (±2 menit):** Dampak Bisnis Jika Diabaikan (Risiko kerugian stok minus, denda pajak PBJT akibat penagihan salah, kegagalan rekonsiliasi kas dan GRNI).
* **Slide 5–7 (±2 menit):** Arsitektur Solusi & Peta Modul (Diagram modul O2C, P2P, POS, Accounting, skema database terintegrasi, dan live system overview).
* **Slide 8–11 (±5 menit):** **Decision Defense Inti:**
  * Konflik D-01 (SR-01 vs SR-02: Delivery-based invoicing).
  * Konflik D-02 (SR-03 vs SR-04: Zero Negative Stock).
  * Konflik D-03 (SR-05 vs SR-06: Three-Way Matching).
  * Konflik D-04 (SR-07 vs SR-08: Margin Diskon & Price Lock).
  * Pemaparan pihak yang dirugikan, kompromi, langkah mitigasi, dan bukti pengujian T-xx.
* **Slide 12 (±1 menit):** Hasil Pengujian, Triase Cacat (*Defect Log*), & Refleksi AI:
  * Paparkan hasil 112 assertions lulus 100%.
  * Jelaskan satu contoh jebakan logika AI (*AI-generated trap*) yang sempat terjadi (misal: AI sempat mencoba mem-bypass kredit atau membuat auto-adjust rekonsiliasi) dan bagaimana tim mendeteksi serta memperbaikinya.
* **Slide 13–14 (±3 menit):** Rekomendasi Masa Depan (*Future Roadmap*):
  * Matriks prioritas Now / Next / Later.
  * Fitur Digital Loyalty (F-23), integrasi payment gateway QRIS dinamis, dan peramalan kebutuhan stok gerai.
* **Slide 15 (±10 menit):** Sesi Tanya Jawab (Q&A) & Defense Individu setiap anggota tim atas modul yang dipegang.
