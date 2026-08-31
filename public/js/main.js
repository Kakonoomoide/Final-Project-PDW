/**
 * Vanilla JS, gak pake framework - fetch ke API, terus render manual
 * ke DOM. Pola ini sama kayak yang dipake di project React sebelumnya
 * (ambil data -> render tampilan), cuma di sini gak ada helper
 * framework, jadi manipulasi DOM-nya ditulis manual pake
 * document.getElementById dst.
 */
async function checkHealth() {
  const badge = document.getElementById('health-badge');
  const output = document.getElementById('health-output');

  badge.textContent = 'Mengecek...';
  badge.className = 'badge bg-secondary';

  try {
    const res = await fetch('/api/health');
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    badge.textContent = 'Backend Aktif';
    badge.className = 'badge bg-success';
    output.textContent = JSON.stringify(result.data, null, 2);
  } catch (err) {
    badge.textContent = 'Backend Gak Kedetek';
    badge.className = 'badge bg-danger';
    output.textContent = err.message;
  }
}

// cek otomatis pas halaman pertama kali dibuka
document.addEventListener('DOMContentLoaded', checkHealth);

// tombol "Cek Ulang" manggil fungsi yang sama, gak nulis ulang logic-nya
document.getElementById('btn-check-health').addEventListener('click', checkHealth);
