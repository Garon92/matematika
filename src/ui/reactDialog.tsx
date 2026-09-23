import { createRoot } from 'react-dom/client';
import { openDialog, openSettingsDialog, type DialogOptions } from '../kit';

/** Kit settings dialog + app-specific React settings in its `extra` slot. */
export function openSettingsWithExtra(element: React.ReactNode) {
  const host = document.createElement('div');
  const root = createRoot(host);
  root.render(element);
  const handle = openSettingsDialog({ extra: host });
  void handle.closed.then(() => setTimeout(() => root.unmount(), 400));
  return handle;
}

/** Kit dialog with React content; the content gets a `close` callback. */
export function openReactDialog(opts: Omit<DialogOptions, 'content'>, render: (close: (value?: string) => void) => React.ReactNode) {
  const host = document.createElement('div');
  const root = createRoot(host);
  const handle = openDialog({ ...opts, content: host });
  root.render(render((v) => handle.close(v)));
  void handle.closed.then(() => setTimeout(() => root.unmount(), 400));
  return handle;
}
