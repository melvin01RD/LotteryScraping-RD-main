# Backend — Flask (puerto 5000)

## Levantar el servidor

```powershell
cd backend
python app.py
```

## Verificar que está corriendo

```powershell
curl http://localhost:5000/api/results/today
```

## Detener el proceso (PowerShell)

```powershell
taskkill /F /IM python.exe
```

---

## Archivos

### `app.py`
Punto de entrada de Flask. Contiene:
- `load_html(search_date)` — descarga HTML de `loteriasdominicanas.com` y la página de anguila.
- `load_html_name(search_name, search_date)` — descarga HTML de una URL específica del sitio.
- `scraping(search_date, search_lotery)` — parsea los `div.game-block` y devuelve lista de sorteos.
- `scrapingByName(search_name, search_date, search_lotery)` — igual pero apuntando a una sub-URL.
- `scrape_for_date(date_str)` — adaptador que llama a `scraping()` y convierte el resultado al
  formato de BD (`lottery_id`, `draw_name`, `draw_date`, `numbers`, `extra`).
- Todos los `@app.route` de scraping y los dos endpoints de la API unificada con Neon.

### `db.py`
Módulo de acceso a Neon PostgreSQL (psycopg2). Funciones:
- `get_connection()` — abre conexión usando `DATABASE_URL` del `.env`.
- `get_results_by_date(date_str)` — SELECT por fecha; retorna lista de dicts.
- `get_latest_results()` — resultado más reciente por cada sorteo (DISTINCT ON).
- `save_results(results, source)` — INSERT con `ON CONFLICT DO NOTHING` (evita duplicados).
- `search_number_in_results(number, months_back)` — busca un número en los últimos N meses.
- `date_exists_in_db(date_str)` — booleano; ¿hay datos para esa fecha?
- `archive_and_cleanup(months_to_keep)` — agrega datos viejos a `lottery_monthly_stats`
  y elimina los registros detallados; registra la operación en `retention_log`.

### `lottery.json`
Catálogo estático de loterías con su `id` y `name`. `scraping()` lo carga para filtrar
y mapear los bloques HTML al ID correcto.

### `requirements.txt`
```
flask
flask-cors
beautifulsoup4
psycopg2-binary
python-dotenv
pytest
pytest-flask
pytest-mock
```

### `schema.sql`
Esquema de la base de datos Neon PostgreSQL (tablas `lottery_results`, `lottery_monthly_stats`,
`retention_log` y la constraint `uq_lottery_draw_date`).

---

## Endpoints disponibles (puerto 5000)

### API unificada (Neon PostgreSQL)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/results/today` | Resultados de hoy — BD primero, scraping si no hay. Retorna `{date, source, results}` |
| GET | `/api/results/date/<YYYY-MM-DD>` | Resultados por fecha — BD primero, scraping bajo demanda |
| POST | `/api/admin/archive` | Job de archivado mensual (requiere header `X-Admin-Secret`) |

### Endpoints de scraping genéricos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Todas las loterías (`?date=DD-MM-YYYY`) |
| GET | `/search?name=X` | Buscar por nombre (`?date=DD-MM-YYYY`) |

### Loterías nacionales dominicanas

| Método | Ruta | Lotería |
|--------|------|---------|
| GET | `/loteria-nacional` | Lotería Nacional (quiniela) |
| GET | `/loterias-nacionales` | Todas las de Lotería Nacional |
| GET | `/loteria-leidsa` | Quiniela Leidsa |
| GET | `/loteria-real` | Quiniela Real |
| GET | `/loteria-loteka` | Quiniela Loteka |
| GET | `/loteria-gana-mas` | Gana Más |
| GET | `/loteria-primera` | La Primera |
| GET | `/loteria-primera-12am` | La Primera Día (medio día) |
| GET | `/loteria-primera-noche` | Primera Noche |
| GET | `/loteria-la-suerte` | La Suerte (búsqueda general) |
| GET | `/loteria-la-suerte-12am` | La Suerte 12:30 |
| GET | `/loteria-la-suerte-tarde` | La Suerte 18:00 |
| GET | `/loteria-lotedom` | Quiniela LoteDom |

### Loterías Anguila

| Método | Ruta | Lotería |
|--------|------|---------|
| GET | `/loteria-anguila` | Anguila (todas) |
| GET | `/loteria-anguila-10am` | Anguila Mañana |
| GET | `/loteria-anguila-12am` | Anguila Medio Día |
| GET | `/loteria-anguila-6pm` | Anguila Tarde |
| GET | `/loteria-anguila-9pm` | Anguila Noche |

### Loterías americanas

| Método | Ruta | Lotería |
|--------|------|---------|
| GET | `/loteria-americana` | Americanas (todas) |
| GET | `/loteria-florida-tarde` | Florida Día |
| GET | `/loteria-florida-noche` | Florida Noche |
| GET | `/loteria-new-york-12am` | New York Tarde |
| GET | `/loteria-new-york-noche` | New York Noche |

---

## Formato JSON de respuesta

### Endpoints de scraping (`/`, `/search`, `/loteria-*`)

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

### Endpoints Neon (`/api/results/today`, `/api/results/date/<YYYY-MM-DD>`)

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

`source` puede ser `"database"` (datos en caché) o `"scraping"` (obtenidos en tiempo real).

---

## Cómo funciona la deduplicación en `scrape_for_date()`

```python
seen = set()
for item in raw:
    key = (str(item.get('id', '')), item.get('name', ''))
    if key in seen:
        continue
    seen.add(key)
    ...
```

El scraping puede devolver el mismo sorteo más de una vez (por ejemplo cuando aparece en la
página principal y en la página de anguila). El set `seen` filtra duplicados usando la tupla
`(lottery_id, draw_name)` antes de insertar en BD.

A nivel de BD la constraint `uq_lottery_draw_date` en `lottery_results` actúa como segunda
barrera: el `ON CONFLICT DO NOTHING` de `save_results()` ignora cualquier fila ya existente.

---

## Variables de entorno (`backend/.env`)

```env
DATABASE_URL=postgresql://user:password@host/dbname
ADMIN_SECRET=tu_secreto_aqui
PORT=5000
```
