/**
 * Karena project ini pake HTML biasa (bukan template engine kayak EJS),
 * navbar/sidebar gak bisa di-include pake <%- include(...) %>. Ini
 * alternatifnya: elemen dengan atribut data-include="/partials/xxx.html"
 * bakal diisi otomatis dengan isi file itu, jadi navbar/sidebar cukup
 * ditulis SEKALI (di public/partials/), semua halaman tinggal include.
 *
 * Contoh pemakaian di HTML:
 *   <div data-include="/partials/navbar-admin.html"></div>
 */
async function includePartials() {
  const elements = document.querySelectorAll('[data-include]');

  await Promise.all(
    Array.from(elements).map(async (el) => {
      const url = el.getAttribute('data-include');
      try {
        const res = await fetch(url);
        el.innerHTML = await res.text();
      } catch (err) {
        el.innerHTML = `<p class="text-danger small">Gagal load ${url}</p>`;
      }
    })
  );

  // kasih tau bagian lain (navbar-auth.js dll) kalo partial udah kepasang
  document.dispatchEvent(new Event('partials:loaded'));
}

document.addEventListener('DOMContentLoaded', includePartials);
