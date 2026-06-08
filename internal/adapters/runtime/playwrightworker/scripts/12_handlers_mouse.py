def handle_mouse_command(page: Any, network_log: "NetworkLog", artifacts_dir: Path, task_id: str, command: Dict[str, Any]) -> Optional[Tuple[Dict[str, Any], Optional[Dict[str, Any]]]]:
    if "mouse_move" in command:
        payload = command["mouse_move"]
        points = [point_value(point) for point in payload.get("path") or []]
        if not points:
            points = [point_value(payload.get("point"))]
        points = [point for point in points if point]
        if not points:
            raise CommandFailure(ERROR_VALIDATION_FAILED, "mouse move point or path is required", False)
        wait_ms = duration_ms(payload.get("duration"))
        interval_ms = wait_ms / len(points) if wait_ms else None
        for point in points:
            page.mouse.move(point["x"], point["y"])
            if interval_ms:
                page.wait_for_timeout(interval_ms)
        return succeeded_result(command, current_url=page.url), None

    if "mouse_click" in command:
        payload = command["mouse_click"]
        point = required_point(payload.get("point"), "point")
        button = mouse_button_value(payload.get("button")) or "left"
        hold_duration = duration_ms(payload.get("hold_duration"))
        if hold_duration is not None and hold_duration > 0:
            page.mouse.move(point["x"], point["y"])
            page.mouse.down(button=button)
            page.wait_for_timeout(hold_duration)
            page.mouse.up(button=button)
        else:
            kwargs: Dict[str, Any] = {"button": button}
            click_count = payload.get("click_count")
            if click_count:
                kwargs["click_count"] = click_count
            delay = duration_ms(payload.get("delay"))
            if delay is not None:
                kwargs["delay"] = delay
            page.mouse.click(point["x"], point["y"], **kwargs)
        return succeeded_result(command, current_url=page.url), None

    if "mouse_down" in command:
        payload = command["mouse_down"]
        page.mouse.down(button=mouse_button_value(payload.get("button")) or "left")
        return succeeded_result(command, current_url=page.url), None

    if "mouse_up" in command:
        payload = command["mouse_up"]
        page.mouse.up(button=mouse_button_value(payload.get("button")) or "left")
        return succeeded_result(command, current_url=page.url), None

    if "drag" in command:
        payload = command["drag"]
        drag(page, payload, command)
        return succeeded_result(command, current_url=page.url), None

    if "scroll" in command:
        payload = command["scroll"]
        delta_x = float(payload.get("delta_x") or 0)
        delta_y = float(payload.get("delta_y") or 0)
        if has_command_locator(payload):
            locator = resolve_command_locator(page, payload)
            kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
            if delta_x == 0 and delta_y == 0:
                locator.scroll_into_view_if_needed(**kwargs)
            else:
                locator.scroll_into_view_if_needed(**kwargs)
                locator.hover(**kwargs)
                page.mouse.wheel(delta_x, delta_y)
        else:
            page.mouse.wheel(delta_x, delta_y)
        return succeeded_result(command, current_url=page.url), None
    return None
