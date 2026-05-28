# BlobCast — Design System
> *Own your posts forever.*

---

## 0. Filosofi Desain

BlobCast bukan produk SaaS. Bukan crypto app generik. Bukan Twitter clone dengan skin Web3.

BlobCast adalah **arsip permanen milik manusia** — tempat kata-kata, gambar, dan identitas dikubur dalam blok-blok data yang tidak bisa dihapus. Desainnya harus mencerminkan bobot itu.

**Tiga prinsip inti:**

1. **Permanence over polish** — Bukan halus dan mengkilap. Tapi terasa berat, terasa nyata, seperti sesuatu yang akan bertahan.
2. **Human marks, not machine output** — Setiap elemen grafis harus terasa seperti ada tangan manusia di baliknya. Ketidaksempurnaan adalah fitur, bukan bug.
3. **Tension as composition** — Ketegangan antara grid dan kekacauan, antara teks serif besar dan ruang kosong brutal — itulah karakter visual BlobCast.

---

## 1. Palet Warna

### Filosofi Warna

Hindari: gradien neon, biru SaaS (#4A90E2), ungu "Web3", teal "fintech".
Gunakan: earthy dan industri — seperti tinta di kertas tua, beton, dan satu tanda bahaya.

### Palet Utama

```
--color-ground:      #0D0C0A    /* Near-black, sedikit warm — bukan black murni */
--color-bark:        #1C1A16    /* Surface primer — seperti kayu terbakar */
--color-ash:         #2E2B25    /* Surface sekunder */
--color-dust:        #4A4640    /* Border, divider */
--color-bone:        #E8E2D5    /* Teks utama — off-white, bukan putih steril */
--color-parchment:   #C4BAA8    /* Teks muted */
--color-fog:         #7A7268    /* Teks tertier, placeholder */
```

### Aksen Tunggal

```
--color-signal:      #D4451A    /* Burnt orange-red — SATU aksen, tidak lebih */
```

Aksen `--color-signal` dipakai **sangat hemat**: CTA utama, tag aktif, indikator on-chain, highlight penting. Tidak untuk dekorasi.

### Variasi Konteks

```
--color-signal-dim:  #8A2D10    /* Hover state, latar badge signal */
--color-signal-ink:  #F5C4B4    /* Teks di atas latar signal */

--color-verify:      #5C7A4E    /* Hijau tua, earthy — bukan neon green */
--color-verify-dim:  #2E3D27
--color-verify-ink:  #B8CCAF
```

### Aturan Penggunaan

- Maksimal **3 warna per halaman** (tidak termasuk teks dan surface)
- Background tidak pernah putih murni. Selalu `--color-ground` atau `--color-bark`
- Jangan gunakan opacity/alpha untuk membuat warna baru — gunakan warna dari palet saja
- `--color-signal` tidak boleh muncul lebih dari **2× per viewport**

---

## 2. Tipografi

### Filosofi Tipografi

Teks adalah grafis. Judul bukan label — judul adalah gambar. Ukuran tidak mengikuti hierarki yang sopan; ukuran mengikuti bobot naratif.

### Font Stack

```css
/* Display — Untuk heading besar, identitas, tagline */
--font-display: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;

/* Body — Untuk body text, UI label, metadata */
--font-body: 'DM Mono', 'Courier New', monospace;

/* Accent — Untuk tag, badge, kode, hash */
--font-accent: 'Space Mono', 'IBM Plex Mono', monospace;
```

**Catatan loading:**
```html


```

### Skala Tipografi

```
--text-display-xl:  clamp(56px, 8vw, 96px)   /* Tagline, hero statement */
--text-display-lg:  clamp(36px, 5vw, 60px)   /* Section title, nama user besar */
--text-display-md:  clamp(24px, 3.5vw, 40px) /* Sub-heading editorial */
--text-body-lg:     18px                      /* Body text utama */
--text-body-md:     15px                      /* UI text standar */
--text-body-sm:     13px                      /* Metadata, timestamp */
--text-caption:     11px                      /* Label, fine print */
```

### Aturan Tipografi

1. **Heading display selalu menggunakan `--font-display`** — tidak ada pengecualian
2. **Body dan UI menggunakan `--font-body` (mono)** — ini memberikan kesan terminal/arsip
3. Italic pada `--font-display` dipakai untuk penekanan emosional — kata-kata seperti *"forever"*, *"yours"*, *"permanent"*
4. **Letter-spacing untuk display: -0.02em** (tight, editorial)
5. **Letter-spacing untuk mono body: 0** (natural)
6. **Line-height display: 1.05–1.1** (compressed, berat)
7. **Line-height body: 1.6** (nyaman dibaca)
8. Jangan rata kanan-kiri (justify) untuk body text
9. Teks besar boleh terpotong oleh tepi viewport — ini disengaja

---

## 3. Tekstur & Efek Visual

### Grain Overlay (Wajib)

Setiap halaman menggunakan grain noise layer di atas semua konten:

```css
.grain-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}
```

**Implementasi React:**
```jsx
// Tambahkan di root layout

```

### Paper Texture Card

Card tidak boleh flat solid. Gunakan subtle pattern untuk surface:

```css
.card-texture {
  background-color: var(--color-bark);
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.012) 2px,
      rgba(255,255,255,0.012) 4px
    );
}
```

### Walrus Mesh Gradient

Untuk area hero, banner, atau surface promo yang butuh karakter lebih hidup, BlobCast boleh memakai efek mesh gradient ala Walrus. Kuncinya bukan satu linear gradient, melainkan tumpukan radial gradient transparan di atas latar gelap yang pekat.

```css
.walrus-mesh-bg {
  background-color: #05070d;
  background-image:
    radial-gradient(ellipse at 50% 120%, rgba(0, 229, 255, 0.45) 0%, transparent 60%),
    radial-gradient(ellipse at 90% 100%, rgba(138, 97, 219, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 30% 0%, rgba(0, 51, 204, 0.3) 0%, transparent 60%),
    radial-gradient(ellipse at 10% 80%, rgba(13, 114, 133, 0.3) 0%, transparent 50%);
  background-repeat: no-repeat;
  background-size: cover;
}

.walrus-orb-bg {
  background-color: #000000;
  background-image:
    radial-gradient(circle at 20% 70%, rgba(0, 229, 255, 0.7) 0%, transparent 55%),
    radial-gradient(circle at 80% 80%, rgba(184, 150, 255, 0.6) 0%, transparent 60%),
    radial-gradient(circle at 50% 20%, rgba(0, 42, 255, 0.7) 0%, transparent 65%),
    radial-gradient(circle at 90% 40%, rgba(125, 245, 212, 0.3) 0%, transparent 50%);
  background-repeat: no-repeat;
  background-size: cover;
}

.walrus-text-gradient {
  background: linear-gradient(90deg, #00e5ff 0%, #b28cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
```

**Catatan penggunaan:**

- Pakai hanya untuk hero, banner, orb, atau elemen editorial yang memang ingin terasa seperti pendaran on-chain.
- Tetap di atas latar gelap; jangan dipakai pada halaman light mode karena BlobCast tidak punya light mode.
- Jika ingin efek lebih menyatu, letakkan gradien di elemen absolut di belakang konten lalu beri `filter: blur(24px)` pada layer itu, bukan pada teks atau konten utama.

### Efek Stempel / Ink

Untuk badge dan tag — bukan pill mulus, tapi terasa seperti stempel karet:

```css
.badge-stamp {
  font-family: var(--font-accent);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 7px;
  border: 1.5px solid currentColor;
  /* Tidak ada border-radius — kotak tegas */
  border-radius: 0;
  /* Atau: sedikit tidak simetris */
  border-radius: 2px 0px 2px 0px;
}
```

### Scan Line (Opsional, untuk header)

```css
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 3px,
    rgba(0,0,0,0.08) 3px,
    rgba(0,0,0,0.08) 4px
  );
  pointer-events: none;
}
```

---

## 4. Border, Bentuk, & Sudut

### Prinsip Bentuk

BlobCast tidak menggunakan border-radius sempurna. Bentuk-bentuk di sini:

- Tegas dan industrial, **atau**
- Organik dan sedikit tidak beraturan — tapi bukan smooth pill

### Border Radius Rules

```css
/* DILARANG */
border-radius: 8px;   /* Terlalu SaaS */
border-radius: 12px;  /* Terlalu friendly */
border-radius: 9999px; /* Pill — tidak pernah */

/* DIIZINKAN */
border-radius: 0;                         /* Kotak tegas — default */
border-radius: 2px;                       /* Hampir kotak */
border-radius: 2px 0px 4px 1px;          /* Asimetris — organik */
border-radius: 0 0 3px 3px;              /* Hanya bawah */

/* UNTUK AVATAR PROFIL — bukan lingkaran sempurna */
border-radius: 4px 6px 3px 5px;          /* Terasa seperti gambar dipotong tangan */
```

### Border Style

```css
/* Default card border */
border: 1.5px solid var(--color-dust);

/* Emphasized / aktif */
border: 1.5px solid var(--color-bone);

/* Signal / on-chain verified */
border: 1.5px solid var(--color-signal);
border-left: 3px solid var(--color-signal); /* Aksen kiri — lebih dramatis */

/* Separator */
border-top: 1px solid var(--color-ash);

/* JANGAN: dashed atau dotted untuk konten utama */
```

### Bentuk Dekoratif

Elemen grafis non-fungsional untuk karakter visual:

```css
/* Tanda kurung editorial di sekitar metadata */
.bracket-left::before  { content: '['; color: var(--color-fog); font-family: var(--font-accent); }
.bracket-right::after  { content: ']'; color: var(--color-fog); font-family: var(--font-accent); }

/* Garis vertikal tebal sebagai divider editorial */
.rule-vertical {
  width: 3px;
  background: var(--color-signal);
  align-self: stretch;
  flex-shrink: 0;
}

/* Hash mark dekoratif */
.hash-mark::before {
  content: '///';
  font-family: var(--font-accent);
  color: var(--color-fog);
  letter-spacing: -0.1em;
  margin-right: 8px;
}
```

---

## 5. Tata Letak (Layout)

### Filosofi Layout

Jangan gunakan grid standar 12-kolom yang sopan. Layout BlobCast bekerja dengan **tegangan** — elemen-elemen yang saling tarik, tumpang tindih, dan ruang kosong yang tidak terduga.

### Grid Sistem

```css
/* Grid dasar — sengaja asimetris */
.layout-editorial {
  display: grid;
  grid-template-columns: 
    [full-start] 16px 
    [content-start] 1fr 
    [main-start] 2fr 
    [main-end] 1fr 
    [content-end] 16px 
    [full-end];
}

/* Feed layout — main content lebih lebar dari sidebar */
.layout-feed {
  display: grid;
  grid-template-columns: 220px 1fr 280px;
  gap: 0; /* Tidak ada gap — border sebagai separator */
}

/* Composer layout — teks besar dengan offset */
.layout-compose {
  display: grid;
  grid-template-columns: 48px 1fr;
  align-items: start;
}
```

### Overlapping Elements

Elemen yang saling tumpang tindih — bukan bug, ini karakter:

```css
/* Post card dengan timestamp yang "keluar" dari card */
.post-card {
  position: relative;
  padding: 20px 20px 20px 20px;
}

.post-timestamp {
  position: absolute;
  top: -10px;  /* Menonjol ke atas card */
  right: 16px;
  font-family: var(--font-accent);
  font-size: 10px;
  background: var(--color-ground);
  padding: 2px 6px;
  border: 1px solid var(--color-dust);
}

/* Section heading yang memotong border */
.section-heading-overlap {
  position: relative;
  margin-top: -16px;  /* Tumpang tindih dengan elemen di atas */
  display: inline-block;
  background: var(--color-ground);
  padding: 0 12px;
}
```

### Asymmetric Spacing

```css
/* Padding tidak simetris — disengaja */
.card-asymmetric {
  padding: 20px 16px 24px 20px; /* atas kanan bawah kiri — berbeda */
}

/* Margin yang "jatuh ke satu sisi" */
.content-block {
  margin-left: 48px;  /* Besar di kiri */
  margin-right: 16px; /* Kecil di kanan */
}
```

### Whitespace Dramatis

```css
/* Section break yang mencolok */
.section-break {
  height: clamp(48px, 8vh, 96px);
  position: relative;
}

.section-break::before {
  content: attr(data-label);
  position: absolute;
  bottom: 12px;
  left: 0;
  font-family: var(--font-accent);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-fog);
}
```

---

## 6. Komponen UI

### Post Card

```
┌─────────────────────────────────────────┐  ← border 1.5px --color-dust
│ [BLOB]  ← badge kiri, mono, huruf besar│
│                                         │
│  Avatar    Nama User           [12:34]  │
│  [kotak]   @handle                  ← timestamp keluar atas kanan
│            ↳ Walrus blob ID: 8x91akj   │
│                                         │
│  Isi teks post — font-body 15px         │
│  Line height 1.6, off-white             │
│                                         │
│  ─────────────────────────────          │
│  ♡ 142    ⟳ 38    ⬡ on-chain   ⬆ tip  │  ← action bar, mono 12px
└─────────────────────────────────────────┘
```

**CSS:**
```css
.post-card {
  background: var(--color-bark);
  border: 1.5px solid var(--color-dust);
  border-radius: 2px 0 2px 0;
  padding: 20px;
  position: relative;
  
  /* Efek paper texture */
  background-image: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(255,255,255,0.01) 2px,
    rgba(255,255,255,0.01) 4px
  );
}

.post-card:hover {
  border-color: var(--color-parchment);
  /* Tidak ada transform, tidak ada box-shadow besar */
  /* Hanya border berubah — halus tapi terasa */
}

.post-badge-blob {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--color-signal);
  color: var(--color-signal-ink);
  font-family: var(--font-accent);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 0;  /* Kotak sempurna — seperti stempel */
}
```

### Wallet Connect Button

```css
.btn-wallet {
  font-family: var(--font-accent);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  
  background: transparent;
  color: var(--color-bone);
  border: 1.5px solid var(--color-bone);
  border-radius: 0;  /* Tidak ada rounding */
  
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  
  position: relative;
}

.btn-wallet::before {
  content: '⬡';  /* Hexagon — simbol SUI */
  margin-right: 8px;
  color: var(--color-signal);
}

.btn-wallet:hover {
  background: var(--color-bone);
  color: var(--color-ground);
}

.btn-wallet.connected {
  border-color: var(--color-verify);
  color: var(--color-verify-ink);
}

.btn-wallet.connected::before {
  content: '●';
  color: var(--color-verify);
}
```

### Composer (Post Editor)

```css
.composer {
  border-bottom: 1.5px solid var(--color-ash);
  padding: 20px;
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
}

.composer-avatar {
  width: 40px;
  height: 40px;
  background: var(--color-ash);
  border: 1.5px solid var(--color-dust);
  border-radius: 3px 5px 2px 4px;  /* Organik, tidak bulat sempurna */
}

.composer-textarea {
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-bone);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
  resize: none;
  width: 100%;
  min-height: 80px;
}

.composer-textarea::placeholder {
  color: var(--color-fog);
  font-style: italic;
}

.composer-actions {
  grid-column: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-ash);
  padding-top: 12px;
  margin-top: 8px;
}

/* Toggle "Mint as Blob" */
.toggle-mint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-accent);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-parchment);
  cursor: pointer;
}

.toggle-mint.active {
  color: var(--color-signal);
}
```

### Sidebar Navigation

```css
.sidebar-nav {
  padding: 32px 16px;
  border-right: 1.5px solid var(--color-ash);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Logo — teks sebagai grafis */
.nav-logo {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--color-bone);
  margin-bottom: 32px;
  
  /* "Cast" dalam italic */
}
.nav-logo span {
  font-style: italic;
  color: var(--color-signal);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-parchment);
  text-decoration: none;
  border-left: 2px solid transparent;
  border-radius: 0;
  transition: all 0.1s;
}

.nav-item:hover,
.nav-item.active {
  color: var(--color-bone);
  border-left-color: var(--color-signal);
  background: rgba(255,255,255,0.03);
}
```

### Inline Tx Toast (On-chain Confirmation)

```css
.toast-onchain {
  position: fixed;
  bottom: 24px;
  right: 24px;
  
  background: var(--color-bark);
  border: 1.5px solid var(--color-verify);
  border-radius: 0 2px 0 2px;  /* Asimetris */
  
  padding: 12px 16px;
  font-family: var(--font-accent);
  font-size: 11px;
  
  max-width: 320px;
}

.toast-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-verify-ink);
  margin-bottom: 4px;
}

.toast-hash {
  color: var(--color-bone);
  word-break: break-all;
}
```

---

## 7. Arahan Visual (Foto & Grafis)

### Fotografi

Gunakan **film analog aesthetics**:

- Grain tinggi, sedikit overexposed atau underexposed
- Color grading: warm shadows, desaturated highlights
- Format: portrait atau square — bukan landscape lebar
- Tidak ada filter Instagram yang terlalu kuat — lebih subtle

**Untuk avatar user:**
- Foto nyata atau ilustrasi tangan bergaya zine
- Tidak ada avatar 3D glossy atau pixel art generik
- Fallback: inisial dalam kotak dengan border asimetris

**Untuk media dalam post:**
- Tampilkan dengan border `1.5px solid var(--color-dust)`
- Tidak ada `border-radius` lebih dari 2px
- Tambahkan caption di bawah dengan style `--font-accent` 11px

### Elemen Grafis Hand-drawn

Untuk ilustrasi dekoratif, gunakan gaya:

- Sketsa garis tipis, sedikit gemetar (tidak mulus)
- Crosshatching untuk shadow — bukan gradient
- Bentuk tidak sempurna secara sengaja
- Referensi visual: zine underground, buku catatan lapangan, poster punk

**Tools yang direkomendasikan:**
- Procreate + export SVG
- Inkscape dengan path manual
- Scanned pen sketches

**Hindari:**
- Ilustrasi Lottie animasi floating 3D
- Icon pack generik (Heroicons, FontAwesome tanpa modifikasi)
- Vektor flat dengan fill warna solid bersih

### Kolase Visual

Untuk halaman marketing/landing:

- Teks besar yang terpotong oleh foto
- Foto yang sedikit miring (rotate ±2-3°)
- Caption yang menumpang di atas gambar
- Sticker-style overlays dengan teks mono

---

## 8. Animasi & Motion

### Prinsip Motion

Tidak ada:
- Easing yang terlalu smooth (cubic-bezier yang terasa "premium SaaS")
- Fade-in massal semua elemen
- Hover scale/lift yang berlebihan
- Loading spinner animasi yang fancy

Ada:
- Transisi singkat dan tegas (0.1s–0.15s)
- Sedikit mechanical — terasa seperti mesin, bukan layar sentuh premium

```css
/* Transisi global */
* {
  transition-duration: 0.12s;
  transition-timing-function: linear; /* Bukan ease — lebih mechanical */
}

/* Hover state minimal */
.interactive:hover {
  opacity: 0.8;  /* Sederhana — bukan transform atau shadow */
}

/* Untuk CTA penting: single flash */
@keyframes blobcast-flash {
  0%   { opacity: 1; }
  50%  { opacity: 0.6; }
  100% { opacity: 1; }
}

.on-chain-confirmed {
  animation: blobcast-flash 0.3s linear 2;
}
```

---

## 9. Komponen On-Chain Spesifik

### Walrus Blob ID Display

```jsx
// Blob ID — ditampilkan seperti kode, bukan tersembunyi

  BLOB
  8x91akjs...f4e2

```

```css
.blob-ref {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-accent);
  font-size: 10px;
}

.blob-label {
  background: var(--color-ash);
  color: var(--color-parchment);
  padding: 2px 5px;
  border: 1px solid var(--color-dust);
  border-radius: 0;
  letter-spacing: 0.1em;
}

.blob-id {
  color: var(--color-fog);
  letter-spacing: 0.05em;
}
```

### Tipping Panel

```css
.tip-panel {
  background: var(--color-ground);
  border: 1.5px solid var(--color-dust);
  border-top: 3px solid var(--color-signal); /* Aksen tebal di atas */
  border-radius: 0;
  padding: 20px;
}

.tip-amount-input {
  background: var(--color-bark);
  border: 1.5px solid var(--color-dust);
  border-radius: 0;
  color: var(--color-bone);
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  padding: 8px 12px;
  width: 100%;
  outline: none;
  text-align: right;
}

.tip-amount-input:focus {
  border-color: var(--color-bone);
}

.tip-currency {
  font-family: var(--font-accent);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-fog);
  margin-top: 4px;
  text-align: right;
}
```

---

## 10. Voice & Tone (Microcopy)

Kata-kata di UI harus mencerminkan desainnya.

| Konteks | Jangan | Gunakan |
|---|---|---|
| Empty state | "Nothing here yet! 🎉" | "Kosong. Tulis sesuatu." |
| Wallet connect | "Connect your wallet to get started" | "Hubungkan wallet. Mulai milik." |
| Post berhasil | "Your post was published successfully!" | "Terkirim. Tersimpan. Selamanya." |
| Loading | "Loading your feed..." | "Mengambil dari blob storage..." |
| NFT minted | "Your post is now an NFT!" | "Terdaftar di chain. Tidak bisa dihapus." |
| Error | "Oops! Something went wrong." | "Gagal. Coba lagi." |
| Like on-chain | "Liked!" | "Dicatat. [tx: 0x4f2a...]" |

**Aturan microcopy:**
- Kalimat pendek. Titik banyak. Tidak ada tanda seru berlebihan.
- Gunakan kalimat aktif dan langsung
- Referensi teknis boleh muncul — ini audiens Web3
- Tidak ada bahasa marketing yang berlebihan

---

## 11. Dark Mode Only

BlobCast tidak memiliki light mode.

Alasan:
- Konsistensi visual mutlak
- Earthy dark palette adalah identitas, bukan pilihan
- Konten teks on-dark lebih dramatis secara editorial

```css
:root {
  color-scheme: dark;
}

html, body {
  background: var(--color-ground);
  color: var(--color-bone);
}
```

---

## 12. Checklist Desainer

Sebelum ship, pastikan:

- [ ] Tidak ada `border-radius` lebih dari 6px tanpa justifikasi
- [ ] Grain overlay aktif di semua halaman
- [ ] Tidak ada font Inter, Roboto, Open Sans, atau Space Grotesk
- [ ] `--color-signal` muncul maksimal 2× per viewport
- [ ] Tidak ada gradien neon atau warna biru SaaS
- [ ] Avatar tidak berbentuk lingkaran sempurna
- [ ] Setiap post card menampilkan Walrus blob ID
- [ ] Microcopy mengikuti panduan voice & tone
- [ ] Animasi tidak lebih dari 0.15s
- [ ] Semua teks terbaca di atas `--color-ground`

---

*BlobCast Design System v1.0 — Untuk pertanyaan atau perubahan, refer ke arsitektur dokumen.*

> **Ingat:** Desain ini bukan tentang terlihat cantik. Ini tentang terlihat **nyata, berat, dan permanen** — seperti arsip yang tidak bisa dihapus.