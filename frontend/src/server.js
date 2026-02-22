import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { getLeidsa, getNacional, getLoteka, getLaSuerte } from './scrapper.js';

const app = express();
const PORT = process.env.PORT || 3000;
const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5000';

app.use(cors());

// Health check
app.get('/', (req, res) => {
    res.send('API de loterías corriendo correctamente');
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

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Flask URL: ${FLASK_URL}`);
});
