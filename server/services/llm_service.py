"""
Multi-provider LLM service with auto-fallback.
Chain: Azure OpenAI (GPT-4o-mini) → Gemini Free → Groq Free → Ollama Local → None (rule-based).

Azure OpenAI is the primary provider (student $100 credit).
Remaining providers are free fallbacks requiring no credit card.
"""
import os
import json
import asyncio
import logging

logger = logging.getLogger("placify.llm")
DEFAULT_MAX_OUTPUT_TOKENS = 8192

# ── Lazy-loaded provider clients ──────────────────────────────────
_azure_client = None
_gemini_model = None
_groq_client = None


def _uses_completion_token_limit(model_name: str) -> bool:
    """Newer chat models reject max_tokens and require max_completion_tokens."""
    normalized = (model_name or "").strip().lower()
    return normalized.startswith(("gpt-5", "o1", "o3", "o4"))


def _azure_token_limit_kwargs(deployment: str, limit: int) -> dict:
    if _uses_completion_token_limit(deployment):
        # openai==1.14.x does not accept max_completion_tokens directly, but
        # extra_body is merged into the JSON request sent to Azure.
        return {"extra_body": {"max_completion_tokens": limit}}
    return {"max_tokens": limit}


def _get_azure():
    """Initialize Azure OpenAI client (GPT-4o-mini via student credit)."""
    global _azure_client
    if _azure_client is None:
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()
        key = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
        if not endpoint or not key:
            return None
        try:
            from openai import AsyncAzureOpenAI
            _azure_client = AsyncAzureOpenAI(
                azure_endpoint=endpoint,
                api_key=key,
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
            )
            logger.info("Azure OpenAI provider initialized (GPT-4o-mini)")
        except ImportError:
            logger.warning("openai package not installed, skipping Azure OpenAI")
            return None
        except Exception as e:
            logger.warning("Azure OpenAI init failed: %s", e)
            return None
    return _azure_client


def _get_gemini():
    """Initialize Gemini client (free tier: 15 RPM)."""
    global _gemini_model
    if _gemini_model is None:
        key = os.getenv("GEMINI_API_KEY", "").strip()
        if not key:
            return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=key)
            _gemini_model = genai.GenerativeModel("gemini-2.0-flash")
            logger.info("Gemini provider initialized (gemini-2.0-flash)")
        except ImportError:
            logger.warning("google-generativeai not installed, skipping Gemini")
            return None
        except Exception as e:
            logger.warning("Gemini init failed: %s", e)
            return None
    return _gemini_model


def _get_groq():
    """Initialize Groq client (free tier: 30 RPM)."""
    global _groq_client
    if _groq_client is None:
        key = os.getenv("GROQ_API_KEY", "").strip()
        if not key:
            return None
        try:
            from groq import AsyncGroq
            _groq_client = AsyncGroq(api_key=key)
            logger.info("Groq provider initialized (llama-3.3-70b-versatile)")
        except ImportError:
            logger.warning("groq package not installed, skipping Groq")
            return None
        except Exception as e:
            logger.warning("Groq init failed: %s", e)
            return None
    return _groq_client


# ── Main API ──────────────────────────────────────────────────────

async def generate(prompt: str, system: str = "", json_mode: bool = False) -> str | None:
    """
    Generate text using the first available LLM provider.
    Returns None if all providers fail — caller should use rule-based fallback.

    Chain: Azure OpenAI → Gemini → Groq → Ollama → None
    """
    timeout = int(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
    max_output_tokens = int(os.getenv("LLM_MAX_OUTPUT_TOKENS", str(DEFAULT_MAX_OUTPUT_TOKENS)))

    # ── 1. Azure OpenAI (Primary — GPT-4o-mini) ──────────────────
    azure = _get_azure()
    if azure:
        try:
            deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            kwargs = {
                "model": deployment,
                "messages": messages,
                "temperature": 0.7,
                **_azure_token_limit_kwargs(deployment, max_output_tokens),
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            resp = await asyncio.wait_for(
                azure.chat.completions.create(**kwargs),
                timeout=timeout
            )
            text = resp.choices[0].message.content
            if text and text.strip():
                logger.info("llm_response provider=azure_openai model=%s tokens=%d",
                           deployment, resp.usage.total_tokens if resp.usage else 0)
                return text.strip()
        except asyncio.TimeoutError:
            logger.warning("llm_timeout provider=azure_openai seconds=%d", timeout)
        except Exception as e:
            logger.warning("llm_error provider=azure_openai error=%s", str(e)[:200])

    # ── 2. Gemini Free ────────────────────────────────────────────
    gemini = _get_gemini()
    if gemini:
        try:
            full_prompt = f"{system}\n\n{prompt}" if system else prompt
            resp = await asyncio.wait_for(
                gemini.generate_content_async(
                    full_prompt,
                    generation_config={"max_output_tokens": max_output_tokens},
                ),
                timeout=timeout
            )
            text = resp.text
            if text and text.strip():
                logger.info("llm_response provider=gemini tokens=%d", len(text.split()))
                return text.strip()
        except asyncio.TimeoutError:
            logger.warning("llm_timeout provider=gemini seconds=%d", timeout)
        except Exception as e:
            logger.warning("llm_error provider=gemini error=%s", str(e)[:200])

    # ── 3. Groq Free ─────────────────────────────────────────────
    groq = _get_groq()
    if groq:
        try:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            kwargs = {
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": max_output_tokens,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            resp = await asyncio.wait_for(
                groq.chat.completions.create(**kwargs),
                timeout=timeout
            )
            text = resp.choices[0].message.content
            if text and text.strip():
                logger.info("llm_response provider=groq tokens=%d", len(text.split()))
                return text.strip()
        except asyncio.TimeoutError:
            logger.warning("llm_timeout provider=groq seconds=%d", timeout)
        except Exception as e:
            logger.warning("llm_error provider=groq error=%s", str(e)[:200])

    # ── 4. Ollama Local ───────────────────────────────────────────
    try:
        import ollama as ol
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        # Run sync ollama in a thread to not block the event loop
        loop = asyncio.get_running_loop()
        resp = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: ol.chat(model="llama3.2", messages=messages, options={"num_predict": max_output_tokens})),
            timeout=timeout
        )
        text = resp["message"]["content"]
        if text and text.strip():
            logger.info("llm_response provider=ollama tokens=%d", len(text.split()))
            return text.strip()
    except ImportError:
        logger.debug("ollama package not installed, skipping")
    except Exception as e:
        logger.debug("llm_error provider=ollama error=%s", str(e)[:100])

    # ── All providers failed ──────────────────────────────────────
    logger.warning("llm_all_providers_unavailable — caller should use rule-based fallback")
    return None


async def generate_json(prompt: str, system: str = "") -> dict | None:
    """Generate and parse a JSON response. Returns None on failure."""
    result = await generate(prompt, system, json_mode=True)
    if result is None:
        return None
    try:
        # Strip markdown code fences if the LLM wraps the JSON
        cleaned = result.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("llm_invalid_json response=%s", result[:200])
        return None


async def extract_with_vision(pdf_bytes: bytes) -> str | None:
    """
    Use Gemini's multimodal capability to extract text from image-based PDFs.
    Only works with Gemini (free tier supports vision).
    """
    gemini = _get_gemini()
    if not gemini:
        return None

    try:
        import base64
        b64 = base64.b64encode(pdf_bytes).decode()
        resp = await gemini.generate_content_async([
            "Extract ALL text from this resume PDF. Preserve section headers and bullet points. Return only the extracted text, nothing else.",
            {"mime_type": "application/pdf", "data": b64}
        ])
        text = resp.text
        if text and len(text.strip()) >= 50:
            logger.info("vision_extract success chars=%d", len(text))
            return text.strip()
    except Exception as e:
        logger.warning("vision_extract failed: %s", str(e)[:200])

    return None


def is_available() -> bool:
    """Check if at least one LLM provider is configured."""
    if os.getenv("AZURE_OPENAI_API_KEY", "").strip() and os.getenv("AZURE_OPENAI_ENDPOINT", "").strip():
        return True
    if os.getenv("GEMINI_API_KEY", "").strip():
        return True
    if os.getenv("GROQ_API_KEY", "").strip():
        return True
    try:
        import ollama
        return True
    except ImportError:
        return False


def get_provider_status() -> dict:
    """Return status of all configured providers (for /health endpoint)."""
    return {
        "azure_openai": bool(os.getenv("AZURE_OPENAI_API_KEY", "").strip() and os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()),
        "gemini": bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "groq": bool(os.getenv("GROQ_API_KEY", "").strip()),
        "ollama": _check_ollama(),
        "any_available": is_available(),
    }


def _check_ollama() -> bool:
    try:
        import ollama
        return True
    except ImportError:
        return False
