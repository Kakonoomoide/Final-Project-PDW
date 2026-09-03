let articleModal;
let articlesData = [];

document.addEventListener('DOMContentLoaded', () => {
  articleModal = new bootstrap.Modal(document.getElementById('articleModal'));
  loadArticles();
});

async function loadArticles() {
  const tableBody = document.getElementById('articleTableBody');

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center">Memuat data...</td>
    </tr>
  `;

  try {
    const response = await fetch('/api/articles');
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal mengambil data artikel');
    }

    articlesData = result.data || [];
    renderArticles();
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

function renderArticles() {
  const tableBody = document.getElementById('articleTableBody');

  if (articlesData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          Belum ada artikel.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = articlesData.map((article, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(article.title)}</td>
      <td>${escapeHtml(article.caption || '-')}</td>
      <td>
        ${escapeHtml(
          article.content && article.content.length > 100
            ? article.content.substring(0, 100) + '...'
            : article.content || '-'
        )}
      </td>
      <td class="text-center align-middle">
        ${
          article.imageUrl
            ? `
              <img
                src="${escapeAttribute(article.imageUrl)}"
                width="80"
                height="60"
                style="object-fit: cover;"
                class="rounded"
                alt="Gambar artikel"
                onerror="this.style.display='none'"
              >
            `
            : '-'
        }
      </td>
      <td class="text-center align-middle">
        <button
          class="btn btn-sm btn-warning me-1"
          onclick="openEditModal(${article.id})"
        >
          Edit
        </button>

        <button
          class="btn btn-sm btn-danger"
          onclick="deleteArticle(${article.id})"
        >
          Hapus
        </button>
      </td>
    </tr>
  `).join('');
}

function openCreateModal() {
  document.getElementById('modalTitle').textContent = 'Tambah Artikel';
  document.getElementById('articleForm').reset();
  document.getElementById('articleId').value = '';
  document.getElementById('captionSuggestions').style.display = 'none';
  document.getElementById('captionOptions').innerHTML = '';
  resetGenerateButton();
  document.getElementById('saveArticleBtn').disabled = false;
  articleModal.show();
}

function openEditModal(id) {
  const article = articlesData.find(item => item.id === id);

  if (!article) {
    showAlert('Data artikel tidak ditemukan.', 'danger');
    return;
  }

  document.getElementById('modalTitle').textContent = 'Edit Artikel';
  document.getElementById('articleId').value = article.id;
  document.getElementById('title').value = article.title || '';
  document.getElementById('content').value = article.content || '';
  document.getElementById('caption').value = article.caption || '';
  document.getElementById('imageUrl').value = article.imageUrl || '';
  document.getElementById('captionSuggestions').style.display = 'none';
  document.getElementById('captionOptions').innerHTML = '';
  resetGenerateButton();
  document.getElementById('saveArticleBtn').disabled = false;
  articleModal.show();
}

async function saveArticle() {
  const id = document.getElementById('articleId').value;
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  const caption = document.getElementById('caption').value.trim();
  const imageUrl = document.getElementById('imageUrl').value.trim();
  const saveButton = document.getElementById('saveArticleBtn');

  if (!title || !content) {
    showAlert('Judul dan isi artikel wajib diisi.', 'warning');
    return;
  }

  const payload = {
    title,
    content,
    caption,
    imageUrl: imageUrl || null
  };

  const url = id ? `/api/articles/${id}` : '/api/articles';
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
      throw new Error(result.message || 'Gagal menyimpan artikel');
    }

    articleModal.hide();
    await loadArticles();

    showAlert(
      id
        ? 'Artikel berhasil diperbarui.'
        : 'Artikel berhasil ditambahkan.',
      'success'
    );
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? 'Update' : 'Simpan';
  }
}

async function deleteArticle(id) {
  const article = articlesData.find(item => item.id === id);

  if (!article) {
    return;
  }

  const confirmed = confirm(
    `Yakin ingin menghapus artikel "${article.title}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/articles/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menghapus artikel');
    }

    await loadArticles();

    showAlert(
      'Artikel berhasil dihapus.',
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
      'Isi judul dan isi artikel terlebih dahulu.',
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
    const response = await fetch('/api/articles/generate-caption', {
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
  useButton.className = 'btn btn-primary btn-sm';
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