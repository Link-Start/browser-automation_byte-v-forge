def capture_live_frame(page: Any, cdp_session: Any, live_view: Dict[str, Any], sequence: int) -> Dict[str, Any]:
    if cdp_session is None:
        raise CommandFailure(ERROR_UNSUPPORTED_OPERATION, "CDP live view is not available for this runtime", False)
    metrics = cdp_session.send("Page.getLayoutMetrics")
    viewport = metrics.get("cssLayoutViewport") or metrics.get("layoutViewport") or {}
    screenshot = cdp_session.send(
        "Page.captureScreenshot",
        {"format": "jpeg", "quality": 65, "fromSurface": True, "captureBeyondViewport": False},
    )
    return {
        "type": "live_frame",
        "frame": {
            "live_view_id": str(live_view.get("live_view_id") or ""),
            "sequence": int(sequence or 0),
            "provider": "BROWSER_LIVE_VIEW_PROVIDER_CDP",
            "content_type": "image/jpeg",
            "image_base64": str(screenshot.get("data") or ""),
            "width": int(viewport.get("clientWidth") or 0),
            "height": int(viewport.get("clientHeight") or 0),
            "current_url": sanitize_url(str(getattr(page, "url", ""))),
            "title": safe_title(page),
            "captured_at": now_rfc3339(),
        },
    }


def dispatch_live_input(page: Any, cdp_session: Any, event: Dict[str, Any]) -> Dict[str, Any]:
    if cdp_session is None:
        raise CommandFailure(ERROR_UNSUPPORTED_OPERATION, "CDP live input is not available for this runtime", False)
    kind = str(event.get("kind") or "")
    x = float(event.get("x") or 0)
    y = float(event.get("y") or 0)
    if kind == "BROWSER_LIVE_INPUT_KIND_MOUSE_MOVE":
        cdp_session.send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": x, "y": y})
    elif kind == "BROWSER_LIVE_INPUT_KIND_MOUSE_CLICK":
        button = live_mouse_button(event.get("button"))
        cdp_session.send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": button, "clickCount": 1})
        cdp_session.send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": button, "clickCount": 1})
    elif kind == "BROWSER_LIVE_INPUT_KIND_MOUSE_WHEEL":
        cdp_session.send("Input.dispatchMouseEvent", {"type": "mouseWheel", "x": x, "y": y, "deltaX": float(event.get("delta_x") or 0), "deltaY": float(event.get("delta_y") or 0)})
    elif kind == "BROWSER_LIVE_INPUT_KIND_KEY_PRESS":
        key = str(event.get("key") or "")
        if key:
            cdp_session.send("Input.dispatchKeyEvent", {"type": "keyDown", "key": key})
            cdp_session.send("Input.dispatchKeyEvent", {"type": "keyUp", "key": key})
    elif kind == "BROWSER_LIVE_INPUT_KIND_TYPE_TEXT":
        text = str(event.get("text") or "")
        if text:
            cdp_session.send("Input.insertText", {"text": text})
    else:
        raise CommandFailure(ERROR_VALIDATION_FAILED, "unsupported live input kind", False)
    return {"type": "live_input_result"}


def safe_title(page: Any) -> str:
    try:
        return str(page.title())
    except (PlaywrightError, PlaywrightTimeoutError):
        return ""


def live_mouse_button(value: Any) -> str:
    if value == "BROWSER_MOUSE_BUTTON_RIGHT":
        return "right"
    if value == "BROWSER_MOUSE_BUTTON_MIDDLE":
        return "middle"
    return "left"


def worker_error_response(response_type: str, failure: CommandFailure) -> Dict[str, Any]:
    return {
        "type": response_type,
        "error": {"code": failure.code, "message": failure.message, "retryable": failure.retryable},
    }
