/**
 * Client-side fitur M5: chat konsultasi pertanian + deteksi hama/penyakit
 * lewat foto. Vanilla JS, polanya sama kayak file JS lain di project ini:
 * fetch ke API -> render manual ke DOM.
 *
 * Endpoint yang dipake (semuanya butuh login):
 *   GET    /api/chat/history  - riwayat obrolan
 *   POST   /api/chat          - kirim pesan teks
 *   POST   /api/chat/detect   - kirim foto buat dianalisa
 *   DELETE /api/chat/history  - reset obrolan
 */

// Ukuran maksimal sisi terpanjang foto sebelum dikirim. Foto dari HP
// gampang 3-5MB, padahal buat diagnosis daun gak butuh resolusi segitu.
// Dikecilin dulu di browser biar upload-nya cepet & gak nabrak limit body.
const MAX_DIMENSI_FOTO = 1024;
const KUALITAS_JPEG = 0.8;

const el = {};
let fotoTerpilih = null; // data URL foto yang udah dikecilin, siap dikirim
let lagiProses = false; // ngunci tombol biar gak dobel-kirim

document.addEventListener('DOMContentLoaded', init);

async function init() {
  el.box = document.getElementById('chat-box');
  el.area = document.getElementById('chat-area');
  el.needLogin = document.getElementById('need-login');
  el.error = document.getElementById('chat-error');
  el.form = document.getElementById('chat-form');
  el.input = document.getElementById('chat-input');
  el.btnSend = document.getElementById('btn-send');
  el.btnClear = document.getElementById('btn-clear');
  el.fotoInput = document.getElementById('foto-input');
  el.fotoNote = document.getElementById('foto-note');
  el.btnDetect = document.getElementById('btn-detect');
  el.previewWrap = document.getElementById('foto-preview-wrap');
  el.preview = document.getElementById('foto-preview');

  el.form.addEventListener('submit', handleKirimPesan);
  el.btnClear.addEventListener('click', handleHapusRiwayat);
  el.fotoInput.addEventListener('change', handlePilihFoto);
  el.btnDetect.addEventListener('click', handleAnalisaFoto);

  // Enter = kirim, Shift+Enter = ganti baris (kebiasaan umum aplikasi chat)
  el.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      el.form.requestSubmit();
    }
  });

  await muatRiwayat();
}

/* ================== ambil & tampilkan riwayat ================== */

async function muatRiwayat() {
  try {
    const res = await fetch('/api/chat/history');
    const result = await res.json();

    // 401 = belum login. Form chat disembunyiin, diganti ajakan login.
    if (res.status === 401) {
      el.needLogin.classList.remove('d-none');
      return;
    }
    if (!result.success) throw new Error(result.message);

    el.area.classList.remove('d-none');

    if (result.data.length === 0) {
      tampilkanSambutan();
    } else {
      result.data.forEach((pesan) =>
        tambahBubble(pesan.role, pesan.content, { hasImage: pesan.hasImage, scroll: false })
      );
      el.btnClear.hidden = false;
    }

    scrollKeBawah();
  } catch (err) {
    tampilkanError('Gagal memuat riwayat chat: ' + err.message);
  }
}

function tampilkanSambutan() {
  tambahBubble(
    'model',
    'Halo! 👋 Saya asisten penyuluh Tani Makmur.\n\n' +
      'Silakan tanya apa saja soal pertanian — mulai dari pemilihan bibit, ' +
      'pemupukan, sampai cara ngatasin hama.\n\n' +
      'Kalau tanamanmu keliatan sakit, upload fotonya di bawah, nanti saya ' +
      'bantu deteksi hama atau penyakitnya. 🌱',
    { scroll: false }
  );
}

/* ================== kirim pesan teks ================== */

async function handleKirimPesan(e) {
  e.preventDefault();
  if (lagiProses) return;

  const pesan = el.input.value.trim();
  if (!pesan) return;

  tambahBubble('user', pesan);
  el.input.value = '';
  setProses(true);

  const loading = tambahLoading('Sedang mengetik');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: pesan }),
    });
    const result = await res.json();

    loading.remove();
    if (!result.success) throw new Error(result.message);

    tambahBubble('model', result.data.reply);
    el.btnClear.hidden = false;
  } catch (err) {
    loading.remove();
    tambahBubble('model', '⚠️ Gagal dapat balasan: ' + err.message);
  } finally {
    setProses(false);
    el.input.focus();
  }
}

/* ================== deteksi hama/penyakit dari foto ================== */

function handlePilihFoto() {
  const file = el.fotoInput.files[0];

  if (!file) {
    resetFoto();
    return;
  }

  // Dikecilin dulu SEBELUM dikirim, bukan pas mau dikirim, biar preview
  // yang muncul persis sama dengan yang bakal dianalisa AI.
  kecilkanFoto(file)
    .then((dataUrl) => {
      fotoTerpilih = dataUrl;
      el.preview.src = dataUrl;
      el.previewWrap.classList.remove('d-none');
      el.btnDetect.disabled = false;
    })
    .catch(() => {
      resetFoto();
      tampilkanError('Fotonya gagal dibaca, coba pilih file gambar yang lain.');
    });
}

/**
 * Baca file gambar -> gambar ulang ke <canvas> dengan ukuran lebih kecil
 * -> ekspor jadi JPEG base64 (data URL). Rasio aslinya dijaga, cuma sisi
 * terpanjang yang dibatasi MAX_DIMENSI_FOTO.
 */
function kecilkanFoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();

      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        const skala = Math.min(1, MAX_DIMENSI_FOTO / Math.max(width, height));
        width = Math.round(width * skala);
        height = Math.round(height * skala);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', KUALITAS_JPEG));
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

async function handleAnalisaFoto() {
  if (lagiProses || !fotoTerpilih) return;

  const catatan = el.fotoNote.value.trim();
  const fotoDikirim = fotoTerpilih;

  tambahBubble('user', catatan ? '📷 Foto tanaman — ' + catatan : '📷 Foto tanaman dikirim', {
    hasImage: true,
    previewSrc: fotoDikirim,
  });

  setProses(true);
  const loading = tambahLoading('Sedang menganalisa foto');

  try {
    const res = await fetch('/api/chat/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: fotoDikirim, note: catatan }),
    });
    const result = await res.json();

    loading.remove();
    if (!result.success) throw new Error(result.message);

    tambahBubble('model', result.data.reply);
    el.btnClear.hidden = false;
    resetFoto();
    el.fotoNote.value = '';
  } catch (err) {
    loading.remove();
    tambahBubble('model', '⚠️ Gagal menganalisa foto: ' + err.message);
  } finally {
    setProses(false);
  }
}

function resetFoto() {
  fotoTerpilih = null;
  el.fotoInput.value = '';
  el.preview.removeAttribute('src');
  el.previewWrap.classList.add('d-none');
  el.btnDetect.disabled = true;
}

/* ================== hapus riwayat ================== */

async function handleHapusRiwayat() {
  if (!confirm('Hapus semua riwayat chat? Obrolan sebelumnya gak bisa dibalikin.')) return;

  try {
    const res = await fetch('/api/chat/history', { method: 'DELETE' });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    el.box.innerHTML = '';
    el.btnClear.hidden = true;
    tampilkanSambutan();
  } catch (err) {
    tampilkanError('Gagal menghapus riwayat: ' + err.message);
  }
}

/* ================== helper tampilan ================== */

/**
 * Balasan Gemini formatnya markdown ringan (**tebal**, list bernomor).
 * Gak dipasang library markdown biar gak nambah dependency - cukup
 * tangani **tebal** aja, sisanya udah kebaca rapi berkat
 * `white-space: pre-wrap` di CSS.
 *
 * Teksnya di-escape DULUAN sebelum diubah jadi HTML, biar kalo balasan
 * AI (atau pesan user) ngandung karakter kayak < atau >, itu tampil apa
 * adanya, bukan ke-render jadi tag HTML beneran.
 */
function formatPesan(teks) {
  const aman = teks
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return aman.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function tambahBubble(role, teks, options) {
  const opts = options || {};
  const previewSrc = opts.previewSrc || null;
  const scroll = opts.scroll !== false;
  const dariUser = role === 'user';

  const wrap = document.createElement('div');
  wrap.className = 'd-flex mb-3 ' + (dariUser ? 'justify-content-end' : 'justify-content-start');

  const bubble = document.createElement('div');
  bubble.className = 'bubble rounded-3 px-3 py-2 ' + (dariUser ? 'bubble-user' : 'bubble-ai');

  // Foto cuma ditampilin buat pesan yang baru dikirim di sesi ini.
  // Riwayat lama gak nyimpen gambarnya (liat models/chatMessage.model.js),
  // jadi pas halaman di-refresh yang kebaca tinggal teksnya aja.
  if (previewSrc && dariUser) {
    const img = document.createElement('img');
    img.src = previewSrc;
    img.className = 'img-fluid rounded mb-2 d-block';
    img.style.maxHeight = '160px';
    img.alt = 'Foto tanaman';
    bubble.appendChild(img);
  }

  const isi = document.createElement('div');
  isi.innerHTML = formatPesan(teks);
  bubble.appendChild(isi);

  wrap.appendChild(bubble);
  el.box.appendChild(wrap);

  if (scroll) scrollKeBawah();
  return wrap;
}

function tambahLoading(label) {
  const wrap = document.createElement('div');
  wrap.className = 'd-flex mb-3 justify-content-start';
  wrap.innerHTML =
    '<div class="bubble bubble-ai rounded-3 px-3 py-2 text-muted small">' +
    '<span class="spinner-border spinner-border-sm me-2"></span>' +
    label +
    '...</div>';

  el.box.appendChild(wrap);
  scrollKeBawah();
  return wrap;
}

// Ngunci tombol kirim & analisa selama nunggu balasan AI, biar user gak
// nge-spam request (tiap request itu manggil API Gemini beneran).
function setProses(aktif) {
  lagiProses = aktif;
  el.btnSend.disabled = aktif;
  el.btnDetect.disabled = aktif || !fotoTerpilih;
  el.input.disabled = aktif;
}

function scrollKeBawah() {
  el.box.scrollTop = el.box.scrollHeight;
}

function tampilkanError(pesan) {
  el.error.textContent = pesan;
  el.error.classList.remove('d-none');
}
