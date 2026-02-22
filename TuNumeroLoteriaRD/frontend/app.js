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
  // Enlace dinámico al Home
  // ========================
  const homeLink = document.getElementById('homeLink');
  if (homeLink) {
    const isInPages = window.location.pathname.includes('/pages/');
    homeLink.setAttribute('href', isInPages ? '../index.html' : 'index.html');
  }

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
  };

  // ========================
  // Fetch de resultados
  // ========================
  const obtenerResultados = async (ruta, loteria) => {
    setLoadingState(loteria);
    try {
      const response = await fetch(`http://localhost:3000${ruta}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      mostrarResultados(data, loteria);
    } catch (error) {
      console.error(`Error al obtener los datos de ${loteria}:`, error);
      setErrorState(loteria);
    }
  };

  // Lanzar todas las peticiones
  for (const [loteria, ruta] of Object.entries(rutasLoterias)) {
    obtenerResultados(ruta, loteria);
  }
});
