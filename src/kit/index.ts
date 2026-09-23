/**
 * g92 kit — barrel export. Importing it registers <g92-appbar> and applies settings to <html>.
 * CSS is separate: import './kit/kit.css' once in your entry.
 */
export { KIT_VERSION } from './version';
export { safeStorage, readJSON, writeJSON } from './storage';
export {
  settings,
  getSettings,
  getSettingsSnapshot,
  setSettings,
  subscribeSettings,
  reloadSettings,
  applySettings,
  resolvedTheme,
  prefersReducedMotion,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  type G92Settings,
  type ThemeSetting,
  type MotionSetting,
} from './settings';
export { createStore, type Store, type StoreOptions, type MigrationApi } from './store';
export {
  recordActivity,
  getActivity,
  clearActivity,
  recentApps,
  subscribeActivity,
  timeAgo,
  formatMetric,
  ACTIVITY_KEY,
  type ActivityEntry,
  type ActivityMap,
  type ActivityMetric,
  type ActivityUpdate,
} from './activity';
export { APPS, APP_BY_ID, ICONS, CATEGORY_LABELS, getApp, applyAccent, type G92App, type AppId, type AppCategory } from './apps';
export { sfx, play as playSfx, tone, unlockAudio, type SfxName, type ToneOptions } from './sfx';
export { h, starsHTML, plural, flash, bindRange, UI_ICONS, type UiIconName } from './dom';
export {
  openDialog,
  confirmDialog,
  alertDialog,
  openSettingsDialog,
  type DialogOptions,
  type DialogAction,
  type DialogHandle,
  type ConfirmOptions,
  type SettingsDialogOptions,
  type ButtonVariant,
} from './dialog';
export { toast, type ToastOptions, type ToastVariant } from './toast';
export { G92Appbar, defineAppbar } from './appbar';
