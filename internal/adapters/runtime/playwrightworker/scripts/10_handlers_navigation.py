def handle_navigation_command(page: Any, network_log: "NetworkLog", artifacts_dir: Path, task_id: str, command: Dict[str, Any]) -> Optional[Tuple[Dict[str, Any], Optional[Dict[str, Any]]]]:
    if "navigate" in command:
        payload = command["navigate"]
        kwargs = navigation_kwargs(payload, command)
        page.goto(required(payload, "url"), **kwargs)
        return succeeded_result(command, current_url=page.url), None

    if "reload" in command:
        payload = command["reload"]
        page.reload(**navigation_kwargs(payload, command))
        return succeeded_result(command, current_url=page.url), None

    if "go_back" in command:
        payload = command["go_back"]
        page.go_back(**navigation_kwargs(payload, command))
        return succeeded_result(command, current_url=page.url), None

    if "go_forward" in command:
        payload = command["go_forward"]
        page.go_forward(**navigation_kwargs(payload, command))
        return succeeded_result(command, current_url=page.url), None
    return None
