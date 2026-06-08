def handle_extract_command(page: Any, network_log: "NetworkLog", artifacts_dir: Path, task_id: str, command: Dict[str, Any]) -> Optional[Tuple[Dict[str, Any], Optional[Dict[str, Any]]]]:
    if "extract_text" in command:
        payload = command["extract_text"]
        locator = resolve_command_locator(page, payload)
        timeout = duration_ms(payload.get("timeout") or command.get("timeout"))
        if timeout is not None:
            locator.first.wait_for(timeout=timeout)
        count = locator.count()
        if payload.get("all_matches"):
            texts = locator.all_text_contents()
            return succeeded_result(command, texts=texts, matched_count=count, current_url=page.url), None
        text = locator.first.inner_text(timeout=timeout)
        return succeeded_result(command, text=text, matched_count=count, current_url=page.url), None

    if "count_elements" in command:
        payload = command["count_elements"]
        locator = resolve_command_locator(page, payload)
        timeout = duration_ms(payload.get("timeout") or command.get("timeout"))
        if timeout is not None:
            locator.first.wait_for(timeout=timeout)
        return succeeded_result(command, matched_count=locator.count(), current_url=page.url), None

    if "get_attribute" in command:
        payload = command["get_attribute"]
        name = required(payload, "name")
        locator = resolve_command_locator(page, payload)
        timeout = duration_ms(payload.get("timeout") or command.get("timeout"))
        if timeout is not None:
            locator.first.wait_for(timeout=timeout)
        count = locator.count()
        if payload.get("all_matches"):
            values = [locator.nth(index).get_attribute(name, timeout=timeout) for index in range(count)]
            return succeeded_result(command, json_value={"values": values}, matched_count=count, current_url=page.url), None
        value = locator.first.get_attribute(name, timeout=timeout)
        return succeeded_result(command, attribute_value=value, matched_count=count, current_url=page.url), None

    if "extract_element" in command:
        payload = command["extract_element"]
        locator = resolve_command_locator(page, payload)
        timeout = duration_ms(payload.get("timeout") or command.get("timeout"))
        if timeout is not None:
            locator.first.wait_for(timeout=timeout)
        count = locator.count()
        if payload.get("all_matches"):
            elements = [extract_element(locator.nth(index), payload, timeout) for index in range(count)]
            return succeeded_result(command, json_value={"elements": elements}, matched_count=count, current_url=page.url), None
        element = extract_element(locator.first, payload, timeout)
        return succeeded_result(
            command,
            text=element.get("text"),
            json_value=element,
            matched_count=count,
            attributes=element.get("attributes"),
            visible=element.get("visible"),
            bounding_box=element.get("bounding_box"),
            current_url=page.url,
        ), None

    if "screenshot" in command:
        payload = command["screenshot"]
        artifact_key = payload.get("artifact_key") or command.get("command_id") or "screenshot"
        artifact_id = sanitize_filename(f"{task_id}-{artifact_key}")
        path = artifacts_dir / f"{artifact_id}.png"
        kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        if has_command_locator(payload):
            resolve_command_locator(page, payload).screenshot(path=str(path), **kwargs)
        else:
            page.screenshot(path=str(path), full_page=bool(payload.get("full_page")), **kwargs)
        artifact = {
            "artifact_id": artifact_id,
            "kind": "BROWSER_ARTIFACT_KIND_SCREENSHOT",
            "uri": path.resolve().as_uri(),
            "content_type": "image/png",
            "size_bytes": path.stat().st_size,
            "labels": {"task_id": task_id, "command_id": command.get("command_id") or ""},
            "created_at": now_rfc3339(),
        }
        return succeeded_result(command, artifact=artifact, current_url=page.url), artifact

    if "upload_file" in command:
        raise CommandFailure(ERROR_UNSUPPORTED_OPERATION, "upload_file requires a secret/file resolver adapter", False)

    if "select_option" in command:
        payload = command["select_option"]
        locator = resolve_command_locator(page, payload)
        kwargs = timeout_kwargs(payload.get("timeout") or command.get("timeout"))
        selected_values = select_options(locator, payload.get("values") or [], payload.get("labels") or [], payload.get("indexes") or [], kwargs)
        return succeeded_result(command, json_value={"selected_values": selected_values}, current_url=page.url), None

    if "submit_form" in command:
        payload = command["submit_form"]
        locator = resolve_command_locator(page, payload)
        timeout = duration_ms(payload.get("timeout") or command.get("timeout"))
        if timeout is not None:
            locator.first.wait_for(timeout=timeout)
        locator.first.evaluate(
            """(el) => {
                const form = el.tagName && el.tagName.toLowerCase() === 'form' ? el : el.closest('form');
                if (!form) throw new Error('form not found');
                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                else form.submit();
            }"""
        )
        return succeeded_result(command, current_url=page.url), None

    if "evaluate" in command:
        payload = command["evaluate"]
        expression = required(payload, "expression")
        arg = payload.get("args")
        value = evaluate_page(page, expression, arg)
        return succeeded_result(command, json_value=json_safe(value), current_url=page.url), None
    return None
