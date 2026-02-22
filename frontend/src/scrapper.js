import 'dotenv/config';
import axios from 'axios';
import { load } from 'cheerio';

const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5000';

// Base del sitio agregador (misma fuente que usa Flask)
const AGGREGATOR_BASE = 'https://loteriasdominicanas.com';

// ========================
// Helpers
// ========================

// Fecha de hoy en formato DD-MM-YYYY (igual que Flask)
const todayFormatted = () => {
    const d = new Date();
    return [
        String(d.getDate()).padStart(2, '0'),
        String(d.getMonth() + 1).padStart(2, '0'),
        d.getFullYear()
    ].join('-');
};

// Consulta Flask y valida que haya datos
const fromFlask = async (searchName) => {
    const response = await axios.get(
        `${FLASK_URL}/search?name=${encodeURIComponent(searchName)}`,
        { timeout: 5000 }
    );
    if (!response.data || response.data.length === 0) {
        throw new Error(`Flask devolvió respuesta vacía para: ${searchName}`);
    }
    return response.data;
};

// ========================
// Fallback: scraping de loteriasdominicanas.com
//
// Selectores confirmados (los mismos que usa app.py con BeautifulSoup):
//   Contenedor:  div.game-block
//   Nombre:      a.game-title  (texto en minúsculas)
//   Números:     span.score    (uno por premio, unir con "-")
//   Fecha:       div.session-date
//
// Se usa esta fuente en lugar de los sitios individuales porque:
//   - leidsa.com     → devuelve HTTP 403 (bloquea bots)
//   - loteka.com.do  → resultados cargados vía AJAX sin selectores CSS limpios
// ========================

const scrapeFromAggregator = async (path, lotteryName, lotteryId) => {
    const url = `${AGGREGATOR_BASE}/${path}`;
    const { data } = await axios.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LotteryBot/1.0)' }
    });
    const $ = load(data);
    const nameLower = lotteryName.toLowerCase();
    let result = null;

    $('div.game-block').each((_, block) => {
        const title = $(block).find('a.game-title').text().trim().toLowerCase();
        if (title !== nameLower) return;

        const scores = [];
        $(block).find('span.score').each((_, span) => {
            scores.push($(span).text().trim());
        });
        const date = $(block).find('div.session-date').text().trim() || todayFormatted();
        const number = scores.join('-');

        result = [{ id: lotteryId, name: lotteryName, date, number }];
        return false; // break .each()
    });

    if (!result) throw new Error(`No se encontró "${lotteryName}" en ${url}`);
    return result;
};

// ========================
// API pública: Flask primero, loteriasdominicanas.com como fallback
// ========================

export const getLeidsa = async () => {
    try {
        return await fromFlask('leidsa');
    } catch (err) {
        console.warn(`[scrapper] Flask falló para Leidsa (${err.message}). Usando fallback.`);
        return scrapeFromAggregator('leidsa', 'Quiniela Leidsa', 15);
    }
};

export const getNacional = async () => {
    try {
        return await fromFlask('nacional');
    } catch (err) {
        console.warn(`[scrapper] Flask falló para Nacional (${err.message}). Usando fallback.`);
        return scrapeFromAggregator('loteria-nacional/quiniela', 'Lotería Nacional', 13);
    }
};

export const getLoteka = async () => {
    try {
        return await fromFlask('loteka');
    } catch (err) {
        console.warn(`[scrapper] Flask falló para Loteka (${err.message}). Usando fallback.`);
        return scrapeFromAggregator('loteka', 'Quiniela Loteka', 12);
    }
};

export const getLaSuerte = async () => {
    try {
        return await fromFlask('la suerte');
    } catch (err) {
        console.warn(`[scrapper] Flask falló para La Suerte (${err.message}). Usando fallback.`);
        return scrapeFromAggregator('la-suerte-dominicana', 'La Suerte 18:00', 10);
    }
};
