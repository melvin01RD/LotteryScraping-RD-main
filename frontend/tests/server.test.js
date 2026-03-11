import { jest } from '@jest/globals';

// Mock scrapper before server.js is imported
jest.unstable_mockModule('../src/scrapper.js', () => ({
    getLeidsa: jest.fn().mockResolvedValue([{ id: 15, name: 'Quiniela Leidsa', date: '11-03-2026', number: '01-02-03' }]),
    getNacional: jest.fn().mockResolvedValue([{ id: 13, name: 'Lotería Nacional', date: '11-03-2026', number: '04-05-06' }]),
    getLoteka: jest.fn().mockResolvedValue([{ id: 12, name: 'Quiniela Loteka', date: '11-03-2026', number: '07-08-09' }]),
    getLaSuerte: jest.fn().mockResolvedValue([{ id: 10, name: 'La Suerte 18:00', date: '11-03-2026', number: '10-11-12' }]),
}));

const { app } = await import('../src/server.js');
const supertest = (await import('supertest')).default;
const request = supertest(app);

describe('Basic server routes', () => {
    test('GET / returns 200 and HTML', async () => {
        const res = await request.get('/');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/html/);
    });

    test('GET /pages/contacto.html returns 200', async () => {
        const res = await request.get('/pages/contacto.html');
        expect(res.status).toBe(200);
    });

    test('GET /ruta-inexistente returns 404', async () => {
        const res = await request.get('/ruta-inexistente');
        expect(res.status).toBe(404);
    });
});
