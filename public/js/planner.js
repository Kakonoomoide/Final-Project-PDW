/**
 * Client-side halaman planner (M5): form preferensi + daftar rencana
 * perjalanan. Vanilla JS, polanya sama kayak file JS lain di project ini:
 * fetch ke API -> render manual ke DOM.
 *
 * Endpoint yang dipake (semuanya butuh login):
 *   GET    /api/trips           - daftar trip punya user
 *   POST   /api/trips/generate  - bikin trip + itinerary versi 1
 *   POST   /api/trips/:id/regenerate - bikin versi baru (tombol "coba lagi")
 *   DELETE /api/trips/:id       - hapus trip
 *   GET    /api/geo/reverse     - koordinat -> nama kota (tombol 📍)
 */

const PILIHAN_MINAT = [
  'pantai',
  'gunung',
  'budaya',
  'kuliner',
  'belanja',
  'alam',
  'sejarah',
  'santai',
];

const MAX_MINAT = 8;
const MAX_DURASI_HARI = 14;

const el = {};
let lagiProses = false;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  el.area = document.getElementById('planner-area');
  el.needLogin = document.getElementById('need-login');
  el.error = document.getElementById('planner-error');
  el.form = document.getElementById('planner-form');
  el.destinasi = document.getElementById('destinasi');
  el.asal = document.getElementById('asal');
  el.btnLokasi = document.getElementById('btn-lokasi');
  el.lokasiStatus = document.getElementById('lokasi-status');
  el.mulai = document.getElementById('mulai');
  el.selesai = document.getElementById('selesai');
  el.durasiInfo = document.getElementById('durasi-info');
  el.budget = document.getElementById('budget');
  el.jumlah = document.getElementById('jumlah');
  el.minatWrap = document.getElementById('minat-wrap');
  el.pace = document.getElementById('pace');
  el.kebutuhan = document.getElementById('kebutuhan');
  el.btnGenerate = document.getElementById('btn-generate');
  el.daftar = document.getElementById('daftar-trip');
  el.jumlahTrip = document.getElementById('jumlah-trip');
  el.overlay = document.getElementById('loading-overlay');

  renderChipMinat();
  setTanggalMinimum();

  el.form.addEventListener('submit', handleSubmit);
  el.btnLokasi.addEventListener('click', handlePakaiLokasi);
  el.mulai.addEventListener('change', perbaruiInfoDurasi);
  el.selesai.addEventListener('change', perbaruiInfoDurasi);

  await muatDaftarTrip();
}

/* ==================== form ==================== */

function renderChipMinat() {
  el.minatWrap.innerHTML = PILIHAN_MINAT.map(
    (minat) => `
      <span class="chip">
        <input type="checkbox" id="minat-${minat}" value="${minat}" />
        <label for="minat-${minat}">${minat}</label>
      </span>`
  ).join('');

  // Batasi jumlah centang di sisi browser juga, biar user langsung tau
  // batasnya - server tetep validasi ulang (jangan pernah percaya
  // sepenuhnya sama validasi di browser).
  el.minatWrap.addEventListener('change', () => {
    const terpilih = ambilMinat();
    el.minatWrap.querySelectorAll('input').forEach((input) => {
      input.disabled = !input.checked && terpilih.length >= MAX_MINAT;
    });
  });
}

function ambilMinat() {
  return Array.from(el.minatWrap.querySelectorAll('input:checked')).map((i) => i.value);
}

function setTanggalMinimum() {
  const hariIni = new Date().toISOString().slice(0, 10);
  el.mulai.min = hariIni;
  el.selesai.min = hariIni;
}

function hitungDurasi(mulai, selesai) {
  if (!mulai || !selesai) return null;
  const a = new Date(`${mulai}T00:00:00Z`);
  const b = new Date(`${selesai}T00:00:00Z`);
  return Math.round((b - a) / 86400000) + 1; // inklusif
}

function perbaruiInfoDurasi() {
  // Tanggal selesai gak boleh sebelum tanggal mulai - dikunci lewat
  // atribut min, jadi date picker-nya sendiri yang nyegah.
  if (el.mulai.value) el.selesai.min = el.mulai.value;

  const durasi = hitungDurasi(el.mulai.value, el.selesai.value);

  if (durasi === null) {
    el.durasiInfo.textContent = `Maksimal ${MAX_DURASI_HARI} hari.`;
    el.durasiInfo.className = 'form-text mb-3';
    return;
  }

  if (durasi < 1) {
    el.durasiInfo.textContent = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
    el.durasiInfo.className = 'form-text mb-3 text-danger';
  } else if (durasi > MAX_DURASI_HARI) {
    el.durasiInfo.textContent = `${durasi} hari — terlalu panjang, maksimal ${MAX_DURASI_HARI} hari.`;
    el.durasiInfo.className = 'form-text mb-3 text-danger';
  } else {
    el.durasiInfo.textContent = `${durasi} hari perjalanan.`;
    el.durasiInfo.className = 'form-text mb-3 text-success';
  }
}

/* ==================== geolocation ==================== */

async function handlePakaiLokasi() {
  el.btnLokasi.disabled = true;
  setStatusLokasi('Mendeteksi lokasi…', 'text-muted');

  try {
    const posisi = await window.GeoClient.minta();
    const lokasi = await window.GeoClient.reverse(posisi.lat, posisi.lng);

    el.asal.value = lokasi.city;
    setStatusLokasi(`Terdeteksi: ${lokasi.city}. Bisa diubah manual kalau keliru.`, 'text-success');
  } catch (err) {
    // Kegagalan geolocation ditampilin sebagai teks kecil di bawah field,
    // BUKAN alert() - ini fitur opsional, gak pantes nyetop user. Field-nya
    // tetep bisa diketik manual.
    setStatusLokasi(err.message, 'text-warning');
  } finally {
    el.btnLokasi.disabled = false;
  }
}

function setStatusLokasi(pesan, kelasWarna) {
  el.lokasiStatus.textContent = pesan;
  el.lokasiStatus.className = `form-text ${kelasWarna}`;
}

/* ==================== daftar trip ==================== */

async function muatDaftarTrip() {
  try {
    const res = await fetch('/api/trips');

    // 401 = belum login. Form disembunyiin, diganti ajakan login.
    if (res.status === 401) {
      el.needLogin.classList.remove('d-none');
      return;
    }

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    el.area.classList.remove('d-none');
    renderDaftarTrip(result.data);
  } catch (err) {
    el.area.classList.remove('d-none');
    tampilkanError('Gagal memuat daftar rencana: ' + err.message);
  }
}

function renderDaftarTrip(trips) {
  el.jumlahTrip.textContent = trips.length;

  if (trips.length === 0) {
    el.daftar.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-body text-center text-muted py-5">
          <div class="mb-2" style="font-size: 2rem;">🧭</div>
          Belum ada rencana perjalanan.<br />
          Isi formulir di sebelah buat bikin yang pertama.
        </div>
      </div>`;
    return;
  }

  el.daftar.innerHTML = trips.map(kartuTrip).join('');

  el.daftar.querySelectorAll('[data-hapus]').forEach((btn) => {
    btn.addEventListener('click', () => handleHapus(btn.dataset.hapus));
  });
  el.daftar.querySelectorAll('[data-ulang]').forEach((btn) => {
    btn.addEventListener('click', () => handleCobaLagi(btn.dataset.ulang));
  });
}

function kartuTrip(trip) {
  const lencana = {
    generated: '<span class="badge text-bg-success">Siap</span>',
    draft: '<span class="badge text-bg-secondary">Draf</span>',
    failed: '<span class="badge text-bg-danger">Gagal</span>',
  }[trip.status] || '';

  const gagal =
    trip.status === 'failed'
      ? `<div class="alert alert-danger py-2 px-3 small mt-2 mb-0">
           ${escapeHtml(trip.lastError || 'Gagal membuat itinerary')}
           <button class="btn btn-sm btn-outline-danger ms-2" data-ulang="${trip.id}">Coba lagi</button>
         </div>`
      : '';

  const judulnya =
    trip.status === 'generated'
      ? `<a href="/trip/${trip.id}" class="stretched-link text-decoration-none">${escapeHtml(trip.title)}</a>`
      : escapeHtml(trip.title);

  return `
    <div class="card border-0 shadow-sm mb-2 position-relative">
      <div class="card-body py-3">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">${judulnya}</div>
            <div class="text-muted small">
              📍 ${escapeHtml(trip.destination)}
              ${trip.originCity ? `· dari ${escapeHtml(trip.originCity)}` : ''}
            </div>
            <div class="text-muted small">
              🗓️ ${trip.startDate} → ${trip.endDate} (${trip.durationDays} hari)
              · 👥 ${trip.travelerCount} orang
              · 💰 ${formatRupiah(trip.budget)}
            </div>
          </div>
          <div class="d-flex align-items-center gap-2 flex-shrink-0" style="z-index: 2;">
            ${lencana}
            <button class="btn btn-sm btn-outline-secondary" data-hapus="${trip.id}" title="Hapus">🗑️</button>
          </div>
        </div>
        ${gagal}
      </div>
    </div>`;
}

/* ==================== aksi ==================== */

async function handleSubmit(e) {
  e.preventDefault();
  if (lagiProses) return;

  const durasi = hitungDurasi(el.mulai.value, el.selesai.value);
  if (durasi < 1 || durasi > MAX_DURASI_HARI) {
    return tampilkanError(
      durasi < 1
        ? 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
        : `Durasi perjalanan maksimal ${MAX_DURASI_HARI} hari.`
    );
  }

  sembunyikanError();
  setProses(true);

  try {
    const res = await fetch('/api/trips/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: el.destinasi.value.trim(),
        originCity: el.asal.value.trim() || null,
        startDate: el.mulai.value,
        endDate: el.selesai.value,
        budget: Number(el.budget.value),
        travelerCount: Number(el.jumlah.value) || 1,
        interests: ambilMinat(),
        pace: el.pace.value,
        specialNeeds: el.kebutuhan.value.trim() || null,
      }),
    });

    const result = await res.json();

    if (!result.success) {
      // Generate gagal tapi trip-nya tetep kesimpen. Daftar dimuat ulang
      // biar kartunya muncul dengan tombol "coba lagi" - jadi isian
      // formulirnya gak kebuang percuma.
      await muatDaftarTrip();
      throw new Error(result.message);
    }

    window.location.href = `/trip/${result.data.trip.id}`;
  } catch (err) {
    tampilkanError('Gagal menyusun itinerary: ' + err.message);
  } finally {
    setProses(false);
  }
}

async function handleCobaLagi(id) {
  if (lagiProses) return;

  sembunyikanError();
  setProses(true);

  try {
    const res = await fetch(`/api/trips/${id}/regenerate`, { method: 'POST' });
    const result = await res.json();

    if (!result.success) throw new Error(result.message);

    window.location.href = `/trip/${id}`;
  } catch (err) {
    await muatDaftarTrip();
    tampilkanError('Masih gagal: ' + err.message);
  } finally {
    setProses(false);
  }
}

async function handleHapus(id) {
  if (!confirm('Hapus rencana ini? Semua versi itinerary-nya ikut terhapus dan gak bisa dibalikin.')) {
    return;
  }

  try {
    const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    await muatDaftarTrip();
  } catch (err) {
    tampilkanError('Gagal menghapus: ' + err.message);
  }
}

/* ==================== helper tampilan ==================== */

function setProses(aktif) {
  lagiProses = aktif;
  el.btnGenerate.disabled = aktif;
  el.overlay.classList.toggle('tampil', aktif);
}

function tampilkanError(pesan) {
  el.error.textContent = pesan;
  el.error.classList.remove('d-none');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function sembunyikanError() {
  el.error.classList.add('d-none');
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(angka || 0);
}

/**
 * Judul & nama tujuan itu teks dari user, dan kartunya dirakit pakai
 * innerHTML - jadi harus di-escape dulu, kalau nggak judul yang
 * ngandung tag HTML bakal ke-render beneran.
 */
function escapeHtml(teks) {
  return String(teks == null ? '' : teks)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
