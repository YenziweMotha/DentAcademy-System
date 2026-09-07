"""OpenRouter HTTP client — API key stays server-side only."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("dentacademy.ai.openrouter")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterError(Exception):
    """Raised when the OpenRouter provider cannot complete a request."""


def get_openrouter_config() -> Dict[str, Any]:
    return {
        "api_key": os.getenv("OPENROUTER_API_KEY", "").strip(),
        "model": os.getenv("AI_MODEL", "openai/gpt-4o-mini").strip()
        or "openai/gpt-4o-mini",
        "timeout": float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "45")),
        "site_url": os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "app_name": os.getenv("AI_APP_NAME", "DentAcademy Experience Chat"),
    }


def chat_completion(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 1200,
    response_format: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Call OpenRouter chat completions and return the assistant text content.
    Never logs the API key or full message bodies containing report content.
    """
    cfg = get_openrouter_config()
    if not cfg["api_key"]:
        raise OpenRouterError("OPENROUTER_API_KEY is not configured")

    headers = {
        "Authorization": f"Bearer {cfg['api_key']}",
        "Content-Type": "application/json",
        "HTTP-Referer": cfg["site_url"],
        "X-Title": cfg["app_name"],
    }
    payload: Dict[str, Any] = {
        "model": cfg["model"],
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        payload["response_format"] = response_format

    try:
        with httpx.Client(timeout=cfg["timeout"]) as client:
            response = client.post(OPENROUTER_URL, headers=headers, json=payload)
    except httpx.TimeoutException as exc:
        logger.warning("OpenRouter request timed out")
        raise OpenRouterError("AI provider timed out") from exc
    except httpx.HTTPError as exc:
        logger.warning("OpenRouter network error: %s", type(exc).__name__)
        raise OpenRouterError("AI provider unavailable") from exc

    if response.status_code >= 400:
        logger.warning("OpenRouter HTTP %s", response.status_code)
        raise OpenRouterError(f"AI provider returned HTTP {response.status_code}")

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        logger.warning("OpenRouter returned unexpected payload shape")
        raise OpenRouterError("AI provider returned an unexpected response") from exc

    if not isinstance(content, str) or not content.strip():
        raise OpenRouterError("AI provider returned empty content")
    return content.strip()
