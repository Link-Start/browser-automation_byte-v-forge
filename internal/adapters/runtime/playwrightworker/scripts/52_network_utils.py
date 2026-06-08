def network_event_matches(event: Dict[str, Any], request_filter: Dict[str, Any], require_response: bool) -> bool:
    if require_response and event.get("phase") not in {"finished", "failed"}:
        return False
    url = str(event.get("_url") or event.get("url") or "")
    url_substring = str(request_filter.get("url_substring") or "")
    if url_substring and url_substring not in url:
        return False
    url_regex = str(request_filter.get("url_regex") or "")
    if url_regex and not re.search(url_regex, url):
        return False
    method = str(request_filter.get("method") or "").upper()
    if method and str(event.get("method") or "").upper() != method:
        return False
    resource_type = str(request_filter.get("resource_type") or "")
    if resource_type and str(event.get("resource_type") or "") != resource_type:
        return False
    started_after = int(request_filter.get("started_after_unix_ms") or 0)
    if started_after > 0 and int(event.get("started_at_unix_ms") or 0) < started_after:
        return False
    status_min = int(request_filter.get("status_code_min") or 0)
    status_max = int(request_filter.get("status_code_max") or 0)
    if status_min > 0 or status_max > 0:
        status_code = int(event.get("status_code") or 0)
        if status_code <= 0:
            return False
        if status_min > 0 and status_code < status_min:
            return False
        if status_max > 0 and status_code > status_max:
            return False
    return True


def public_network_event(event: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in event.items() if not key.startswith("_")}


def sanitize_url(raw: str) -> str:
    raw = raw.strip()
    before, sep, _ = raw.partition("#")
    if sep:
        raw = before
    before, sep, _ = raw.partition("?")
    if sep:
        raw = before
    return raw


def sanitize_filename(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-")
    return value or "artifact"


def now_unix_ms() -> int:
    return int(time.time() * 1000)


def now_rfc3339() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(value: Dict[str, Any]) -> None:
    print(json.dumps(value, separators=(",", ":")), flush=True)
