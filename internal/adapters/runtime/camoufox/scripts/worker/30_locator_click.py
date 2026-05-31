def resolve_command_locator(page: Any, payload: Dict[str, Any]) -> Any:
    selector_group = payload.get("selector_group")
    if selector_group and selector_group.get("selectors"):
        return resolve_locator_group(page, selector_group)
    return resolve_locator(page, payload.get("selector"))


def resolve_click_locator(page: Any, payload: Dict[str, Any]) -> Any:
    selector_group = payload.get("selector_group")
    if selector_group and selector_group.get("selectors"):
        return resolve_click_locator_group(page, selector_group)
    return resolve_click_locator_from_selector(page, payload.get("selector"))


def resolve_click_locator_group(page: Any, selector_group: Dict[str, Any]) -> Any:
    selectors = [selector for selector in selector_group.get("selectors") or [] if selector and selector.get("value")]
    if not selectors:
        raise CommandFailure(ERROR_VALIDATION_FAILED, "selector_group.selectors is required", False)
    if selector_group.get("require_all"):
        return resolve_locator_group(page, selector_group)
    return resolve_first_visible_locator(
        page,
        selectors,
        selector_group.get("timeout"),
        resolve_click_locator_from_selector,
    )


def resolve_click_locator_from_selector(page: Any, selector: Optional[Dict[str, Any]]) -> Any:
    if selector and selector.get("kind") == "BROWSER_SELECTOR_KIND_TEXT":
        return action_text_locator(page, selector)
    return locator_for_selector(page, selector)


def resolve_action_text_locator(page: Any, selector: Dict[str, Any]) -> Any:
    locator = action_text_locator(page, selector)
    timeout = duration_ms(selector.get("timeout"))
    if timeout is not None:
        locator.first.wait_for(timeout=timeout)
    return locator


def action_text_locator(page: Any, selector: Dict[str, Any]) -> Any:
    value = required(selector, "value")
    exact = bool(selector.get("exact"))
    has_text: Any = re.compile(rf"^\s*{re.escape(value)}\s*$") if exact else value
    return page.locator(ACTIONABLE_CLICK_SELECTOR).filter(has_text=has_text)
