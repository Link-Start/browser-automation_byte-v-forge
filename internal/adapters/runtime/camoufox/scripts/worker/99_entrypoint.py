if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        traceback.print_exc(file=sys.stderr)
        write_json(
            {
                "type": "task_result",
                "error": {"code": ERROR_BROWSER_UNAVAILABLE, "message": str(exc), "retryable": True},
            }
        )
