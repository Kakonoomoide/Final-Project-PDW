/**
 * Landing page (M1): widget cuaca kota tujuan + rekomendasi AI waktu
 * berkunjung, dan daftar artikel wisata terbaru. Pola fetch/render-nya
 * sama kayak public/js/articles.js - fetch API, terus render manual ke
 * DOM tanpa framework.
 */

const WEATHER_ICON_BASE = 'https://openweathermap.org/img/wn';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('weatherForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const city = document.getElementById('cityInput').value.trim();
    if (city) loadWeather(city);
  });

  document.querySelectorAll('.city-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const city = chip.dataset.city;
      document.getElementById('cityInput').value = city;
      loadWeather(city);
    });
  });

  loadArticles();
});

async function loadWeather(city) {
  const result = document.getElementById('weatherResult');
  const submitBtn = document.getElementById('weatherSubmitBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengecek...';
  result.innerHTML = `<div class="weather-loading">Mengecek cuaca di ${escapeHtml(city)}...</div>`;

  try {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const body = await response.json();

    if (!response.ok || !body.success) {
      throw new Error(body.message || 'Gagal mengambil data cuaca');
    }

    renderWeather(body.data);
  } catch (error) {
    result.innerHTML = `<div class="weather-error">${escapeHtml(error.message)}</div>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Cek Cuaca';
  }
}

function renderWeather(data) {
  const { weather, rekomendasi } = data;
  const result = document.getElementById('weatherResult');

  const iconUrl = `${WEATHER_ICON_BASE}/${escapeAttribute(weather.icon)}@2x.png`;
  const rekomendasiHtml = rekomendasi
    ? `<p class="ticket__rekomendasi">${escapeHtml(rekomendasi)}</p>`
    : `<p class="ticket__rekomendasi text-muted" style="font-style:italic;">Rekomendasi AI lagi tidak tersedia, tapi data cuacanya tetap akurat kok.</p>`;

  result.innerHTML = `
    <div class="ticket">
      <div class="ticket__stub">
        <div class="ticket__city">${escapeHtml(weather.city)}</div>
        <div class="ticket__country">${escapeHtml(weather.country || '')}</div>
        <div class="ticket__temp">
          <img src="${iconUrl}" alt="${escapeAttribute(weather.description)}" width="52" height="52" onerror="this.style.display='none'" />
          ${Math.round(weather.temp)}°C
        </div>
        <div class="ticket__condition">${escapeHtml(weather.description || weather.condition)}</div>
      </div>
      <div class="ticket__perforation"></div>
      <div class="ticket__body">
        <div class="ticket__fields">
          <div>
            <div class="ticket__field-label">Terasa seperti</div>
            <div class="ticket__field-value">${Math.round(weather.feelsLike)}°C</div>
          </div>
          <div>
            <div class="ticket__field-label">Kelembapan</div>
            <div class="ticket__field-value">${weather.humidity ?? '-'}%</div>
          </div>
          <div>
            <div class="ticket__field-label">Angin</div>
            <div class="ticket__field-value">${weather.windSpeed ?? '-'} m/s</div>
          </div>
        </div>
        ${rekomendasiHtml}
      </div>
    </div>
  `;
}

async function loadArticles() {
  const container = document.getElementById('articlesResult');

  try {
    const response = await fetch('/api/articles');
    const body = await response.json();

    if (!response.ok || !body.success) {
      throw new Error(body.message || 'Gagal memuat artikel');
    }

    renderArticles(body.data || []);
  } catch (error) {
    container.innerHTML = `<div class="articles-empty">${escapeHtml(error.message)}</div>`;
  }
}

function renderArticles(articles) {
  const container = document.getElementById('articlesResult');

  if (!articles || articles.length === 0) {
    container.innerHTML = `<div class="articles-empty">Belum ada artikel wisata. Cek lagi nanti ya.</div>`;
    return;
  }

  const sorted = [...articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const [featured, ...rest] = sorted;
  const sideArticles = rest.slice(0, 3);

  container.innerHTML = `
    <div class="row g-4">
      <div class="col-md-7">
        ${renderFeaturedArticle(featured)}
      </div>
      <div class="col-md-5">
        ${sideArticles.length > 0
          ? sideArticles.map(renderArticleRow).join('')
          : '<div class="articles-empty">Belum ada artikel lain.</div>'}
      </div>
    </div>
  `;
}

function renderFeaturedArticle(article) {
  const excerpt = getExcerpt(article, 180);

  return `
    <div class="article-feature">
      <img
        class="article-feature__img"
        src="${escapeAttribute(article.imageUrl || placeholderImage())}"
        alt="${escapeAttribute(article.title)}"
        onerror="this.src='${placeholderImage()}'"
      />
      <div class="article-feature__body">
        <div class="article-row__date mb-2">${formatDate(article.createdAt)}</div>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.caption || excerpt)}</p>
      </div>
    </div>
  `;
}

function renderArticleRow(article) {
  const excerpt = getExcerpt(article, 90);

  return `
    <div class="article-row">
      <img
        class="article-row__img"
        src="${escapeAttribute(article.imageUrl || placeholderImage())}"
        alt="${escapeAttribute(article.title)}"
        onerror="this.src='${placeholderImage()}'"
      />
      <div>
        <div class="article-row__date">${formatDate(article.createdAt)}</div>
        <div class="article-row__title">${escapeHtml(article.title)}</div>
        <p class="article-row__excerpt">${escapeHtml(article.caption || excerpt)}</p>
      </div>
    </div>
  `;
}

function getExcerpt(article, maxLength) {
  const content = article.content || '';
  return content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function placeholderImage() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="100%" height="100%" fill="#e7edea"/></svg>'
  );
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
