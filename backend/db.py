"""
db.py — Módulo de conexión y queries para lotery-scrapping-RD
Usar con Neon PostgreSQL
"""

import os
import json
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    """Retorna una conexión a Neon PostgreSQL."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


# ============================================================
# QUERIES PRINCIPALES
# ============================================================

def get_results_by_date(date_str: str):
    """
    Busca resultados por fecha. Usado por el date picker.
    Retorna lista de sorteos para esa fecha o [] si no hay.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT lottery_id, draw_name, draw_date, numbers, extra, source
                FROM lottery_results
                WHERE draw_date = %s
                ORDER BY lottery_id, draw_name
            """, (date_str,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]


def get_latest_results():
    """
    Retorna los resultados más recientes de cada sorteo.
    Usado para la pantalla principal.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT ON (lottery_id, draw_name)
                    lottery_id, draw_name, draw_date, numbers, extra
                FROM lottery_results
                ORDER BY lottery_id, draw_name, draw_date DESC
            """)
            rows = cur.fetchall()
            return [dict(r) for r in rows]


def save_results(results: list, source: str = 'daily_job'):
    """
    Guarda una lista de resultados. Ignora duplicados (ON CONFLICT DO NOTHING).
    
    results: [
        {
            "lottery_id": "leidsa",
            "draw_name": "Loto",
            "draw_date": "2025-03-11",
            "numbers": [12, 34, 56],
            "extra": "07"
        },
        ...
    ]
    """
    if not results:
        return 0

    saved = 0
    with get_connection() as conn:
        with conn.cursor() as cur:
            for r in results:
                cur.execute("""
                    INSERT INTO lottery_results 
                        (lottery_id, draw_name, draw_date, numbers, extra, source)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT ON CONSTRAINT uq_lottery_draw_date DO NOTHING
                """, (
                    r['lottery_id'],
                    r['draw_name'],
                    r['draw_date'],
                    json.dumps(r['numbers']),
                    r.get('extra'),
                    source
                ))
                saved += cur.rowcount
        conn.commit()
    return saved


def search_number_in_results(number: int, months_back: int = 3):
    """
    Busca si un número específico apareció en los últimos N meses.
    Usado por la feature 'Consultar Números'.
    """
    since = datetime.now() - timedelta(days=months_back * 30)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT lottery_id, draw_name, draw_date, numbers
                FROM lottery_results
                WHERE draw_date >= %s
                  AND numbers @> %s::jsonb
                ORDER BY draw_date DESC
            """, (since.date(), json.dumps([number])))
            rows = cur.fetchall()
            return [dict(r) for r in rows]


def date_exists_in_db(date_str: str) -> bool:
    """Verifica si ya tenemos datos para una fecha específica."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM lottery_results
                WHERE draw_date = %s LIMIT 1
            """, (date_str,))
            return cur.fetchone() is not None


# ============================================================
# JOB DE ARCHIVADO Y LIMPIEZA (ejecutar 1x por mes)
# ============================================================

def archive_and_cleanup(months_to_keep: int = 12):
    """
    1. Agrega datos > N meses a lottery_monthly_stats
    2. Elimina los registros detallados viejos
    3. Registra en retention_log

    Retorna dict con resultados de la operación.
    """
    cutoff = datetime.now() - timedelta(days=months_to_keep * 30)

    with get_connection() as conn:
        with conn.cursor() as cur:

            # 1. Obtener registros a archivar agrupados por mes
            cur.execute("""
                SELECT lottery_id, draw_name,
                       TO_CHAR(draw_date, 'YYYY-MM') AS year_month,
                       numbers
                FROM lottery_results
                WHERE draw_date < %s
            """, (cutoff.date(),))
            old_records = cur.fetchall()

            if not old_records:
                return {"archived": 0, "deleted": 0, "message": "Nada que archivar"}

            # 2. Calcular frecuencias por mes
            monthly_data = {}
            for row in old_records:
                key = (row['lottery_id'], row['draw_name'], row['year_month'])
                nums = row['numbers'] if isinstance(row['numbers'], list) else json.loads(row['numbers'])
                if key not in monthly_data:
                    monthly_data[key] = {'freq': {}, 'count': 0}
                for n in nums:
                    monthly_data[key]['freq'][str(n)] = monthly_data[key]['freq'].get(str(n), 0) + 1
                monthly_data[key]['count'] += 1

            # 3. Insertar aggregados (ignorar si ya existen)
            archived = 0
            for (lottery_id, draw_name, ym), data in monthly_data.items():
                top = sorted(data['freq'].items(), key=lambda x: x[1], reverse=True)[:20]
                cur.execute("""
                    INSERT INTO lottery_monthly_stats
                        (lottery_id, draw_name, year_month, top_numbers, total_draws)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT ON CONSTRAINT uq_monthly_stats DO NOTHING
                """, (lottery_id, draw_name, ym, json.dumps(top), data['count']))
                archived += cur.rowcount

            # 4. Eliminar detalle antiguo SOLO después de archivar
            cur.execute("""
                DELETE FROM lottery_results WHERE draw_date < %s
            """, (cutoff.date(),))
            deleted = cur.rowcount

            # 5. Registrar en audit log
            cur.execute("""
                INSERT INTO retention_log (records_archived, records_deleted, cutoff_date, notes)
                VALUES (%s, %s, %s, %s)
            """, (archived, deleted, cutoff.date(), f"Retención: {months_to_keep} meses"))

        conn.commit()

    return {
        "archived": archived,
        "deleted": deleted,
        "cutoff_date": str(cutoff.date()),
        "message": f"Archivados {archived} meses, eliminados {deleted} registros detallados"
    }
