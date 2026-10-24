# Chat

Chat app React + Vite dengan akun email/password dan pesan lintas perangkat melalui Supabase.

## Setup Supabase

1. Buat project di Supabase.
2. Buka **SQL Editor**, lalu jalankan isi `supabase/schema.sql`. Ini membuat profil, pesan, trigger pembuatan profil, dan aturan Row Level Security.
3. Di **Project Settings > API**, salin Project URL dan publishable/anon key.
4. Buat file `.env.local` berdasarkan `.env.example`, lalu isi URL dan key untuk pengujian lokal.
5. Di Supabase Auth, atur Site URL dan Redirect URL ke `https://kato57819-ai.github.io/chat/`.
6. Di GitHub repo, buka **Settings > Secrets and variables > Actions > Variables**. Tambahkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY`, lalu jalankan ulang workflow Pages.

Jangan pernah memasukkan `service_role` key atau password ke source code. File `.env.local` tidak dilacak Git. Publishable/anon key digunakan di browser; aturan RLS pada schema membatasi akses data.

## Catatan

Akun lama yang tersimpan di browser tidak otomatis dipindahkan ke Supabase. Pengguna perlu membuat akun baru dengan nama tampilan, email, dan password. Jika konfirmasi email aktif, konfirmasikan email sebelum masuk.

## Perintah

- `npm run dev` menjalankan aplikasi lokal.
- `npm run build` membuat versi produksi.
- `npm run lint` menjalankan Oxlint.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
# Chat

Chat app React + Vite dengan akun email/password dan pesan lintas perangkat melalui Supabase.

## Setup Supabase

1. Buat project di Supabase.
2. Buka **SQL Editor**, lalu jalankan isi file `supabase/schema.sql`. Schema ini membuat profil, pesan, trigger pembuatan profil, dan aturan Row Level Security.
3. Di Supabase, buka **Project Settings > API** lalu salin Project URL dan publishable/anon key.
4. Buat file `.env.local` di folder project berdasarkan `.env.example`:

	```env
	VITE_SUPABASE_URL=https://your-project-id.supabase.co
	VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
	```

5. Jalankan `npm run dev` untuk uji lokal.
6. Di pengaturan Auth Supabase, atur URL situs dan redirect URL GitHub Pages ke `https://kato57819-ai.github.io/chat/`.
7. Tambahkan kedua variable `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sebagai build secrets/variables di workflow GitHub Actions, lalu jalankan ulang deployment Pages.

Jangan pernah menaruh `service_role` key atau password di source code. File `.env.local` tidak dilacak Git. Publishable/anon key memang digunakan di aplikasi browser; keamanan data bergantung pada kebijakan RLS dalam schema.

## Catatan

Akun lama yang tersimpan di browser tidak otomatis dipindahkan ke Supabase; pengguna perlu membuat akun baru. Untuk membuat akun, gunakan nama tampilan, email, dan password. Jika konfirmasi email aktif, konfirmasikan email sebelum login.

## Perintah

- `npm run dev` menjalankan aplikasi lokal.
- `npm run build` membuat versi produksi.
- `npm run lint` menjalankan Oxlint.
