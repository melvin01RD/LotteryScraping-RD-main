import { jest } from '@jest/globals';

// mockGet must be defined before unstable_mockModule so the factory can close over it
const mockGet = jest.fn();

jest.unstable_mockModule('axios', () => ({
    default: { get: mockGet },
}));

jest.unstable_mockModule('../src/scrapper.js', () => ({
    getLeidsa: jest.fn(),
    getNacional: jest.fn(),
    getLoteka: jest.fn(),
    getLaSuerte: jest.fn(),
}));

const { app } = await import('../src/server.js');
const supertest = (await import('supertest')).default;
const request = supertest(app);

const FLASK_TODAY_OK = {
    date: '2026-03-11',
    source: 'database',
    results: [{ lottery_id: '13', draw_name: 'Lotería Nacional', draw_date: '2026-03-11', numbers: [1, 2, 3], extra: null, source: 'daily_job' }],
};

beforeEach(() => {
    mockGet.mockReset();
});

describe('GET /api/results/today', () => {
    test('Flask OK → retorna JSON con {date, source, results}', async () => {
        mockGet.mockResolvedValueOnce({ data: FLASK_TODAY_OK });

        const res = await request.get('/api/results/today');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('date');
        expect(res.body).toHaveProperty('source');
        expect(res.body).toHaveProperty('results');
    });

    test('Flask no disponible (ECONNREFUSED) → Express retorna 503', async () => {
        const err = new Error('connect ECONNREFUSED 127.0.0.1:5000');
        err.code = 'ECONNREFUSED';
        mockGet.mockRejectedValueOnce(err);

        const res = await request.get('/api/results/today');

        expect(res.status).toBe(503);
        expect(res.body.error).toBe('bd_connection');
    });

    test('Flask retorna 404 → Express propaga 404', async () => {
        const err = new Error('Request failed with status code 404');
        err.response = { status: 404 };
        mockGet.mockRejectedValueOnce(err);

        const res = await request.get('/api/results/today');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('no_results');
    });

    test('Flask retorna 500 → Express propaga 500', async () => {
        const err = new Error('Request failed with status code 500');
        err.response = { status: 500 };
        mockGet.mockRejectedValueOnce(err);

        const res = await request.get('/api/results/today');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('scraping_error');
    });
});

describe('GET /api/results/date/:date', () => {
    test('Fecha válida + Flask OK → retorna JSON con fecha correcta', async () => {
        const payload = { ...FLASK_TODAY_OK, date: '2026-03-11' };
        mockGet.mockResolvedValueOnce({ data: payload });

        const res = await request.get('/api/results/date/2026-03-11');

        expect(res.status).toBe(200);
        expect(res.body.date).toBe('2026-03-11');
    });

    test('Fecha inválida → retorna 400 sin llamar a Flask', async () => {
        const res = await request.get('/api/results/date/fecha-invalida');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('invalid_date');
        expect(mockGet).not.toHaveBeenCalled();
    });
});
