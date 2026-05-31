def has_command_locator(payload: Dict[str, Any]) -> bool:
    selector = payload.get("selector") or {}
    selector_group = payload.get("selector_group") or {}
    if selector.get("value"):
        return True
    return any((candidate or {}).get("value") for candidate in selector_group.get("selectors") or [])


def click_locator(locator: Any, **kwargs: Any) -> None:
    locator.first.click(**kwargs)


def fill_locator(page: Any, locator: Any, value: str, timeout_value: Any) -> None:
    kwargs = timeout_kwargs(timeout_value)
    try:
        locator.fill(value, **kwargs)
        return
    except (PlaywrightError, PlaywrightTimeoutError):
        pass

    try:
        locator.first.evaluate(
            """(el, value) => {
                el.focus();
                const proto = el instanceof HTMLTextAreaElement
                    ? HTMLTextAreaElement.prototype
                    : HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
                if (setter) {
                    setter.call(el, value);
                } else {
                    el.value = value;
                }
                el.dispatchEvent(new Event("input", {bubbles: true}));
                el.dispatchEvent(new Event("change", {bubbles: true}));
            }""",
            value,
        )
        return
    except (PlaywrightError, PlaywrightTimeoutError):
        pass

    locator.first.focus(**kwargs)
    page.keyboard.press("Control+A")
    page.keyboard.press("Delete")
    page.keyboard.type(value)


def select_options(locator: Any, values: List[str], labels: List[str], indexes: List[int], kwargs: Dict[str, Any]) -> List[str]:
    attempts: List[Tuple[str, Any]] = []
    if values:
        attempts.append(("value", values))
        attempts.extend(("value", value) for value in values)
    if labels:
        attempts.append(("label", labels))
        attempts.extend(("label", label) for label in labels)
    if indexes:
        attempts.append(("index", indexes))
        attempts.extend(("index", index) for index in indexes)
    last_error: Optional[Exception] = None
    for kind, value in attempts:
        try:
            if kind == "value":
                return list(locator.select_option(value=value, **kwargs))
            if kind == "label":
                return list(locator.select_option(label=value, **kwargs))
            return list(locator.select_option(index=value, **kwargs))
        except (PlaywrightError, PlaywrightTimeoutError) as exc:
            last_error = exc
    if last_error:
        raise last_error
    return []


def with_navigation_retry(page: Any, action: Callable[[], Any]) -> Any:
    deadline = time.monotonic() + 15
    last_error: Optional[Exception] = None
    for attempt in range(3):
        try:
            return action()
        except (PlaywrightError, PlaywrightTimeoutError) as exc:
            if not is_navigation_context_error(exc) or attempt == 2:
                raise
            last_error = exc
            wait_for_navigation_settle(page, deadline)
    if last_error:
        raise last_error
    raise CommandFailure(ERROR_BROWSER_UNAVAILABLE, "browser action did not return a result", True)


def wait_for_navigation_settle(page: Any, deadline: float) -> None:
    wait_ms = max(100, min(5000, int((deadline - time.monotonic()) * 1000)))
    try:
        page.wait_for_load_state("domcontentloaded", timeout=wait_ms)
    except (PlaywrightError, PlaywrightTimeoutError):
        pass
    try:
        page.wait_for_timeout(500)
    except (PlaywrightError, PlaywrightTimeoutError):
        pass


def evaluate_page(page: Any, expression: str, arg: Any) -> Any:
    return with_navigation_retry(page, lambda: page.evaluate(expression, arg))


def is_navigation_context_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "execution context was destroyed" in message or "most likely because of a navigation" in message
