document.addEventListener('DOMContentLoaded', () => {

  // ========================
  // Toggle Claro / Oscuro
  // ========================
  const toggleButton = document.getElementById('toggleDarkMode');

  function aplicarModo(modo) {
    if (modo === 'light') {
      document.body.classList.add('light-mode');
      if (toggleButton) {
        toggleButton.innerHTML = '<i class="fas fa-moon"></i>';
        toggleButton.title = 'Modo Oscuro';
      }
    } else {
      document.body.classList.remove('light-mode');
      if (toggleButton) {
        toggleButton.innerHTML = '<i class="fas fa-sun"></i>';
        toggleButton.title = 'Modo Claro';
      }
    }
  }

  const estadoGuardado = localStorage.getItem('color-mode') || 'dark';
  aplicarModo(estadoGuardado);

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      const modoActual = document.body.classList.contains('light-mode') ? 'light' : 'dark';
      const nuevoModo = modoActual === 'light' ? 'dark' : 'light';
      localStorage.setItem('color-mode', nuevoModo);
      aplicarModo(nuevoModo);
    });
  }

  // ========================
  // Año dinámico en el footer
  // ========================
  const footerYear = document.getElementById('footer-year');
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  // ========================
  // Scroll suave desde el navbar
  // ========================
  document.querySelectorAll('.nav-scroll[data-target]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const navCollapse = document.getElementById('navbarNav');
        if (navCollapse && navCollapse.classList.contains('show')) {
          const toggler = document.querySelector('.navbar-toggler');
          if (toggler) toggler.click();
        }
      }
    });
  });

  // ========================
  // Enlace dinámico al Home
  // ========================
  const homeLink = document.getElementById('homeLink');
  if (homeLink) {
    const isInPages = window.location.pathname.includes('/pages/');
    homeLink.setAttribute('href', isInPages ? '../index.html' : 'index.html');
  }

  // ========================
  // Helpers de fecha
  // ========================
  const hoyISO = () => {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');
  };

  // YYYY-MM-DD → DD/MM/YYYY para mostrar en UI
  const formatDrawDate = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  // ========================
  // API unificada (nueva estructura Flask + Neon)
  // Respuesta: { date, source: "db"|"scraping", results: [...] }
  // ========================
  const API_BASE = 'http://localhost:3000';

  const fetchResultados = async (isoDate) => {
    const url = isoDate === hoyISO()
      ? `${API_BASE}/api/results/today`
      : `${API_BASE}/api/results/date/${isoDate}`;
    const r = await fetch(url);
    const body = await r.json();
    if (!r.ok) throw body;
    return body;
  };

  // ========================
  // Mapeo draw_name → clave de card
  // ========================
  const DRAW_MAP = [
    { key: 'nacional', kw: ['nacional'] },
    { key: 'leidsa',   kw: ['leidsa']   },
    { key: 'loteka',   kw: ['loteka']   },
    { key: 'real',     kw: ['real']     },
    { key: 'suerte',   kw: ['suerte']   },
    { key: 'primera',  kw: ['primera']  },
  ];

  const nameToKey = (drawName) => {
    const lower = (drawName || '').toLowerCase();
    return DRAW_MAP.find(m => m.kw.some(k => lower.includes(k)))?.key ?? null;
  };

  const lotteryLabels = {
    nacional: 'Lotería Nacional',
    leidsa:   'Leidsa',
    loteka:   'Loteka',
    real:     'Lotería Real',
    suerte:   'La Suerte Dominicana',
    primera:  'La Primera',
  };

  const ALL_KEYS = Object.keys(lotteryLabels);

  // ========================
  // Estados de los cards
  // ========================
  const setLoadingState = (key) => {
    ['primer', 'segundo', 'tercer'].forEach(premio => {
      const el = document.getElementById(`${premio}-${key}`);
      if (el) {
        el.textContent = '...';
        el.className = 'premio-numero loading';
      }
    });
    const fechaEl = document.getElementById(`fecha-${key}`);
    if (fechaEl) fechaEl.textContent = 'Cargando...';
    const badgeEl = document.getElementById(`badge-${key}`);
    if (badgeEl) badgeEl.textContent = '';
  };

  const setErrorState = (key) => {
    ['primer', 'segundo', 'tercer'].forEach(premio => {
      const el = document.getElementById(`${premio}-${key}`);
      if (el) {
        el.textContent = '—';
        el.className = 'premio-numero error';
      }
    });
    const fechaEl = document.getElementById(`fecha-${key}`);
    if (fechaEl) fechaEl.textContent = '—';
    const badgeEl = document.getElementById(`badge-${key}`);
    if (badgeEl) badgeEl.textContent = '';
  };

  // ========================
  // Badge de fuente (En vivo / Desde caché)
  // ========================
  const updateSourceBadge = (source) => {
    const el = document.getElementById('source-indicator');
    if (!el) return;
    if (source === 'scraping') {
      el.textContent = '🔴 En vivo';
      el.className = 'source-badge source-live';
      el.hidden = false;
    } else if (source === 'db') {
      el.textContent = '🗄️ Desde caché';
      el.className = 'source-badge source-cache';
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  };

  // ========================
  // Banner de error global
  // ========================
  const ERROR_MESSAGES = {
    bd_connection:  'No se pudo conectar a la base de datos. Verifique que el servidor esté activo.',
    no_results:     'No hay resultados disponibles para esta fecha.',
    scraping_error: 'Error al obtener los datos en tiempo real. Los resultados podrían no estar disponibles aún.',
    default:        'Error al obtener los resultados. Intente de nuevo más tarde.',
  };

  const errorMsg = (err) =>
    ERROR_MESSAGES[err?.error] ||
    (err?.status === 503 ? ERROR_MESSAGES.bd_connection :
     err?.status === 404 ? ERROR_MESSAGES.no_results :
     ERROR_MESSAGES.default);

  const showError = (msg) => {
    const el = document.getElementById('global-error');
    if (el) { el.textContent = msg; el.hidden = false; }
  };

  const clearError = () => {
    const el = document.getElementById('global-error');
    if (el) el.hidden = true;
  };

  // ========================
  // Renderizar un resultado en su card
  // item: { draw_name, draw_date, numbers: [...], extra }
  // ========================
  const renderCard = (item) => {
    const key = nameToKey(item.draw_name);
    if (!key) return;

    const nums = item.numbers || [];
    const dateStr = formatDrawDate(item.draw_date);

    const fechaEl = document.getElementById(`fecha-${key}`);
    if (fechaEl) fechaEl.textContent = dateStr;

    ['primer', 'segundo', 'tercer'].forEach((p, i) => {
      const el = document.getElementById(`${p}-${key}`);
      if (el) {
        el.textContent = nums[i] !== undefined ? String(nums[i]).padStart(2, '0') : '—';
        el.className = 'premio-numero';
      }
    });

    const badgeEl = document.getElementById(`badge-${key}`);
    if (badgeEl) {
      const esHoy = item.draw_date === hoyISO();
      badgeEl.textContent = esHoy ? '🟢 Hoy' : `🟡 ${dateStr}`;
      badgeEl.className = 'card-badge ms-auto';
    }
  };

  // ========================
  // Cargar resultados por fecha (ISO: YYYY-MM-DD)
  // ========================
  const cargarFecha = async (isoDate) => {
    clearError();
    ALL_KEYS.forEach(setLoadingState);

    try {
      const data = await fetchResultados(isoDate);

      // Resetear todos a sin datos antes de renderizar
      ALL_KEYS.forEach(setErrorState);

      if (!data.results || data.results.length === 0) {
        showError(ERROR_MESSAGES.no_results);
        updateSourceBadge(null);
        return;
      }

      updateSourceBadge(data.source);

      // Renderizar cada resultado en su card (primera coincidencia por clave)
      const used = new Set();
      data.results.forEach(item => {
        const key = nameToKey(item.draw_name);
        if (!key || used.has(key)) return;
        used.add(key);
        renderCard(item);
      });
    } catch (err) {
      ALL_KEYS.forEach(setErrorState);
      showError(errorMsg(err));
      updateSourceBadge(null);
      console.error('Error cargando resultados:', err);
    }
  };

  // ========================
  // Date Picker
  // ========================
  const fechaPicker = document.getElementById('fecha-picker');
  const btnHoy      = document.getElementById('btn-hoy');
  const heroTitle   = document.getElementById('hero-title');

  const updateHeroTitle = (isoDate) => {
    if (!heroTitle) return;
    heroTitle.textContent = isoDate === hoyISO()
      ? 'Resultados de Hoy'
      : `Resultados del ${formatDrawDate(isoDate)}`;
  };

  if (fechaPicker) {
    const hoy = hoyISO();
    fechaPicker.max   = hoy;
    fechaPicker.value = hoy;
    fechaPicker.addEventListener('change', () => {
      updateHeroTitle(fechaPicker.value);
      cargarFecha(fechaPicker.value);
    });
  }

  if (btnHoy && fechaPicker) {
    btnHoy.addEventListener('click', () => {
      fechaPicker.value = hoyISO();
      updateHeroTitle(fechaPicker.value);
      cargarFecha(fechaPicker.value);
    });
  }

  // Carga inicial solo si hay cards de loterías en la página
  if (document.getElementById('primer-nacional')) {
    cargarFecha(hoyISO());
  }

  // ========================
  // Consultar Números
  // ========================
  const numInputIds = ['num1', 'num2', 'num3'];

  numInputIds.forEach((id, index) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = el.value.replace(/\D/g, '');
      if (el.value.length >= 2 && index < numInputIds.length - 1) {
        document.getElementById(numInputIds[index + 1])?.focus();
      }
    });
  });

  const btnConsultar = document.getElementById('btn-consultar');
  const resultadosEl = document.getElementById('consultar-resultados');

  const consultarNumeros = async () => {
    const queryNums = numInputIds
      .map(id => (document.getElementById(id)?.value || '').trim())
      .filter(n => n !== '')
      .map(n => n.padStart(2, '0'));

    if (queryNums.length === 0) return;

    if (resultadosEl) resultadosEl.innerHTML = '<p class="consultar-loading">Buscando...</p>';

    const matches = [];
    try {
      const data = await fetchResultados(hoyISO());
      (data.results || []).forEach(item => {
        const key = nameToKey(item.draw_name);
        const nums = (item.numbers || []).map(n => String(n).padStart(2, '0'));
        if (queryNums.some(n => nums.includes(n))) {
          matches.push({
            loteria: lotteryLabels[key] || item.draw_name,
            fecha:   formatDrawDate(item.draw_date),
            numero:  nums.join('-'),
          });
        }
      });
    } catch { /* ignorar error */ }

    if (!resultadosEl) return;

    if (matches.length === 0) {
      resultadosEl.innerHTML = '<p class="consultar-vacio">No se encontraron coincidencias.</p>';
    } else {
      resultadosEl.innerHTML = matches.map(m =>
        `<div class="consultar-match">
          <span class="match-check">✓</span>
          <span class="match-loteria">${m.loteria}</span>
          <span class="match-fecha">${m.fecha}</span>
          <span class="match-numero">${m.numero}</span>
        </div>`
      ).join('');
    }
  };

  if (btnConsultar) {
    btnConsultar.addEventListener('click', consultarNumeros);
    numInputIds.forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') consultarNumeros();
      });
    });
  }

  // ========================
  // Stats Panel
  // ========================
  const statsPanel = document.getElementById('stats-panel');

  const openStatsPanel = (tabName) => {
    if (!statsPanel) return;
    statsPanel.removeAttribute('hidden');
    statsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.stats-pane').forEach(p => p.setAttribute('hidden', ''));

    document.querySelector(`.stats-tab[data-tab="${tabName}"]`)?.classList.add('active');
    document.getElementById(`tab-${tabName}`)?.removeAttribute('hidden');

    if (tabName === 'calientes') loadCalientes();
    else if (tabName === 'frios') loadFrios();
  };

  document.querySelectorAll('.stats-nav-link[data-stats]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      openStatsPanel(link.getAttribute('data-stats'));
    });
  });

  document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.addEventListener('click', () => openStatsPanel(tab.getAttribute('data-tab')));
  });

  document.getElementById('btn-stats-close')?.addEventListener('click', () => {
    statsPanel?.setAttribute('hidden', '');
  });

  // Frecuencias desde el endpoint unificado
  const fetchAllNumbers = async () => {
    try {
      const data = await fetchResultados(hoyISO());
      const freq = {};
      (data.results || []).forEach(item => {
        (item.numbers || []).forEach(n => {
          const key = String(n).padStart(2, '0');
          freq[key] = (freq[key] || 0) + 1;
        });
      });
      return freq;
    } catch {
      return {};
    }
  };

  const renderFreqList = (el, entries) => {
    if (entries.length === 0) {
      el.innerHTML = '<p class="consultar-vacio">Sin datos disponibles.</p>';
      return;
    }
    const topMax = Math.max(...entries.map(e => e[1]));
    el.innerHTML = `<div class="freq-list">${
      entries.map(([num, count]) => `
        <div class="freq-item">
          <span class="freq-num">${num}</span>
          <div class="freq-bar-wrap">
            <div class="freq-bar" style="width:${Math.round((count / topMax) * 100)}%"></div>
          </div>
          <span class="freq-count">${count}×</span>
        </div>`).join('')
    }</div>`;
  };

  const loadCalientes = async () => {
    const el = document.getElementById('calientes-content');
    if (!el || el.dataset.loaded === '1') return;
    el.innerHTML = '<p class="consultar-loading">Analizando...</p>';
    const freq = await fetchAllNumbers();
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    renderFreqList(el, sorted);
    el.dataset.loaded = '1';
  };

  const loadFrios = async () => {
    const el = document.getElementById('frios-content');
    if (!el || el.dataset.loaded === '1') return;
    el.innerHTML = '<p class="consultar-loading">Analizando...</p>';
    const freq = await fetchAllNumbers();
    const sorted = Object.entries(freq).sort((a, b) => a[1] - b[1]).slice(0, 10);
    renderFreqList(el, sorted);
    el.dataset.loaded = '1';
  };

  // Resultados Anteriores
  const fechaAntEl = document.getElementById('fecha-anteriores');
  if (fechaAntEl) {
    fechaAntEl.max   = hoyISO();
    fechaAntEl.value = hoyISO();
  }

  document.getElementById('btn-buscar-anteriores')?.addEventListener('click', async () => {
    const el = document.getElementById('anteriores-content');
    if (!el || !fechaAntEl) return;
    el.innerHTML = '<p class="consultar-loading">Cargando...</p>';

    try {
      const data = await fetchResultados(fechaAntEl.value);
      const results = data.results || [];

      if (results.length === 0) {
        el.innerHTML = '<p class="consultar-vacio">No se encontraron resultados para esa fecha.</p>';
        return;
      }

      const rows = results.map(item => {
        const key = nameToKey(item.draw_name);
        const nums = (item.numbers || []).map(n => String(n).padStart(2, '0')).join('-');
        return `<div class="anteriores-row">
          <span class="ant-name">${lotteryLabels[key] || item.draw_name}</span>
          <span class="ant-fecha">${formatDrawDate(item.draw_date)}</span>
          <span class="ant-num">${nums || '—'}</span>
        </div>`;
      });
      el.innerHTML = rows.join('');
    } catch (err) {
      el.innerHTML = `<p class="consultar-vacio">${errorMsg(err)}</p>`;
    }
  });

  // ========================
  // Refresh FAB
  // ========================
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-refresh');
    btn?.classList.add('spinning');
    const cal = document.getElementById('calientes-content');
    const fri = document.getElementById('frios-content');
    if (cal) delete cal.dataset.loaded;
    if (fri) delete fri.dataset.loaded;
    cargarFecha(fechaPicker?.value || hoyISO());
    setTimeout(() => btn?.classList.remove('spinning'), 1500);
  });
});
