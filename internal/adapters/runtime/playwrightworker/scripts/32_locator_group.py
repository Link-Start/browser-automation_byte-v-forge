def resolve_named_locator(page: Any, payload: Dict[str, Any], selector_key: str, selector_group_key: str) -> Any:
    selector_group = payload.get(selector_group_key)
    if selector_group and selector_group.get("selectors"):
        return resolve_locator_group(page, selector_group)
    return resolve_locator(page, payload.get(selector_key))


def resolve_locator_group(page: Any, selector_group: Dict[str, Any]) -> Any:
    selectors = [selector for selector in selector_group.get("selectors") or [] if selector and selector.get("value")]
    if not selectors:
        raise CommandFailure(ERROR_VALIDATION_FAILED, "selector_group.selectors is required", False)
    timeout = selector_group.get("timeout")
    if selector_group.get("require_all"):
        locators = [resolve_locator(page, with_default_timeout(selector, timeout)) for selector in selectors]
        return locators[0]
    return resolve_first_visible_locator(page, selectors, timeout, locator_for_selector)


def resolve_first_visible_locator(
    page: Any,
    selectors: List[Dict[str, Any]],
    timeout: Any,
    resolver: Callable[[Any, Optional[Dict[str, Any]]], Any],
) -> Any:
    timeout_ms = duration_ms(timeout)
    deadline = time.monotonic() + timeout_ms / 1000 if timeout_ms is not None else time.monotonic()
    failures: List[str] = []
    attached_candidate: Any = None
    while True:
        for selector in selectors:
            try:
                locator = resolver(page, selector)
                if locator.first.is_visible(timeout=50):
                    return locator
                if attached_candidate is None and locator.count() > 0:
                    attached_candidate = locator
            except (CommandFailure, PlaywrightError, PlaywrightTimeoutError) as exc:
                failures.append(str(exc))
        if timeout_ms is None or time.monotonic() >= deadline:
            break
        remaining_ms = max(0, int((deadline - time.monotonic()) * 1000))
        page.wait_for_timeout(min(100, remaining_ms))
    if attached_candidate is not None:
        return attached_candidate
    raise CommandFailure(ERROR_TIMEOUT, "; ".join(failures[-len(selectors):]) or "selector group did not match", True)


def with_default_timeout(selector: Dict[str, Any], timeout: Any) -> Dict[str, Any]:
    if timeout is None or selector.get("timeout") is not None:
        return selector
    candidate = dict(selector)
    candidate["timeout"] = timeout
    return candidate


def resolve_locator(page: Any, selector: Optional[Dict[str, Any]]) -> Any:
    locator = locator_for_selector(page, selector)
    timeout = duration_ms((selector or {}).get("timeout"))
    if timeout is not None:
        locator.first.wait_for(timeout=timeout)
    return locator


def locator_for_selector(page: Any, selector: Optional[Dict[str, Any]]) -> Any:
    if not selector:
        raise CommandFailure(ERROR_VALIDATION_FAILED, "selector is required", False)
    value = required(selector, "value")
    kind = selector.get("kind") or "BROWSER_SELECTOR_KIND_CSS"
    exact = bool(selector.get("exact"))
    if kind == "BROWSER_SELECTOR_KIND_TEXT":
        locator = page.get_by_text(value, exact=exact)
    elif kind == "BROWSER_SELECTOR_KIND_ROLE":
        role_name = selector.get("role_name") or value
        name = value if selector.get("role_name") else None
        locator = page.get_by_role(role_name, name=name, exact=exact)
    elif kind == "BROWSER_SELECTOR_KIND_LABEL":
        locator = page.get_by_label(value, exact=exact)
    elif kind == "BROWSER_SELECTOR_KIND_PLACEHOLDER":
        locator = page.get_by_placeholder(value, exact=exact)
    elif kind == "BROWSER_SELECTOR_KIND_TEST_ID":
        locator = page.get_by_test_id(value)
    elif kind == "BROWSER_SELECTOR_KIND_XPATH":
        locator = page.locator(value if value.startswith("xpath=") else f"xpath={value}")
    else:
        locator = page.locator(value)
    return locator
