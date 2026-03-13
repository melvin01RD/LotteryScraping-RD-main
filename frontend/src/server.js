import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { getLeidsa, getNacional, getLoteka, getLaSuerte } from './scrapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;
const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5000';

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// Frontend entry point
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Rutas con fallback via scrapper.js ─────────────────────────

app.get('/nacional', async (req, res) => {
    try {
        res.json(await getNacional());
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos de Nacional' });
    }
});

app.get('/leidsa', async (req, res) => {
    try {
        res.json(await getLeidsa());
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos de Leidsa' });
    }
});

app.get('/loteria-loteka', async (req, res) => {
    try {
        res.json(await getLoteka());
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos de Loteka' });
    }
});

app.get('/loteria-la-suerte', async (req, res) => {
    try {
        res.json(await getLaSuerte());
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos de La Suerte' });
    }
});

// ── Rutas Flask directas (sin fallback de scraping propio) ─────

app.get('/real', async (req, res) => {
    try {
        const response = await axios.get(`${FLASK_URL}/search?name=real`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos de Real' });
    }
});

app.get('/primera', async (req, res) => {
    try {
        const response = await axios.get(`${FLASK_URL}/search?name=primera`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos de La Primera' });
    }
});

app.get('/primera-noche', async (req, res) => {
    try {
        const response = await axios.get(`${FLASK_URL}/search?name=primera noche`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos de La Primera Noche' });
    }
});

app.get('/gana-mas', async (req, res) => {
    try {
        const response = await axios.get(`${FLASK_URL}/search?name=gana más`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos de Gana Más' });
    }
});

// ── Nueva API unificada con Neon PostgreSQL ─────────────────────

app.get('/api/results/today', async (req, res) => {
    try {
        const response = await axios.get(`${FLASK_URL}/api/results/today`, { timeout: 10000 });
        res.json(response.data);
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            res.status(503).json({ error: 'bd_connection', message: 'No se pudo conectar al servidor de datos' });
        } else if (error.response?.status === 404) {
            res.status(404).json({ error: 'no_results', message: 'No hay resultados disponibles para hoy' });
        } else {
            res.status(500).json({ error: 'scraping_error', message: 'Error al obtener los resultados en tiempo real' });
        }
    }
});

app.get('/api/results/date/:date', async (req, res) => {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'invalid_date', message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }
    try {
        const response = await axios.get(`${FLASK_URL}/api/results/date/${date}`, { timeout: 10000 });
        res.json(response.data);
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            res.status(503).json({ error: 'bd_connection', message: 'No se pudo conectar al servidor de datos' });
        } else if (error.response?.status === 404) {
            res.status(404).json({ error: 'no_results', message: 'No hay resultados disponibles para esta fecha' });
        } else {
            res.status(500).json({ error: 'scraping_error', message: 'Error al obtener los resultados en tiempo real' });
        }
    }
});

export { app };

const isMain = path.resolve(process.argv[1]).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase();
if (isMain) {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
        console.log(`Flask URL: ${FLASK_URL}`);
    });
}
