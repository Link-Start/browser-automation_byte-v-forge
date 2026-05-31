def timeout_kwargs(value: Any) -> Dict[str, Any]:
    timeout = duration_ms(value)
    if timeout is None:
        return {}
    return {"timeout": timeout}


def duration_ms(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value) * 1000
    if isinstance(value, dict):
        seconds = float(value.get("seconds") or 0)
        nanos = float(value.get("nanos") or 0)
        return seconds * 1000 + nanos / 1_000_000
    if isinstance(value, str):
        match = re.fullmatch(r"([-+]?\d+(?:\.\d+)?)s", value)
        if match:
            return float(match.group(1)) * 1000
    raise CommandFailure(ERROR_VALIDATION_FAILED, f"invalid duration: {value}", False)


def wait_until_value(value: Optional[str]) -> Optional[str]:
    mapping = {
        "BROWSER_NAVIGATION_WAIT_UNTIL_LOAD": "load",
        "BROWSER_NAVIGATION_WAIT_UNTIL_DOM_CONTENT_LOADED": "domcontentloaded",
        "BROWSER_NAVIGATION_WAIT_UNTIL_NETWORK_IDLE": "networkidle",
        "BROWSER_NAVIGATION_WAIT_UNTIL_COMMIT": "commit",
    }
    return mapping.get(value or "")


def load_state_value(value: Optional[str]) -> Optional[str]:
    mapping = {
        "BROWSER_LOAD_STATE_LOAD": "load",
        "BROWSER_LOAD_STATE_DOM_CONTENT_LOADED": "domcontentloaded",
        "BROWSER_LOAD_STATE_NETWORK_IDLE": "networkidle",
    }
    return mapping.get(value or "")


def mouse_button_value(value: Optional[str]) -> Optional[str]:
    mapping = {
        "BROWSER_MOUSE_BUTTON_LEFT": "left",
        "BROWSER_MOUSE_BUTTON_RIGHT": "right",
        "BROWSER_MOUSE_BUTTON_MIDDLE": "middle",
    }
    return mapping.get(value or "")


def selector_state_value(value: Optional[str]) -> Optional[str]:
    mapping = {
        "BROWSER_SELECTOR_STATE_ATTACHED": "attached",
        "BROWSER_SELECTOR_STATE_DETACHED": "detached",
        "BROWSER_SELECTOR_STATE_VISIBLE": "visible",
        "BROWSER_SELECTOR_STATE_HIDDEN": "hidden",
    }
    return mapping.get(value or "")
