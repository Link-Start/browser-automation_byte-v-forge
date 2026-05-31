def succeeded_result(command: Dict[str, Any], **kwargs: Any) -> Dict[str, Any]:
    result = {
        "command_id": command.get("command_id") or "",
        "command_key": command.get("command_key") or "",
        "status": "BROWSER_COMMAND_STATUS_SUCCEEDED",
        "completed_at": now_rfc3339(),
    }
    result.update({key: value for key, value in kwargs.items() if value is not None})
    return result


def failed_result(command: Dict[str, Any], code: str, message: str, retryable: bool) -> Dict[str, Any]:
    return {
        "command_id": command.get("command_id") or "",
        "command_key": command.get("command_key") or "",
        "status": "BROWSER_COMMAND_STATUS_FAILED",
        "error": {"code": proto_error_code(code), "message": message, "retryable": retryable},
        "completed_at": now_rfc3339(),
    }


def proto_error_code(code: str) -> str:
    mapping = {
        ERROR_VALIDATION_FAILED: "BROWSER_AUTOMATION_ERROR_CODE_VALIDATION_FAILED",
        ERROR_BROWSER_UNAVAILABLE: "BROWSER_AUTOMATION_ERROR_CODE_BROWSER_UNAVAILABLE",
        ERROR_NAVIGATION_FAILED: "BROWSER_AUTOMATION_ERROR_CODE_NAVIGATION_FAILED",
        ERROR_SCRIPT_FAILED: "BROWSER_AUTOMATION_ERROR_CODE_SCRIPT_FAILED",
        ERROR_TIMEOUT: "BROWSER_AUTOMATION_ERROR_CODE_TIMEOUT",
        ERROR_UNSUPPORTED_OPERATION: "BROWSER_AUTOMATION_ERROR_CODE_UNSUPPORTED_OPERATION",
    }
    return mapping.get(code, "BROWSER_AUTOMATION_ERROR_CODE_INTERNAL")


def operation_error_code(command: Dict[str, Any]) -> str:
    if any(operation in command for operation in ("navigate", "reload", "go_back", "go_forward", "wait_for_url", "wait_for_load_state")):
        return ERROR_NAVIGATION_FAILED
    if "evaluate" in command:
        return ERROR_SCRIPT_FAILED
    return ERROR_BROWSER_UNAVAILABLE


def is_retryable(code: str) -> bool:
    return code in {ERROR_BROWSER_UNAVAILABLE, ERROR_NAVIGATION_FAILED, ERROR_TIMEOUT}


def required(payload: Dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not value:
        raise CommandFailure(ERROR_VALIDATION_FAILED, f"{key} is required", False)
    return value


def json_safe(value: Any) -> Any:
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)
