def handle_input_command(page: Any, network_log: "NetworkLog", artifacts_dir: Path, task_id: str, command: Dict[str, Any]) -> Optional[Tuple[Dict[str, Any], Optional[Dict[str, Any]]]]:
    if "click" in command:
        payload = command["click"]
        locator = resolve_click_locator(page, payload)
        kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        click_count = payload.get("click_count")
        if click_count:
            kwargs["click_count"] = click_count
        if payload.get("force"):
            kwargs["force"] = True
        button = mouse_button_value(payload.get("button"))
        if button:
            kwargs["button"] = button
        position = point_value(payload.get("position"))
        if position:
            kwargs["position"] = position
        delay = duration_ms(payload.get("delay"))
        if delay is not None:
            kwargs["delay"] = delay
        hold_duration = duration_ms(payload.get("hold_duration"))
        if hold_duration is not None and hold_duration > 0:
            x, y = locator_point(locator, position, payload.get("timeout") or command.get("timeout"))
            page.mouse.move(x, y)
            page.mouse.down(button=button or "left")
            page.wait_for_timeout(hold_duration)
            page.mouse.up(button=button or "left")
            return succeeded_result(command, current_url=page.url), None
        click_locator(locator, **kwargs)
        return succeeded_result(command, current_url=page.url), None

    if "fill" in command:
        payload = command["fill"]
        locator = resolve_command_locator(page, payload)
        fill_locator(page, locator, payload.get("value") or "", payload.get("timeout") or command.get("timeout"))
        return succeeded_result(command, current_url=page.url), None

    if "set_checked" in command:
        payload = command["set_checked"]
        kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        if payload.get("force"):
            kwargs["force"] = True
        resolve_command_locator(page, payload).set_checked(bool(payload.get("checked")), **kwargs)
        return succeeded_result(command, current_url=page.url), None

    if "type_text" in command:
        payload = command["type_text"]
        text = required(payload, "text")
        kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        delay = duration_ms(payload.get("delay"))
        if delay is not None:
            kwargs["delay"] = delay
        if has_command_locator(payload):
            locator = resolve_command_locator(page, payload)
            if payload.get("clear_before"):
                locator.fill("", **timeout_kwargs(payload.get("timeout") or command.get("timeout")))
            locator.press_sequentially(text, **kwargs)
        else:
            keyboard_kwargs: Dict[str, Any] = {}
            if delay is not None:
                keyboard_kwargs["delay"] = delay
            page.keyboard.type(text, **keyboard_kwargs)
        return succeeded_result(command, current_url=page.url), None

    if "clear" in command:
        payload = command["clear"]
        resolve_command_locator(page, payload).fill("", **timeout_kwargs(payload.get("timeout") or command.get("timeout")))
        return succeeded_result(command, current_url=page.url), None

    if "press" in command:
        payload = command["press"]
        key = required(payload, "key")
        if has_command_locator(payload):
            resolve_command_locator(page, payload).press(key, **timeout_kwargs(payload.get("timeout") or command.get("timeout")))
        else:
            page.keyboard.press(key)
        return succeeded_result(command, current_url=page.url), None

    if "focus" in command:
        payload = command["focus"]
        resolve_command_locator(page, payload).focus(**timeout_kwargs(payload.get("timeout") or command.get("timeout")))
        return succeeded_result(command, current_url=page.url), None

    if "blur" in command:
        payload = command["blur"]
        resolve_command_locator(page, payload).evaluate("(el) => el.blur()")
        return succeeded_result(command, current_url=page.url), None

    if "hover" in command:
        payload = command["hover"]
        kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        position = point_value(payload.get("position"))
        if position:
            kwargs["position"] = position
        resolve_command_locator(page, payload).hover(**kwargs)
        return succeeded_result(command, current_url=page.url), None
    return None
