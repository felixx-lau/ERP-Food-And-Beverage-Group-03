# TEST RESULTS REGISTER (T-01 s.d. T-32)
## Sistem ERP PT Rasa Aruna Bersama (Rasa Aruna Kitchen)
**Referensi Skenario:** Dokumen Tugas *24SI1 - Group 03 - Food and Beverage.pdf*  
**Metodologi Pengujian:** Otomasi Pengujian Backend & Transaksi Database Persisten (Zero Mock)  
**Status Hasil Akhir:** **32 / 32 Test Cases PASSED (100% SUCCESS)**

---

### Ringkasan Eksekutif Hasil Pengujian

| Kelompok Modul | Rentang Test Case | Total Pengujian | Status Lulus | Status Gagal |
| :--- | :--- | :---: | :---: | :---: |
| **Pondasi, RBAC & Home Switcher** | `T-01`, `T-02` | 2 | 2 | 0 |
| **Order to Cash: Contacts & Credit** | `T-03`, `T-04` | 2 | 2 | 0 |
| **Products & SKU Variants** | `T-05`, `T-06` | 2 | 2 | 0 |
| **CRM Pipeline** | `T-07`, `T-08` | 2 | 2 | 0 |
| **Sales Quotation & Order** | `T-09`, `T-10` | 2 | 2 | 0 |
| **Delivery & Backorder** | `T-11`, `T-12` | 2 | 2 | 0 |
| **Internal Stock Transfer** | `T-13`, `T-14` | 2 | 2 | 0 |
| **Procure to Pay (PO, GRN, 3-Way Match)** | `T-15`, `T-16`, `T-17`, `T-18`, `T-21`, `T-22` | 6 | 6 | 0 |
| **Customer Invoicing & PBJT 10%** | `T-19`, `T-20` | 2 | 2 | 0 |
| **Payments & Overpayment Guard** | `T-23`, `T-24` | 2 | 2 | 0 |
| **General Ledger & COGS** | `T-25`, `T-26` | 2 | 2 | 0 |
| **Point of Sale & Session Closing** | `T-27`, `T-28` | 2 | 2 | 0 |
| **Return & Credit Note** | `T-29`, `T-30` | 2 | 2 | 0 |
| **Dashboard Operasional & Rekonsiliasi** | `T-31`, `T-32` | 2 | 2 | 0 |
| **TOTAL KESELURUHAN** | **T-01 s.d. T-32** | **32** | **32 (100%)** | **0** |

---

### Tabel Rincian Bukti Pengujian T-01 sampai T-32

#### T-01: Navigasi Home & Otorisasi Pemilik (F-01 / Wireframe S-01)
* **Kriteria (Given / When / Then):**
  * *Given:* Role `OWNER` (Maya Prasetyo) login aktif; baseline dataset terpasang.
  * *When:* Halaman beranda dimuat.
  * *Then:* Tampil 8 titik navigasi lengkap (Sales, CRM, Purchase, Inventory, Accounting, Invoicing, Point of Sale, Dashboard) dan identitas perusahaan PT Rasa Aruna Bersama.
* **Expected Result:** Owner memiliki akses penuh ke 8 modul aplikasi tanpa batasan.
* **Actual Result:** 8 titik navigasi aktif dan terhubung; identitas perusahaan "PT Rasa Aruna Bersama" muncul pada header dan profil.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase2_3.ts` (Assert: `T-01`).

#### T-02: Batasan Otorisasi Kasir ke General Ledger (SR-15 / F-01, F-21 / Wireframe S-01)
* **Kriteria (Given / When / Then):**
  * *Given:* Role `CASHIER` (Bagas Putra) login aktif.
  * *When:* Meminta akses ke modul General Ledger / Accounting.
  * *Then:* Akses ditolak di level backend (`HTTP 403 Forbidden`) dan event penolakan terekam di Audit Trail.
* **Expected Result:** Kasir diblokir membuka buku besar dan audit log mencatat pelanggaran hak akses.
* **Actual Result:** Backend RBAC mengembalikan error 403; tabel `AuditLog` mencatat record penolakan dengan actor: Bagas Putra, role: CASHIER, action: ACCESS_DENIED.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase2_3.ts` (Assert: `T-02`, `T-02-A`).

#### T-03: Formulir Kontak & Evaluasi Credit Exposure Normal (F-02, F-10 / Wireframe S-02)
* **Kriteria (Given / When / Then):**
  * *Given:* Kontak C01 (PT Saji Kantor Sejahtera) dan C02 (CV Tumbuh Bersama) dibuka pada baseline seed.
  * *When:* Detail kredit dan piutang diperiksa.
  * *Then:* Headroom kredit dihitung akurat dari credit limit dikurangi piutang berjalan.
* **Expected Result:**
  * C01: Limit Rp 3.000.000, Piutang Rp 1.200.000, Sisa Headroom Rp 1.800.000.
  * C02: Limit Rp 350.000, Piutang Rp 300.000, Sisa Headroom Rp 50.000.
* **Actual Result:** Data terhitung tepat: C01 headroom Rp 1.800.000; C02 headroom Rp 50.000.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-03-C01`, `T-03-C02`).

#### T-04: Kontrol Batas Kredit Pelanggan / Over-Credit Guard (SR-09 / F-02, F-10 / Wireframe S-02)
* **Kriteria (Given / When / Then):**
  * *Given:* Pelanggan C02 memiliki sisa headroom Rp 50.000.
  * *When:* Dibuat pesanan baru 2 × RICE-CHICK-S dengan nilai gross Rp 105.600 (melebihi headroom).
  * *Then:* Sistem menolak konfirmasi pesanan dan saldo kredit C02 tetap terlindungi.
* **Expected Result:** Konfirmasi order diblokir karena defisit kredit Rp 55.600.
* **Actual Result:** Sistem mengembalikan pesan validasi "Batas Kredit Terlampaui (SR-09 / T-04)"; pesanan tetap Draft; headroom C02 tetap Rp 50.000.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-04`, `T-04-VERIFY`, `T-04-HEADROOM`).

#### T-05: Master Produk & Pemisahan Stok Multi-Lokasi (F-03 / Wireframe S-03)
* **Kriteria (Given / When / Then):**
  * *Given:* SKU `RICE-CHICK-S` dibuka pada baseline seed.
  * *When:* Data harga, biaya, dan stok diperiksa.
  * *Then:* Stok gudang (WH-JKT) dan gerai (CAFE-JKT) terpisah secara eksplisit.
* **Expected Result:** Harga jual Rp 48.000; Standard Cost Rp 26.000; WH-JKT On-Hand 40, Reserved 6, Available 34; CAFE-JKT On-Hand 12, Available 12; Total Perusahaan 52 unit.
* **Actual Result:** Seluruh parameter cocok 100% dengan skenario tugas.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-05`).

#### T-06: Independensi Varian SKU (SR-17 / F-03 / Wireframe S-03)
* **Kriteria (Given / When / Then):**
  * *Given:* SKU varian `COF-LATT-HOT` dan `COF-LATT-ICE` memiliki kode unik masing-masing.
  * *When:* Stok varian Hot diubah (dari 20 menjadi 25 unit).
  * *Then:* Stok varian Iced tetap konstan (25 unit) tanpa terpengaruh.
* **Expected Result:** Modifikasi varian tidak saling menimpa atau teragregasi otomatis.
* **Actual Result:** Stok Hot bertambah menjadi 25, sedangkan stok Iced tetap utuh di 25 unit.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-06`, `T-06-BEFORE`).

#### T-07: Prospek CRM Baseline (F-04 / Wireframe S-04)
* **Kriteria (Given / When / Then):**
  * *Given:* Lead `LD0003` dimuat pada baseline seed.
  * *When:* Papan Kanban CRM dibuka.
  * *Then:* Lead berada di kolom *Qualified* bernilai Rp 1.200.000 tertaut ke kontak C03 (Klinik Harmoni).
* **Expected Result:** Lead LD0003 terlihat di tahap Qualified dengan estimasi omset Rp 1.200.000.
* **Actual Result:** Data lead sesuai: ID `LD0003`, stage `QUALIFIED`, expected revenue Rp 1.200.000.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-07`).

#### T-08: Validasi Data Minimum Pemindahan Tahap CRM (SR-16 / F-04 / Wireframe S-04)
* **Kriteria (Given / When / Then):**
  * *Given:* Dibuat lead baru tanpa nilai peluang / pelanggan.
  * *When:* Mencoba memindahkan lead ke tahap *Proposition*.
  * *Then:* Sistem memblokir pemindahan dan mewajibkan data minimum terisi.
* **Expected Result:** Pemindahan tahap diblokir oleh validasi SR-16.
* **Actual Result:** Sistem mengembalikan validasi error: "Validasi CRM Gagal (SR-16 / T-08): Pemindahan ke Proposition mewajibkan pengisian estimasi omset dan kontak pelanggan."
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-08`).

#### T-09: Alur Penawaran ke Sales Order Normal (F-05, F-06, F-10 / Wireframe S-05)
* **Kriteria (Given / When / Then):**
  * *Given:* Quotation untuk pelanggan C01 berisi 4 × RICE-CHICK-S dan 2 × RICE-CHICK-L tanpa diskon.
  * *When:* Penawaran dikonfirmasi menjadi Sales Order.
  * *Then:* Terbentuk nomor dokumen unik, line totals terhitung tepat, PBJT 10% dihitung dari net, dan credit exposure diperbarui.
* **Expected Result:** Net Rp 316.000, PBJT Rp 31.600, Gross Rp 347.600; Projected Cost Rp 172.000; Exposure C01 menjadi Rp 1.547.600, Headroom Rp 1.452.400.
* **Actual Result:** Seluruh kalkulasi finansial dan eksposur pelanggan sesuai ekspektasi.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-09`, `T-09-CALC`, `T-09-CONFIRM`).

#### T-10: Persetujuan Diskon > 10% & Penguncian Harga (SR-07, SR-08 / F-05, F-06 / Wireframe S-05)
* **Kriteria (Given / When / Then):**
  * *Given:* Penawaran dengan diskon 20% (Net Rp 76.800, PBJT Rp 7.680).
  * *When:* Sales mencoba mengonfirmasi tanpa persetujuan Owner.
  * *Then:* Konfirmasi ditolak; setelah Owner menyetujui, SO terkonfirmasi dan harga terkunci permanen.
* **Expected Result:** Diskon 20% memerlukan approval Owner; pengeditan harga pasca-konfirmasi ditolak.
* **Actual Result:** Konfirmasi awal diblokir; disetujui Owner; SO Confirmed; percobaan edit harga pasca-konfirmasi ditolak oleh aturan *Price Lock*.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-10`, `T-10-BLOCKED`, `T-10-APPROVED`, `T-10-LOCKED`).

#### T-11: Pengiriman Sebagian & Pembentukan Backorder (SR-04, SR-10 / F-07, F-08 / Wireframe S-06)
* **Kriteria (Given / When / Then):**
  * *Given:* Sales Order 8 unit RICE-CHICK-S dikonfirmasi di WH-JKT.
  * *When:* Surat jalan memproses pengiriman sebagian (5 unit).
  * *Then:* Terbentuk Backorder otomatis untuk sisa 3 unit; stok on-hand gudang berkurang 5 unit; COGS diakui Rp 130.000; nilai penagihan yang berhak adalah net Rp 240.000 + PBJT Rp 24.000 = Rp 264.000.
* **Expected Result:** On-hand WH turun dari 40 menjadi 35; Backorder 3 unit; COGS diakui Rp 130.000.
* **Actual Result:** Backorder terbentuk dengan nomor `WH/OUT/0010`; stok on-hand 35; COGS Rp 130.000.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-11-DO`, `T-11-BACKORDER`, `T-11-FINANCIAL`, `T-11-STOCK`).

#### T-12: Proteksi Stok Negatif & Stok Direservasi (SR-04 / F-07, F-08 / Wireframe S-06)
* **Kriteria (Given / When / Then):**
  * *Given:* Lokasi WH-JKT memiliki stok on-hand 35 unit, di mana 6 unit telah direservasi untuk pesanan lain.
  * *When:* Mencoba melakukan pengiriman 38 unit (melebihi stok fisik dan stok tersedia).
  * *Then:* Sistem memblokir pengiriman dan mencegah stok negatif.
* **Expected Result:** Pengiriman dibatalkan; stok tidak boleh bernilai minus.
* **Actual Result:** Sistem mengembalikan pesan: "Validasi Gagal (SR-04 / T-12): Kuantitas pengiriman (38) melebihi stok fisik On-Hand (35). Stok negatif dilarang."
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase4.ts` (Assert: `T-12`, `T-12-VERIFY`).

#### T-13: Transfer Stok Antar-Lokasi Normal (SR-12 / F-19 / Wireframe S-07)
* **Kriteria (Given / When / Then):**
  * *Given:* Stok COF-LATT-ICE awal di WH-JKT = 25 unit dan CAFE-JKT = 18 unit.
  * *When:* Dilakukan transfer internal 4 unit dari WH-JKT ke CAFE-JKT.
  * *Then:* Stok WH turun 25→21, stok CAFE naik 18→22, total unit perusahaan tetap 43, nilai persediaan perusahaan konstan.
* **Expected Result:** Stok berpindah lokasi secara seimbang tanpa mengubah nilai agregat perusahaan.
* **Actual Result:** WH-JKT: 21 unit, CAFE-JKT: 22 unit; total stok perusahaan konstan pada 43 unit; nilai transfer tercatat Rp 52.000.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase7.ts` (Assert: `T-13`, `T-13-BASELINE`, `T-13-DRAFT`).

#### T-14: Penolakan Transfer Melebihi Stok Tersedia (SR-04, SR-12 / F-19 / Wireframe S-07)
* **Kriteria (Given / When / Then):**
  * *Given:* Stok on-hand WH-JKT adalah 21 unit.
  * *When:* Mencoba transfer 28 unit ke CAFE-JKT.
  * *Then:* Sistem menolak transfer dan mempertahankan stok lokasi asal.
* **Expected Result:** Transfer dibatalkan karena kuantitas melebihi ketersediaan.
* **Actual Result:** Transfer ditolak dengan pesan: "Validasi Transfer Gagal (SR-04 / SR-12 / T-14): Kuantitas transfer (28) melebihi stok yang tersedia (21)."; stok WH tetap utuh di 21 unit.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase7.ts` (Assert: `T-14`, `T-14-VERIFY`).

#### T-15: Pembuatan RFQ & Konfirmasi Purchase Order (F-11 / Wireframe S-08)
* **Kriteria (Given / When / Then):**
  * *Given:* RFQ dibuat untuk vendor V03 sebanyak 10 unit COF-LATT-HOT pada harga Rp 12.000/unit.
  * *When:* PO dikonfirmasi.
  * *Then:* Nilai PO Rp 120.000 (tax fixture 0%); stok fisik on-hand belum berubah (komitmen pengadaan tercatat).
* **Expected Result:** PO berstatus Confirmed; stok fisik belum bertambah sebelum penerimaan barang.
* **Actual Result:** PO `P00007` Confirmed senilai Rp 120.000; stok on-hand tetap 20 unit.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase5.ts` (Assert: `T-15`, `T-15-RFQ`).

#### T-16: Idempotensi Konfirmasi Purchase Order (SR-13 / F-11 / Wireframe S-08)
* **Kriteria (Given / When / Then):**
  * *Given:* PO `P00007` telah berstatus Confirmed.
  * *When:* Konfirmasi ulang diklik kembali pada PO yang sama.
  * *Then:* Sistem tidak membuat dokumen penerimaan atau komitmen ganda.
* **Expected Result:** Operasi bersifat idempoten; jumlah Goods Receipt tetap 1.
* **Actual Result:** Dokumen penerimaan tetap 1; tidak ada duplikasi sequence atau komitmen.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase5.ts` (Assert: `T-16`).

#### T-17: Penerimaan Barang & Pemisahan Kuantitas Ditolak (F-12 / Wireframe S-09)
* **Kriteria (Given / When / Then):**
  * *Given:* PO 10 unit COF-LATT-HOT tiba di gudang.
  * *When:* Dilakukan penerimaan dengan 8 unit Accepted dan 2 unit Rejected.
  * *Then:* Hanya 8 unit masuk ke stok persediaan (on-hand naik 20→28); valuasi persediaan bertambah Rp 96.000; jurnal mencatat Dr 1030 Inventory Rp 96.000 dan Cr 1040 GRNI Rp 96.000.
* **Expected Result:** 2 unit ditolak tidak masuk ke persediaan; jurnal GRNI seimbang.
* **Actual Result:** On-hand naik dari 20 ke 28; jurnal `JE/2026/0001` Dr 1030 Rp 96.000 = Cr 1040 Rp 96.000; barang ditolak tidak menambah persediaan.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase5.ts` (Assert: `T-17`, `T-17-STOCK`, `T-17-INITIAL`).

#### T-18: Pelanggaran Three-Way Match atas Barang Ditolak (SR-06 / F-12 / Wireframe S-09)
* **Kriteria (Given / When / Then):**
  * *Given:* Penerimaan barang mencatat 8 unit accepted dan 2 unit rejected.
  * *When:* Vendor mengirim tagihan untuk seluruh 10 unit (10 × Rp 12.000 = Rp 120.000).
  * *Then:* Three-Way Match Engine menolak pembuatan tagihan melebihi kuantitas accepted.
* **Expected Result:** Penagihan barang yang ditolak/belum diterima diblokir.
* **Actual Result:** Sistem menolak penagihan dengan pesan: "Validasi Three-Way Match Gagal (SR-06 / T-18): Kuantitas tagihan (10) melebihi kuantitas penerimaan yang lolos inspeksi (8 unit)."
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase5.ts` (Assert: `T-18`, `T-18-VERIFY`).

#### T-19: Penagihan Berbasis Pengiriman & PBJT 10% (SR-02, SR-18 / F-09, F-22 / Wireframe S-10)
* **Kriteria (Given / When / Then):**
  * *Given:* Skenario T-11 di mana 5 unit RICE-CHICK-S telah terkirim.
  * *When:* Diterbitkan Customer Invoice untuk 5 unit tersebut.
  * *Then:* Nilai net Rp 240.000, PBJT 10% Rp 24.000, total gross Rp 264.000; jurnal mencatat Dr 1020 A/R Rp 264.000, Cr 4010 Revenue Rp 240.000, Cr 2020 PBJT Rp 24.000.
* **Expected Result:** Invoice dan pajak dihitung tepat atas kuantitas yang telah dikirim.
* **Actual Result:** Invoice `INV/2026/0007` diposting dengan nilai Net Rp 240.000, PBJT Rp 24.000, Gross Rp 264.000; jurnal seimbang.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase6.ts` (Assert: `T-19`, `T-19-CALC`).

#### T-20: Penolakan Penagihan Melebihi Kuantitas Terkirim (SR-01, SR-02 / F-09 / Wireframe S-10)
* **Kriteria (Given / When / Then):**
  * *Given:* Skenario pesanan 8 unit dengan pengiriman baru 5 unit.
  * *When:* Mencoba membuat invoice untuk seluruh 8 unit yang dipesan.
  * *Then:* Sistem menolak penagihan atas 3 unit backorder yang belum dikirim.
* **Expected Result:** Penagihan melebihi kuantitas delivered diblokir sesuai SR-02.
* **Actual Result:** Sistem mengembalikan pesan: "Validasi Penagihan Gagal (SR-02 / F-09 / T-20): Kuantitas tagihan (8) melebihi kuantitas yang telah dikirim (5)."
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase6.ts` (Assert: `T-20`, `T-20-VERIFY`).

#### T-21: Vendor Bill & Three-Way Match Normal (F-13 / Wireframe S-11)
* **Kriteria (Given / When / Then):**
  * *Given:* Penerimaan 8 unit accepted dari PO P00007.
  * *When:* Dibuat Vendor Bill untuk 8 unit tersebut.
  * *Then:* Vendor Bill net Rp 96.000 diposting; jurnal mencatat Dr 1040 GRNI Rp 96.000 dan Cr 2010 A/P Rp 96.000; saldo interim GRNI menjadi Rp 0.
* **Expected Result:** Three-Way Match valid; utang dagang diakui dan akun perantara GRNI ter-clearing.
* **Actual Result:** Vendor Bill `BILL/2026/0007` diposting; jurnal Dr 1040 Rp 96.000 = Cr 2010 Rp 96.000; saldo GRNI untuk transaksi ini nol.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase5.ts` (Assert: `T-21`, `T-21-BILL`, `T-21-GRNI-ZERO`).

#### T-22: Pencegahan Duplikasi Posting Tagihan Vendor (SR-06, SR-13 / F-13 / Wireframe S-11)
* **Kriteria (Given / When / Then):**
  * *Given:* Vendor Bill BILL/2026/0007 untuk 8 unit telah diposting.
  * *When:* Mencoba membuat atau mem-posting kembali tagihan untuk 8 unit yang sama.
  * *Then:* Sistem memblokir tagihan duplikat dan saldo utang tidak bertambah ganda.
* **Expected Result:** Duplikasi tagihan dicegah oleh Three-Way Match engine.
* **Actual Result:** Sistem mengembalikan: "Validasi Three-Way Match Gagal: Kuantitas tagihan (8) melebihi kuantitas unbilled (0 unit)."
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase5.ts` (Assert: `T-22`, `T-22-IDEMPOTENT`, `T-22-VERIFY`).

#### T-23: Pembayaran Sebagian / Partial Payment (F-15 / Wireframe S-12)
* **Kriteria (Given / When / Then):**
  * *Given:* Invoice dengan sisa tagihan Rp 264.000.
  * *When:* Dilakukan registrasi pembayaran parsial sebesar Rp 100.000 via Bank.
  * *Then:* Outstanding tagihan turun menjadi Rp 164.000; saldo Kas/Bank naik Rp 100.000; saldo Piutang (A/R) turun Rp 100.000; jurnal mencatat Dr 1010 Bank Rp 100.000 dan Cr 1020 A/R Rp 100.000.
* **Expected Result:** Pembayaran sebagian teralokasi tepat dengan jurnal berpasangan seimbang.
* **Actual Result:** Status invoice sebagian lunas; sisa outstanding Rp 164.000; jurnal seimbang Rp 100.000.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase6.ts` (Assert: `T-23`).

#### T-24: Proteksi Pembayaran Berlebih / Overpayment Guard (SR-19 / F-15 / Wireframe S-12)
* **Kriteria (Given / When / Then):**
  * *Given:* Sisa tagihan outstanding adalah Rp 264.000.
  * *When:* Mencoba melakukan registrasi pembayaran sebesar Rp 300.000.
  * *Then:* Sistem menolak pembayaran berlebih dan mempertahankan saldo invoice.
* **Expected Result:** Pembayaran melebihi sisa tagihan ditolak sesuai SR-19.
* **Actual Result:** Sistem mengembalikan pesan: "Validasi Pembayaran Gagal (SR-19 / F-15 / T-24): Jumlah pembayaran (Rp 300.000) melebihi sisa tagihan outstanding (Rp 264.000)."
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase6.ts` (Assert: `T-24`, `T-24-VERIFY`).

#### T-25: Pengakuan Beban Pokok Pendapatan (COGS) & Keseimbangan Buku Besar (F-14 / Wireframe S-13)
* **Kriteria (Given / When / Then):**
  * *Given:* Transaksi pengiriman 5 unit RICE-CHICK-S dan faktur penjualan terkait telah diposting.
  * *When:* Jurnal delivery dan invoice diperiksa di Buku Besar.
  * *Then:* Jurnal pengiriman mencatat Dr 5010 COGS Rp 130.000 = Cr 1030 Inventory Rp 130.000; Jurnal invoice mencatat Dr 1020 A/R Rp 264.000 = Cr Revenue Rp 240.000 + Cr PBJT Rp 24.000; Total debit = total kredit = Rp 394.000.
* **Expected Result:** Seluruh entri jurnal seimbang ($\sum Dr = \sum Cr$) dan COGS diakui sesuai standar cost.
* **Actual Result:** Total akumulasi debit Rp 394.000 sama persis dengan kredit Rp 394.000.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase6.ts` (Assert: `T-25`, `T-25-DELIVERY-JOURNAL`, `T-25-INVOICE-JOURNAL`).

#### T-26: Idempotensi Posting Ulang Dokumen Akuntansi (SR-13 / F-14 / Wireframe S-13)
* **Kriteria (Given / When / Then):**
  * *Given:* Dokumen pengiriman dan invoice telah berstatus Posted.
  * *When:* Dilakukan instruksi posting ulang terhadap dokumen yang sama.
  * *Then:* Sistem tidak membuat jurnal kedua kali (*zero duplicate journal*).
* **Expected Result:** Jumlah entri jurnal di database tidak bertambah.
* **Actual Result:** Jumlah jurnal tetap konstan pada 4 entri; saldo COGS dan Piutang tidak bertambah ganda.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase6.ts` (Assert: `T-26`).

#### T-27: Transaksi Point of Sale Gerai Restoran Normal (F-16, F-17, F-22 / Wireframe S-14)
* **Kriteria (Given / When / Then):**
  * *Given:* Sesi kasir `POS01` dibuka di lokasi `CAFE-JKT`.
  * *When:* Dijual 2 × COF-LATT-HOT dan 1 × COOKIE-CHO-1 dibayar via QRIS / Bank.
  * *Then:* Net Rp 80.000, PBJT Rp 8.000, Total Bayar Rp 88.000; COGS diakui Rp 33.000; stok CAFE-JKT berkurang (Hot 24→22, Cookie 20→19); saldo Bank bertambah Rp 88.000; jurnal seimbang.
* **Expected Result:** Penjualan kasir terintegrasi langsung ke stok gerai, kas/bank, pajak restoran, dan jurnal akuntansi.
* **Actual Result:** Order `POS/2026/0001` tersimpan; stok berkurang tepat; kas bertambah; jurnal seimbang Rp 121.000.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase7.ts` (Assert: `T-27`, `T-27-SESSION`, `T-27-STOCK-AFTER`, `T-27-FINANCIAL`).

#### T-28: Evaluasi Stok Kasir & Penutupan Sesi POS (SR-03, SR-04, SR-14 / F-16, F-17 / Wireframe S-14)
* **Kriteria (Given / When / Then):**
  * *Given:* Stok COF-LATT-HOT di CAFE-JKT tersisa 22 unit.
  * *When:* Kasir mencoba checkout 25 unit (melebihi stok fisik), lalu sesi kasir ditutup.
  * *Then:* Checkout 25 unit ditolak (SR-04); sesi berhasil ditutup; penutupan ulang sesi tidak memicu posting ganda (SR-14).
* **Expected Result:** Kasir dicegah membuat stok minus; penutupan sesi bersifat idempoten.
* **Actual Result:** Checkout 25 unit diblokir; sesi POS01 ditutup dengan total penjualan Rp 88.000 (selisih kas Rp 0); penutupan ulang sesi ditolak tanpa jurnal ganda.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase7.ts` (Assert: `T-28`, `T-28-STOCK-EVAL`, `T-28-CLOSE-SESSION`).

#### T-29: Retur Penjualan dengan Inspeksi Kualitas & Credit Note Normal (F-18 / Wireframe S-15)
* **Kriteria (Given / When / Then):**
  * *Given:* Pelanggan mengembalikan 1 × RICE-CHICK-S dari pesanan yang telah difaktur.
  * *When:* Barang diperiksa dan mendapatkan status inspeksi `ACCEPTED`.
  * *Then:* Stok gudang bertambah 35→36 unit; COGS dibalik Rp 26.000; Credit Note diterbitkan dengan nilai net Rp 48.000, PBJT Rp 4.800, total gross Rp 52.800; piutang invoice berkurang Rp 52.800.
* **Expected Result:** Retur yang lolos inspeksi membalik persediaan, COGS, pajak restoran, dan piutang.
* **Actual Result:** Restok persediaan bertambah 1 unit; Credit Note `RINV/2026/0007` terbit; sisa piutang invoice berkurang menjadi Rp 211.200; jurnal pembalik seimbang.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase7.ts` (Assert: `T-29`, `T-29-INSPECTION`, `T-29-RETURN-REQ`).

#### T-30: Penolakan Restok & Credit Note Tanpa Inspeksi (SR-11 / F-18 / Wireframe S-15)
* **Kriteria (Given / When / Then):**
  * *Given:* Pelanggan mengajukan retur 2 unit RICE-CHICK-S tetapi status inspeksi kualitas masih `PENDING`.
  * *When:* Mencoba melakukan restok persediaan atau menerbitkan Credit Note.
  * *Then:* Sistem memblokir proses hingga pemeriksaan kualitas disetujui.
* **Expected Result:** Barang retur tanpa persetujuan inspeksi tidak boleh masuk ke persediaan.
* **Actual Result:** Sistem mengembalikan: "Validasi Retur Gagal (SR-11 / T-30): Barang retur belum lolos pemeriksaan kualitas (Status: PENDING). Restok dan Credit Note diblokir."
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase7.ts` (Assert: `T-30`, `T-30-VERIFY`).

#### T-31: Integritas KPI Dashboard Operasional (F-20 / Wireframe S-16)
* **Kriteria (Given / When / Then):**
  * *Given:* Aplikasi dimuat pada baseline seed murni tanpa transaksi tambahan.
  * *When:* Dashboard eksekutif `/dashboard` dibuka.
  * *Then:* Seluruh 8 KPI cocok 100% dengan database persisten dan memiliki tautan ke dokumen sumber.
* **Expected Result:** Stok 616 unit (WH 410, CAFE 206), Valuasi Rp 12.214.000, Piutang Rp 1.500.000, Utang Rp 1.000.000, Bank Rp 20.000.000, CRM 1 lead (Rp 1.2M), 1 confirmed SO (reserved 6), 1 confirmed PO, POS revenue Rp 0.
* **Actual Result:** Seluruh 8 KPI cocok persis dengan data database aktual dan seluruh card memiliki tautan navigasi sumber yang valid.
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase8.ts` (Assert: `T-31.1` s.d. `T-31.10`).

#### T-32: Rekonsiliasi Keuangan, Deteksi Anomali & Larangan Auto-Post (SR-20 / F-21 / Wireframe S-16)
* **Kriteria (Given / When / Then):**
  * *Given:* Buku besar normal seimbang (Debit Rp 33.714.000 == Kredit Rp 33.714.000).
  * *When:* Disimulasikan selisih stok fisik +1 unit berbeda dari saldo akun buku besar 1030.
  * *Then:* Sistem mendeteksi status `MISMATCH`, memunculkan peringatan rekonsiliasi mencolok, menampilkan jejak audit, dan menolak mutlak pem-post-an jurnal penyesuaian otomatis (`autoPostBlocked = true`).
* **Expected Result:** Status berubah ke MISMATCH; dilarang keras auto-post jurnal penyeimbang artifisial.
* **Actual Result:** Status `MISMATCH` terdeteksi; pesan peringatan audit muncul; `autoPostBlocked` bernilai `true`; jumlah jurnal di database tetap konstan (tidak ada manipulasi data).
* **Status:** **PASS**
* **Bukti:** `scripts/test_phase8.ts` (Assert: `T-32.1` s.d. `T-32.7`).
