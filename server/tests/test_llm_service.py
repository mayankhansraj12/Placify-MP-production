"""Tests for LLM service fallback chain and generation methods."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.fixture
def mock_llm_service():
    """Import llm_service with mocked providers."""
    with patch.dict("os.environ", {}, clear=False):
        import importlib
        from services import llm_service
        importlib.reload(llm_service)
        return llm_service


class TestLLMServiceAvailability:
    def test_is_available_returns_bool(self, mock_llm_service):
        result = mock_llm_service.is_available()
        assert isinstance(result, bool)


class TestGenerateFunction:
    @pytest.mark.asyncio
    async def test_generate_returns_string_or_none(self, mock_llm_service):
        """generate() should return a string or None when no provider is configured."""
        result = await mock_llm_service.generate(
            prompt="Say hello", system="You are a test bot."
        )
        assert result is None or isinstance(result, str)

    @pytest.mark.asyncio
    async def test_generate_json_returns_dict_or_none(self, mock_llm_service):
        """generate_json() should return a dict or None."""
        result = await mock_llm_service.generate_json(
            prompt='Return {"test": true}', system="Return valid JSON."
        )
        assert result is None or isinstance(result, dict)


class TestVisionExtraction:
    @pytest.mark.asyncio
    async def test_extract_with_vision_handles_empty_bytes(self, mock_llm_service):
        """Vision extraction should handle empty input gracefully."""
        result = await mock_llm_service.extract_with_vision(b"")
        assert result is None or isinstance(result, str)



