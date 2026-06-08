def handle_wait_state_command(page: Any, network_log: "NetworkLog", artifacts_dir: Path, task_id: str, command: Dict[str, Any]) -> Optional[Tuple[Dict[str, Any], Optional[Dict[str, Any]]]]:
    if "wait_for_selector" in command:
        payload = command["wait_for_selector"]
        kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        state = selector_state_value(payload.get("state"))
        if state:
            kwargs["state"] = state
        resolve_command_locator(page, payload).wait_for(**kwargs)
        return succeeded_result(command, current_url=page.url), None

    if "wait_for_text" in command:
        payload = command["wait_for_text"]
        page.get_by_text(required(payload, "text"), exact=bool(payload.get("exact"))).wait_for(
            **timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        )
        return succeeded_result(command, current_url=page.url), None

    if "wait_for_url" in command:
        payload = command["wait_for_url"]
        pattern = required(payload, "url_pattern")
        kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        if payload.get("exact"):
            page.wait_for_url(lambda url: str(url) == pattern, **kwargs)
        else:
            page.wait_for_url(pattern, **kwargs)
        return succeeded_result(command, current_url=page.url), None

    if "wait_for_load_state" in command:
        payload = command["wait_for_load_state"]
        kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        state = load_state_value(payload.get("state"))
        if state:
            page.wait_for_load_state(state, **kwargs)
        else:
            page.wait_for_load_state(**kwargs)
        return succeeded_result(command, current_url=page.url), None

    if "wait_for_timeout" in command:
        payload = command["wait_for_timeout"]
        duration = duration_ms(payload.get("duration"))
        if duration is None or duration <= 0:
            raise CommandFailure(ERROR_VALIDATION_FAILED, "wait timeout duration is required", False)
        page.wait_for_timeout(duration)
        return succeeded_result(command, current_url=page.url), None

    if "get_page_state" in command:
        payload = command["get_page_state"]
        state, title, text = collect_page_state(page, payload)
        return succeeded_result(command, current_url=page.url, title=title, text=text, json_value=state), None

    if "get_cookies" in command:
        payload = command["get_cookies"]
        urls = payload.get("urls") or []
        if urls:
            cookies = page.context.cookies(urls)
        else:
            cookies = page.context.cookies()
        return succeeded_result(command, json_value={"cookies": json_safe(cookies)}, current_url=page.url), None

    if "get_storage_state" in command:
        payload = command["get_storage_state"]
        state = page.context.storage_state()
        if not payload.get("include_cookies", True):
            state["cookies"] = []
        if not payload.get("include_origins", True):
            state["origins"] = []
        return succeeded_result(command, json_value=json_safe(state), current_url=page.url), None

    if "wait_for_network_request" in command:
        payload = command["wait_for_network_request"]
        timeout = payload.get("timeout") or command.get("timeout")
        request = network_log.wait_for(payload.get("filter") or {}, payload.get("require_response"), timeout)
        return succeeded_result(command, json_value={"request": request}, current_url=page.url), None

    if "get_network_requests" in command:
        payload = command["get_network_requests"]
        requests = network_log.list(payload.get("filter") or {}, int(payload.get("limit") or 0))
        return succeeded_result(command, json_value={"requests": requests}, matched_count=len(requests), current_url=page.url), None
    return None
