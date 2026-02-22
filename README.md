# 🎰 LotteryScraping-RD

Aplicación web que extrae y muestra en tiempo real los resultados de las principales loterías dominicanas.

![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)
![Python](https://img.shields.io/badge/Python-3.x-blue)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green)

---

## 📋 Descripción

**LotteryScraping-RD** combina un backend en Python (Flask) que hace scraping de [Loterías Dominicanas](https://loteriasdominicanas.com/) con un servidor intermedio en Node.js (Express) y un frontend moderno que muestra los resultados del día en tiempo real.

Las loterías disponibles son: Lotería Nacional, Leidsa, Loteka, Lotería Real, La Suerte Dominicana, La Primera, Anguila y más.

---

## 🏗️ Estructura del Proyecto

```
LotteryScraping-RD-main/
├── backend/
│   ├── app.py           # API Flask + scraping
│   ├── lottery.json     # Catálogo de loterías
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   ├── index.html   # Interfaz principal
│   │   ├── app.js       # Lógica del frontend
│   │   └── styles.css
│   ├── src/
│   │   ├── server.js    # Servidor Express
│   │   ├── routes.js    # Rutas de la API
│   │   └── scrapper.js  # Scrapers con fallback
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md
```

---

## ⚙️ Flujo de Datos

```
Frontend (app.js)
    ↓  fetch http://localhost:3000/{loteria}
Servidor Express (server.js)
    ↓
    1. Intenta Flask: GET http://127.0.0.1:5000/search?name={loteria}
    ↓ OK → retorna datos
    ↓ FALLA → fallback
    2. Scraping directo al sitio de la lotería
    ↓
Respuesta: [{ id, name, date, number }]
```

---

## 🚀 Instalación y Uso

### Requisitos

- Python 3.x
- Node.js 18+
- npm

### 1. Clonar el repositorio

```bash
git clone https://github.com/melvin01RD/LotteryScraping-RD-main.git
cd LotteryScraping-RD-main
```

### 2. Configurar el Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

El backend queda disponible en `http://127.0.0.1:5000`

### 3. Configurar el Frontend (Express)

```bash
cd frontend
npm install
cp .env.example .env   # En Windows: copy .env.example .env
node src/server.js
```

El servidor Express queda disponible en `http://localhost:3000`

### 4. Ver la aplicación

Abre `frontend/public/index.html` con Live Server o directamente en el navegador.

---

## 🔌 Endpoints de la API

### Flask (puerto 5000)

| Endpoint                                      | Descripción                |
| --------------------------------------------- | -------------------------- |
| `GET /`                                       | Todas las loterías del día |
| `GET /search?name={nombre}`                   | Buscar por nombre          |
| `GET /search?name={nombre}&date={dd-mm-yyyy}` | Buscar por nombre y fecha  |
| `GET /loteria-gana-mas`                       | Resultados Gana Más        |
| `GET /loteria-primera`                        | Resultados La Primera      |
| `GET /loteria-loteka`                         | Resultados Loteka          |
| `GET /loteria-la-suerte`                      | Resultados La Suerte       |

### Express (puerto 3000)

| Endpoint               | Descripción                     |
| ---------------------- | ------------------------------- |
| `GET /leidsa`          | Resultados Leidsa               |
| `GET /loterianacional` | Resultados Lotería Nacional     |
| `GET /loteka`          | Resultados Loteka               |
| `GET /real`            | Resultados Lotería Real         |
| `GET /primera`         | Resultados La Primera           |
| `GET /gana-mas`        | Resultados Gana Más             |
| `GET /la-suerte`       | Resultados La Suerte Dominicana |

---

## 🗂️ Catálogo de Loterías (lottery.json)

El archivo `lottery.json` define las loterías disponibles. El campo `name` debe coincidir exactamente con el nombre que aparece en [loteriasdominicanas.com](https://loteriasdominicanas.com/).

```json
[
  { "id": 1, "name": "La Primera Día" },
  { "id": 2, "name": "Anguila Mañana" },
  { "id": 9, "name": "Gana Más" },
  { "id": 13, "name": "Lotería Nacional" }
]
```

---

## 🛠️ Variables de Entorno

Crea un archivo `.env` en la carpeta `frontend/` basado en `.env.example`:

```env
FLASK_URL=http://127.0.0.1:5000
PORT=3000
```

> ⚠️ Usar `127.0.0.1` en lugar de `localhost` para evitar conflictos IPv6 en Node.js 18+.

---

## 📦 Dependencias

### Backend

- `Flask` — servidor web
- `Flask-CORS` — manejo de CORS
- `BeautifulSoup4` — parsing HTML
- `urllib` — peticiones HTTP

### Frontend

- `Express` — servidor Node.js
- `Axios` — peticiones HTTP
- `Cheerio` — scraping con fallback
- `dotenv` — variables de entorno
- `cors` — manejo de CORS

---

## 🤝 Contribuir

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feature/nueva-loteria`
3. Haz commit: `git commit -m "feat: agrega lotería X"`
4. Push: `git push origin feature/nueva-loteria`
5. Abre un Pull Request

---

## 📄 Licencia

MIT License — ver archivo [LICENSE](LICENSE) para más detalles.
