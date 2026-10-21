/**
 * Google Apps Script untuk Backend Google Sheets
 * Galen Personality Assessment
 * 
 * CARA MENGAKTIFKAN WEBHOOK:
 * 1. Buka spreadsheet Google Anda.
 * 2. Klik menu: Extensions (Ekstensi) > Apps Script.
 * 3. Hapus semua kode default di editor, lalu PASTE seluruh kode di bawah ini.
 * 4. Klik tombol "Deploy" (Terapkan) > "New deployment" (Penerapan baru).
 * 5. Pilih jenis: "Web app" (Aplikasi web).
 * 6. Konfigurasi:
 *    - Description: "Galen Webhook"
 *    - Execute as: "Me" (Saya)
 *    - Who has access: "Anyone" (Siapa saja)  <-- PENTING agar web bisa mengirim data!
 * 7. Klik "Deploy", lalu SALIN URL Web App yang dihasilkan.
 * 8. Masukkan URL tersebut ke menu "Riwayat & Backend" di aplikasi Galen!
 */

// Biarkan kosong jika skrip dibuat langsung di dalam Spreadsheet (Extensions > Apps Script)
var SPREADSHEET_ID = "";

function doPost(e) {
  try {
    var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var user = data.user || {};
    var percentages = data.percentages || {};
    var scores = data.scores || {};
    
    var row = [
      data.formattedDate || new Date().toLocaleString("id-ID"),
      data.id || "",
      user.name || "",
      user.agency || "",
      user.email || "",
      data.dominant1 || "",
      data.dominant2 || "",
      data.combinationTitle || "",
      percentages.koleris || 0,
      percentages.sanguinis || 0,
      percentages.melankolis || 0,
      percentages.phlegmatis || 0,
      scores.koleris || 0,
      scores.sanguinis || 0,
      scores.melankolis || 0,
      scores.phlegmatis || 0
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data berhasil dicatat"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Galen Personality Assessment Webhook is Active! Target: " + SPREADSHEET_ID);
}
