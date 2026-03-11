import sys
import os
import pytest
from unittest.mock import patch

# Add backend/ to sys.path so 'import app' and 'import db' resolve correctly
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

# app.py runs app.run(port=port) at module level — patch it before importing
# so the import doesn't block the test process.
_run_patch = patch("flask.Flask.run")
_run_patch.start()

import app as _app_module  # noqa: E402 — must come after the patch above


SAMPLE_RESULTS = [
    {
        "lottery_id": "1",
        "draw_name": "La Primera Día",
        "draw_date": "2026-03-11",
        "numbers": [50, 15, 77],
        "extra": None,
        "source": "daily_job",
    },
    {
        "lottery_id": "10",
        "draw_name": "La Suerte 18:00",
        "draw_date": "2026-03-11",
        "numbers": [46, 60, 92],
        "extra": None,
        "source": "daily_job",
    },
    {
        "lottery_id": "11",
        "draw_name": "Anguila Tarde",
        "draw_date": "2026-03-11",
        "numbers": [37, 11, 6],
        "extra": None,
        "source": "daily_job",
    },
]


@pytest.fixture
def mock_db():
    """
    Reemplaza las funciones de BD y scraping para que los tests
    no hagan requests reales a Neon ni a los sitios de lotería.
    """
    with patch("app.get_results_by_date", return_value=SAMPLE_RESULTS) as mock_get, \
         patch("app.save_results", return_value=3) as mock_save, \
         patch("app.scrape_for_date", return_value=SAMPLE_RESULTS) as mock_scrape:
        yield {"get": mock_get, "save": mock_save, "scrape": mock_scrape}


@pytest.fixture
def client(mock_db):
    """Cliente Flask en modo testing con BD y scraping mockeados."""
    _app_module.app.config["TESTING"] = True
    with _app_module.app.test_client() as c:
        yield c
