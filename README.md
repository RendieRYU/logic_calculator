# Kalkulator Logika

>Aplikasi web mandiri (single-page) untuk mem-parsing, mengevaluasi, dan menganalisis ekspresi logika boolean dengan tabel kebenaran, riwayat evaluasi, ekspor TXT, serta dukungan tema Gelap/Terang.

## 🔑 Fitur Utama
- Parser custom (tanpa library eksternal) dengan AST
- Operator lengkap: `NOT` `AND` `OR` `XOR` `NAND` `NOR` `XNOR/EQUIV` `IMPLIES`
- Bentuk alternatif simbol: `! ¬ & ∧ | ∨ ^ -> => <-> <=>`
- Konstanta: `TRUE FALSE 1 0`
- Deteksi variabel otomatis & kontrol nilai via checkbox
- Evaluasi ekspresi instan + Riwayat hasil (dengan assignment variabel)
- Tabel kebenaran (hingga 12 variabel untuk UI, 16 untuk ekspor CSV — bisa diatur) + ekspor ke CSV
- Toggle Tema (persisten via `localStorage` + deteksi preferensi sistem)
- Tombol pintasan operator & petunjuk sintaks interaktif
- Berbagi (share) ekspresi via parameter URL (`?expr=`)
- Validasi & pesan error sintaks yang jelas (posisi token bermasalah)
- Desain responsif & ringan (hanya HTML/CSS/JS murni)

## 🚀 Cara Cepat Mulai
1. Clone / salin folder, atau cukup unduh file.
2. Buka `index.html` langsung di browser modern (Chrome, Firefox, Edge, Safari).
3. Tulis ekspresi: contoh `(A AND B) -> NOT C`.
4. Atur nilai variabel dengan mencentang / mengosongkan checkbox.
5. Klik **Evaluasi** atau tekan tombol Enter (setelah fokus input) untuk melihat hasil.
6. Klik **Tabel Kebenaran** untuk menghasilkan tabel (hati‑hati: jumlah baris = 2^n variabel).
7. Klik **Ekspor CSV** bila butuh data tabel.
8. Klik **🔗** untuk salin URL yang menyertakan ekspresi.

## 🧠 Sintaks & Operator
| Operator | Alternatif | Arity | Deskripsi |
|----------|------------|-------|-----------|
| NOT      | ! ¬        | unary | Negasi |
| AND      | & ∧        | binary| Konjungsi |
| OR       | \| ∨       | binary| Disjungsi |
| XOR      | ^          | binary| Eksklusif OR |
| NAND     | —          | binary| Negasi AND |
| NOR      | —          | binary| Negasi OR |
| XNOR     | EQUIV <-> <=> | binary | Kesetaraan (ekuivalen) |
| IMPLIES  | -> =>      | binary| Implikasi (p → q) |

Konstanta: `TRUE, FALSE, 1, 0` (tidak peka huruf besar/kecil). Variabel: huruf/underscore diawali `[A-Za-z_]` dapat mengandung angka selanjutnya.

## ⚖️ Prioritas (Precedence) & Asosiativitas
1. `NOT`
2. `AND`, `NAND`
3. `XOR`
4. `OR`, `NOR`
5. `IMPLIES` (right-associative)
6. `EQUIV`, `XNOR`

`A -> B -> C` dibaca: `A -> (B -> C)`.

Gunakan tanda kurung `( )` untuk menegaskan grup jika ragu.

## ✍️ Contoh Ekspresi
| Ekspresi | Arti |
|----------|------|
| `NOT A OR B` | (¬A) ∨ B |
| `(A AND B) -> C` | Jika A dan B maka C |
| `A XOR B` | Benar jika tepat satu dari A,B benar |
| `A <-> B` | A ekuivalen B |
| `NAND (A OR B)` | Negasi dari (A ∨ B) |
| `(A AND (B -> C))` | A ∧ (B → C) |

## 🔍 Grammar (Ringkas / Pseudo EBNF)
```
expr        := equiv
equiv       := implies ( (EQUIV|XNOR) implies )*
implies     := or ( IMPLIES implies )?         // right associative
or          := xor ( (OR|NOR) xor )*
xor         := and ( XOR and )*
and         := primary ( (AND|NAND) primary )*
primary     := IDENT | CONST | NOT primary | '(' expr ')'
```

AST Node Types: `VAR {name}` · `CONST {value}` · unary `NOT {operand}` · binary `{type,left,right}` untuk semua operator lain.

## 🏗 Arsitektur Internal
1. Lexer: memindai string → token (regex dengan flag `y` untuk posisi presisi)
2. Parser: recursive descent + layer precedence (fungsi terpisah per level)
3. Evaluator: rekursif atas AST menghasilkan boolean
4. UI binding: pembaruan variabel, evaluasi, tabel kebenaran, riwayat
5. Ekspor: membangun CSV secara langsung (string join)

Kompleksitas evaluasi: O(n) terhadap jumlah node AST. Tabel kebenaran: O(2^k * n) (k = variabel unik).

## 📦 Ekspor CSV
Kolom: semua variabel (urut alfabet) + `Result`. Baris: 0..2^k - 1 dalam urutan biner. Simbol TRUE/FALSE dikonversi ke `1/0`.

## 🌐 Parameter URL
`?expr=...` → mengisi otomatis input ekspresi saat halaman dimuat.
Contoh: `index.html?expr=(A%20AND%20B)->C`

## 🕶 Tema
Disimpan di `localStorage (logicTheme)`; pilihan: `light` / `dark`. Default: mengikuti sistem (`prefers-color-scheme`).

## 🧾 Riwayat
Setiap evaluasi sukses masuk daftar (maks 25, newest on top) format: `[Badge T/F] Ekspresi (assignment variabel)`. Tidak tersimpan permanen (volatile per sesi tab).

## ⚙️ Menambah Operator Baru (Contoh: `NORX` prioritas sama OR)
1. Tambahkan regex token di `tokenSpec`.
2. Sisipkan di level parser yang sesuai (`parseOr`).
3. Tambah case di `evalAst`.
4. Perbarui README & tombol pintasan (opsional) + daftar bantuan.

## 🚫 Batas & Pertimbangan
- Tabel kebenaran eksponensial: 12 variabel = 4096 baris (masih aman). >12 dibatasi di UI untuk menjaga performa.
- Tidak ada minimization / simplification boolean bawaan (lihat Roadmap).
- Tidak mem-parsing operator custom yang belum didefinisikan.

## 🧩 Troubleshooting
| Masalah | Penyebab Umum | Solusi |
|---------|---------------|--------|
| "Token tidak dikenal" | Salah ketik simbol / karakter asing | Cek ejaan / hilangkan karakter | 
| Hasil selalu FALSE | Variabel tidak dicentang atau logika benar-benar false | Periksa checkbox variabel |
| Tabel kosong | AST gagal dibuat | Lihat pesan error sintaks |
| Ekspor kosong | Belum ada AST / terlalu banyak variabel | Masukkan ekspresi valid & kurangi variabel |

## 🛣 Roadmap (Ide Lanjutan)
- Penyederhanaan ekspresi (aljabar boolean / Quine-McCluskey / Karnaugh)
- Highlight sintaks + penandaan error inline (caret)
- Visualisasi AST
- Mode langkah evaluasi (step-by-step)
- Penyimpanan koleksi ekspresi (local persistence)
- Ekspor gambar (PNG/SVG) untuk tabel kebenaran
- Generator ekspresi acak untuk latihan

## 🤝 Kontribusi
Pull request & saran dipersilakan. Langkah umum:
1. Fork & buat branch fitur.
2. Lakukan perubahan terfokus.
3. Uji di browser utama.
4. Update README bila mengubah perilaku publik.
5. Ajukan PR dengan deskripsi jelas.

