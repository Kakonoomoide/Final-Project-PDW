let newsModal;
let newsData = [];

document.addEventListener('DOMContentLoaded', () => {
  newsModal = new bootstrap.Modal(document.getElementById('newsModal'));
  loadNews();
});

async function loadNews() {
  const tableBody = document.getElementById('newsTableBody');

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center">Memuat data...</td>
    </tr>
  `;

  try {
    const response = await fetch('/api/news');
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal mengambil data berita');
    }

    newsData = result.data || [];
    renderNews();
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">
          ${escapeHtml(error.message)}
        </td>
      </tr>
    `;
  }
}

function renderNews() {
  const tableBody = document.getElementById('newsTableBody');

  if (newsData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          Belum ada berita.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = newsData.map((news, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(news.title)}</td>
      <td>${escapeHtml(news.caption || '-')}</td>
      <td>
        ${escapeHtml(
          news.content && news.content.length > 100
            ? news.content.substring(0, 100) + '...'
            : news.content || '-'
        )}
      </td>
      <td>
        ${
          news.imageUrl
            ? `
              <img
                src="${escapeAttribute(news.imageUrl)}"
                width="80"
                height="60"
                style="object-fit: cover;"
                class="rounded"
                alt="Gambar berita"
                onerror="this.style.display='none'"
              >
            `
            : '-'
        }
      </td>
      <td>
        <button
          class="btn btn-sm btn-warning me-1"
          onclick="openEditModal(${news.id})"
        >
          Edit
        </button>

        <button
          class="btn btn-sm btn-danger"
          onclick="deleteNews(${news.id})"
        >
          Hapus
        </button>
      </td>
    </tr>
  `).join('');
}

function openCreateModal() {
  document.getElementById('modalTitle').textContent = 'Tambah Berita';
  document.getElementById('newsForm').reset();
  document.getElementById('newsId').value = '';
  document.getElementById('captionSuggestions').style.display = 'none';
  document.getElementById('captionOptions').innerHTML = '';
  resetGenerateButton();
  document.getElementById('saveNewsBtn').disabled = false;
  newsModal.show();
}

function openEditModal(id) {
  const news = newsData.find(item => item.id === id);

  if (!news) {
    showAlert('Data berita tidak ditemukan.', 'danger');
    return;
  }

  document.getElementById('modalTitle').textContent = 'Edit Berita';
  document.getElementById('newsId').value = news.id;
  document.getElementById('title').value = news.title || '';
  document.getElementById('content').value = news.content || '';
  document.getElementById('caption').value = news.caption || '';
  document.getElementById('imageUrl').value = news.imageUrl || '';
  document.getElementById('captionSuggestions').style.display = 'none';
  document.getElementById('captionOptions').innerHTML = '';
  resetGenerateButton();
  document.getElementById('saveNewsBtn').disabled = false;
  newsModal.show();
}

async function saveNews() {
  const id = document.getElementById('newsId').value;
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  const caption = document.getElementById('caption').value.trim();
  const imageUrl = document.getElementById('imageUrl').value.trim();
  const saveButton = document.getElementById('saveNewsBtn');

  if (!title || !content) {
    showAlert('Judul dan isi berita wajib diisi.', 'warning');
    return;
  }

  const payload = {
    title,
    content,
    caption,
    imageUrl: imageUrl || null
  };

  const url = id ? `/api/news/${id}` : '/api/news';
  const method = id ? 'PUT' : 'POST';

  saveButton.disabled = true;
  saveButton.textContent = id ? 'Memperbarui...' : 'Menyimpan...';

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menyimpan berita');
    }

    newsModal.hide();
    await loadNews();

    showAlert(
      id
        ? 'Berita berhasil diperbarui.'
        : 'Berita berhasil ditambahkan.',
      'success'
    );
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? 'Update' : 'Simpan';
  }
}

async function deleteNews(id) {
  const news = newsData.find(item => item.id === id);

  if (!news) {
    return;
  }

  const confirmed = confirm(
    `Yakin ingin menghapus berita "${news.title}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/news/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menghapus berita');
    }

    await loadNews();

    showAlert(
      'Berita berhasil dihapus.',
      'success'
    );
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function generateCaption() {
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  const button = document.getElementById('generateCaptionBtn');

  if (!title || !content) {
    showAlert(
      'Isi judul dan isi berita terlebih dahulu.',
      'warning'
    );
    return;
  }

  button.disabled = true;

  button.innerHTML = `
    Generating Caption
    <span class="loading-dots">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  `;

  document.getElementById('captionSuggestions').style.display = 'none';
  document.getElementById('captionOptions').innerHTML = '';

  try {
    const response = await fetch('/api/news/generate-caption', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        content
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Gagal menghasilkan caption AI'
      );
    }

    const captions = Array.isArray(result.data)
      ? result.data
      : [];

    if (captions.length === 0) {
      throw new Error('AI tidak memberikan pilihan caption.');
    }

    renderCaptionOptions(captions);
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    resetGenerateButton();
  }
}

function renderCaptionOptions(captions) {
  const container = document.getElementById('captionOptions');
  const suggestions = document.getElementById('captionSuggestions');

  suggestions.style.display = 'block';

  container.innerHTML = captions.map((caption, index) => `
    <div
      class="caption-option border rounded p-2 mb-2"
      onclick="selectCaption(${index})"
      id="captionOption${index}"
    >
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="captionOption"
          id="caption${index}"
          value="${index}"
          onclick="event.stopPropagation(); selectCaption(${index})"
        />

        <label
          class="form-check-label"
          for="caption${index}"
        >
          ${escapeHtml(caption)}
        </label>
      </div>
    </div>
  `).join('');

  const useButton = document.createElement('button');

  useButton.type = 'button';
  useButton.className = 'btn btn-success btn-sm';
  useButton.textContent = 'Gunakan Caption Terpilih';

  useButton.onclick = () => {
    const selected = document.querySelector(
      'input[name="captionOption"]:checked'
    );

    if (!selected) {
      showAlert(
        'Pilih caption terlebih dahulu.',
        'warning'
      );
      return;
    }

    const selectedCaption =
      captions[Number(selected.value)];

    document.getElementById('caption').value =
      selectedCaption;

    showAlert(
      'Caption berhasil dimasukkan ke form.',
      'success'
    );
  };

  container.appendChild(useButton);
}

function selectCaption(index) {
  document
    .querySelectorAll('.caption-option')
    .forEach(option => {
      option.classList.remove('selected');
    });

  const selected =
    document.getElementById(`captionOption${index}`);

  if (selected) {
    selected.classList.add('selected');
  }

  const radio =
    document.getElementById(`caption${index}`);

  if (radio) {
    radio.checked = true;
  }
}

function resetGenerateButton() {
  const button =
    document.getElementById('generateCaptionBtn');

  if (!button) {
    return;
  }

  button.disabled = false;
  button.textContent = 'Generate Caption dengan AI';
}

function showAlert(message, type) {
  document.getElementById('alertContainer').innerHTML = `
    <div
      class="alert alert-${type} alert-dismissible fade show"
      role="alert"
    >
      ${escapeHtml(message)}

      <button
        type="button"
        class="btn-close"
        data-bs-dismiss="alert"
      ></button>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}