import { createRoot } from 'react-dom/client';
import { openDialog, openSettingsDialog, type DialogOptions } from '../kit';

/** Opens a kit dialog whose content is a React element. */
export function openReactDialog(opts: Omit<DialogOptions, 'content'>, element: React.ReactNode) {
  const host = document.createElement('div');
  const root = createRoot(host);
  root.render(element);
  const handle = openDialog({ ...opts, content: host });
  void handle.closed.then(() => setTimeout(() => root.unmount(), 400));
  return handle;
}

/** Kit settings dialog + app-specific React settings in the `extra` slot. */
export function openSettingsWithExtra(element: React.ReactNode) {
  const host = document.createElement('div');
  const root = createRoot(host);
  root.render(element);
  const handle = openSettingsDialog({ extra: host });
  void handle.closed.then(() => setTimeout(() => root.unmount(), 400));
  return handle;
}
