from cloakbrowser import launch


def main() -> None:
    raw_options = os.environ.get("CLOAK_BROWSER_WORKER_OPTIONS_JSON", "{}")
    options = json.loads(raw_options)
    artifacts_dir = Path(options["artifacts_dir"])
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    launch_options = options.get("launch_options") or {}
    context_options = options.get("context_options") or {}
    init_scripts = options.get("init_scripts") or []

    browser = launch(**launch_options)
    context = browser.new_context(**context_options)
    for script in init_scripts:
        if script:
            context.add_init_script(script)
    page = context.new_page()
    cdp_session = context.new_cdp_session(page)
    network_log = NetworkLog(page)
    write_json({"type": "ready"})
    try:
        for line in sys.stdin:
            if not line.strip():
                continue
            request = json.loads(line)
            if request.get("type") == "stop":
                break
            if request.get("type") == "execute_task":
                write_json(execute_task(page, network_log, artifacts_dir, request["task"]))
                continue
            if request.get("type") == "capture_live_frame":
                try:
                    write_json(capture_live_frame(page, cdp_session, request.get("live_view") or {}, int(request.get("sequence") or 0)))
                except CommandFailure as failure:
                    write_json(worker_error_response("live_frame", failure))
                continue
            if request.get("type") == "dispatch_live_input":
                try:
                    write_json(dispatch_live_input(page, cdp_session, request.get("input") or {}))
                except CommandFailure as failure:
                    write_json(worker_error_response("live_input_result", failure))
                continue
            write_json(
                {
                    "type": "task_result",
                    "error": {
                        "code": ERROR_VALIDATION_FAILED,
                        "message": "unsupported worker request type",
                        "retryable": False,
                    },
                }
            )
    finally:
        context.close()
        browser.close()
