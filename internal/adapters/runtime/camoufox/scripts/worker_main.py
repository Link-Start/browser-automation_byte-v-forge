from playwright.sync_api import sync_playwright


def main() -> None:
    raw_options = os.environ.get("CAMOUFOX_WORKER_OPTIONS_JSON", "{}")
    options = json.loads(raw_options)
    endpoint = options["endpoint"]
    artifacts_dir = Path(options["artifacts_dir"])
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    context_options = options.get("context_options") or {}
    init_scripts = options.get("init_scripts") or []

    with sync_playwright() as playwright:
        browser = playwright.firefox.connect(endpoint)
        context = browser.new_context(**context_options)
        for script in init_scripts:
            if script:
                context.add_init_script(script)
        page = context.new_page()
        network_log = NetworkLog(page)
        write_json({"type": "ready"})
        try:
            for line in sys.stdin:
                if not line.strip():
                    continue
                request = json.loads(line)
                if request.get("type") == "stop":
                    break
                if request.get("type") != "execute_task":
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
                    continue
                write_json(execute_task(page, network_log, artifacts_dir, request["task"]))
        finally:
            context.close()
            browser.close()
