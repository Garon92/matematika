import { createRoot } from 'react-dom/client';
import { openSettingsDialog } from '../kit';

/** Kit settings dialog + app-specific React settings in its `extra` slot. */
export function openSettingsWithExtra(element: React.ReactNode) {
  const host = document.createElement('div');
  const root = createRoot(host);
  root.render(element);
  const handle = openSettingsDialog({ extra: host });
  void handle.closed.then(() => setTimeout(() => root.unmount(), 400));
  return handle;
}
