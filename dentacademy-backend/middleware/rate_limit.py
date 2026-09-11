"""Lightweight in-memory rate limiting for auth and abuse-prone endpoints.

Suitable for a single-process deployment (Render free / local). For multi-
instance production, replace with Redis-backed limiting.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Callable, Deque, Dict, Optional, Tuple

from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def hit(self, key: str, *, limit: int, window_seconds: float) -> Tuple[bool, int]:
        """Record a hit. Returns (allowed, retry_after_seconds)."""
        now = time.monotonic()
        with self._lock:
            bucket = self._hits[key]
            cutoff = now - window_seconds
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry = int(max(1, window_seconds - (now - bucket[0])))
                return False, retry
            bucket.append(now)
            return True, 0

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    # Prefer direct client; only trust first XFF hop when behind a known proxy.
    if os_getenv_trust_proxy() and request.headers.get("x-forwarded-for"):
        return request.headers["x-forwarded-for"].split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def os_getenv_trust_proxy() -> bool:
    import os

    return os.getenv("TRUST_PROXY_HEADERS", "0") == "1"


def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int,
    window_seconds: float,
    identity: Optional[str] = None,
) -> None:
    ip = client_ip(request)
    key = f"{scope}:{ip}:{identity or '-'}"
    allowed, retry = limiter.hit(key, limit=limit, window_seconds=window_seconds)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry)},
        )


def rate_limit_dependency(
    scope: str, limit: int, window_seconds: float
) -> Callable:
    def _dep(request: Request) -> None:
        enforce_rate_limit(
            request, scope=scope, limit=limit, window_seconds=window_seconds
        )

    return _dep
