/**
 * Kit dialogs with React content (React apps only — vendored with src/kit/react/).
 *
 *   openReactDialog({ title: 'Jak na to', actions: [{ label: 'Rozumím' }] }, (close) => <Help onDone={() => close('ok')} />);
 *   openReactSettingsDialog(<MyAppSettings />);          // kit settings dialog + app-specific section
 *
 * The React root is created in a host element inside the dialog and unmounted after it closes.
 */
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { openDialog, openSettingsDialog, type DialogHandle, type DialogOptions, type SettingsDialogOptions } from '../dialog';

function mountReact(node: ReactNode): { host: HTMLElement; unmount: () => void } {
  const host = document.createElement('div');
  host.className = 'g92-react-host';
  const root = createRoot(host);
  root.render(node);
  // unmount after the closing animation (never synchronously inside a React event)
  return { host, unmount: () => setTimeout(() => root.unmount(), 400) };
}

/** Kit dialog whose body is React; `render` receives `close(value?)`. */
export function openReactDialog(opts: Omit<DialogOptions, 'content'>, render: (close: (value?: string) => void) => ReactNode): DialogHandle {
  let handle: DialogHandle | null = null;
  const close = (value?: string) => handle?.close(value);
  const { host, unmount } = mountReact(render(close));
  handle = openDialog({ ...opts, content: host });
  void handle.closed.then(unmount);
  return handle;
}

/** Global g92 settings dialog with an extra React section (app-specific settings). */
export function openReactSettingsDialog(extra: ReactNode, opts: Omit<SettingsDialogOptions, 'extra'> = {}): DialogHandle {
  const { host, unmount } = mountReact(extra);
  const handle = openSettingsDialog({ ...opts, extra: host });
  // if the dialog was already open, our host was not used
  if (!handle.el.contains(host)) unmount();
  else void handle.closed.then(unmount);
  return handle;
}

/** Alias matching matematika's local helper name. */
export const openSettingsWithExtra = openReactSettingsDialog;
