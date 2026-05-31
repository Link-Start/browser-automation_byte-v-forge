import json
import os
import re
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


ERROR_VALIDATION_FAILED = "validation_failed"
ERROR_BROWSER_UNAVAILABLE = "browser_unavailable"
ERROR_NAVIGATION_FAILED = "navigation_failed"
ERROR_SCRIPT_FAILED = "script_failed"
ERROR_TIMEOUT = "timeout"
ERROR_UNSUPPORTED_OPERATION = "unsupported_operation"
ACTIONABLE_CLICK_SELECTOR = (
    "a,button,input[type=button],input[type=submit],input[type=reset],"
    "[role=button],[role=link],[role=menuitem]"
)


class CommandFailure(Exception):
    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


class NetworkLog:
    def __init__(self, page: Any):
        self.page = page
        self.events: List[Dict[str, Any]] = []
        page.on("request", self.on_request)
        page.on("response", self.on_response)
        page.on("requestfinished", self.on_request_finished)
        page.on("requestfailed", self.on_request_failed)

    def on_request(self, request: Any) -> None:
        event = {
            "request_id": str(id(request)),
            "url": sanitize_url(str(getattr(request, "url", ""))),
            "_url": str(getattr(request, "url", "")),
            "method": str(getattr(request, "method", "")).upper(),
            "resource_type": str(getattr(request, "resource_type", "")),
            "phase": "started",
            "started_at_unix_ms": now_unix_ms(),
        }
        self.events.append(event)
        del self.events[:-300]

    def on_response(self, response: Any) -> None:
        request = getattr(response, "request", None)
        event = self.event_for_request(request)
        if not event:
            return
        event["status_code"] = int(getattr(response, "status", 0) or 0)
        event["response_at_unix_ms"] = now_unix_ms()

    def on_request_finished(self, request: Any) -> None:
        event = self.event_for_request(request)
        if not event:
            return
        event["phase"] = "finished"
        event["finished_at_unix_ms"] = now_unix_ms()
        try:
            response = request.response()
            if response:
                event["status_code"] = int(getattr(response, "status", 0) or 0)
        except (PlaywrightError, PlaywrightTimeoutError):
            pass

    def on_request_failed(self, request: Any) -> None:
        event = self.event_for_request(request)
        if not event:
            return
        event["phase"] = "failed"
        event["failed_at_unix_ms"] = now_unix_ms()
        failure = getattr(request, "failure", None)
        if failure:
            event["failure"] = str(failure)

    def event_for_request(self, request: Any) -> Optional[Dict[str, Any]]:
        if request is None:
            return None
        request_id = str(id(request))
        for event in reversed(self.events):
            if event.get("request_id") == request_id:
                return event
        return None

    def wait_for(self, request_filter: Dict[str, Any], require_response: bool, timeout_value: Any) -> Dict[str, Any]:
        timeout = duration_ms(timeout_value)
        if timeout is None:
            timeout = 5000
        deadline = time.monotonic() + timeout / 1000
        while True:
            event = self.first_matching(request_filter, require_response)
            if event:
                return public_network_event(event)
            if time.monotonic() >= deadline:
                raise CommandFailure(ERROR_TIMEOUT, "network request did not match", True)
            self.page.wait_for_timeout(100)

    def list(self, request_filter: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
        matches = [public_network_event(event) for event in self.events if network_event_matches(event, request_filter, False)]
        if limit > 0:
            return matches[-limit:]
        return matches

    def first_matching(self, request_filter: Dict[str, Any], require_response: bool) -> Optional[Dict[str, Any]]:
        for event in self.events:
            if network_event_matches(event, request_filter, require_response):
                return event
        return None
