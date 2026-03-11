-- schema.sql — lotery-scrapping-RD
-- Ejecutar en Neon PostgreSQL antes de usar la aplicación.
-- Reconstruido desde las queries de db.py.

-- Tabla principal de resultados
CREATE TABLE IF NOT EXISTS lottery_results (
    id          SERIAL PRIMARY KEY,
    lottery_id  TEXT        NOT NULL,
    draw_name   TEXT        NOT NULL,
    draw_date   DATE        NOT NULL,
    numbers     JSONB       NOT NULL,
    extra       TEXT,
    source      TEXT        DEFAULT 'daily_job',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_lottery_draw_date UNIQUE (lottery_id, draw_name, draw_date)
);

-- Tabla de estadísticas mensuales (archivo histórico)
CREATE TABLE IF NOT EXISTS lottery_monthly_stats (
    id           SERIAL PRIMARY KEY,
    lottery_id   TEXT    NOT NULL,
    draw_name    TEXT    NOT NULL,
    year_month   TEXT    NOT NULL,   -- formato: 'YYYY-MM'
    top_numbers  JSONB,
    total_draws  INT     DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_monthly_stats UNIQUE (lottery_id, draw_name, year_month)
);

-- Tabla de auditoría de retención
CREATE TABLE IF NOT EXISTS retention_log (
    id                SERIAL PRIMARY KEY,
    records_archived  INT,
    records_deleted   INT,
    cutoff_date       DATE,
    notes             TEXT,
    executed_at       TIMESTAMPTZ DEFAULT NOW()
);
