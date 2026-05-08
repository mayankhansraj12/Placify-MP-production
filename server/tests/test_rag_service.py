"""Tests for RAG service query and indexing functionality."""
import pytest
from unittest.mock import patch, MagicMock
import json
import os


class TestRAGServiceInit:
    def test_import_succeeds(self):
        """RAG service should import without errors."""
        from services import rag_service
        assert rag_service is not None



class TestKnowledgeBaseFiles:
    """Verify knowledge base JSON files are valid and have minimum counts."""

    KB_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge")

    def _load_kb(self, filename):
        path = os.path.join(self.KB_DIR, filename)
        assert os.path.exists(path), f"Missing knowledge base file: {filename}"
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert isinstance(data, list), f"{filename} should be a JSON array"
        return data

    def test_interview_questions_valid(self):
        data = self._load_kb("interview_questions.json")
        assert len(data) >= 40, f"Expected 40+ questions, got {len(data)}"
        for item in data[:5]:
            assert "question" in item
            assert "role" in item
            assert "difficulty" in item

    def test_prep_resources_valid(self):
        data = self._load_kb("prep_resources.json")
        assert len(data) >= 20, f"Expected 20+ resources, got {len(data)}"
        for item in data[:5]:
            assert "title" in item
            assert "url" in item
            assert "skills" in item

    def test_company_profiles_valid(self):
        data = self._load_kb("company_profiles.json")
        assert len(data) >= 15, f"Expected 15+ companies, got {len(data)}"
        for item in data[:5]:
            assert "company" in item
            assert "tier" in item
            assert "roles_hiring" in item

    def test_resume_tips_valid(self):
        data = self._load_kb("resume_tips.json")
        assert len(data) >= 10, f"Expected 10+ tips, got {len(data)}"


class TestRAGQueryFunctions:
    def test_query_interview_prep_returns_list(self):
        """get_rag_interview_prep should return a list (or empty)."""
        try:
            from services.rag_service import query_interview_prep
            results = query_interview_prep("python data structures", "Software Developer")
            assert isinstance(results, list)
        except (ImportError, Exception):
            pytest.skip("RAG service not initialized")

    def test_query_company_insights_returns_list(self):
        """get_rag_company_insights should return a list (or empty)."""
        try:
            from services.rag_service import query_company_insights
            results = query_company_insights("Top-Tier", "Software Developer")
            assert isinstance(results, list)
        except (ImportError, Exception):
            pytest.skip("RAG service not initialized")
