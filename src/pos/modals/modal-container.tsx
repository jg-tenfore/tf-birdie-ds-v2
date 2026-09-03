import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Where dialogs portal to.
 *
 * Dialogs normally attach to `document.body`, which is right in the app: one sheet fills
 * the window and a dialog belongs over all of it. The before/after action stories break
 * that assumption — two sheets side by side, and a dialog centred on the window would sit
 * between them belonging to neither.
 *
 * `null` keeps the default. Anything else scopes the portal, so the dialog and its scrim
 * land inside that pane.
 */
const ModalContainerContext = createContext<HTMLElement | null>(null);

export function ModalContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <ModalContainerContext.Provider value={container}>{children}</ModalContainerContext.Provider>
  );
}

/** The element dialogs should portal into, or `null` for `document.body`. */
export function useModalContainer(): HTMLElement | null {
  return useContext(ModalContainerContext);
}
