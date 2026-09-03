/**
 * Pembungkus navigator.geolocation, dipake bareng sama halaman planner
 * (isi kota asal otomatis) & halaman detail trip (marker "kamu di sini").
 *
 * Geolocation itu FITUR TAMBAHAN, bukan syarat. User berhak nolak izin
 * lokasi, browsernya bisa gak dukung, atau dia lagi buka lewat http://
 * (Chrome cuma ngizinin geolocation di https atau localhost). Semua
 * kemungkinan itu HARUS berujung ke pesan yang jelas dan halaman yang
 * tetep jalan - bukan halaman yang diem aja atau error di konsol.
 */
const GeoClient = {
  tersedia() {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  },

  /** Minta koordinat user. Reject dengan pesan yang bisa dibaca manusia. */
  minta() {
    return new Promise((resolve, reject) => {
      if (!this.tersedia()) {
        return reject(new Error('Browser ini tidak mendukung deteksi lokasi'));
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          // Kode error-nya angka doang, gak ada gunanya ditampilin ke
          // user - diterjemahin dulu ke kalimat yang ngasih tau apa yang
          // bisa dia lakuin setelahnya.
          const pesan = {
            1: 'Izin lokasi ditolak. Kamu masih bisa mengetik kota asal manual.',
            2: 'Lokasi tidak bisa ditentukan. Coba lagi atau ketik manual.',
            3: 'Deteksi lokasi kelamaan. Coba lagi atau ketik manual.',
          };
          reject(new Error(pesan[err.code] || 'Gagal mendeteksi lokasi'));
        },
        {
          // Buat nebak NAMA KOTA, GPS presisi tinggi cuma boros baterai
          // dan bikin lama. Akurasi level menara seluler udah cukup.
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // posisi cache 5 menit masih boleh dipakai
        }
      );
    });
  },

  /**
   * Koordinat -> nama kota, lewat server kita sendiri (bukan Nominatim
   * langsung). Alasannya ada di controllers/geo.controller.js.
   */
  async reverse(lat, lng) {
    const res = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  },
};

window.GeoClient = GeoClient;
