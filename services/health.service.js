/**
 * Logic buat nentuin status "sehat"-nya aplikasi. Sengaja dipisah dari
 * controller, biar kalo nanti ceknya makin kompleks (misal ikut ngecek
 * koneksi database, ping service lain, dst), controller-nya gak perlu
 * diubah - cukup ubah di sini.
 */
function getHealthStatus() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getHealthStatus };
