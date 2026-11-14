"""Contract tests for the technical report v2 checker."""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
CHECKER_PATH = ROOT / "tools" / "check_report.py"


def load_checker():
    spec = importlib.util.spec_from_file_location("sgrt_report_checker", CHECKER_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


@pytest.fixture()
def checker():
    return load_checker()


def test_v2_has_six_chapters_and_one_h1_each(checker):
    result = checker.check_v2(checker.REPORT)

    assert result["pages"] == 7
    for relative in checker.V2_PAGES:
        assert (checker.REPORT / relative).is_file()


def test_v2_experiment_registry_has_fifteen_unique_ids(checker):
    result = checker.check_v2(checker.REPORT)

    assert result["experiments"] == 15


def test_v2_legacy_anchor_mapping_resolves(checker):
    result = checker.check_v2(checker.REPORT)

    assert result["legacy_anchors"]["matching"] == (
        "surface/index.html#experiment-matching"
    )
    assert result["legacy_anchors"]["pose-sixdof"] == (
        "pose/index.html#experiment-pose"
    )


def test_v2_pages_expose_evidence_and_boundary_sections(checker):
    for relative in checker.V2_PAGES[1:]:
        text = (checker.REPORT / relative).read_text(encoding="utf-8")
        assert 'class="chapter-boundary"' in text
        assert 'rel="prev"' in text
        assert 'rel="next"' in text


def test_v2_page_links_resolve_across_directories(checker):
    page = checker.check_page(checker.REPORT / "technical-v2" / "index.html")

    assert page.h1 == 1
    assert "surface/index.html" in str(page.links)


def test_v2_evidence_references_must_exist(checker):
    data = checker._v2_data()
    data["experiments"][0]["evidenceIds"].append("NOT-A-SOURCE")

    with pytest.raises(AssertionError, match="Unknown evidence"):
        checker.check_evidence_refs(data)
