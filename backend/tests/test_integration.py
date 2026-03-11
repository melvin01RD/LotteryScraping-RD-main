"""
Tests de integración reales — backend Flask + Neon PostgreSQL.
Sin mocks: golpean Flask en http://localhost:5000 y la BD real.

Prerequisito: Flask debe estar corriendo con el código actual.
  cd backend && python app.py
"""

import pytest
import requests

BASE_URL = "http://localhost:5000"

VALID_SOURCES = {"database", "scraping"}
REQUIRED_RESULT_FIELDS = {"lottery_id", "draw_name", "draw_date", "numbers", "extra"}


# ─────────────────────────────────────────────
# Fixture de sesión: verifica que Flask responda
# ─────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def flask_running():
    """Falla rápido si Flask no está disponible, con mensaje claro."""
    try:
        r = requests.get(f"{BASE_URL}/api/results/today", timeout=5)
        r.raise_for_status()
    except Exception as exc:
        pytest.skip(f"Flask no está corriendo en {BASE_URL} — {exc}")


# ─────────────────────────────────────────────
# GET /api/results/today
# ─────────────────────────────────────────────

class TestIntegrationToday:
    """Pruebas reales sobre GET /api/results/today."""

    @pytest.fixture(scope="class")
    def today_response(self):
        """Una sola petición compartida por todos los tests de esta clase."""
        return requests.get(f"{BASE_URL}/api/results/today", timeout=10)

    @pytest.fixture(scope="class")
    def today_data(self, today_response):
        return today_response.json()

    def test_status_200(self, today_response):
        assert today_response.status_code == 200

    def test_has_date_field(self, today_data):
        assert "date" in today_data

    def test_has_source_field(self, today_data):
        assert "source" in today_data, (
            "El campo 'source' no está en la respuesta. "
            "¿Flask está corriendo con el código actualizado? Reinicia con: python app.py"
        )

    def test_source_is_valid_value(self, today_data):
        assert today_data.get("source") in VALID_SOURCES, (
            f"source='{today_data.get('source')}' no es válido. Esperado: {VALID_SOURCES}"
        )

    def test_has_results_field(self, today_data):
        assert "results" in today_data

    def test_results_is_nonempty_list(self, today_data):
        results = today_data.get("results", [])
        assert isinstance(results, list)
        assert len(results) > 0, "No hay resultados para hoy — ¿scraping o BD vacía?"

    def test_no_duplicate_draw_names(self, today_data):
        names = [r["draw_name"] for r in today_data.get("results", [])]
        assert len(names) == len(set(names)), (
            f"draw_names duplicados: {[n for n in names if names.count(n) > 1]}"
        )

    def test_each_result_has_required_fields(self, today_data):
        for r in today_data.get("results", []):
            missing = REQUIRED_RESULT_FIELDS - set(r.keys())
            assert not missing, f"Faltan campos {missing} en: {r}"

    def test_numbers_is_list_of_integers(self, today_data):
        for r in today_data.get("results", []):
            nums = r.get("numbers", None)
            assert isinstance(nums, list), f"'numbers' no es lista en: {r}"
            assert all(isinstance(n, int) for n in nums), (
                f"'numbers' contiene no-enteros: {nums}"
            )

    def test_lottery_id_is_truthy(self, today_data):
        for r in today_data.get("results", []):
            assert r.get("lottery_id"), f"lottery_id vacío en: {r}"


# ─────────────────────────────────────────────
# GET /api/results/date/<fecha>
# ─────────────────────────────────────────────

class TestIntegrationByDate:
    """Pruebas reales sobre GET /api/results/date/<fecha>."""

    TEST_DATE = "2026-03-10"

    @pytest.fixture(scope="class")
    def date_response(self):
        return requests.get(f"{BASE_URL}/api/results/date/{self.TEST_DATE}", timeout=15)

    @pytest.fixture(scope="class")
    def date_data(self, date_response):
        return date_response.json()

    def test_status_200(self, date_response):
        assert date_response.status_code == 200

    def test_date_field_matches_request(self, date_data):
        assert date_data.get("date") == self.TEST_DATE

    def test_source_is_valid(self, date_data):
        assert date_data.get("source") in VALID_SOURCES

    def test_results_is_nonempty_list(self, date_data):
        results = date_data.get("results", [])
        assert isinstance(results, list)
        assert len(results) > 0, f"No hay resultados para {self.TEST_DATE}"


class TestIntegrationInvalidDate:
    """Fecha inválida debe devolver 400."""

    def test_invalid_date_returns_400(self):
        r = requests.get(f"{BASE_URL}/api/results/date/fecha-invalida", timeout=5)
        assert r.status_code == 400

    def test_invalid_date_has_error_field(self):
        r = requests.get(f"{BASE_URL}/api/results/date/fecha-invalida", timeout=5)
        data = r.json()
        assert "error" in data


# ─────────────────────────────────────────────
# Caché: segunda llamada a /today → source "database"
# ─────────────────────────────────────────────

class TestIntegrationCache:
    """
    La primera llamada a /api/results/today guarda en BD.
    La segunda debe leer desde BD y retornar source="database".
    """

    def test_second_call_source_is_database(self):
        # Primera llamada (puede ser scraping si la BD estaba vacía)
        requests.get(f"{BASE_URL}/api/results/today", timeout=10)

        # Segunda llamada: los datos ya están en BD
        r2 = requests.get(f"{BASE_URL}/api/results/today", timeout=10)
        assert r2.status_code == 200

        data = r2.json()
        assert "source" in data, (
            "El campo 'source' no está en la respuesta. "
            "Reinicia Flask con el código actualizado."
        )
        assert data["source"] == "database", (
            f"Se esperaba source='database' en la segunda llamada, "
            f"pero se obtuvo source='{data.get('source')}'"
        )
