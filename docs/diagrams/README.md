# Diagram Perancangan Sistem — TrAvelIt

Lima diagram UML/ERD yang menggambarkan sistem ini, ditulis dalam Mermaid.
Semuanya dibuat dari kode yang benar-benar ada di repo — bukan rancangan
di atas kertas — jadi kalau kodenya berubah, diagramnya ikut perlu diperbarui.

| Diagram | File | Isi |
| --- | --- | --- |
| Use Case | [`use-case.md`](./use-case.md) | Aktor & use case, lengkap dengan «include» / «extend» |
| Activity | [`activity-generate-itinerary.md`](./activity-generate-itinerary.md) | Alur generate itinerary + dua decision node |
| Class | [`class-diagram.md`](./class-diagram.md) | Domain, layanan aplikasi, integrasi eksternal |
| Sequence | [`sequence-generate-itinerary.md`](./sequence-generate-itinerary.md) | `POST /api/trips/generate` ujung ke ujung |
| ERD | [`erd.md`](./erd.md) | 9 tabel beserta relasinya |

Tiap diagram punya tiga bentuk:

- **`.md`** — buka di VS Code lalu tekan `Ctrl+Shift+V` untuk pratinjau.
  Ini juga yang ter-render otomatis di GitHub.
- **`.mmd`** — kode Mermaid mentah, untuk dipakai di
  [mermaid.live](https://mermaid.live), `mmdc`, atau CI.
- **`.png`** — hasil render, siap ditempel ke laporan atau slide.

Isi `.md` dan `.mmd` dijamin identik — file `.md` di-generate dari `.mmd`.

## Menempel ke laporan atau PPT

Pakai file `.png` yang sudah ada. Kalau butuh resolusi lebih tinggi
(misalnya untuk dicetak), render ulang dengan skala lebih besar:

```bash
npx -y @mermaid-js/mermaid-cli -i docs/diagrams/erd.mmd -o erd.png -b white -s 3
```

Untuk mengedit lebih enak secara visual, tempel isi `.mmd` ke
[mermaid.live](https://mermaid.live), ubah di sana, lalu salin balik.

## Kalau kode berubah, perbarui yang mana

| Kalau kamu mengubah… | Perbarui diagram |
| --- | --- |
| File di `models/` | ERD dan Class |
| Endpoint di `routes/` | Use Case |
| Alur di `services/trip.service.js` | Activity dan Sequence |
| Aturan validasi di `services/itinerarySchema.js` | Activity (DECISION 2) |

Render ulang semuanya sekaligus:

```bash
cd docs/diagrams
for f in *.mmd; do
  npx -y @mermaid-js/mermaid-cli -i "$f" -o "${f%.mmd}.png" -b white
done
```

## Catatan kecil

Emoji sengaja tidak dipakai di label node. Mermaid CLI merender emoji
sebagai kotak kosong saat mengekspor PNG, walaupun di pratinjau VS Code
tampil normal — jadi supaya hasil cetaknya bersih, emojinya dihilangkan.
