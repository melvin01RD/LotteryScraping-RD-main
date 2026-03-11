# Frontend — Express (puerto 3000)

## Levantar el servidor

```powershell
cd frontend
node src/server.js
```

## Verificar que está corriendo

```powershell
curl http://localhost:3000
```

## Detener el proceso (PowerShell)

```powershell
taskkill /F /IM node.exe
```

---

## Archivos

### `src/server.js`
Punto de entrada de Express. Responsabilidades:
- Sirve los archivos estáticos de `public/` (HTML, CSS, JS).
- Define las rutas de la API que el cliente consume.
- Para cuatro loterías (Nacional, Leidsa, Loteka, La Suerte) llama a `scrapper.js`,
  que intenta Flask primero y hace scraping directo como fallback.
- Para el resto (Real, Primera, Primera Noche, Gana Más) actúa como proxy puro hacia Flask
  usando `axios`.
- Expone `/api/results/today` y `/api/results/date/:date` que reenvían la petición a Flask
  con manejo de errores diferenciado (`ECONNREFUSED`, `ETIMEDOUT`, 404).

### `src/routes.js`
Router secundario con rutas adicionales (leidsa, nacional, loteka, real, primera, suerte, etc.)
que también proxean a Flask. **Actualmente no está montado en `server.js`.**

### `src/scrapper.js`
Módulo de scraping de Node.js (cheerio). Patrón para cada lotería:

1. Llama a `Flask /search?name=<nombre>` con timeout de 5 s.
2. Si Flask falla o devuelve datos vacíos, hace scraping directo de
   `loteriasdominicanas.com` usando los mismos selectores que `app.py`:
   - Contenedor: `div.game-block`
   - Nombre: `a.game-title` (texto en minúsculas)
   - Números: `span.score` (uno por premio, unidos con `-`)
   - Fecha: `div.session-date`
3. Retorna el resultado en el mismo formato que Flask.

Loterías con fallback implementado: `getLeidsa`, `getNacional`, `getLoteka`, `getLaSuerte`.

### `public/index.html`
SPA principal. Incluye Bootstrap 5, Font Awesome y el JS personalizado (`app.js`).
Contiene las cards de cada lotería, el panel de estadísticas (calientes/fríos/anteriores),
la sección de consulta de números y el footer con año dinámico.

### `public/app.js`
Lógica del cliente. Hace `fetch` a las rutas de Express y actualiza el DOM con los resultados.
También gestiona: date picker, estadísticas, modo oscuro/claro, consulta de números por lotería.

### `public/styles.css`
Estilos personalizados sobre Bootstrap. Define las cards de loterías, el hero, el panel de
estadísticas, el FAB de refresh y el soporte de dark/light mode.

---

## Cómo el frontend consume la API de Flask

El cliente (`app.js`) nunca llama directamente a Flask. Llama a rutas de Express (`/api/results/today`,
`/api/results/date/:date`, `/nacional`, etc.), y Express actúa como proxy hacia Flask en `localhost:5000`.

Esto centraliza el manejo de errores y evita problemas de CORS en el browser.

```
Browser → GET /api/results/today → Express :3000 → axios → Flask :5000 → Neon PostgreSQL
```

Si Flask no está disponible, Express devuelve:
```json
{ "error": "bd_connection", "message": "No se pudo conectar al servidor de datos" }
```

---

## Variables de entorno (`frontend/.env`)

```env
FLASK_URL=http://localhost:5000   # URL del backend Flask (default si no se define)
PORT=3000                          # Puerto de Express (default si no se define)
```
