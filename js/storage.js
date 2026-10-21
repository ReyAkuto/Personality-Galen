/**
 * Modul Penyimpanan Data & Log Peserta
 * Mendukung: LocalStorage, Firebase Realtime Database (via REST), dan Google Sheets (Apps Script Webhook)
 */

const StorageManager = {
  LOCAL_LOGS_KEY: 'galen_assessment_logs',

  /**
   * Simpan hasil asesmen ke seluruh backend yang aktif
   * @param {Object} logData 
   * @returns {Promise<Object>} Status hasil penyimpanan ke masing-masing provider
   */
  async saveAssessmentLog(logData) {
    const config = window.GalenConfig.get();
    const resultStatus = {
      local: false,
      firebase: null,
      googleSheets: null,
      timestamp: new Date().toISOString()
    };

    // 1. Simpan ke LocalStorage (Selalu aktif sebagai backup instan)
    try {
      this.saveToLocalStorage(logData);
      resultStatus.local = true;
    } catch (err) {
      console.error("[Storage] Gagal menyimpan ke LocalStorage:", err);
    }

    // 2. Simpan ke Firebase Realtime Database (REST API)
    if (config.firebase && config.firebase.enabled && config.firebase.databaseUrl) {
      try {
        const fbResult = await this.saveToFirebase(logData, config.firebase);
        resultStatus.firebase = fbResult;
      } catch (err) {
        console.error("[Storage] Gagal menyimpan ke Firebase:", err);
        resultStatus.firebase = { success: false, error: err.message };
      }
    }

    // 3. Simpan ke Google Sheets (Apps Script Webhook)
    if (config.googleSheets && config.googleSheets.enabled && config.googleSheets.webhookUrl) {
      try {
        const gsResult = await this.saveToGoogleSheets(logData, config.googleSheets.webhookUrl);
        resultStatus.googleSheets = gsResult;
      } catch (err) {
        console.error("[Storage] Gagal menyimpan ke Google Sheets:", err);
        resultStatus.googleSheets = { success: false, error: err.message };
      }
    }

    return resultStatus;
  },

  /**
   * Simpan record ke browser LocalStorage
   */
  saveToLocalStorage(logData) {
    let logs = this.getLocalLogs();
    logs.unshift(logData); // letakkan log terbaru di awal
    // Batasi maksimum 1000 log di browser agar tidak overload
    if (logs.length > 1000) logs = logs.slice(0, 1000);
    localStorage.setItem(this.LOCAL_LOGS_KEY, JSON.stringify(logs));
  },

  /**
   * Ambil semua record dari LocalStorage
   */
  getLocalLogs() {
    try {
      const raw = localStorage.getItem(this.LOCAL_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("[Storage] Gagal membaca log dari LocalStorage:", e);
      return [];
    }
  },

  /**
   * Hapus semua log di LocalStorage
   */
  clearLocalLogs() {
    localStorage.removeItem(this.LOCAL_LOGS_KEY);
  },

  /**
   * Kirim log ke Firebase Realtime Database via REST API
   * Format URL: https://<DATABASE_NAME>.firebasedatabase.app/logs.json
   */
  async saveToFirebase(logData, fbConfig) {
    let url = fbConfig.databaseUrl.trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    
    // Endpoint REST Firebase Realtime Database
    const endpoint = `${url}/galen_assessment_logs.json`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      throw new Error(`Firebase response status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, id: data.name };
  },

  /**
   * Kirim log ke Google Sheets via Google Apps Script Web App
   */
  async saveToGoogleSheets(logData, webhookUrl) {
    // Mode no-cors biasa digunakan untuk Apps Script redirect
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });

    return { success: true, message: "Terkirim ke Google Sheets webhook" };
  },

  /**
   * Ekspor seluruh log di LocalStorage menjadi file CSV untuk Excel/Sheets
   */
  exportLogsToCSV() {
    const logs = this.getLocalLogs();
    if (!logs || logs.length === 0) {
      alert("Belum ada riwayat log peserta yang tersimpan.");
      return;
    }

    const headers = [
      "ID",
      "Waktu",
      "Nama",
      "Usia/Profesi",
      "Email/Kontak",
      "Dominan 1",
      "Dominan 2",
      "Gelar Kombinasi",
      "Koleris (%)",
      "Sanguinis (%)",
      "Melankolis (%)",
      "Phlegmatis (%)",
      "Skor K",
      "Skor S",
      "Skor M",
      "Skor P"
    ];

    const rows = logs.map(l => [
      `"${l.id || ''}"`,
      `"${l.formattedDate || l.timestamp || ''}"`,
      `"${(l.user && l.user.name) || ''}"`,
      `"${(l.user && l.user.agency) || ''}"`,
      `"${(l.user && l.user.email) || ''}"`,
      `"${l.dominant1 || ''}"`,
      `"${l.dominant2 || ''}"`,
      `"${l.combinationTitle || ''}"`,
      l.percentages ? l.percentages.koleris : 0,
      l.percentages ? l.percentages.sanguinis : 0,
      l.percentages ? l.percentages.melankolis : 0,
      l.percentages ? l.percentages.phlegmatis : 0,
      l.scores ? l.scores.koleris : 0,
      l.scores ? l.scores.sanguinis : 0,
      l.scores ? l.scores.melankolis : 0,
      l.scores ? l.scores.phlegmatis : 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Galen_Assessment_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

window.StorageManager = StorageManager;
