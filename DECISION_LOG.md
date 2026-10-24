# DECISION LOG & CONFLICT DEFENSE
## Proyek ERP Rasa Aruna Kitchen (PT Rasa Aruna Bersama)
**Referensi Kebutuhan:** Dokumen Tugas *24SI1 - Group 03 - Food and Beverage.pdf*  
**Format Acuan:** Skenario Handout Halaman 3–6, 32–33

---

### Ringkasan Eksekutif
Dalam perancangan dan implementasi sistem ERP untuk PT Rasa Aruna Bersama, beberapa pemangku kepentingan (*stakeholders*) menyampaikan kebutuhan bisnis yang saling bertentangan secara langsung (*conflicting business rules*). Dokumen ini mencatat analisis ketegangan bisnis, opsi-opsi yang dipertimbangkan, keputusan final arsitektur sistem, pihak yang menerima kompromi (*trade-off*), langkah mitigasi, serta bukti pengujian otomatis yang memvalidasi keputusan tersebut.

---

### Matriks Keputusan Konflik Bisnis

| ID Konflik | Pasangan Aturan | Stakeholder Berkonflik | Opsi yang Dipertimbangkan | Keputusan Final | Pihak yang Menerima Trade-off & Mitigasi | Bukti Pengujian |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **D-01** | **SR-01 vs SR-02** | Maya Prasetyo (Pemilik) vs Reza Firdaus (Kepala Keuangan) | **Opsi A (SR-01):** Tagih 100% Sales Order saat Confirmed tanpa menunggu delivery.<br>**Opsi B (SR-02):** Tagih hanya barang yang berstatus Delivered valid. | **Opsi B (SR-02 / F-09)** diimplementasikan sebagai aturan penagihan utama. | **Maya Prasetyo (Pemilik)** menerima penundaan pengakuan piutang.<br>*Mitigasi:* Modul Customer Deposit (Akun 2030) dan pelacakan backorder yang transparan. | **T-19 & T-20** |
| **D-02** | **SR-03 vs SR-04** | Bagas Putra (Kepala Gerai POS) vs Sinta Maharani (Kepala Gudang) | **Opsi A (SR-03):** Izinkan POS menjual stok minus demi kelancaran antrean kasir.<br>**Opsi B (SR-04):** Blokir transaksi yang menyebabkan stok minus atau memakan stok reserved. | **Opsi B (SR-04 / F-07, F-16)** diimplementasikan secara ketat di backend. | **Bagas Putra (Kepala Gerai)** harus memantau stok gerai dan tidak bisa checkout jika stok habis.<br>*Mitigasi:* Fitur Internal Transfer instan (F-19) dari WH-JKT ke CAFE-JKT. | **T-12, T-14, T-28** |
| **D-03** | **SR-05 vs SR-06** | Arief Wicaksono (Manajer Pengadaan) vs Reza Firdaus (Kepala Keuangan) | **Opsi A (SR-05):** Tagihan vendor diposting penuh sesuai Purchase Order.<br>**Opsi B (SR-06):** Three-Way Matching: tagihan vendor maksimal sesuai kuantitas accepted penerimaan. | **Opsi B (SR-06 / F-12, F-13)** diimplementasikan melalui Three-Way Match Engine. | **Arief Wicaksono (Pengadaan)** tidak bisa langsung memproses tagihan sebelum GRN diinspeksi.<br>*Mitigasi:* SLA inspeksi gudang cepat dan GRNI interim account (1040). | **T-17, T-18, T-21, T-22** |
| **D-04** | **SR-07 vs SR-08** | Dini Anggraini (Manajer Penjualan) vs Maya Prasetyo (Pemilik) | **Opsi A (SR-07):** Sales bebas memberikan diskon 0–20% tanpa persetujuan tambahan.<br>**Opsi B (SR-08):** Diskon > 10% wajib persetujuan Owner; harga dikunci setelah SO Confirmed. | **Opsi B (SR-08 / F-06)** diimplementasikan pada alur persetujuan sales. | **Dini Anggraini (Sales)** kehilangan fleksibilitas instan untuk diskon di atas 10%.<br>*Mitigasi:* Workflow approval instan di dashboard Owner dan audit trail transparan. | **T-10** |

---

### Rincian Analisis Keputusan

#### 1. Keputusan D-01: Kebijakan Penagihan Pelanggan (SR-01 vs SR-02)
* **Deskripsi Konflik:**
  * Pemilik (*Maya Prasetyo*) menuntut agar arus kas tidak tertunda dengan segera menerbitkan invoice 100% saat Sales Order dikonfirmasi (`SR-01`).
  * Kepala Keuangan (*Reza Firdaus*) menolak menagih barang yang belum dikirim karena melanggar standar akuntansi, memicu komplain pelanggan, dan mengakibatkan sengketa pajak PBJT 10% (`SR-02`).
* **Analisis & Opsi:**
  * *Opsi A:* Menerbitkan faktur sebelum barang dikirim menghasilkan pengakuan pendapatan semu (*unearned revenue*) yang salah secara GAAP/PSAK dan mendistorsi kewajiban pajak restoran (PBJT).
  * *Opsi B:* Menagih berdasarkan kuantitas yang tervalidasi diterima pelanggan (*Delivery-based Invoicing*).
* **Keputusan Final:**
  * Sistem menerapkan **SR-02 (Delivery-based Invoicing)** pada modul `F-09`.
  * Penagihan terhadap kuantitas yang belum dikirim (misal order 8 unit, baru kirim 5 unit, mencoba tagih 8 unit) **diblokir secara ketat oleh sistem**.
* **Pihak Terdampak & Mitigasi:**
  * *Pemilik* harus menunggu surat jalan tervalidasi.
  * *Mitigasi:* Sistem menyediakan Akun Deposit Pelanggan (`2030 Customer Deposits`) jika bisnis membutuhkan uang muka / down payment sebelum pengiriman.
* **Bukti Pengujian:**
  * `T-19`: Penagihan 5 unit yang sudah dikirim berhasil diposting (Net Rp 240.000 + PBJT Rp 24.000 = Rp 264.000).
  * `T-20`: Percobaan menagih 8 unit saat baru dikirim 5 unit diblokir oleh backend dengan pesan validasi bisnis yang jelas.

---

#### 2. Keputusan D-02: Kebijakan Integritas Stok vs Kelancaran Kasir (SR-03 vs SR-04)
* **Deskripsi Konflik:**
  * Kepala Gerai (*Bagas Putra*) menginginkan antrean kasir tidak terhenti meskipun stok fisik di layar kasir habis/kurang (`SR-03`).
  * Kepala Gudang (*Sinta Maharani*) menuntut agar sistem tidak pernah mengizinkan stok minus atau memakan stok yang sudah direservasi untuk pesanan kantor (`SR-04`).
* **Analisis & Opsi:**
  * *Opsi A:* Membiarkan kasir menjual stok negatif merusak akurasi kartu persediaan, membuat COGS menjadi tidak terdefinisi, mengacaukan valuasi persediaan di buku besar, dan merusak reservasi pelanggan korporat (misal 6 unit pesanan `S00006`).
  * *Opsi B:* Memblokir seluruh transaksi yang menghasilkan stok fisik negatif di level database transaction lock.
* **Keputusan Final:**
  * Sistem memprioritaskan **SR-04 (Zero Negative Stock & Reserved Protection)** pada seluruh modul (`F-07`, `F-16`, `F-19`).
  * Kasir diblokir melakukan *checkout* jika stok produk di lokasi `CAFE-JKT` kurang dari kuantitas pembelian.
* **Pihak Terdampak & Mitigasi:**
  * *Kasir* tidak dapat memproses pesanan jika stok di sistem belum diperbarui.
  * *Mitigasi:* Disediakan alur **Internal Transfer Cepat (`F-19`)** dari `WH-JKT` ke `CAFE-JKT` yang dapat diproses dalam hitungan detik untuk menyelaraskan stok fisik dan sistem.
* **Bukti Pengujian:**
  * `T-12`: Percobaan pengiriman 38 unit dari WH saat sisa stok tersedia hanya 34 unit (40 on-hand minus 6 reserved) ditolak.
  * `T-14`: Percobaan transfer internal 28 unit dari WH saat on-hand hanya 25 unit ditolak.
  * `T-28`: Percobaan checkout POS 25 unit saat stok CAFE-JKT hanya 24 unit ditolak dengan peringatan *Zero Negative Stock*.

---

#### 3. Keputusan D-03: Three-Way Matching Tagihan Pemasok (SR-05 vs SR-06)
* **Deskripsi Konflik:**
  * Manajer Pengadaan (*Arief Wicaksono*) ingin langsung mem-posting tagihan vendor sebesar 100% nilai PO agar pembayaran tidak tertunda (`SR-05`).
  * Kepala Keuangan (*Reza Firdaus*) menolak keras membayar barang sebelum diinspeksi kualitasnya, dan hanya mengizinkan tagihan atas barang yang lolos inspeksi penerimaan (`SR-06`).
* **Analisis & Opsi:**
  * *Opsi A:* Mem-posting tagihan langsung dari PO tanpa inspeksi penerimaan berisiko tinggi membayarkan barang yang cacat, busuk, atau belum sampai, yang mengakibatkan kerugian finansial perusahaan.
  * *Opsi B:* Mengharuskan Three-Way Matching antara Purchase Order, Goods Receipt (Accepted Qty), dan Vendor Bill.
* **Keputusan Final:**
  * Sistem menerapkan **SR-06 (Three-Way Match Enforcement)** pada modul `F-12` dan `F-13`.
  * Vendor Bill hanya dapat dibuat maksimal sebesar kuantitas `Accepted` dari dokumen Goods Receipt yang berstatus `DONE`. Kuantitas `Rejected` tidak dapat ditagih.
* **Pihak Terdampak & Mitigasi:**
  * *Manajer Pengadaan* tidak dapat menjanjikan pembayaran instan kepada vendor sebelum tim gudang melakukan inspeksi.
  * *Mitigasi:* Gudang diberikan antarmuka penerimaan cepat dengan pemisahan field `Accepted` dan `Rejected` secara tegas, serta akun perantara `1040 GRNI / Stock Interim` yang mencatat kewajiban sementara secara otomatis.
* **Bukti Pengujian:**
  * `T-17`: Penerimaan 10 unit PO dengan 8 accepted dan 2 rejected mencatat persediaan dan GRNI hanya untuk 8 unit (Rp 96.000).
  * `T-18`: Upaya penagihan Vendor Bill sebesar 10 unit ditolak oleh Three-Way Match Engine karena melebihi kuantitas accepted (8 unit).
  * `T-21`: Penagihan 8 unit accepted berhasil diposting dan menghapus saldo interim GRNI menjadi Rp 0.
  * `T-22`: Upaya mem-posting tagihan ganda untuk unit yang sama diblokir (*Idempotent control*).

---

#### 4. Keputusan D-04: Kontrol Margin Diskon dan Penguncian Harga (SR-07 vs SR-08)
* **Deskripsi Konflik:**
  * Manajer Penjualan (*Dini Anggraini*) meminta kebebasan memberikan diskon hingga 20% untuk memenangkan kontrak korporat besar tanpa persetujuan tambahan (`SR-07`).
  * Pemilik (*Maya Prasetyo*) menuntut margin laba dilindungi dengan membatasi diskon di atas 10% harus melalui persetujuan tertulis Pemilik, serta harga dikunci setelah SO dikonfirmasi (`SR-08`).
* **Analisis & Opsi:**
  * *Opsi A:* Diskon 20% tanpa batas dapat menurunkan margin kotor di bawah biaya operasional dan biaya PBJT restoran.
  * *Opsi B:* Batas wewenang diskon bertingkat (Sales: maks 10%; > 10% butuh approval Owner).
* **Keputusan Final:**
  * Sistem menerapkan **SR-08 (Discount Approval & Post-Confirmation Price Lock)** pada modul `F-05` dan `F-06`.
  * Quotation dengan diskon di atas 10% tidak dapat dikonfirmasi oleh role SALES sebelum kolom `discountApproved` disetujui oleh role OWNER.
  * Setelah Sales Order berstatus `CONFIRMED`, harga satuan dan diskon dikunci secara permanen.
* **Pihak Terdampak & Mitigasi:**
  * *Tim Penjualan* memerlukan waktu tunggu untuk persetujuan penawaran di atas 10%.
  * *Mitigasi:* Tombol persetujuan diskon instan (*One-Click Owner Approval*) tersedia langsung di formulir dokumen penjualan dan notifikasi status tercatat di Log Notes.
* **Bukti Pengujian:**
  * `T-10`: Sales mencoba mengonfirmasi penawaran dengan diskon 20% ditolak sistem; setelah Owner menyetujui, SO berhasil dikonfirmasi; percobaan mengubah harga pasca-konfirmasi ditolak oleh mekanisme *Price Lock*.

---

#### 5. Keputusan D-05: Penanganan Anomali Rekonsiliasi Persediaan (SR-20 / T-32)
* **Deskripsi Masalah:**
  * Pada dashboard rekonsiliasi keuangan (`F-21`), jika terdeteksi selisih antara stok fisik gudang dengan saldo akun buku besar 1030 (misal selisih simulasi 1 unit), timbul pertanyaan apakah sistem boleh secara otomatis mem-posting jurnal penyesuaian (*auto-adjust*) agar laporan keuangan terlihat seimbang.
* **Keputusan Final:**
  * Berdasarkan **SR-20**, sistem **DILARANG KERAS** mem-posting jurnal siluman/artifisial secara otomatis untuk menutupi selisih.
  * Sistem wajib mempertahankan status `MISMATCH`, menampilkan banner peringatan audit mencolok, menyajikan jejak audit dokumen sumber (*Audit Source Trail*), dan mengunci opsi penyesuaian otomatis (`autoPostBlocked = true`).
  * Selisih hanya boleh diselesaikan melalui dokumen fisik *Stock Opname / Inventory Adjustment* resmi yang disetujui oleh Owner dan tercatat di audit trail.
* **Bukti Pengujian:**
  * `T-32`: Saat simulasi selisih +1 unit dieksekusi, sistem mendeteksi status `MISMATCH`, memunculkan peringatan rekonsiliasi, memblokir auto-posting, dan membuktikan jumlah jurnal di database tetap konstan (tidak ada jurnal palsu).
