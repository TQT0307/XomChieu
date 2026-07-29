export const ADMIN_SHORTCUT_REQUIRED_CLICKS = 5;
export const ADMIN_SHORTCUT_MAX_GAP_MS = 1400;

export interface AdminShortcutState {
  count: number;
  lastClickAt: number;
}

export const advanceAdminShortcut = (
  state: AdminShortcutState,
  clickedAt: number
): { state: AdminShortcutState; shouldOpenAdmin: boolean } => {
  const isContinuing =
    state.count > 0 &&
    clickedAt >= state.lastClickAt &&
    clickedAt - state.lastClickAt <= ADMIN_SHORTCUT_MAX_GAP_MS;
  const count = isContinuing ? state.count + 1 : 1;
  const shouldOpenAdmin = count >= ADMIN_SHORTCUT_REQUIRED_CLICKS;

  return {
    state: shouldOpenAdmin
      ? { count: 0, lastClickAt: 0 }
      : { count, lastClickAt: clickedAt },
    shouldOpenAdmin
  };
};

