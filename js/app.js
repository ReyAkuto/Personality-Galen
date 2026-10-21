/**
 * Logika Utama Aplikasi Galen Personality Assessment
 * Memproses 40 soal, skoring 4 temperamen (Florence Littauer & Galen),
 * kalkulasi dominasi karakter, penyajian ulasan mendalam, dan logging data.
 */

(function () {
  'use strict';

  // State Aplikasi
  const state = {
    questions: [],
    descriptions: {},
    participant: {
      name: '',
      agency: '',
      email: ''
    },
    currentQuestionIndex: 0,
    answers: new Array(40).fill(null), // menyimpan index opsi yang dipilih per soal (0..3)
    results: null
  };

  // Label temperamen
  const TEMPERAMENT_INFO = {
    k: { key: 'Koler', name: 'Koleris', title: 'Pemimpin Tegas & Berorientasi Sasaran', color: 'koleris' },
    s: { key: 'Sanguin', name: 'Sanguinis', title: 'Pribadi Ceria, Antusias & Komunikatif', color: 'sanguin' },
    m: { key: 'Melan', name: 'Melankolis', title: 'Pemikir Analitis, Rinci & Menjaga Kualitas', color: 'melan' },
    p: { key: 'Phleg', name: 'Phlegmatis', title: 'Pribadi Damai, Tenang & Diplomatis', color: 'phleg' }
  };

  // Gelar Perpaduan Dua Karakter
  const COMBINATION_TITLES = {
    'SangKol': 'Sanguinis - Koleris (Penggerak Antusias & Berani Mengambil Risiko)',
    'KolMelan': 'Koleris - Melankolis (Pemimpin Visioner yang Tepat & Rinci)',
    'KolPhleg': 'Koleris - Phlegmatis (Eksekutor Tenang & Terarah)',
    'MelanPhleg': 'Melankolis - Phlegmatis (Pemikir Analitis & Penjaga Harmoni)',
    'SangMelan': 'Sanguinis - Melankolis (Pribadi Hangat, Kreatif & Berorientasi Kualitas)',
    'SangPhleg': 'Sanguinis - Phlegmatis (Pribadi Ramah, Menyenangkan & Pembawa Damai)'
  };

  // Elemen DOM
  const views = {
    home: document.getElementById('view-home'),
    test: document.getElementById('view-test'),
    result: document.getElementById('view-result')
  };

  /**
   * Inisialisasi awal saat halaman dimuat
   */
  async function initApp() {
    bindEvents();
    init3DTiltEffects();
    await loadData();
    updateBackendBadgeStatus();
  }

  /**
   * Load data soal & ulasan
   * Mendukung window fallback (jika file:///) atau fetch (jika http://)
   */
  async function loadData() {
    // 1. Soal
    if (window.GALEN_QUESTIONS && window.GALEN_QUESTIONS.length > 0) {
      state.questions = window.GALEN_QUESTIONS;
    } else {
      try {
        const resp = await fetch('data/questions.json');
        if (resp.ok) state.questions = await resp.json();
      } catch (e) {
        console.warn("Fetch questions.json gagal, menggunakan data lokal jika ada.", e);
      }
    }

    // 2. Deskripsi
    if (window.GALEN_DESCRIPTIONS && Object.keys(window.GALEN_DESCRIPTIONS).length > 0) {
      state.descriptions = window.GALEN_DESCRIPTIONS;
    } else {
      try {
        const resp = await fetch('data/personality_descriptions.json');
        if (resp.ok) state.descriptions = await resp.json();
      } catch (e) {
        console.warn("Fetch descriptions gagal, menggunakan data lokal jika ada.", e);
      }
    }
  }

  /**
   * Bind event listener UI
   */
  function bindEvents() {
    // Form Mulai Tes
    const startForm = document.getElementById('form-start-assessment');
    if (startForm) {
      startForm.addEventListener('submit', handleStartTest);
    }

    // Tombol Navigasi Tes
    document.getElementById('btn-prev-question')?.addEventListener('click', () => navigateQuestion(-1));
    document.getElementById('btn-next-question')?.addEventListener('click', () => navigateQuestion(1));
    document.getElementById('btn-cancel-test')?.addEventListener('click', confirmCancelTest);

    // Keyboard Shortcuts (1-4, Enter, Backspace)
    window.addEventListener('keydown', handleKeyboardNav);

    // Tab Navigasi di Halaman Hasil
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchResultTab(targetTab);
      });
    });

    // Tombol Aksi Hasil
    document.getElementById('btn-print-report')?.addEventListener('click', () => window.print());
    document.getElementById('btn-copy-summary')?.addEventListener('click', copyResultSummary);
    document.getElementById('btn-retest')?.addEventListener('click', confirmRetest);

    // Modal Logs / Admin
    document.getElementById('btn-open-logs')?.addEventListener('click', openLogsModal);
    document.getElementById('btn-close-logs')?.addEventListener('click', closeLogsModal);
    document.getElementById('modal-logs-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-logs-backdrop') closeLogsModal();
    });
    document.getElementById('btn-export-csv')?.addEventListener('click', () => window.StorageManager.exportLogsToCSV());
    document.getElementById('btn-clear-logs')?.addEventListener('click', handleClearLogs);

    // Settings Backend Form
    document.getElementById('btn-save-backend-settings')?.addEventListener('click', handleSaveBackendSettings);

    // Theme Toggle (Dark & Light Mode)
    document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);
    updateThemeUI();

    // Branding click to home
    document.getElementById('brand-home-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('home', 'backward');
    });
  }

  /**
   * Theme Toggle (Dark / Light Mode)
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      localStorage.setItem('theme', newTheme);
      const meta = document.querySelector('meta[name="color-scheme"]');
      if (meta) meta.content = newTheme;
    } catch (e) {}
    updateThemeUI();
  }

  function updateThemeUI() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = currentTheme === 'dark';
    const sunIcon = document.querySelector('#btn-theme-toggle .icon-sun');
    const moonIcon = document.querySelector('#btn-theme-toggle .icon-moon');
    if (sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
    if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
  }

  /**
   * Mengganti tampilan aktif dengan Transisi 3D Smooth & Directional Navigation
   * Mendukung View Transitions API (Chrome 125+, Edge 125+, Safari 18.2+, Firefox 147+)
   * dengan fallback CSS 3D Transforms otomatis.
   * @param {string} viewName - 'home' | 'test' | 'result'
   * @param {'forward' | 'backward'} direction
   */
  function switchView(viewName, direction = 'forward') {
    const currentKey = Object.keys(views).find(k => views[k]?.classList.contains('active'));
    const currentView = views[currentKey];
    const targetView = views[viewName];

    if (!targetView || currentView === targetView) return;

    const updateDOM = () => {
      Object.keys(views).forEach(k => {
        if (views[k]) views[k].classList.remove('active');
      });
      targetView.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Reset aura layar penuh saat keluar dari halaman hasil
      if (viewName !== 'result') {
        const fullAura = document.getElementById('full-screen-aura');
        if (fullAura) fullAura.classList.remove('active');
      }

      // Animasi cascading meter-bar jika masuk ke hasil
      if (viewName === 'result') {
        animateResultEntrance();
      }
    };

    // 1. Coba gunakan View Transitions API bawaan browser
    if (document.startViewTransition) {
      try {
        document.startViewTransition({
          update: updateDOM,
          types: [direction]
        });
        return;
      } catch (e) {
        try {
          document.startViewTransition(updateDOM);
          return;
        } catch (err) {}
      }
    }

    // 2. Fallback: Hardware-Accelerated CSS 3D View Transition
    perform3DViewSwitch(currentView, targetView, updateDOM, direction);
  }

  function perform3DViewSwitch(currentView, targetView, updateDOM, direction) {
    if (!currentView) {
      updateDOM();
      return;
    }

    const exitClass = direction === 'forward' ? 'view-exit-forward' : 'view-exit-backward';
    const enterClass = direction === 'forward' ? 'view-enter-forward' : 'view-enter-backward';

    currentView.classList.add(exitClass);

    setTimeout(() => {
      currentView.classList.remove(exitClass);
      updateDOM();
      targetView.classList.add(enterClass);

      setTimeout(() => {
        targetView.classList.remove(enterClass);
      }, 420);
    }, 240);
  }

  /**
   * Animasi entrance dinamis untuk meter-bar pada result view
   */
  function animateResultEntrance() {
    const fills = document.querySelectorAll('.meter-bar-fill');
    fills.forEach(fill => {
      const targetWidth = fill.style.width;
      fill.style.width = '0%';
      requestAnimationFrame(() => {
        setTimeout(() => {
          fill.style.transition = 'width 1.1s cubic-bezier(0.16, 1, 0.3, 1)';
          fill.style.width = targetWidth;
        }, 120);
      });
    });
  }

  /**
   * Mulai Asesmen
   */
  function handleStartTest(e) {
    e.preventDefault();
    const nameInput = document.getElementById('input-name');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
      alert("Silakan masukkan nama lengkap Anda terlebih dahulu.");
      nameInput?.focus();
      return;
    }

    state.participant.name = name;
    state.participant.agency = document.getElementById('input-agency')?.value.trim() || '-';
    state.participant.email = document.getElementById('input-email')?.value.trim() || '-';

    state.currentQuestionIndex = 0;
    state.answers = new Array(state.questions.length || 40).fill(null);

    switchView('test', 'forward');
    renderQuestion(0);
  }

  /**
   * Render satu soal berdasarkan index
   */
  function renderQuestion(idx) {
    if (!state.questions || state.questions.length === 0) {
      alert("Data pertanyaan belum berhasil dimuat. Silakan periksa koneksi atau refresh halaman.");
      return;
    }

    state.currentQuestionIndex = idx;
    const q = state.questions[idx];
    const totalQ = state.questions.length;

    // Progress Bar
    const progressPercent = Math.round(((idx + 1) / totalQ) * 100);
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) progressFill.style.width = `${progressPercent}%`;

    const stepCounter = document.getElementById('step-counter-text');
    if (stepCounter) stepCounter.textContent = `Soal ${idx + 1} dari ${totalQ}`;

    // Tag & Instruction
    const qBadge = document.getElementById('question-index-badge');
    if (qBadge) qBadge.textContent = `${String(idx + 1).padStart(2, '0')} / ${totalQ}`;

    const partLabel = document.getElementById('question-part-label');
    if (partLabel) {
      partLabel.textContent = idx < 20
        ? 'Bagian I: Sifat Positif & Kekuatan Diri'
        : 'Bagian II: Tantangan & Area Pengembangan Diri';
    }

    // Render Options
    const optionsContainer = document.getElementById('options-container');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];
    const currentSelected = state.answers[idx];

    q.options.forEach((opt, optIdx) => {
      const card = document.createElement('div');
      card.className = `option-card ${currentSelected === optIdx ? 'selected' : ''}`;
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', currentSelected === optIdx ? 'true' : 'false');
      card.setAttribute('data-index', optIdx);

      card.innerHTML = `
        <div class="option-badge">${letters[optIdx]}</div>
        <div class="option-text">${escapeHtml(opt.text)}</div>
        <div class="option-right-action">
          <kbd class="option-key-hint">${optIdx + 1}</kbd>
          <div class="option-radio-dot">
            <div class="option-radio-dot-inner"></div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => selectOption(optIdx));
      optionsContainer.appendChild(card);
    });

    // Update Nav Buttons
    const btnPrev = document.getElementById('btn-prev-question');
    if (btnPrev) {
      btnPrev.disabled = (idx === 0);
      btnPrev.style.opacity = (idx === 0) ? '0.5' : '1';
    }

    const btnNext = document.getElementById('btn-next-question');
    if (btnNext) {
      if (idx === totalQ - 1) {
        btnNext.innerHTML = `Selesai & Lihat Hasil <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
      } else {
        btnNext.innerHTML = `Selanjutnya <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
      }
    }

    // Perbarui visual aura di belakang card
    updateCardAura();
  }

  /**
   * Dynamic Temperament Aura Glow behind Test Card
   * Berubah warna secara real-time mengikuti akumulasi jawaban peserta.
   * Aktif setelah peserta menjawab minimal 4 atau 5 soal.
   */
  function updateCardAura() {
    const auraEl = document.getElementById('test-card-aura');
    if (!auraEl) return;

    let k = 0, s = 0, m = 0, p = 0;
    let answeredCount = 0;

    state.answers.forEach((optIdx, qIdx) => {
      if (optIdx !== null && state.questions[qIdx]) {
        answeredCount++;
        const cat = state.questions[qIdx].options[optIdx].category.toLowerCase();
        if (cat === 'k') k++;
        else if (cat === 's') s++;
        else if (cat === 'm') m++;
        else if (cat === 'p') p++;
      }
    });

    // Update counter di bawah card
    const counterEl = document.getElementById('card-answered-count');
    if (counterEl) {
      counterEl.textContent = `${answeredCount} / ${state.questions.length || 40} dijawab`;
    }

    // Munculkan aura jika sudah menjawab >= 4 soal
    if (answeredCount < 4) {
      auraEl.classList.remove('active');
      return;
    }

    const pK = k / answeredCount;
    const pS = s / answeredCount;
    const pM = m / answeredCount;
    const pP = p / answeredCount;

    // Perpaduan warna dinamis Galen (Koleris: Merah, Sanguinis: Hijau, Melankolis: Ungu, Phlegmatis: Cyan)
    const bg = `
      radial-gradient(circle at 18% 22%, rgba(239, 68, 68, ${0.15 + pK * 0.75}) 0%, transparent 55%),
      radial-gradient(circle at 82% 18%, rgba(16, 185, 129, ${0.15 + pS * 0.75}) 0%, transparent 55%),
      radial-gradient(circle at 22% 82%, rgba(139, 92, 246, ${0.15 + pM * 0.75}) 0%, transparent 55%),
      radial-gradient(circle at 80% 80%, rgba(6, 182, 212, ${0.15 + pP * 0.75}) 0%, transparent 55%),
      radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.12) 0%, transparent 70%)
    `;

    auraEl.style.background = bg;
    auraEl.classList.add('active');
  }

  /**
   * Saat opsi dipilih
   */
  function selectOption(optIdx) {
    state.answers[state.currentQuestionIndex] = optIdx;

    // Update tampilan card
    const cards = document.querySelectorAll('.option-card');
    cards.forEach((c, i) => {
      if (i === optIdx) {
        c.classList.add('selected');
        c.setAttribute('aria-checked', 'true');
      } else {
        c.classList.remove('selected');
        c.setAttribute('aria-checked', 'false');
      }
    });

    // Update aura saat opsi dipilih
    updateCardAura();

    // Auto-advance dengan jeda taktil (180ms) untuk UX yang sangat responsif
    setTimeout(() => {
      if (state.currentQuestionIndex < state.questions.length - 1) {
        navigateQuestion(1);
      } else {
        // Pada soal terakhir, otomatis tuntaskan dan tampilkan hasil
        finishAssessment();
      }
    }, 180);
  }

  /**
   * Navigasi soal (delta: +1 atau -1) dengan 3D deck slide
   */
  function navigateQuestion(delta) {
    const nextIdx = state.currentQuestionIndex + delta;

    if (delta > 0) {
      // Pastikan soal saat ini sudah dijawab sebelum maju
      if (state.answers[state.currentQuestionIndex] === null) {
        showToast("Pilih salah satu pernyataan terlebih dahulu!");
        return;
      }
    }

    if (nextIdx >= state.questions.length) {
      // Selesai seluruh soal! Hitung hasil
      finishAssessment();
    } else if (nextIdx >= 0) {
      const container = document.getElementById('options-container');
      const outClass = delta > 0 ? 'options-flip-out-forward' : 'options-flip-out-backward';
      const inClass = delta > 0 ? 'options-flip-in-forward' : 'options-flip-in-backward';

      if (container) {
        container.classList.add(outClass);
        setTimeout(() => {
          container.classList.remove(outClass);
          renderQuestion(nextIdx);
          container.classList.add(inClass);
          setTimeout(() => {
            container.classList.remove(inClass);
          }, 240);
        }, 90);
      } else {
        renderQuestion(nextIdx);
      }
    }
  }

  /**
   * Keyboard shortcut navigation
   */
  function handleKeyboardNav(e) {
    if (!views.test || !views.test.classList.contains('active')) return;

    if (['1', '2', '3', '4'].includes(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      selectOption(idx);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      navigateQuestion(1);
    } else if (e.key === 'ArrowLeft') {
      navigateQuestion(-1);
    }
  }

  /**
   * Konfirmasi batalkan tes
   */
  function confirmCancelTest() {
    if (confirm("Apakah Anda yakin ingin membatalkan tes ini dan kembali ke menu utama? Jawaban Anda akan direset.")) {
      document.getElementById('test-card-aura')?.classList.remove('active');
      document.getElementById('full-screen-aura')?.classList.remove('active');
      switchView('home', 'backward');
    }
  }

  /**
   * Kalkulasi Hasil Asesmen & Logging
   */
  async function finishAssessment() {
    // 1. Hitung poin masing-masing kategori
    let countK = 0;
    let countS = 0;
    let countM = 0;
    let countP = 0;

    state.answers.forEach((optIdx, qIdx) => {
      if (optIdx !== null && state.questions[qIdx]) {
        const cat = state.questions[qIdx].options[optIdx].category.toLowerCase();
        if (cat === 'k') countK++;
        else if (cat === 's') countS++;
        else if (cat === 'm') countM++;
        else if (cat === 'p') countP++;
      }
    });

    const total = state.questions.length || 40;
    const percentK = parseFloat(((countK / total) * 100).toFixed(1));
    const percentS = parseFloat(((countS / total) * 100).toFixed(1));
    const percentM = parseFloat(((countM / total) * 100).toFixed(1));
    const percentP = parseFloat(((countP / total) * 100).toFixed(1));

    // Urutkan peringkat dominasi (1..4)
    const rankList = [
      { cat: 'k', count: countK, percent: percentK, info: TEMPERAMENT_INFO.k },
      { cat: 's', count: countS, percent: percentS, info: TEMPERAMENT_INFO.s },
      { cat: 'm', count: countM, percent: percentM, info: TEMPERAMENT_INFO.m },
      { cat: 'p', count: countP, percent: percentP, info: TEMPERAMENT_INFO.p }
    ].sort((a, b) => b.count - a.count);

    const dominant1 = rankList[0];
    const dominant2 = rankList[1];

    // Tentukan kunci kombinasi untuk teks ulasan (misal: 'SangKol', 'KolMelan')
    const comboKey = getCombinationKey(dominant1.cat, dominant2.cat);
    const comboTitle = COMBINATION_TITLES[comboKey] || `${dominant1.info.name} - ${dominant2.info.name}`;

    const testId = 'GALEN-' + Date.now().toString(36).toUpperCase();
    const formattedDate = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const results = {
      id: testId,
      timestamp: new Date().toISOString(),
      formattedDate: formattedDate,
      user: { ...state.participant },
      scores: {
        koleris: countK,
        sanguinis: countS,
        melankolis: countM,
        phlegmatis: countP
      },
      percentages: {
        koleris: percentK,
        sanguinis: percentS,
        melankolis: percentM,
        phlegmatis: percentP
      },
      dominant1: dominant1.info.name,
      dominant2: dominant2.info.name,
      dominant1Cat: dominant1.cat,
      dominant2Cat: dominant2.cat,
      combinationKey: comboKey,
      combinationTitle: comboTitle,
      rank: rankList
    };

    state.results = results;

    // Render tampilan hasil & aktifkan aura latar belakang penuh
    renderResultView(results);
    applyResultBackgroundAura(dominant1.cat, dominant2.cat);
    switchView('result', 'forward');

    // Simpan ke storage (LocalStorage + Firebase + Google Sheets)
    try {
      const storageStatus = await window.StorageManager.saveAssessmentLog(results);
      updateStorageStatusBadge(storageStatus);
    } catch (err) {
      console.error("Gagal menyimpan log:", err);
    }
  }

  /**
   * Helper penentu key kombinasi (sesuai format JSON: SangKol, KolMelan, dll.)
   */
  function getCombinationKey(cat1, cat2) {
    const pair = [cat1.toLowerCase(), cat2.toLowerCase()].sort().join('');
    // Kombinasi yang tersedia:
    // k + s = ks -> SangKol
    // k + m = km -> KolMelan
    // k + p = kp -> KolPhleg
    // m + p = mp -> MelanPhleg
    // m + s = ms -> SangMelan
    // p + s = ps -> SangPhleg
    const map = {
      'ks': 'SangKol',
      'km': 'KolMelan',
      'kp': 'KolPhleg',
      'mp': 'MelanPhleg',
      'ms': 'SangMelan',
      'ps': 'SangPhleg'
    };
    return map[pair] || 'SangKol';
  }

  /**
   * Dynamic Full-Screen Temperament Aura
   * Mengisi seluruh latar belakang halaman hasil asesmen dengan perpaduan warna
   * dari dua temperamen dominan peserta.
   * Contoh: Melankolis (Ungu #8B5CF6) + Sanguinis (Hijau #10B981) menghasilkan perpaduan
   * kosmik ungu dan hijau yang menyatu lembut di seluruh layar.
   */
  function applyResultBackgroundAura(cat1, cat2) {
    const auraEl = document.getElementById('full-screen-aura');
    if (!auraEl) return;

    const AURA_COLORS = {
      k: { rgb: '239, 68, 68', name: 'Koleris' },      // Merah
      s: { rgb: '16, 185, 129', name: 'Sanguinis' },   // Hijau
      m: { rgb: '139, 92, 246', name: 'Melankolis' },  // Ungu
      p: { rgb: '6, 182, 212', name: 'Phlegmatis' }    // Cyan / Biru
    };

    const c1 = AURA_COLORS[cat1?.toLowerCase()] || AURA_COLORS.k;
    const c2 = AURA_COLORS[cat2?.toLowerCase()] || AURA_COLORS.s;

    // Mesh gradient organik yang menyatu secara halus di seluruh layar
    const bgMesh = `
      radial-gradient(circle at 15% 18%, rgba(${c1.rgb}, 0.28) 0%, transparent 55%),
      radial-gradient(circle at 85% 82%, rgba(${c2.rgb}, 0.28) 0%, transparent 55%),
      radial-gradient(circle at 50% 45%, rgba(${c1.rgb}, 0.16) 0%, rgba(${c2.rgb}, 0.16) 50%, transparent 75%),
      radial-gradient(circle at 82% 16%, rgba(${c2.rgb}, 0.18) 0%, transparent 45%),
      radial-gradient(circle at 18% 85%, rgba(${c1.rgb}, 0.18) 0%, transparent 45%)
    `;

    auraEl.style.background = bgMesh;
    auraEl.classList.add('active');
  }

  /**
   * Render Halaman Hasil
   */
  function renderResultView(r) {
    // Header Data
    document.getElementById('res-participant-name').textContent = r.user.name;
    document.getElementById('res-assessment-date').textContent = r.formattedDate;
    document.getElementById('res-combination-title').textContent = r.combinationTitle;

    // Chips
    const chipsContainer = document.getElementById('res-chips-container');
    if (chipsContainer) {
      chipsContainer.innerHTML = `
        <span class="temperament-chip chip-${r.dominant1Cat === 'k' ? 'koleris' : r.dominant1Cat === 's' ? 'sanguin' : r.dominant1Cat === 'm' ? 'melan' : 'phleg'}">
          Dominan 1: ${r.dominant1} (${r.rank[0].percent}%)
        </span>
        <span class="temperament-chip chip-${r.dominant2Cat === 'k' ? 'koleris' : r.dominant2Cat === 's' ? 'sanguin' : r.dominant2Cat === 'm' ? 'melan' : 'phleg'}">
          Dominan 2: ${r.dominant2} (${r.rank[1].percent}%)
        </span>
      `;
    }

    // Render Progress Meters
    const metersContainer = document.getElementById('meters-container');
    if (metersContainer) {
      metersContainer.innerHTML = '';
      r.rank.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'meter-row';
        row.innerHTML = `
          <div class="meter-label-row">
            <div class="meter-name">
              <span class="rank-badge">#${idx + 1}</span>
              <strong>${item.info.name}</strong>
              <span style="font-size:0.8rem; color:var(--text-subtle);">(${item.info.title})</span>
            </div>
            <div>
              <span>${item.count} / 40 Poin</span> • <strong>${item.percent}%</strong>
            </div>
          </div>
          <div class="meter-bar-track">
            <div class="meter-bar-fill fill-${item.info.color}" style="width: ${item.percent}%;"></div>
          </div>
        `;
        metersContainer.appendChild(row);
      });
    }

    // Render Tab Konten
    renderResultTabs(r);
  }

  /**
   * Render Konten Ulasan per Tab
   */
  function renderResultTabs(r) {
    const desc = state.descriptions || {};

    // 1. Tab Karakter Utama (Dominan 1)
    const domKey = TEMPERAMENT_INFO[r.dominant1Cat]?.key || 'Koler';
    const mainText = desc[domKey] || 'Penjelasan karakter utama sedang dimuat...';
    document.getElementById('tab-content-dominant').innerHTML = formatTextToHtml(mainText);

    // 2. Tab Perpaduan Karakter (Dominan 1 + 2)
    const comboText = desc[r.combinationKey] || 'Penjelasan perpaduan karakter sedang dimuat...';
    document.getElementById('tab-content-combo').innerHTML = formatTextToHtml(comboText);

    // 3. Tab Teori Galen
    const teoriText = desc['Teori'] || 'Teori temperamen Hippocrates dan Galen mengelompokkan karakter ke dalam 4 cairan tubuh alami.';
    document.getElementById('tab-content-theory').innerHTML = formatTextToHtml(teoriText);

    // Default aktif tab pertama
    switchResultTab('dominant');
  }

  /**
   * Switch active result tab
   */
  function switchResultTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-content-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-content-${tabName}`);
    });
  }

  /**
   * Format teks mentah dari database menjadi HTML paragraf yang rapi
   */
  function formatTextToHtml(rawText) {
    if (!rawText) return '<p>Konten belum tersedia.</p>';

    const paragraphs = rawText.split(/\r?\n\r?\n/);
    let html = '';

    paragraphs.forEach(p => {
      const trimmed = p.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        html += `<h4>${escapeHtml(trimmed.replace(/\*\*/g, ''))}</h4>`;
      } else if (trimmed.startsWith('Catatan:')) {
        html += `<div class="callout-box"><strong>Catatan Penting:</strong><br>${escapeHtml(trimmed.replace(/^Catatan:\s*/i, ''))}</div>`;
      } else {
        html += `<p>${escapeHtml(trimmed)}</p>`;
      }
    });

    return html;
  }

  /**
   * Copy ringkasan hasil ke clipboard
   */
  function copyResultSummary() {
    if (!state.results) return;
    const r = state.results;
    const summary = `Hasil Tes Kepribadian Galen (4 Temperamen)
Nama: ${r.user.name}
Tanggal: ${r.formattedDate}
----------------------------------------
Karakter Dominan: ${r.dominant1} (${r.percentages[r.dominant1Cat.toLowerCase() === 'k' ? 'koleris' : r.dominant1Cat.toLowerCase() === 's' ? 'sanguinis' : r.dominant1Cat.toLowerCase() === 'm' ? 'melankolis' : 'phlegmatis']}%)
Karakter Pendamping: ${r.dominant2}
Gelar: ${r.combinationTitle}

Skor Lengkap:
- Koleris: ${r.percentages.koleris}% (${r.scores.koleris}/40)
- Sanguinis: ${r.percentages.sanguinis}% (${r.scores.sanguinis}/40)
- Melankolis: ${r.percentages.melankolis}% (${r.scores.melankolis}/40)
- Phlegmatis: ${r.percentages.phlegmatis}% (${r.scores.phlegmatis}/40)
----------------------------------------
Dibuat dengan Galen Personality Assessment Tool`;

    navigator.clipboard.writeText(summary).then(() => {
      showToast("Ringkasan berhasil disalin ke clipboard!");
    }).catch(() => {
      showToast("Gagal menyalin otomatis, silakan copy manual.");
    });
  }

  /**
   * Konfirmasi Ulangi Tes
   */
  function confirmRetest() {
    if (confirm("Ingin melakukan asesmen ulang? Anda akan kembali ke beranda.")) {
      state.currentQuestionIndex = 0;
      state.answers = new Array(40).fill(null);
      state.results = null;
      document.getElementById('test-card-aura')?.classList.remove('active');
      document.getElementById('full-screen-aura')?.classList.remove('active');
      switchView('home', 'backward');
    }
  }

  /**
   * Efek 3D Card Parallax Tilt & Dynamic Physical Glare
   * Memberikan efek fisik taktil saat kursor mouse bergerak di atas card di desktop.
   */
  function init3DTiltEffects() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    const tiltCards = document.querySelectorAll('.card-3d-tilt');
    tiltCards.forEach(card => {
      if (!card.querySelector('.card-3d-glare')) {
        const glare = document.createElement('div');
        glare.className = 'card-3d-glare';
        card.appendChild(glare);
      }

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Rotasi proporsional maksimum 4.5 derajat
        const rotateX = -((y - centerY) / centerY) * 4.5;
        const rotateY = ((x - centerX) / centerX) * 4.5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(8px)`;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
        setTimeout(() => {
          card.style.transition = '';
        }, 550);
      });

      card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.12s ease-out';
      });
    });
  }

  /**
   * Update indikator badge penyimpanan
   */
  function updateStorageStatusBadge(status) {
    const badge = document.getElementById('res-storage-badge');
    if (!badge) return;

    let text = "Tersimpan di Penyimpanan Lokal";
    if (status && status.firebase && status.firebase.success) {
      text += " • Firebase Cloud";
    }
    if (status && status.googleSheets && status.googleSheets.success) {
      text += " • Google Sheets";
    }
    badge.textContent = text;
  }

  /**
   * Update badge status backend di header / settings
   */
  function updateBackendBadgeStatus() {
    const config = window.GalenConfig.get();
    const fbInput = document.getElementById('setting-fb-url');
    const gsInput = document.getElementById('setting-gs-url');
    if (fbInput) fbInput.value = config.firebase.databaseUrl || '';
    if (gsInput) gsInput.value = config.googleSheets.webhookUrl || '';
  }

  /**
   * Buka Modal Logs & Admin
   */
  function openLogsModal() {
    renderLogsTable();
    updateBackendBadgeStatus();
    document.getElementById('modal-logs-backdrop')?.classList.add('open');
  }

  /**
   * Tutup Modal Logs
   */
  function closeLogsModal() {
    document.getElementById('modal-logs-backdrop')?.classList.remove('open');
  }

  /**
   * Render Tabel Riwayat Peserta
   */
  function renderLogsTable() {
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;

    const logs = window.StorageManager.getLocalLogs();
    tbody.innerHTML = '';

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-subtle);">Belum ada riwayat asesmen yang tersimpan di perangkat ini.</td></tr>`;
      return;
    }

    logs.forEach(l => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(l.user?.name || '-')}</strong></td>
        <td>${escapeHtml(l.formattedDate || l.timestamp?.slice(0, 10) || '-')}</td>
        <td><span class="temperament-chip" style="padding:0.15rem 0.5rem; font-size:0.75rem;">${l.dominant1 || '-'}</span></td>
        <td>${l.dominant2 || '-'}</td>
        <td>
          <small>
            K: ${l.percentages?.koleris || 0}% | 
            S: ${l.percentages?.sanguinis || 0}% | 
            M: ${l.percentages?.melankolis || 0}% | 
            P: ${l.percentages?.phlegmatis || 0}%
          </small>
        </td>
        <td>${escapeHtml(l.user?.agency || '-')}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * Hapus riwayat log
   */
  function handleClearLogs() {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat log di browser ini?")) {
      window.StorageManager.clearLocalLogs();
      renderLogsTable();
      showToast("Riwayat log lokal telah dibersihkan.");
    }
  }

  /**
   * Simpan Konfigurasi Backend
   */
  function handleSaveBackendSettings(e) {
    e.preventDefault();
    const config = window.GalenConfig.get();
    const fbUrl = document.getElementById('setting-fb-url')?.value.trim() || '';
    const gsUrl = document.getElementById('setting-gs-url')?.value.trim() || '';

    config.firebase.databaseUrl = fbUrl;
    config.firebase.enabled = Boolean(fbUrl);

    config.googleSheets.webhookUrl = gsUrl;
    config.googleSheets.enabled = Boolean(gsUrl);

    window.GalenConfig.save(config);
    showToast("Pengaturan backend berhasil disimpan!");
  }

  /**
   * Toast notification helper
   */
  function showToast(msg) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'flex';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3200);
  }

  /**
   * Helper XSS sanitation
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Expose untuk testing & debugging
  window.GalenState = state;

  // Jalankan inisialisasi saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
