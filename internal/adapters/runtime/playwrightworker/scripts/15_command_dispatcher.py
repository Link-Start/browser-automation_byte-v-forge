COMMAND_HANDLERS = (
    handle_navigation_command,
    handle_input_command,
    handle_mouse_command,
    handle_wait_state_command,
    handle_extract_command,
)


def execute_command(page: Any, network_log: "NetworkLog", artifacts_dir: Path, task_id: str, command: Dict[str, Any]) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
    for handler in COMMAND_HANDLERS:
        result = handler(page, network_log, artifacts_dir, task_id, command)
        if result is not None:
            return result
    raise CommandFailure(ERROR_UNSUPPORTED_OPERATION, "unsupported command operation", False)
