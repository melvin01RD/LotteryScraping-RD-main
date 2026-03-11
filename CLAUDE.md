# LotteryScraping-RD — Guía de desarrollo

## Descripción del proyecto

Aplicación web que muestra resultados en tiempo real de las principales loterías dominicanas.
Hace scraping de `loteriasdominicanas.com`, almacena los resultados en Neon PostgreSQL y los
sirve al usuario mediante un frontend web.

## Arquitectura

```
Usuario
  └─► Express (frontend) :3000
        └─► Flask (backend) :5000
              └─► loteriasdominicanas.com  (scraping)
              └─► Neon PostgreSQL          (caché y persistencia)
```

- **Backend**: Flask en `http://localhost:5000`
- **Frontend**: Express en `http://localhost:3000` (configurable vía `PORT` en `frontend/.env`)

## Estructura de carpetas

```
LotteryScraping-RD-main/
├── backend/
│   ├── app.py           # Flask app: endpoints, lógica de scraping, adaptador BD
│   ├── db.py            # Conexión y queries Neon PostgreSQL
│   ├── lottery.json     # Catálogo de loterías (IDs y nombres)
│   ├── requirements.txt # Dependencias Python
│   └── schema.sql       # Esquema de la base de datos
└── frontend/
    ├── src/
    │   ├── server.js    # Express app: rutas principales y proxy a Flask
    │   ├── routes.js    # Router secundario (actualmente no montado en server.js)
    │   └── scrapper.js  # Fallback de scraping con cheerio si Flask no responde
    ├── public/
    │   ├── index.html   # SPA principal
    │   ├── app.js       # Lógica del cliente (fetch, DOM updates, estadísticas)
    │   └── styles.css   # Estilos
    └── package.json
```

## Cómo levantar los servidores

### Backend (Flask)

```powershell
cd backend
python app.py
```

Verifica que esté corriendo:
```powershell
curl http://localhost:5000/api/results/today
```

### Frontend (Express)

```powershell
cd frontend
node src/server.js
```

Verifica que esté corriendo:
```powershell
curl http://localhost:3000
```

### Ambos a la vez (desde `frontend/`)

```powershell
npm start
```

Usa `concurrently` para levantar `python ../backend/app.py` y `node src/server.js` en paralelo.

## Endpoints disponibles

### Flask (puerto 5000)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Todas las loterías (`?date=DD-MM-YYYY`) |
| GET | `/search?name=X` | Buscar por nombre (`?date=DD-MM-YYYY`) |
| GET | `/loteria-nacional` | Lotería Nacional |
| GET | `/loteria-leidsa` | Leidsa |
| GET | `/loteria-real` | Lotería Real |
| GET | `/loteria-loteka` | Loteka |
| GET | `/loteria-gana-mas` | Gana Más |
| GET | `/loteria-primera` | La Primera |
| GET | `/loteria-primera-12am` | La Primera Día |
| GET | `/loteria-primera-noche` | Primera Noche |
| GET | `/loteria-la-suerte` | La Suerte Dominicana |
| GET | `/loteria-anguila` | Anguila (todas) |
| GET | `/api/results/today` | Resultados de hoy (BD primero, scraping si no hay) |
| GET | `/api/results/date/<YYYY-MM-DD>` | Resultados por fecha |
| POST | `/api/admin/archive` | Job de archivado (requiere header `X-Admin-Secret`) |

**Formato JSON — endpoints de scraping (`/`, `/search`, `/loteria-*`):**
```json
[
  {
    "id": 13,
    "name": "Lotería Nacional",
    "date": "11-03-2025",
    "number": "12-34-56"
  }
]
```

**Formato JSON — `/api/results/today` y `/api/results/date/<date>`:**
```json
{
  "date": "2025-03-11",
  "source": "database",
  "results": [
    {
      "lottery_id": "13",
      "draw_name": "Lotería Nacional",
      "draw_date": "2025-03-11",
      "numbers": [12, 34, 56],
      "extra": null,
      "source": "daily_job"
    }
  ]
}
```

### Express (puerto 3000)

| Ruta | Comportamiento |
|------|---------------|
| `GET /` | Sirve `public/index.html` |
| `GET /nacional` | `scrapper.js` → Flask primero, fallback directo |
| `GET /leidsa` | `scrapper.js` → Flask primero, fallback directo |
| `GET /loteria-loteka` | `scrapper.js` → Flask primero, fallback directo |
| `GET /loteria-la-suerte` | `scrapper.js` → Flask primero, fallback directo |
| `GET /real` | Proxy → `Flask /search?name=real` |
| `GET /primera` | Proxy → `Flask /search?name=primera` |
| `GET /primera-noche` | Proxy → `Flask /search?name=primera noche` |
| `GET /gana-mas` | Proxy → `Flask /search?name=gana más` |
| `GET /api/results/today` | Proxy → `Flask /api/results/today` |
| `GET /api/results/date/:date` | Proxy → `Flask /api/results/date/:date` |

## Variables de entorno

### `backend/.env`

```env
DATABASE_URL=postgresql://user:password@host/dbname   # Neon PostgreSQL
ADMIN_SECRET=tu_secreto_aqui                          # Protege POST /api/admin/archive
PORT=5000                                              # Opcional, default 5000
```

### `frontend/.env`

```env
FLASK_URL=http://localhost:5000   # URL del backend Flask
PORT=3000                          # Opcional, default 3000
```

## Reglas del proyecto

- **Nunca hacer commits sin autorización explícita del usuario.**
- No hardcodear rutas absolutas de archivos; usar `os.path` (Python) o `path.join` (Node).
- No matar procesos al terminar una tarea; solo detenerlos si el usuario lo pide.
