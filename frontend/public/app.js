document.addEventListener('DOMContentLoaded', () => {

  // ========================
  // Toggle Claro / Oscuro
  // El tema oscuro es el default; light-mode lo activa el usuario
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
        // Cierra el menú móvil si está abierto
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
  // Helper: fecha de hoy en DD-MM-YYYY
  // ========================
  const todayDDMMYYYY = () => {
    const now = new Date();
    return [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0'),
      now.getFullYear()
    ].join('-');
  };

  // ========================
  // Rutas (Express proxy → Flask)
  // ========================
  const rutasLoterias = {
    nacional: '/nacional',
    leidsa:   '/leidsa',
    loteka:   '/loteria-loteka',
    real:     '/real',
    suerte:   '/loteria-la-suerte',
    primera:  '/primera'
  };

  // ========================
  // Estado de carga
  // ========================
  const setLoadingState = (loteria) => {
    ['primer', 'segundo', 'tercer'].forEach(premio => {
      const el = document.getElementById(`${premio}-${loteria}`);
      if (el) {
        el.textContent = '...';
        el.className = 'premio-numero loading';
      }
    });
  };

  // ========================
  // Estado de error
  // ========================
  const setErrorState = (loteria) => {
    ['primer', 'segundo', 'tercer'].forEach(premio => {
      const el = document.getElementById(`${premio}-${loteria}`);
      if (el) {
        el.textContent = 'No disponible';
        el.className = 'premio-numero error';
      }
    });
    const fechaEl = document.getElementById(`fecha-${loteria}`);
    if (fechaEl) fechaEl.textContent = '—';
  };

  // ========================
  // Mostrar resultados
  // Flask devuelve: [{ id, name, date, number: "12-34-56" }]
  // ========================
  const mostrarResultados = (data, loteria) => {
    if (!Array.isArray(data) || data.length === 0) {
      setErrorState(loteria);
      return;
    }

    const item = data[0];
    const premios = item.number ? item.number.split('-') : [];

    const fechaEl = document.getElementById(`fecha-${loteria}`);
    if (fechaEl) fechaEl.textContent = item.date || '—';

    ['primer', 'segundo', 'tercer'].forEach((premio, i) => {
      const el = document.getElementById(`${premio}-${loteria}`);
      if (el) {
        el.textContent = premios[i] ?? '—';
        el.className = 'premio-numero';
      }
    });

    // Badge Hoy / fecha anterior
    const badgeEl = document.getElementById(`badge-${loteria}`);
    if (badgeEl && item.date) {
      const esHoy = item.date === todayDDMMYYYY();
      badgeEl.textContent = esHoy ? '🟢 Hoy' : `🟡 ${item.date}`;
      badgeEl.className = 'card-badge ms-auto';
    }
  };

  // ========================
  // Fetch de resultados (acepta fecha opcional en formato dd-mm-yyyy)
  // ========================
  const obtenerResultados = async (ruta, loteria, fechaParam = null) => {
    setLoadingState(loteria);
    try {
      let url = `http://localhost:3000${ruta}`;
      if (fechaParam) url += `?date=${fechaParam}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      mostrarResultados(data, loteria);
    } catch (error) {
      console.error(`Error al obtener los datos de ${loteria}:`, error);
      setErrorState(loteria);
    }
  };

  // ========================
  // Date Picker
  // ========================
  const fechaPicker = document.getElementById('fecha-picker');
  const btnHoy      = document.getElementById('btn-hoy');
  const heroTitle   = document.getElementById('hero-title');

  const hoyISO = () => {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');
  };

  const isoToBackend = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  };

  const cargarFecha = (isoDate) => {
    const hoy = hoyISO();
    const esHoy = isoDate === hoy;
    if (heroTitle) {
      heroTitle.textContent = esHoy
        ? 'Resultados de Hoy'
        : `Resultados del ${isoToBackend(isoDate)}`;
    }
    const fechaParam = esHoy ? null : isoToBackend(isoDate);
    for (const [loteria, ruta] of Object.entries(rutasLoterias)) {
      obtenerResultados(ruta, loteria, fechaParam);
    }
  };

  if (fechaPicker) {
    const hoy = hoyISO();
    fechaPicker.max   = hoy;
    fechaPicker.value = hoy;
    fechaPicker.addEventListener('change', () => cargarFecha(fechaPicker.value));
  }

  if (btnHoy && fechaPicker) {
    btnHoy.addEventListener('click', () => {
      fechaPicker.value = hoyISO();
      cargarFecha(fechaPicker.value);
    });
  }

  // Lanzar carga inicial solo si esta página tiene las cards de loterías
  if (document.getElementById('primer-nacional')) {
    cargarFecha(hoyISO());
  }

  // ========================
  // Consultar Números
  // ========================
  const lotteryLabels = {
    nacional: 'Lotería Nacional',
    leidsa:   'Leidsa',
    loteka:   'Loteka',
    real:     'Lotería Real',
    suerte:   'La Suerte Dominicana',
    primera:  'La Primera',
  };

  const numInputIds = ['num1', 'num2', 'num3'];

  // Auto-avance entre inputs y solo dígitos
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
    const nums = numInputIds
      .map(id => (document.getElementById(id)?.value || '').trim())
      .filter(n => n !== '')
      .map(n => n.padStart(2, '0'));

    if (nums.length === 0) return;

    if (resultadosEl) resultadosEl.innerHTML = '<p class="consultar-loading">Buscando...</p>';

    const matches = [];

    await Promise.all(
      Object.entries(rutasLoterias).map(async ([loteria, ruta]) => {
        try {
          const response = await fetch(`http://localhost:3000${ruta}`);
          if (!response.ok) return;
          const data = await response.json();
          if (!Array.isArray(data)) return;
          data.forEach(item => {
            const prizes = (item.number || '').split('-').map(p => p.padStart(2, '0'));
            if (nums.some(n => prizes.includes(n))) {
              matches.push({
                loteria: lotteryLabels[loteria] || item.name,
                fecha:   item.date || '—',
                numero:  item.number || '—',
              });
            }
          });
        } catch { /* ignorar error por lotería */ }
      })
    );

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

  // Abrir panel desde el menú
  document.querySelectorAll('.stats-nav-link[data-stats]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      openStatsPanel(link.getAttribute('data-stats'));
    });
  });

  // Cambio de pestaña dentro del panel
  document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.addEventListener('click', () => openStatsPanel(tab.getAttribute('data-tab')));
  });

  // Cerrar panel
  document.getElementById('btn-stats-close')?.addEventListener('click', () => {
    statsPanel?.setAttribute('hidden', '');
  });

  // Fetch todos los números disponibles → { número: frecuencia }
  const fetchAllNumbers = async () => {
    const results = await Promise.allSettled(
      Object.values(rutasLoterias).map(async ruta => {
        const r = await fetch(`http://localhost:3000${ruta}`);
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error();
        return data.flatMap(item =>
          (item.number || '').split('-').map(n => n.padStart(2, '0'))
        );
      })
    );
    const freq = {};
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        r.value.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
      }
    });
    return freq;
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

    const fechaParam = isoToBackend(fechaAntEl.value);
    const nombres = {
      nacional: 'Lotería Nacional', leidsa: 'Leidsa', loteka: 'Loteka',
      real: 'Lotería Real', suerte: 'La Suerte Dominicana', primera: 'La Primera',
    };

    const results = await Promise.allSettled(
      Object.entries(rutasLoterias).map(async ([key, ruta]) => {
        const r = await fetch(`http://localhost:3000${ruta}?date=${fechaParam}`);
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error();
        return { name: nombres[key], item: data[0] };
      })
    );

    const rows = results
      .filter(r => r.status === 'fulfilled')
      .map(r => {
        const { name, item } = r.value;
        return `<div class="anteriores-row">
          <span class="ant-name">${name}</span>
          <span class="ant-fecha">${item.date || '—'}</span>
          <span class="ant-num">${item.number || '—'}</span>
        </div>`;
      });

    el.innerHTML = rows.length > 0
      ? rows.join('')
      : '<p class="consultar-vacio">No se encontraron resultados para esa fecha.</p>';
  });

  // ========================
  // Refresh FAB
  // ========================
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-refresh');
    btn?.classList.add('spinning');
    // Invalidar caché de estadísticas para forzar recarga
    const cal = document.getElementById('calientes-content');
    const fri = document.getElementById('frios-content');
    if (cal) delete cal.dataset.loaded;
    if (fri) delete fri.dataset.loaded;
    cargarFecha(fechaPicker?.value || hoyISO());
    setTimeout(() => btn?.classList.remove('spinning'), 1500);
  });
});
