function showFormError(message) {
  const box = document.getElementById('form-error');
  if (!box) return;
  box.textContent = message;
  box.classList.remove('d-none');
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = await res.json();

    if (!result.success) {
      return showFormError(result.message);
    }

    // admin diarahin ke dashboard admin, user biasa ke landing page
    window.location.href = result.data.role === 'admin' ? '/admin' : '/';
  });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const result = await res.json();

    if (!result.success) {
      return showFormError(result.message);
    }

    window.location.href = '/login';
  });
}
