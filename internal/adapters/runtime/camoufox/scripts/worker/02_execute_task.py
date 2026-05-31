def execute_task(page: Any, network_log: "NetworkLog", artifacts_dir: Path, task: Dict[str, Any]) -> Dict[str, Any]:
    task_id = task.get("task_id") or ""
    input_data = task.get("input") or {}
    commands = input_data.get("commands") or []
    results: List[Dict[str, Any]] = []
    artifacts: List[Dict[str, Any]] = []

    for command in commands:
        try:
            result, artifact = execute_command(page, network_log, artifacts_dir, task_id, command)
            results.append(result)
            if artifact:
                artifacts.append(artifact)
        except CommandFailure as exc:
            results.append(failed_result(command, exc.code, exc.message, exc.retryable))
            if command.get("continue_on_error"):
                continue
            return {
                "type": "task_result",
                "task_id": task_id,
                "results": results,
                "artifacts": artifacts,
                "error": {"code": exc.code, "message": exc.message, "retryable": exc.retryable},
            }
        except PlaywrightTimeoutError as exc:
            results.append(failed_result(command, ERROR_TIMEOUT, str(exc), True))
            if command.get("continue_on_error"):
                continue
            return {
                "type": "task_result",
                "task_id": task_id,
                "results": results,
                "artifacts": artifacts,
                "error": {"code": ERROR_TIMEOUT, "message": str(exc), "retryable": True},
            }
        except PlaywrightError as exc:
            code = operation_error_code(command)
            results.append(failed_result(command, code, str(exc), is_retryable(code)))
            if command.get("continue_on_error"):
                continue
            return {
                "type": "task_result",
                "task_id": task_id,
                "results": results,
                "artifacts": artifacts,
                "error": {"code": code, "message": str(exc), "retryable": is_retryable(code)},
            }
        except Exception as exc:
            traceback.print_exc(file=sys.stderr)
            results.append(failed_result(command, ERROR_BROWSER_UNAVAILABLE, str(exc), True))
            if command.get("continue_on_error"):
                continue
            return {
                "type": "task_result",
                "task_id": task_id,
                "results": results,
                "artifacts": artifacts,
                "error": {"code": ERROR_BROWSER_UNAVAILABLE, "message": str(exc), "retryable": True},
            }

    return {"type": "task_result", "task_id": task_id, "results": results, "artifacts": artifacts}
