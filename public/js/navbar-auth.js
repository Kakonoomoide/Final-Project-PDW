async function renderNavbarAuth() {
  const area = document.getElementById('navbar-auth-area');
  if (!area) return; // halaman ini gak pake navbar-user (misal halaman admin)

  try {
    const res = await fetch('/api/auth/me');
    const result = await res.json();

    if (result.success) {
      area.innerHTML = `
        <span class="text-muted small">Halo, ${result.data.name}</span>
        <button class="btn btn-outline-secondary btn-sm" id="btn-logout">Logout</button>
      `;
      document.getElementById('btn-logout').addEventListener('click', handleLogout);
    } else {
      area.innerHTML = `
        <a href="/login" class="btn btn-outline-primary btn-sm">Login</a>
        <a href="/register" class="btn btn-primary btn-sm">Register</a>
      `;
    }
  } catch (err) {
    area.innerHTML = '';
  }
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

// tunggu navbar-nya keinject dulu (dari include-partials.js) baru render statusnya
document.addEventListener('partials:loaded', renderNavbarAuth);

// dipake juga di halaman admin (tombol logout di navbar-admin.html)
document.addEventListener('partials:loaded', () => {
  const adminLogoutBtn = document.getElementById('btn-logout');
  if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', handleLogout);

  const adminNameEl = document.getElementById('admin-name');
  if (adminNameEl) {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) adminNameEl.textContent = `Halo, ${result.data.name}`;
      });
  }
});
