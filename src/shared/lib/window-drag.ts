import { getCurrentWindow } from "@tauri-apps/api/window";
import type { MouseEvent as ReactMouseEvent } from "react";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      [
        "a",
        "button",
        "input",
        "textarea",
        "select",
        "option",
        "label",
        "summary",
        "[role='button']",
        "[role='tab']",
        "[role='option']",
        "[role='menuitem']",
        "[role='checkbox']",
        "[role='radio']",
        "[role='switch']",
        "[role='slider']",
        "[role='combobox']",
        "[role='listbox']",
        "[role='textbox']",
        "[contenteditable='true']",
        ".no-drag",
      ].join(","),
    ),
  );
}

/** Start a native window drag when pressing non-interactive chrome. */
export function startWindowDragFromEvent(event: ReactMouseEvent): void {
  if (!isTauriRuntime()) return;
  if (event.button !== 0) return;
  if (isInteractiveTarget(event.target)) return;

  void getCurrentWindow().startDragging();
}
