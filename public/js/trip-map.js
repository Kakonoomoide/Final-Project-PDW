/**
 * Client-side halaman detail trip (M5): itinerary per hari + peta Leaflet.
 *
 * Endpoint yang dipake:
 *   GET  /api/trips/:id            - detail trip + itinerary versi terbaru
 *   POST /api/trips/:id/regenerate - bikin versi baru
 */

const tripId = window.location.pathname.split('/').pop();

const el = {};
let peta = null;
let lapisanAktif = null; // LayerGroup berisi marker + polyline hari yang lagi dipilih
let markerUser = null;
let dataHari = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  el.area = document.getElementById('trip-area');
  el.needLogin = document.getElementById('need-login');
  el.error = document.getElementById('trip-error');
  el.judul = document.getElementById('trip-judul');
  el.meta = document.getElementById('trip-meta');
  el.versi = document.getElementById('trip-versi');
  el.btnRegenerate = document.getElementById('btn-regenerate');
  el.ringkasDurasi = document.getElementById('ringkas-durasi');
  el.ringkasBiaya = document.getElementById('ringkas-biaya');
  el.ringkasOrang = document.getElementById('ringkas-orang');
  el.daftarHari = document.getElementById('daftar-hari');
  el.dayTabs = document.getElementById('day-tabs');
  el.mapKosong = document.getElementById('map-kosong');

  el.btnRegenerate.addEventListener('click', handleRegenerate);

  await muatTrip();
}

async function muatTrip() {
  try {
    const res = await fetch(`/api/trips/${tripId}`);

    if (res.status === 401) {
      el.needLogin.classList.remove('d-none');
      return;
    }

    const result = await res.json();

    // 404 di sini berarti dua hal yang sengaja gak dibedain: trip-nya
    // emang gak ada, ATAU ada tapi punya orang lain. Membedakan keduanya
    // sama aja ngasih tau orang bahwa ID itu ada dan milik siapa.
    if (!result.success) throw new Error(result.message);

    el.area.classList.remove('d-none');
    renderHeader(result.data.trip, result.data.itinerary);

    if (!result.data.itinerary) {
      return tampilkanError(
        result.data.trip.status === 'failed'
          ? `Itinerary belum berhasil dibuat: ${result.data.trip.lastError || 'penyebab tidak diketahui'}. Coba tekan "Buat Ulang".`
          : 'Itinerary belum dibuat. Tekan "Buat Ulang" untuk menyusunnya.'
      );
    }

    dataHari = result.data.itinerary.days;
    renderDaftarHari(dataHari);
    renderTabHari(dataHari);
    initPeta();
    tampilkanHari(1);

    // Sengaja TANPA await dan kegagalannya diabaikan: peta harus tampil
    // duluan, dan user yang nolak izin lokasi gak perlu dikasih tau
    // apa-apa di halaman ini - marker "kamu di sini" cuma bonus.
    tandaiPosisiUser();
  } catch (err) {
    el.area.classList.remove('d-none');
    tampilkanError(err.message);
  }
}

/* ==================== render ==================== */

function renderHeader(trip, itinerary) {
  document.title = `${trip.title} - TrAvelIt`;
  el.judul.textContent = trip.title;

  el.meta.innerHTML = `
    📍 ${escapeHtml(trip.destination)}
    ${trip.originCity ? `· dari ${escapeHtml(trip.originCity)}` : ''}
    · 🗓️ ${trip.startDate} → ${trip.endDate}`;

  el.ringkasDurasi.textContent = `${trip.durationDays} hari`;
  el.ringkasOrang.textContent = `${trip.travelerCount} orang`;

  if (itinerary) {
    el.versi.textContent = `Versi ${itinerary.version}`;
    el.ringkasBiaya.textContent = formatRupiah(itinerary.totalEstimatedCost);
  } else {
    el.versi.classList.add('d-none');
    el.ringkasBiaya.textContent = '–';
  }
}

function renderDaftarHari(days) {
  el.daftarHari.innerHTML = days
    .map((hari, index) => {
      const idHari = `hari-${hari.dayNumber}`;
      const totalHari = hari.activities.reduce((s, a) => s + a.estimatedCost, 0);

      return `
        <div class="accordion-item border-0 shadow-sm mb-2">
          <h2 class="accordion-header">
            <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button"
                    data-bs-toggle="collapse" data-bs-target="#${idHari}"
                    data-hari="${hari.dayNumber}">
              <div>
                <div class="fw-semibold">Hari ${hari.dayNumber} · ${hari.date || ''}</div>
                <div class="text-muted small">${escapeHtml(hari.summary)}</div>
              </div>
            </button>
          </h2>
          <div id="${idHari}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}"
               data-bs-parent="#daftar-hari">
            <div class="accordion-body pt-2">
              ${hari.activities.map(barisAktivitas).join('')}
              <div class="text-end small text-muted mt-2 pt-2 border-top">
                Total hari ini: <strong>${formatRupiah(totalHari)}</strong>
              </div>
            </div>
          </div>
        </div>`;
    })
    .join('');

  // Buka accordion hari mana pun -> peta ikut pindah ke hari itu, biar
  // daftar dan peta selalu nunjukin hari yang sama.
  el.daftarHari.querySelectorAll('[data-hari]').forEach((btn) => {
    btn.addEventListener('click', () => tampilkanHari(Number(btn.dataset.hari)));
  });
}

function barisAktivitas(act) {
  const ikon =
    { wisata: '🏝️', kuliner: '🍽️', transport: '🚗', penginapan: '🏨', lainnya: '📌' }[act.category] ||
    '📌';

  // Tiga kemungkinan status lokasi, masing-masing ditandai beda supaya
  // user tau mana yang bisa dipercaya dan mana yang perlu dicek sendiri.
  let lencanaLokasi = '';
  if (act.category !== 'transport') {
    if (act.placeVerified) {
      lencanaLokasi = '<span class="badge text-bg-light text-success border">✓ terverifikasi</span>';
    } else if (act.lat !== null) {
      lencanaLokasi =
        '<span class="badge text-bg-light text-warning border" title="Tidak ditemukan di OpenStreetMap, koordinatnya tebakan AI">⚠️ belum terverifikasi</span>';
    } else {
      lencanaLokasi = '<span class="badge text-bg-light text-muted border">📍 tanpa titik peta</span>';
    }
  }

  const jarak =
    act.distanceKmFromPrev !== null && act.distanceKmFromPrev !== undefined
      ? `<div class="text-muted" style="font-size:0.75rem;">↳ sekitar ${act.distanceKmFromPrev} km · ± ${act.travelMinutesFromPrev} menit dari sebelumnya</div>`
      : '';

  return `
    <div class="aktivitas py-2">
      ${jarak}
      <div class="d-flex gap-2">
        <div class="text-muted small flex-shrink-0" style="width: 3.2rem;">${act.startTime || '--:--'}</div>
        <div class="flex-grow-1">
          <div class="fw-semibold">${ikon} ${escapeHtml(act.name)}</div>
          <div class="text-muted small">${escapeHtml(act.description)}</div>
          <div class="d-flex flex-wrap gap-1 align-items-center mt-1">
            ${lencanaLokasi}
            <span class="badge text-bg-light text-muted border">${formatRupiah(act.estimatedCost)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function renderTabHari(days) {
  el.dayTabs.innerHTML = days
    .map(
      (hari) =>
        `<button class="btn btn-sm btn-outline-primary" data-tab="${hari.dayNumber}">Hari ${hari.dayNumber}</button>`
    )
    .join('');

  el.dayTabs.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => tampilkanHari(Number(btn.dataset.tab)));
  });
}

/* ==================== peta ==================== */

function initPeta() {
  peta = L.map('map', { scrollWheelZoom: false }); // scroll zoom mati biar
  // gulir halaman gak keserempet zoom pas kursor lewat peta

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    // Atribusi ini syarat lisensi ODbL OpenStreetMap, bukan pilihan.
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(peta);

  peta.setView([-2.5, 118], 4); // Indonesia, sebelum data hari pertama masuk
}

function tampilkanHari(dayNumber) {
  if (!peta) return;

  el.dayTabs.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.tab) === dayNumber);
  });

  const hari = dataHari.find((h) => h.dayNumber === dayNumber);
  if (!hari) return;

  const berkoordinat = hari.activities.filter((a) => a.lat !== null && a.lng !== null);

  // KASUS TEPI PENTING: kalau gak ada satu pun aktivitas berkoordinat,
  // JANGAN panggil fitBounds - getBounds() pada layer kosong melempar
  // error dan matiin seluruh script. Tampilan peta sebelumnya dibiarkan.
  if (berkoordinat.length === 0) {
    el.mapKosong.textContent = `Hari ${dayNumber} belum punya titik peta — tempat-tempatnya tidak ditemukan di OpenStreetMap.`;
    el.mapKosong.classList.remove('d-none');
    return;
  }

  el.mapKosong.classList.add('d-none');

  if (lapisanAktif) peta.removeLayer(lapisanAktif);

  const titik = berkoordinat.map((a) => [a.lat, a.lng]);
  const marker = berkoordinat.map((act) =>
    L.marker([act.lat, act.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="marker-nomor ${act.placeVerified ? '' : 'belum-verif'}">${act.orderNo}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
    }).bindPopup(
      `<strong>${escapeHtml(act.name)}</strong><br />
       ${act.startTime || '--:--'} · ${formatRupiah(act.estimatedCost)}
       ${act.placeVerified ? '' : '<br /><span style="color:#fd7e14">⚠️ lokasi belum terverifikasi</span>'}`
    )
  );

  const garis = L.polyline(titik, { color: '#0d6efd', weight: 2, opacity: 0.6, dashArray: '5,6' });

  lapisanAktif = L.layerGroup([garis, ...marker]).addTo(peta);
  peta.fitBounds(L.latLngBounds(titik), { padding: [30, 30], maxZoom: 15 });
}

async function tandaiPosisiUser() {
  try {
    const posisi = await window.GeoClient.minta();

    if (markerUser) peta.removeLayer(markerUser);

    markerUser = L.circleMarker([posisi.lat, posisi.lng], {
      radius: 7,
      color: '#fff',
      weight: 2,
      fillColor: '#198754',
      fillOpacity: 1,
    })
      .addTo(peta)
      .bindPopup('Kamu di sini');
  } catch {
    // Sengaja didiemin. User nolak izin lokasi itu pilihan yang sah, dan
    // marker ini cuma bonus - gak ada yang perlu dikeluhkan ke user.
  }
}

/* ==================== aksi ==================== */

async function handleRegenerate() {
  if (
    !confirm(
      'Buat ulang itinerary? Versi yang sekarang tetap tersimpan, jadi kamu tidak kehilangan apa-apa.\n\nProsesnya butuh 20-60 detik.'
    )
  ) {
    return;
  }

  el.btnRegenerate.disabled = true;
  el.btnRegenerate.textContent = 'Menyusun ulang…';

  try {
    const res = await fetch(`/api/trips/${tripId}/regenerate`, { method: 'POST' });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    window.location.reload();
  } catch (err) {
    tampilkanError('Gagal membuat ulang: ' + err.message);
    el.btnRegenerate.disabled = false;
    el.btnRegenerate.textContent = 'Buat Ulang';
  }
}

/* ==================== helper ==================== */

function tampilkanError(pesan) {
  el.error.textContent = pesan;
  el.error.classList.remove('d-none');
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(angka || 0);
}

/**
 * Nama tempat & deskripsi itu teks yang datang dari AI, dan dirakit
 * pakai innerHTML - harus di-escape dulu biar karakter kayak < atau >
 * tampil apa adanya, bukan ke-render jadi tag HTML.
 */
function escapeHtml(teks) {
  return String(teks == null ? '' : teks)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
