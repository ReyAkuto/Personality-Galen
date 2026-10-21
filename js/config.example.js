/**
 * Konfigurasi Backend & Penyimpanan Log (Template Contoh)
 * Galen Personality Assessment
 * 
 * Salin file ini menjadi 'config.js' atau atur langsung melalui modal
 * "Riwayat & Backend" pada antarmuka web.
 */

const DEFAULT_CONFIG = {
  // Mode aktif: 'all', 'firebase', 'googlesheets', atau 'local'
  activeBackend: 'local',

  // Konfigurasi Firebase (Realtime Database / Firestore REST)
  firebase: {
    enabled: false,
    projectId: "",
    databaseUrl: "",
    apiKey: "",
    appId: ""
  },

  // Konfigurasi Google Sheets (Google Apps Script Web App URL)
  googleSheets: {
    enabled: false,
    webhookUrl: ""
  }
};

// Ambil konfigurasi tersimpan dari localStorage atau gunakan default
function getAppConfig() {
  try {
    const saved = localStorage.getItem('galen_backend_config');
    if (saved) {
      return Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved));
    }
  } catch (e) {
    console.warn("Gagal membaca konfigurasi dari localStorage, menggunakan default.", e);
  }
  return DEFAULT_CONFIG;
}

// Simpan konfigurasi baru ke localStorage
function saveAppConfig(newConfig) {
  try {
    localStorage.setItem('galen_backend_config', JSON.stringify(newConfig));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan konfigurasi ke localStorage:", e);
    return false;
  }
}

// Reset konfigurasi ke default awal
function resetAppConfig() {
  try {
    localStorage.removeItem('galen_backend_config');
    return DEFAULT_CONFIG;
  } catch (e) {
    console.error("Gagal mereset konfigurasi:", e);
    return DEFAULT_CONFIG;
  }
}

// Expose secara global ke window
window.GalenConfig = {
  get: getAppConfig,
  save: saveAppConfig,
  reset: resetAppConfig
};
