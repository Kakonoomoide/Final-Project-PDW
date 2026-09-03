/**
 * admin-destinations.js
 * Logika Frontend CRUD Destinasi Wisata + Integrasi Gemini AI Deskripsi
 * (Jobdesk M4).
 *
 * Asalnya `admin-products.js`. Struktur & pola aslinya dipertahankan,
 * yang berubah cuma pemetaan skemanya:
 *   price -> ticketPrice
 *   stock -> DIBUANG, diganti status "sudah dipetakan / belum"
 *   baru  -> city, province, lat, lng
 */

// State Aplikasi
let allDestinations = [];
let currentEditingId = null;
let currentDeletingId = null;
let destinationModalInstance = null;
let viewModalInstance = null;
let deleteModalInstance = null;

// Format Rupiah
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number || 0);
}

// Format Tanggal
function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Badge Kategori
function getCategoryBadge(category) {
  const cat = (category || '').toLowerCase();
  switch (cat) {
    case 'pantai':
      return '<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1"><i class="bi bi-water me-1"></i>Pantai</span>';
    case 'gunung':
      return '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-triangle-fill me-1"></i>Gunung</span>';
    case 'budaya':
      return '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1"><i class="bi bi-bank me-1"></i>Budaya</span>';
    case 'kuliner':
      return '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i class="bi bi-cup-hot me-1"></i>Kuliner</span>';
    case 'taman':
      return '<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1"><i class="bi bi-tree me-1"></i>Taman</span>';
    default:
      return `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1"><i class="bi bi-tag me-1"></i>${escapeHtml(category || 'Lainnya')}</span>`;
  }
}

/**
 * Menggantikan badge stok dari versi produk. Destinasi gak punya stok,
 * yang penting justru: titik petanya udah ada atau belum. Destinasi
 * tanpa koordinat gak bisa diplot di peta mana pun.
 */
function getMapBadge(destination) {
  const punyaTitik = destination.lat !== null && destination.lat !== undefined;
  return punyaTitik
    ? '<span class="badge bg-success"><i class="bi bi-pin-map-fill me-1"></i>Dipetakan</span>'
    : '<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>Belum</span>';
}

// Sanitize HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toast Notifikasi
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const bgClass =
    type === 'success'
      ? 'text-bg-success'
      : type === 'danger'
        ? 'text-bg-danger'
        : type === 'warning'
          ? 'text-bg-warning'
          : 'text-bg-primary';

  const iconClass =
    type === 'success'
      ? 'bi-check-circle-fill'
      : type === 'danger'
        ? 'bi-exclamation-triangle-fill'
        : type === 'warning'
          ? 'bi-exclamation-circle-fill'
          : 'bi-info-circle-fill';

  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${iconClass} fs-5"></i>
          <div>${escapeHtml(message)}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
  bsToast.show();

  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// Fetch & Render Statistik
async function loadStats() {
  try {
    const res = await fetch('/api/destinations/stats');
    const result = await res.json();

    if (result.success && result.data) {
      const { totalDestinations, berkoordinat, tanpaKoordinat, rataHargaTiket } = result.data;

      const set = (id, nilai) => {
        const el = document.getElementById(id);
        if (el) el.textContent = nilai;
      };

      set('stat-total-destinations', totalDestinations || 0);
      set('stat-mapped', berkoordinat || 0);
      set('stat-unmapped', tanpaKoordinat || 0);
      set('stat-avg-price', formatRupiah(rataHargaTiket || 0));
    }
  } catch (err) {
    console.error('Gagal mengambil statistik:', err);
  }
}

// Fetch & Render Daftar Destinasi
async function loadDestinations() {
  const tbody = document.getElementById('destinations-table-body');
  const loadingIndicator = document.getElementById('destinations-loading');
  const emptyState = document.getElementById('destinations-empty');

  if (loadingIndicator) loadingIndicator.classList.remove('d-none');
  if (emptyState) emptyState.classList.add('d-none');
  if (tbody) tbody.innerHTML = '';

  const search = document.getElementById('filter-search')?.value.trim() || '';
  const category = document.getElementById('filter-category')?.value || '';
  const sortBy = document.getElementById('filter-sort')?.value || 'createdAt';
  const sortOrder = document.getElementById('filter-order')?.value || 'DESC';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category && category !== 'all') params.append('category', category);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  try {
    const res = await fetch(`/api/destinations?${params.toString()}`);
    const result = await res.json();

    if (loadingIndicator) loadingIndicator.classList.add('d-none');

    if (result.success && Array.isArray(result.data)) {
      allDestinations = result.data;
      renderTable(allDestinations);
      loadStats();
    } else if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat data destinasi: ${escapeHtml(result.message || 'Terjadi kesalahan')}</td></tr>`;
    }
  } catch (err) {
    if (loadingIndicator) loadingIndicator.classList.add('d-none');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error koneksi: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

// Render Data ke Table HTML
function renderTable(destinations) {
  const tbody = document.getElementById('destinations-table-body');
  const emptyState = document.getElementById('destinations-empty');
  const countBadge = document.getElementById('destination-count-badge');

  if (countBadge) countBadge.textContent = `${destinations.length} destinasi`;

  if (!destinations || destinations.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  if (emptyState) emptyState.classList.add('d-none');

  const defaultImg = 'https://placehold.co/100x100/e9ecef/495057?text=%F0%9F%93%8D';

  let html = '';
  destinations.forEach((d, idx) => {
    const imgSrc = d.imageUrl && d.imageUrl.trim() !== '' ? d.imageUrl : defaultImg;
    const authorName = d.author ? d.author.name : 'Admin';
    const lokasi = [d.city, d.province].filter(Boolean).join(', ');

    html += `
      <tr>
        <td class="text-center align-middle text-muted fw-semibold">${idx + 1}</td>
        <td class="align-middle">
          <div class="d-flex align-items-center gap-3">
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(d.name)}"
                 class="rounded border object-fit-cover shadow-sm" style="width: 50px; height: 50px;"
                 onerror="this.src='${defaultImg}'" />
            <div>
              <div class="fw-bold text-dark text-break">${escapeHtml(d.name)}</div>
              <small class="text-muted d-block text-truncate" style="max-width: 260px;">
                ${d.description ? escapeHtml(d.description) : '<em>Tanpa deskripsi</em>'}
              </small>
              <small class="text-muted d-block"><i class="bi bi-person me-1"></i>${escapeHtml(authorName)} · ${formatDate(d.updatedAt || d.createdAt)}</small>
            </div>
          </div>
        </td>
        <td class="align-middle">${getCategoryBadge(d.category)}</td>
        <td class="align-middle small text-secondary">${escapeHtml(lokasi || '-')}</td>
        <td class="align-middle fw-bold text-primary-emphasis">${d.ticketPrice > 0 ? formatRupiah(d.ticketPrice) : '<span class="text-success">Gratis</span>'}</td>
        <td class="align-middle">${getMapBadge(d)}</td>
        <td class="align-middle text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button type="button" class="btn btn-outline-info" title="Lihat Detail" onclick="openViewModal(${d.id})">
              <i class="bi bi-eye"></i>
            </button>
            <button type="button" class="btn btn-outline-primary" title="Edit Destinasi" onclick="openEditModal(${d.id})">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button type="button" class="btn btn-outline-danger" title="Hapus Destinasi" onclick="openDeleteModal(${d.id}, '${escapeHtml(d.name).replace(/'/g, "\\'")}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  if (tbody) tbody.innerHTML = html;
}

// Buka Modal Tambah Destinasi
function openCreateModal() {
  currentEditingId = null;
  const form = document.getElementById('destination-form');
  if (form) form.reset();

  document.getElementById('modal-destination-title').innerHTML =
    '<i class="bi bi-plus-circle-fill text-primary me-2"></i>Tambah Destinasi Baru';
  document.getElementById('btn-save-destination').innerHTML =
    '<i class="bi bi-check2-circle me-1"></i>Simpan Destinasi';

  document.getElementById('destination-id').value = '';
  document.getElementById('destination-image-preview').src = '';
  document.getElementById('destination-image-preview-container').classList.add('d-none');
  document.getElementById('ai-extra-notes').value = '';
  document.getElementById('ai-notes-collapse').classList.remove('show');

  if (destinationModalInstance) destinationModalInstance.show();
}

// Buka Modal Edit Destinasi
async function openEditModal(id) {
  currentEditingId = id;
  const form = document.getElementById('destination-form');
  if (form) form.reset();

  try {
    const res = await fetch(`/api/destinations/${id}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      showToast('Gagal memuat data destinasi untuk diedit', 'danger');
      return;
    }

    const d = result.data;
    document.getElementById('modal-destination-title').innerHTML =
      '<i class="bi bi-pencil-square text-primary me-2"></i>Edit Destinasi';
    document.getElementById('btn-save-destination').innerHTML =
      '<i class="bi bi-check2-circle me-1"></i>Simpan Perubahan';

    document.getElementById('destination-id').value = d.id;
    document.getElementById('destination-name').value = d.name || '';
    document.getElementById('destination-category').value = (d.category || 'lainnya').toLowerCase();
    document.getElementById('destination-city').value = d.city || '';
    document.getElementById('destination-province').value = d.province || '';
    document.getElementById('destination-ticket-price').value = d.ticketPrice || 0;
    document.getElementById('destination-lat').value = d.lat ?? '';
    document.getElementById('destination-lng').value = d.lng ?? '';
    document.getElementById('destination-image-url').value = d.imageUrl || '';
    document.getElementById('destination-description').value = d.description || '';
    document.getElementById('ai-extra-notes').value = '';
    document.getElementById('ai-notes-collapse').classList.remove('show');

    const previewContainer = document.getElementById('destination-image-preview-container');
    const previewImg = document.getElementById('destination-image-preview');
    if (d.imageUrl && d.imageUrl.trim() !== '') {
      previewImg.src = d.imageUrl;
      previewContainer.classList.remove('d-none');
    } else {
      previewContainer.classList.add('d-none');
    }

    if (destinationModalInstance) destinationModalInstance.show();
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  }
}

// Simpan Destinasi (Create / Update)
async function handleSaveDestination(e) {
  e.preventDefault();

  const name = document.getElementById('destination-name').value.trim();
  const category = document.getElementById('destination-category').value;
  const city = document.getElementById('destination-city').value.trim();
  const province = document.getElementById('destination-province').value.trim();
  const ticketPriceRaw = document.getElementById('destination-ticket-price').value;
  const latRaw = document.getElementById('destination-lat').value;
  const lngRaw = document.getElementById('destination-lng').value;
  const imageUrl = document.getElementById('destination-image-url').value.trim();
  const description = document.getElementById('destination-description').value.trim();

  if (!name) return showToast('Nama destinasi tidak boleh kosong', 'warning');
  if (!category) return showToast('Silakan pilih kategori destinasi', 'warning');
  if (!city) return showToast('Kota destinasi wajib diisi', 'warning');

  const ticketPrice = ticketPriceRaw === '' ? 0 : parseInt(ticketPriceRaw, 10);
  if (Number.isNaN(ticketPrice) || ticketPrice < 0) {
    return showToast('Harga tiket harus berupa angka valid (minimal 0)', 'warning');
  }

  // Koordinat boleh kosong - server bakal nyari sendiri lewat OpenStreetMap.
  // Tapi kalau diisi, harus dua-duanya, karena satu koordinat doang gak
  // ada artinya buat plot titik.
  const adaLat = latRaw !== '';
  const adaLng = lngRaw !== '';
  if (adaLat !== adaLng) {
    return showToast('Lintang dan bujur harus diisi dua-duanya, atau kosongkan keduanya', 'warning');
  }

  const btnSave = document.getElementById('btn-save-destination');
  const originalHtml = btnSave.innerHTML;
  btnSave.disabled = true;
  btnSave.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Menyimpan...';

  const payload = {
    name,
    category,
    city,
    province: province || null,
    ticketPrice,
    lat: adaLat ? Number(latRaw) : null,
    lng: adaLng ? Number(lngRaw) : null,
    imageUrl: imageUrl || null,
    description: description || null,
  };

  try {
    const url = currentEditingId ? `/api/destinations/${currentEditingId}` : '/api/destinations';
    const method = currentEditingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (result.success) {
      showToast(result.message || 'Destinasi berhasil disimpan!', 'success');
      if (destinationModalInstance) destinationModalInstance.hide();
      loadDestinations();
    } else {
      showToast(result.message || 'Gagal menyimpan destinasi', 'danger');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = originalHtml;
  }
}

// Buka Modal Konfirmasi Hapus
function openDeleteModal(id, name) {
  currentDeletingId = id;
  const nameEl = document.getElementById('delete-destination-name');
  if (nameEl) nameEl.textContent = name;
  if (deleteModalInstance) deleteModalInstance.show();
}

// Eksekusi Hapus Destinasi
async function handleDeleteDestination() {
  if (!currentDeletingId) return;

  const btnDelete = document.getElementById('btn-confirm-delete');
  const originalHtml = btnDelete.innerHTML;
  btnDelete.disabled = true;
  btnDelete.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Menghapus...';

  try {
    const res = await fetch(`/api/destinations/${currentDeletingId}`, { method: 'DELETE' });
    const result = await res.json();

    if (result.success) {
      showToast(result.message || 'Destinasi berhasil dihapus!', 'success');
      if (deleteModalInstance) deleteModalInstance.hide();
      loadDestinations();
    } else {
      showToast(result.message || 'Gagal menghapus destinasi', 'danger');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  } finally {
    btnDelete.disabled = false;
    btnDelete.innerHTML = originalHtml;
    currentDeletingId = null;
  }
}

// Buka Modal View Detail Destinasi
async function openViewModal(id) {
  try {
    const res = await fetch(`/api/destinations/${id}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      showToast('Gagal memuat detail destinasi', 'danger');
      return;
    }

    const d = result.data;
    const defaultImg = 'https://placehold.co/400x300/e9ecef/495057?text=Foto+Destinasi';
    const imgSrc = d.imageUrl && d.imageUrl.trim() !== '' ? d.imageUrl : defaultImg;

    document.getElementById('view-destination-image').src = imgSrc;
    document.getElementById('view-destination-name').textContent = d.name;
    document.getElementById('view-destination-category').innerHTML = getCategoryBadge(d.category);
    document.getElementById('view-destination-city').innerHTML =
      `<span class="badge bg-light text-secondary border"><i class="bi bi-geo-alt me-1"></i>${escapeHtml([d.city, d.province].filter(Boolean).join(', ') || '-')}</span>`;
    document.getElementById('view-destination-map').innerHTML = getMapBadge(d);
    document.getElementById('view-destination-price').textContent =
      d.ticketPrice > 0 ? formatRupiah(d.ticketPrice) : 'Gratis';
    document.getElementById('view-destination-creator').textContent = d.author
      ? `${d.author.name} (${d.author.email})`
      : 'Admin';
    document.getElementById('view-destination-date').textContent = formatDate(d.updatedAt || d.createdAt);

    const descEl = document.getElementById('view-destination-description');
    if (d.description && d.description.trim() !== '') {
      descEl.innerHTML = escapeHtml(d.description).replace(/\n/g, '<br>');
    } else {
      descEl.innerHTML = '<span class="text-muted fst-italic">Belum ada deskripsi untuk destinasi ini.</span>';
    }

    if (viewModalInstance) viewModalInstance.show();
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  }
}

/**
 * Cari koordinat dari nama + kota lewat OpenStreetMap, tanpa harus
 * nyimpen dulu. Berguna buat ngecek "tempat ini kekenal gak sih di peta".
 */
async function handleLookupCoord() {
  const name = document.getElementById('destination-name').value.trim();
  const city = document.getElementById('destination-city').value.trim();
  const btn = document.getElementById('btn-lookup-coord');

  if (!name) {
    showToast('Isi nama destinasi dulu sebelum mencari koordinat', 'warning');
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Mencari...';

  try {
    const q = city ? `${name}, ${city}` : name;
    const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
    const result = await res.json();

    if (!result.success) throw new Error(result.message);

    document.getElementById('destination-lat').value = result.data.lat;
    document.getElementById('destination-lng').value = result.data.lng;
    showToast(`Ketemu: ${result.data.displayName}`, 'success');
  } catch (err) {
    showToast(err.message || 'Gagal mencari koordinat', 'warning');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// Fitur AI: Generate Deskripsi Destinasi Menggunakan Gemini AI
async function handleGenerateAiDescription() {
  const nameInput = document.getElementById('destination-name');
  const categoryInput = document.getElementById('destination-category');
  const cityInput = document.getElementById('destination-city');
  const notesInput = document.getElementById('ai-extra-notes');
  const descTextarea = document.getElementById('destination-description');
  const btnAi = document.getElementById('btn-generate-ai');
  const aiStatusBox = document.getElementById('ai-status-box');
  const aiStatusText = document.getElementById('ai-status-text');

  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const city = cityInput ? cityInput.value.trim() : '';
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!name) {
    showToast('Silakan isi Nama Destinasi terlebih dahulu sebelum meminta bantuan AI', 'warning');
    nameInput.focus();
    return;
  }

  const originalBtnHtml = btnAi.innerHTML;
  btnAi.disabled = true;
  btnAi.innerHTML =
    '<span class="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true"></span>Memproses AI...';

  if (aiStatusBox) {
    aiStatusBox.classList.remove('d-none');
    aiStatusText.textContent = `Gemini AI sedang menyusun deskripsi untuk "${name}"...`;
  }

  try {
    const res = await fetch('/api/destinations/ai-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, city, notes }),
    });

    const result = await res.json();

    if (result.success && result.data && result.data.description) {
      descTextarea.value = result.data.description;
      showToast('✨ Deskripsi berhasil dibuat oleh Gemini AI!', 'success');

      descTextarea.classList.add('border-primary', 'shadow-sm');
      setTimeout(() => descTextarea.classList.remove('border-primary', 'shadow-sm'), 2500);
    } else {
      showToast(result.message || 'Gagal generate deskripsi dari AI', 'danger');
    }
  } catch (err) {
    showToast('Error saat menghubungi AI: ' + err.message, 'danger');
  } finally {
    if (aiStatusBox) aiStatusBox.classList.add('d-none');
    btnAi.disabled = false;
    btnAi.innerHTML = originalBtnHtml;
  }
}

// Salin Deskripsi ke Clipboard
function copyDescription() {
  const desc = document.getElementById('destination-description').value;
  if (!desc.trim()) {
    showToast('Deskripsi masih kosong', 'warning');
    return;
  }
  navigator.clipboard
    .writeText(desc)
    .then(() => showToast('Deskripsi berhasil disalin ke clipboard!', 'success'))
    .catch(() => showToast('Gagal menyalin teks', 'danger'));
}

// Bersihkan Deskripsi
function clearDescription() {
  document.getElementById('destination-description').value = '';
}

// Live Image URL Preview
function setupImagePreview() {
  const inputUrl = document.getElementById('destination-image-url');
  const previewContainer = document.getElementById('destination-image-preview-container');
  const previewImg = document.getElementById('destination-image-preview');

  if (!inputUrl) return;

  inputUrl.addEventListener('input', () => {
    const url = inputUrl.value.trim();
    if (url) {
      previewImg.src = url;
      previewContainer.classList.remove('d-none');
    } else {
      previewContainer.classList.add('d-none');
    }
  });

  previewImg.addEventListener('error', () => {
    previewImg.src = 'https://placehold.co/100x100/e9ecef/495057?text=Gambar+Rusak';
  });
}

// Highlight menu sidebar aktif
function highlightActiveSidebar() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.getAttribute('href') === '/admin/destinasi') {
      link.classList.add('active');
    }
  });
}

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  const modalDestinationEl = document.getElementById('modal-destination');
  if (modalDestinationEl) destinationModalInstance = new bootstrap.Modal(modalDestinationEl);

  const modalViewEl = document.getElementById('modal-view-destination');
  if (modalViewEl) viewModalInstance = new bootstrap.Modal(modalViewEl);

  const modalDeleteEl = document.getElementById('modal-delete-destination');
  if (modalDeleteEl) deleteModalInstance = new bootstrap.Modal(modalDeleteEl);

  const filterSearch = document.getElementById('filter-search');
  const filterCategory = document.getElementById('filter-category');
  const filterSort = document.getElementById('filter-sort');
  const filterOrder = document.getElementById('filter-order');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnAddDestination = document.getElementById('btn-add-destination');

  if (filterSearch) {
    let debounceTimer;
    filterSearch.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadDestinations, 300);
    });
  }

  if (filterCategory) filterCategory.addEventListener('change', loadDestinations);
  if (filterSort) filterSort.addEventListener('change', loadDestinations);
  if (filterOrder) filterOrder.addEventListener('change', loadDestinations);
  if (btnRefresh) btnRefresh.addEventListener('click', loadDestinations);
  if (btnAddDestination) btnAddDestination.addEventListener('click', openCreateModal);

  const destinationForm = document.getElementById('destination-form');
  if (destinationForm) destinationForm.addEventListener('submit', handleSaveDestination);

  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  if (btnConfirmDelete) btnConfirmDelete.addEventListener('click', handleDeleteDestination);

  const btnAi = document.getElementById('btn-generate-ai');
  if (btnAi) btnAi.addEventListener('click', handleGenerateAiDescription);

  const btnLookup = document.getElementById('btn-lookup-coord');
  if (btnLookup) btnLookup.addEventListener('click', handleLookupCoord);

  const btnCopyDesc = document.getElementById('btn-copy-desc');
  if (btnCopyDesc) btnCopyDesc.addEventListener('click', copyDescription);

  const btnClearDesc = document.getElementById('btn-clear-desc');
  if (btnClearDesc) btnClearDesc.addEventListener('click', clearDescription);

  setupImagePreview();
  loadDestinations();
});

document.addEventListener('partials:loaded', highlightActiveSidebar);
