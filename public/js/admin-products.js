/**
 * admin-products.js
 * Logika Frontend CRUD Bahan Pertanian + Integrasi Gemini AI Deskripsi (Jobdesk M4)
 */

// State Aplikasi
let allProducts = [];
let currentEditingId = null;
let currentDeletingId = null;
let productModalInstance = null;
let viewModalInstance = null;
let deleteModalInstance = null;

// Format Rupiah
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number);
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
    case 'bibit':
      return '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-flower1 me-1"></i>Bibit</span>';
    case 'pupuk':
      return '<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1"><i class="bi bi-droplet-fill me-1"></i>Pupuk</span>';
    case 'alat':
      return '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1"><i class="bi bi-tools me-1"></i>Alat</span>';
    case 'pestisida':
      return '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i class="bi bi-shield-shaded me-1"></i>Pestisida</span>';
    default:
      return `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1"><i class="bi bi-tag me-1"></i>${escapeHtml(category || 'Lainnya')}</span>`;
  }
}

// Badge Stok
function getStockBadge(stock) {
  const s = parseInt(stock, 10) || 0;
  if (s <= 0) {
    return '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Habis (0)</span>';
  } else if (s < 10) {
    return `<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>Menipis (${s})</span>`;
  }
  return `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Tersedia (${s})</span>`;
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

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

// Fetch & Render Statistik
async function loadStats() {
  try {
    const res = await fetch('/api/products/stats');
    const result = await res.json();
    if (result.success && result.data) {
      const { totalProducts, totalStock, categoryCounts } = result.data;
      const elTotalProducts = document.getElementById('stat-total-products');
      const elTotalStock = document.getElementById('stat-total-stock');
      const elTotalBibit = document.getElementById('stat-total-bibit');
      const elTotalPupuk = document.getElementById('stat-total-pupuk');

      if (elTotalProducts) elTotalProducts.textContent = totalProducts || 0;
      if (elTotalStock) elTotalStock.textContent = totalStock || 0;
      if (elTotalBibit) elTotalBibit.textContent = categoryCounts['bibit'] || 0;
      if (elTotalPupuk) elTotalPupuk.textContent = categoryCounts['pupuk'] || 0;
    }
  } catch (err) {
    console.error('Gagal mengambil statistik:', err);
  }
}

// Fetch & Render Daftar Produk
async function loadProducts() {
  const tbody = document.getElementById('products-table-body');
  const loadingIndicator = document.getElementById('products-loading');
  const emptyState = document.getElementById('products-empty');

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
    const res = await fetch(`/api/products?${params.toString()}`);
    const result = await res.json();

    if (loadingIndicator) loadingIndicator.classList.add('d-none');

    if (result.success && Array.isArray(result.data)) {
      allProducts = result.data;
      renderTable(allProducts);
      loadStats();
    } else {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat data produk: ${result.message || 'Terjadi kesalahan'}</td></tr>`;
      }
    }
  } catch (err) {
    if (loadingIndicator) loadingIndicator.classList.add('d-none');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error koneksi: ${err.message}</td></tr>`;
    }
  }
}

// Render Data ke Table HTML
function renderTable(products) {
  const tbody = document.getElementById('products-table-body');
  const emptyState = document.getElementById('products-empty');
  const countBadge = document.getElementById('product-count-badge');

  if (countBadge) {
    countBadge.textContent = `${products.length} produk`;
  }

  if (!products || products.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  if (emptyState) emptyState.classList.add('d-none');

  let html = '';
  products.forEach((p, idx) => {
    const defaultImg =
      'https://placehold.co/100x100/e9ecef/495057?text=🌾';
    const imgSrc = p.imageUrl && p.imageUrl.trim() !== '' ? p.imageUrl : defaultImg;
    const creatorName = p.creator ? p.creator.name : 'Admin';

    html += `
      <tr>
        <td class="text-center align-middle text-muted fw-semibold">${idx + 1}</td>
        <td class="align-middle">
          <div class="d-flex align-items-center gap-3">
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.name)}" 
                 class="rounded border object-fit-cover shadow-sm" style="width: 50px; height: 50px;" 
                 onerror="this.src='${defaultImg}'" />
            <div>
              <div class="fw-bold text-dark text-break">${escapeHtml(p.name)}</div>
              <small class="text-muted d-block text-truncate" style="max-width: 260px;">
                ${p.description ? escapeHtml(p.description) : '<em>Tanpa deskripsi</em>'}
              </small>
            </div>
          </div>
        </td>
        <td class="align-middle">${getCategoryBadge(p.category)}</td>
        <td class="align-middle fw-bold text-success-emphasis">${formatRupiah(p.price)}</td>
        <td class="align-middle">${getStockBadge(p.stock)}</td>
        <td class="align-middle">
          <div class="small fw-semibold text-secondary"><i class="bi bi-person me-1"></i>${escapeHtml(creatorName)}</div>
          <div class="small text-muted">${formatDate(p.updatedAt || p.createdAt)}</div>
        </td>
        <td class="align-middle text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button type="button" class="btn btn-outline-info" title="Lihat Detail" onclick="openViewModal(${p.id})">
              <i class="bi bi-eye"></i>
            </button>
            <button type="button" class="btn btn-outline-primary" title="Edit Produk" onclick="openEditModal(${p.id})">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button type="button" class="btn btn-outline-danger" title="Hapus Produk" onclick="openDeleteModal(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  if (tbody) tbody.innerHTML = html;
}

// Buka Modal Tambah Produk
function openCreateModal() {
  currentEditingId = null;
  const form = document.getElementById('product-form');
  if (form) form.reset();

  document.getElementById('modal-product-title').innerHTML =
    '<i class="bi bi-plus-circle-fill text-success me-2"></i>Tambah Bahan Pertanian Baru';
  document.getElementById('btn-save-product').innerHTML =
    '<i class="bi bi-check2-circle me-1"></i>Simpan Produk';

  document.getElementById('product-id').value = '';
  document.getElementById('product-image-preview').src = '';
  document.getElementById('product-image-preview-container').classList.add('d-none');
  document.getElementById('ai-extra-notes').value = '';
  document.getElementById('ai-notes-collapse').classList.remove('show');

  if (productModalInstance) productModalInstance.show();
}

// Buka Modal Edit Produk
async function openEditModal(id) {
  currentEditingId = id;
  const form = document.getElementById('product-form');
  if (form) form.reset();

  try {
    const res = await fetch(`/api/products/${id}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      showToast('Gagal memuat data produk untuk diedit', 'danger');
      return;
    }

    const p = result.data;
    document.getElementById('modal-product-title').innerHTML =
      '<i class="bi bi-pencil-square text-primary me-2"></i>Edit Bahan Pertanian';
    document.getElementById('btn-save-product').innerHTML =
      '<i class="bi bi-check2-circle me-1"></i>Simpan Perubahan';

    document.getElementById('product-id').value = p.id;
    document.getElementById('product-name').value = p.name || '';
    document.getElementById('product-category').value = (p.category || 'bibit').toLowerCase();
    document.getElementById('product-price').value = p.price || 0;
    document.getElementById('product-stock').value = p.stock || 0;
    document.getElementById('product-image-url').value = p.imageUrl || '';
    document.getElementById('product-description').value = p.description || '';
    document.getElementById('ai-extra-notes').value = '';
    document.getElementById('ai-notes-collapse').classList.remove('show');

    // Update Image Preview
    const previewContainer = document.getElementById('product-image-preview-container');
    const previewImg = document.getElementById('product-image-preview');
    if (p.imageUrl && p.imageUrl.trim() !== '') {
      previewImg.src = p.imageUrl;
      previewContainer.classList.remove('d-none');
    } else {
      previewContainer.classList.add('d-none');
    }

    if (productModalInstance) productModalInstance.show();
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  }
}

// Simpan Produk (Create / Update)
async function handleSaveProduct(e) {
  e.preventDefault();

  const name = document.getElementById('product-name').value.trim();
  const category = document.getElementById('product-category').value;
  const price = parseInt(document.getElementById('product-price').value, 10);
  const stock = parseInt(document.getElementById('product-stock').value, 10);
  const imageUrl = document.getElementById('product-image-url').value.trim();
  const description = document.getElementById('product-description').value.trim();

  if (!name) {
    showToast('Nama produk tidak boleh kosong', 'warning');
    return;
  }
  if (!category) {
    showToast('Silakan pilih kategori produk', 'warning');
    return;
  }
  if (isNaN(price) || price < 0) {
    showToast('Harga harus berupa angka valid (minimal 0)', 'warning');
    return;
  }
  if (isNaN(stock) || stock < 0) {
    showToast('Stok harus berupa angka valid (minimal 0)', 'warning');
    return;
  }

  const btnSave = document.getElementById('btn-save-product');
  const originalHtml = btnSave.innerHTML;
  btnSave.disabled = true;
  btnSave.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Menyimpan...';

  const payload = {
    name,
    category,
    price,
    stock,
    imageUrl: imageUrl || null,
    description: description || null,
  };

  try {
    let url = '/api/products';
    let method = 'POST';

    if (currentEditingId) {
      url = `/api/products/${currentEditingId}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (result.success) {
      showToast(result.message || 'Produk berhasil disimpan!', 'success');
      if (productModalInstance) productModalInstance.hide();
      loadProducts();
    } else {
      showToast(result.message || 'Gagal menyimpan produk', 'danger');
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
  const nameEl = document.getElementById('delete-product-name');
  if (nameEl) nameEl.textContent = name;
  if (deleteModalInstance) deleteModalInstance.show();
}

// Eksekusi Hapus Produk
async function handleDeleteProduct() {
  if (!currentDeletingId) return;

  const btnDelete = document.getElementById('btn-confirm-delete');
  const originalHtml = btnDelete.innerHTML;
  btnDelete.disabled = true;
  btnDelete.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Menghapus...';

  try {
    const res = await fetch(`/api/products/${currentDeletingId}`, {
      method: 'DELETE',
    });
    const result = await res.json();

    if (result.success) {
      showToast(result.message || 'Produk berhasil dihapus!', 'success');
      if (deleteModalInstance) deleteModalInstance.hide();
      loadProducts();
    } else {
      showToast(result.message || 'Gagal menghapus produk', 'danger');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  } finally {
    btnDelete.disabled = false;
    btnDelete.innerHTML = originalHtml;
    currentDeletingId = null;
  }
}

// Buka Modal View Detail Produk
async function openViewModal(id) {
  try {
    const res = await fetch(`/api/products/${id}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      showToast('Gagal memuat detail produk', 'danger');
      return;
    }

    const p = result.data;
    const defaultImg =
      'https://placehold.co/400x300/e9ecef/495057?text=🌾+Foto+Bahan+Pertanian';
    const imgSrc = p.imageUrl && p.imageUrl.trim() !== '' ? p.imageUrl : defaultImg;

    document.getElementById('view-product-image').src = imgSrc;
    document.getElementById('view-product-name').textContent = p.name;
    document.getElementById('view-product-category').innerHTML = getCategoryBadge(p.category);
    document.getElementById('view-product-price').textContent = formatRupiah(p.price);
    document.getElementById('view-product-stock').innerHTML = getStockBadge(p.stock);
    document.getElementById('view-product-creator').textContent = p.creator
      ? `${p.creator.name} (${p.creator.email})`
      : 'Admin';
    document.getElementById('view-product-date').textContent = formatDate(
      p.updatedAt || p.createdAt
    );

    const descEl = document.getElementById('view-product-description');
    if (p.description && p.description.trim() !== '') {
      descEl.innerHTML = escapeHtml(p.description).replace(/\n/g, '<br>');
    } else {
      descEl.innerHTML = '<span class="text-muted fst-italic">Belum ada deskripsi untuk produk ini.</span>';
    }

    if (viewModalInstance) viewModalInstance.show();
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'danger');
  }
}

// Fitur AI: Generate Deskripsi Produk Menggunakan Gemini AI
async function handleGenerateAiDescription() {
  const nameInput = document.getElementById('product-name');
  const categoryInput = document.getElementById('product-category');
  const notesInput = document.getElementById('ai-extra-notes');
  const descTextarea = document.getElementById('product-description');
  const btnAi = document.getElementById('btn-generate-ai');
  const aiStatusBox = document.getElementById('ai-status-box');
  const aiStatusText = document.getElementById('ai-status-text');

  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!name) {
    showToast('Silakan isi Nama Produk terlebih dahulu sebelum meminta bantuan AI', 'warning');
    nameInput.focus();
    return;
  }

  // Tampilkan loading state
  const originalBtnHtml = btnAi.innerHTML;
  btnAi.disabled = true;
  btnAi.innerHTML =
    '<span class="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true"></span>Memproses AI...';

  if (aiStatusBox) {
    aiStatusBox.classList.remove('d-none');
    aiStatusText.textContent = `Gemini AI sedang menyusun deskripsi untuk "${name}"...`;
  }

  try {
    const res = await fetch('/api/products/ai-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, notes }),
    });

    const result = await res.json();

    if (result.success && result.data && result.data.description) {
      descTextarea.value = result.data.description;
      showToast('✨ Deskripsi berhasil digenerate oleh Gemini AI!', 'success');

      // Animasi highlight pada textarea
      descTextarea.classList.add('border-success', 'shadow-sm');
      setTimeout(() => {
        descTextarea.classList.remove('border-success', 'shadow-sm');
      }, 2500);

      if (aiStatusBox) {
        aiStatusBox.classList.add('d-none');
      }
    } else {
      showToast(result.message || 'Gagal generate deskripsi dari AI', 'danger');
      if (aiStatusBox) {
        aiStatusBox.classList.add('d-none');
      }
    }
  } catch (err) {
    showToast('Error saat menghubungi AI: ' + err.message, 'danger');
    if (aiStatusBox) {
      aiStatusBox.classList.add('d-none');
    }
  } finally {
    btnAi.disabled = false;
    btnAi.innerHTML = originalBtnHtml;
  }
}

// Salin Deskripsi ke Clipboard
function copyDescription() {
  const desc = document.getElementById('product-description').value;
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
  document.getElementById('product-description').value = '';
}

// Live Image URL Preview
function setupImagePreview() {
  const inputUrl = document.getElementById('product-image-url');
  const previewContainer = document.getElementById('product-image-preview-container');
  const previewImg = document.getElementById('product-image-preview');

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
  const sidebarLinks = document.querySelectorAll('.nav-link');
  sidebarLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === '/admin/produk' || href === '/admin/products') {
      link.classList.add('active');
    }
  });
}

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  // Inisialisasi modal Bootstrap
  const modalProductEl = document.getElementById('modal-product');
  if (modalProductEl) productModalInstance = new bootstrap.Modal(modalProductEl);

  const modalViewEl = document.getElementById('modal-view-product');
  if (modalViewEl) viewModalInstance = new bootstrap.Modal(modalViewEl);

  const modalDeleteEl = document.getElementById('modal-delete-product');
  if (modalDeleteEl) deleteModalInstance = new bootstrap.Modal(modalDeleteEl);

  // Event Listeners Filter
  const filterSearch = document.getElementById('filter-search');
  const filterCategory = document.getElementById('filter-category');
  const filterSort = document.getElementById('filter-sort');
  const filterOrder = document.getElementById('filter-order');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnAddProduct = document.getElementById('btn-add-product');

  if (filterSearch) {
    let debounceTimer;
    filterSearch.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadProducts, 300);
    });
  }

  if (filterCategory) filterCategory.addEventListener('change', loadProducts);
  if (filterSort) filterSort.addEventListener('change', loadProducts);
  if (filterOrder) filterOrder.addEventListener('change', loadProducts);
  if (btnRefresh) btnRefresh.addEventListener('click', loadProducts);
  if (btnAddProduct) btnAddProduct.addEventListener('click', openCreateModal);

  // Form Submit
  const productForm = document.getElementById('product-form');
  if (productForm) productForm.addEventListener('submit', handleSaveProduct);

  // Delete Confirm Button
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  if (btnConfirmDelete) btnConfirmDelete.addEventListener('click', handleDeleteProduct);

  // AI Generate Button
  const btnAi = document.getElementById('btn-generate-ai');
  if (btnAi) btnAi.addEventListener('click', handleGenerateAiDescription);

  // Helper buttons deskripsi
  const btnCopyDesc = document.getElementById('btn-copy-desc');
  if (btnCopyDesc) btnCopyDesc.addEventListener('click', copyDescription);

  const btnClearDesc = document.getElementById('btn-clear-desc');
  if (btnClearDesc) btnClearDesc.addEventListener('click', clearDescription);

  setupImagePreview();
  loadProducts();
});

// Event listener saat partials selesai dimuat
document.addEventListener('partials:loaded', () => {
  highlightActiveSidebar();
});
