def collect_page_state(page: Any, payload: Dict[str, Any]) -> Tuple[Dict[str, Any], Optional[str], Optional[str]]:
    def read_state() -> Tuple[Dict[str, Any], Optional[str], Optional[str]]:
        state: Dict[str, Any] = {"url": page.url}
        title: Optional[str] = None
        text: Optional[str] = None
        if payload.get("include_title"):
            title = page.title()
            state["title"] = title
        if payload.get("include_text"):
            text = page.locator("body").inner_text()
            state["text"] = text
        if payload.get("include_html"):
            state["html"] = page.content()
        state["inputs"] = collect_page_inputs(page)
        state["actions"] = collect_page_actions(page)
        return state, title, text

    return with_navigation_retry(page, read_state)


def collect_page_inputs(page: Any) -> List[Dict[str, str]]:
    return with_navigation_retry(page, lambda: page.evaluate(
        """() => {
            const visible = (el) => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
            };
            const compact = (value) => String(value || "").replace(/\\s+/g, " ").trim();
            return Array.from(document.querySelectorAll("input,textarea,select,[contenteditable='true'],[role='textbox'],[role='combobox']"))
                .filter(visible)
                .slice(0, 20)
                .map((el) => {
                    const item = {
                        tag: el.tagName.toLowerCase(),
                        type: compact(el.getAttribute("type")),
                        name: compact(el.getAttribute("name")),
                        id: compact(el.getAttribute("id")),
                        placeholder: compact(el.getAttribute("placeholder")),
                        ariaLabel: compact(el.getAttribute("aria-label")),
                        autocomplete: compact(el.getAttribute("autocomplete")),
                        role: compact(el.getAttribute("role")),
                    };
                    return Object.fromEntries(Object.entries(item).filter(([, value]) => value));
                })
                .filter((item) => Object.keys(item).length > 0);
        }"""
    ))


def collect_page_actions(page: Any) -> List[Dict[str, str]]:
    return with_navigation_retry(page, lambda: page.evaluate(
        """() => {
            const visible = (el) => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
            };
            const compact = (value) => String(value || "").replace(/\\s+/g, " ").trim();
            const selector = "a,button,input[type=button],input[type=submit],input[type=reset],[role=button],[role=link],[role=menuitem]";
            return Array.from(document.querySelectorAll(selector))
                .filter(visible)
                .slice(0, 40)
                .map((el) => {
                    const item = {
                        tag: el.tagName.toLowerCase(),
                        text: compact(el.innerText || el.textContent),
                        ariaLabel: compact(el.getAttribute("aria-label")),
                        title: compact(el.getAttribute("title")),
                        type: compact(el.getAttribute("type")),
                        role: compact(el.getAttribute("role")),
                    };
                    return Object.fromEntries(Object.entries(item).filter(([, value]) => value));
                })
                .filter((item) => Object.keys(item).length > 0);
        }"""
    ))
