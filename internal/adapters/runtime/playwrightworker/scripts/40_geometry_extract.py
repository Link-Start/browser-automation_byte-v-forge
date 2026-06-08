def navigation_kwargs(payload: Dict[str, Any], command: Dict[str, Any]) -> Dict[str, Any]:
    kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
    wait_until = wait_until_value(payload.get("wait_until"))
    if wait_until:
        kwargs["wait_until"] = wait_until
    return kwargs


def point_value(value: Any) -> Optional[Dict[str, float]]:
    if not value:
        return None
    return {"x": float(value.get("x") or 0), "y": float(value.get("y") or 0)}


def required_point(value: Any, name: str) -> Dict[str, float]:
    point = point_value(value)
    if not point:
        raise CommandFailure(ERROR_VALIDATION_FAILED, f"{name} is required", False)
    return point


def locator_point(locator: Any, position: Optional[Dict[str, float]], timeout_value: Any) -> Tuple[float, float]:
    timeout = duration_ms(timeout_value)
    if timeout is not None:
        locator.first.wait_for(timeout=timeout)
    box = locator.first.bounding_box(timeout=timeout)
    if not box:
        raise CommandFailure(ERROR_TIMEOUT, "element bounding box is unavailable", True)
    if position:
        return float(box["x"]) + position["x"], float(box["y"]) + position["y"]
    return float(box["x"]) + float(box["width"]) / 2, float(box["y"]) + float(box["height"]) / 2


def drag(page: Any, payload: Dict[str, Any], command: Dict[str, Any]) -> None:
    kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
    has_source_selector = bool((payload.get("source_selector") or {}).get("value")) or bool(
        (payload.get("source_selector_group") or {}).get("selectors")
    )
    has_target_selector = bool((payload.get("target_selector") or {}).get("value")) or bool(
        (payload.get("target_selector_group") or {}).get("selectors")
    )
    if has_source_selector and has_target_selector:
        source = resolve_named_locator(page, payload, "source_selector", "source_selector_group")
        target = resolve_named_locator(page, payload, "target_selector", "target_selector_group")
        source.drag_to(target, **kwargs)
        return
    source_point = point_value(payload.get("source_point"))
    target_point = point_value(payload.get("target_point"))
    if has_source_selector:
        source = resolve_named_locator(page, payload, "source_selector", "source_selector_group")
        source_point = dict(zip(("x", "y"), locator_point(source, None, payload.get("timeout") or command.get("timeout"))))
    if has_target_selector:
        target = resolve_named_locator(page, payload, "target_selector", "target_selector_group")
        target_point = dict(zip(("x", "y"), locator_point(target, None, payload.get("timeout") or command.get("timeout"))))
    if not source_point or not target_point:
        raise CommandFailure(ERROR_VALIDATION_FAILED, "drag source and target are required", False)
    page.mouse.move(source_point["x"], source_point["y"])
    page.mouse.down()
    page.mouse.move(target_point["x"], target_point["y"], steps=10)
    page.mouse.up()


def extract_element(locator: Any, payload: Dict[str, Any], timeout: Optional[float]) -> Dict[str, Any]:
    item: Dict[str, Any] = {}
    if payload.get("include_text"):
        item["text"] = locator.inner_text(timeout=timeout)
    if payload.get("include_html"):
        item["html"] = locator.inner_html(timeout=timeout)
    attributes: Dict[str, str] = {}
    if payload.get("include_attributes"):
        attributes.update(locator.evaluate("(el) => Object.fromEntries(Array.from(el.attributes).map((attr) => [attr.name, attr.value]))"))
    for name in payload.get("attribute_names") or []:
        value = locator.get_attribute(name, timeout=timeout)
        if value is not None:
            attributes[name] = value
    if attributes:
        item["attributes"] = attributes
    if payload.get("include_bounding_box"):
        item["bounding_box"] = locator.bounding_box(timeout=timeout)
    if payload.get("include_visibility"):
        item["visible"] = locator.is_visible(timeout=timeout)
    return json_safe(item)
