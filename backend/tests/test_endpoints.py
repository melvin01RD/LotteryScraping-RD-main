"""
Tests para los endpoints de la API unificada con Neon.
Todos los tests usan mocks — no hay requests reales a BD ni a loteriasdominicanas.com.
"""


class TestResultsToday:
    """GET /api/results/today"""

    def test_returns_200(self, client):
        resp = client.get("/api/results/today")
        assert resp.status_code == 200

    def test_response_has_date_and_results(self, client):
        data = client.get("/api/results/today").get_json()
        assert "date" in data
        assert "results" in data
        assert isinstance(data["results"], list)

    def test_results_not_empty(self, client):
        data = client.get("/api/results/today").get_json()
        assert len(data["results"]) > 0


class TestResultsByDate:
    """GET /api/results/date/<date_str>"""

    def test_valid_date_returns_200(self, client):
        resp = client.get("/api/results/date/2026-03-11")
        assert resp.status_code == 200

    def test_valid_date_response_has_correct_date(self, client):
        data = client.get("/api/results/date/2026-03-11").get_json()
        assert data["date"] == "2026-03-11"

    def test_valid_date_response_has_source_and_results(self, client):
        data = client.get("/api/results/date/2026-03-11").get_json()
        assert "source" in data
        assert "results" in data
        assert isinstance(data["results"], list)

    def test_invalid_date_returns_400(self, client):
        resp = client.get("/api/results/date/fecha-invalida")
        assert resp.status_code == 400

    def test_invalid_date_has_error_field(self, client):
        data = client.get("/api/results/date/fecha-invalida").get_json()
        assert "error" in data

    def test_future_date_returns_400(self, client):
        resp = client.get("/api/results/date/2099-12-31")
        assert resp.status_code == 400


class TestResultsStructure:
    """Verificaciones sobre la estructura de los resultados."""

    REQUIRED_FIELDS = {"lottery_id", "draw_name", "draw_date", "numbers", "extra"}

    def test_no_duplicate_draw_names_today(self, client):
        results = client.get("/api/results/today").get_json()["results"]
        draw_names = [r["draw_name"] for r in results]
        assert len(draw_names) == len(set(draw_names)), (
            f"Resultados duplicados encontrados: {draw_names}"
        )

    def test_no_duplicate_draw_names_by_date(self, client):
        results = client.get("/api/results/date/2026-03-11").get_json()["results"]
        draw_names = [r["draw_name"] for r in results]
        assert len(draw_names) == len(set(draw_names)), (
            f"Resultados duplicados encontrados: {draw_names}"
        )

    def test_each_result_has_required_fields(self, client):
        results = client.get("/api/results/today").get_json()["results"]
        assert len(results) > 0
        for r in results:
            missing = self.REQUIRED_FIELDS - set(r.keys())
            assert not missing, f"Faltan campos {missing} en resultado: {r}"

    def test_numbers_is_list(self, client):
        results = client.get("/api/results/today").get_json()["results"]
        for r in results:
            assert isinstance(r["numbers"], list), (
                f"'numbers' debe ser lista, got {type(r['numbers'])} en: {r}"
            )

    def test_lottery_id_is_present_and_truthy(self, client):
        results = client.get("/api/results/today").get_json()["results"]
        for r in results:
            assert r["lottery_id"], f"lottery_id vacío en resultado: {r}"
