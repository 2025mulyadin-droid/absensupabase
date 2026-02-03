# Panduan Deployment Aplikasi Absensi MI ISLAMADINA ke Cloudflare (Versi Supabase)

Panduan ini menjelaskan langkah-langkah untuk mendeloy aplikasi absensi menggunakan **Cloudflare Pages** sebagai hosting frontend & backend functions, serta **Supabase** sebagai database PostgreSQL.

---

## Prasyarat
- Akun [Cloudflare](https://dash.cloudflare.com/) (Gratis).
- Akun [Supabase](https://supabase.com/) (Gratis).
- Git terinstall (disarankan) untuk sinkronisasi kode ke Cloudflare.

---

## Langkah 1: Setup Database di Supabase

1. **Buat Project Baru**: Login ke Supabase dan buat project baru (misal: `absen-gtk-islamadina`).
2. **Setup Tabel (Schema)**:
   - Masuk ke menu **SQL Editor**.
   - Klik **New Query**.
   - Salin dan tempel kode berikut, lalu klik **Run**:

   ```sql
   -- Tabel GTK
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     role TEXT DEFAULT 'Guru/Karyawan',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabel Absensi
   CREATE TABLE attendance (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
     status TEXT NOT NULL CHECK (status IN ('Hadir', 'Sakit', 'Izin')),
     date DATE NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id, date)
   );

   -- Tabel Hari Libur
   CREATE TABLE holidays (
     id SERIAL PRIMARY KEY,
     holiday_date DATE NOT NULL UNIQUE,
     description TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Seed data awal (Contoh)
   INSERT INTO users (name) VALUES 
   ('Abdullah'), ('Siti Aminah'), ('Umar Faruq');
   ```

3. **Ambil API Key**:
   - Pergi ke **Project Settings** > **API**.
   - Catat/salin:
     - **Project URL** (misal: `https://xyzabc.supabase.co`)
     - **anon public key**

---

## Langkah 2: Deploy ke Cloudflare Pages

1. **Hubungkan Host**:
   - Push kode Anda ke GitHub/GitLab.
   - Di dashboard Cloudflare, buka **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. **Konfigurasi Build**:
   - **Framework preset**: `None`.
   - **Build command**: `npm install` (Sangat Penting: Agar Supabase-js terinstall).
   - **Build output directory**: `public`.
3. **Environment Variables (PENTING)**:
   - Sebelum klik deploy, masuk ke tab **Environment Variables** (atau setting ini bisa diatur setelah deploy pertama di tab Settings).
   - Tambahkan variabel berikut:
     - `SUPABASE_URL`: (Isi dengan URL Project Supabase Anda)
     - `SUPABASE_ANON_KEY`: (Isi dengan Anon Public Key Supabase Anda)
4. **Deploy**: Klik **Save and Deploy**.

---

## Langkah 3: Konfigurasi Lanjutan (Functions)

Agar API Functions di Cloudflare mengenali variabel environment:
1. Masuk ke Project Pages Anda > **Settings** > **Functions**.
2. Pastikan pada bagian **Compatibility date** minimal diset ke `2024-01-30`.
3. Di bagian **Environment Variables**, pastikan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` sudah ada di bagian **Production** dan **Preview**.

---

## Langkah 4: Setup Domain Custom

1. Di Dashboard Pages, buka tab **Custom domains**.
2. Klik **Set up a custom domain**.
3. Masukkan domain: `absen.miislamadina.sch.id`.
4. Ikuti instruksi DNS otomatis dari Cloudflare.

---

## Langkah 5: Akses Admin Panel

1. Buka `https://absen.miislamadina.sch.id/admin.html`.
2. Masukkan password: **`bismillah`**.
3. Gunakan dashboard ini untuk:
   - Mengelola Nama GTK (Guru/Karyawan).
   - Mengedit data absensi yang salah.
   - Mengatur hari libur sekolah (agar GTK tidak bisa absen dan laporan otomatis terisi 'L').

---

## Troubleshooting

- **Dropdown Nama Kosong**: Cek apakah `SUPABASE_URL` dan `SUPABASE_ANON_KEY` sudah benar di dashboard Cloudflare. Periksa juga menu Logs di Cloudflare Pages jika ada error 500.
- **Waktu Salah**: Aplikasi menggunakan zona waktu `Asia/Jakarta` (WIB) untuk frontend. Data di database disimpan dalam format DATE (YYYY-MM-DD).
- **Laporan Excel Tidak Berwarna**: Pastikan browser Anda mengizinkan script dari `cdn.jsdelivr.net`.

---
Selamat bekerja!
