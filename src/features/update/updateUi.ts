export type UpdateUiPhase = "downloading" | "installing" | "ready" | "error";

export type UpdateUiState = {
  open: boolean;
  phase: UpdateUiPhase;
  version: string;
  /** 0–100 while downloading; null when unknown total size */
  percent: number | null;
  downloadedBytes: number;
  totalBytes: number | null;
  error: string | null;
};

type Listener = (state: UpdateUiState) => void;

const INITIAL: UpdateUiState = {
  open: false,
  phase: "downloading",
  version: "",
  percent: null,
  downloadedBytes: 0,
  totalBytes: null,
  error: null,
};

let state: UpdateUiState = { ...INITIAL };
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener(state);
  }
}

function patch(partial: Partial<UpdateUiState>) {
  state = { ...state, ...partial };
  emit();
}

export function getUpdateUiState(): UpdateUiState {
  return state;
}

export function subscribeUpdateUi(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function beginUpdateDownload(version: string) {
  patch({
    open: true,
    phase: "downloading",
    version,
    percent: null,
    downloadedBytes: 0,
    totalBytes: null,
    error: null,
  });
}

export function reportUpdateProgress(downloaded: number, total: number | null) {
  const percent =
    total && total > 0
      ? Math.min(100, Math.round((downloaded / total) * 100))
      : null;
  patch({
    phase: "downloading",
    downloadedBytes: downloaded,
    totalBytes: total,
    percent,
  });
}

export function reportUpdateInstalling() {
  patch({
    phase: "installing",
    percent: 100,
  });
}

export function reportUpdateReady() {
  patch({
    phase: "ready",
    percent: 100,
  });
}

export function reportUpdateError(message: string) {
  patch({
    open: true,
    phase: "error",
    error: message,
  });
}

export function closeUpdateUi() {
  patch({ ...INITIAL });
}

type CancelHandler = () => void;
let cancelHandler: CancelHandler | null = null;

export function setUpdateCancelHandler(handler: CancelHandler | null) {
  cancelHandler = handler;
}

/** Abort an in-progress download if a cancel handler is registered. */
export function cancelUpdateDownload() {
  cancelHandler?.();
}
