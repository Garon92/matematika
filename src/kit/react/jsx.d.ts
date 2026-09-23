/**
 * TSX typings for g92 custom elements (React 19). Vendored only into React apps.
 * It is picked up automatically when src/kit/ is inside your tsconfig "include".
 *
 *   <g92-appbar app="anglictina" help ong92-help={() => setHelp(true)} />
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type G92AppbarAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  app: string;
  heading?: string;
  back?: string;
  'back-label'?: string;
  fullscreen?: boolean | string;
  help?: boolean;
  'no-sound'?: boolean;
  'no-settings'?: boolean;
  'no-accent'?: boolean;
  'no-activity'?: boolean;
  'no-theme-color'?: boolean;
  transparent?: boolean;
  /** global shortcuts M / F / ? */
  keys?: boolean;
  class?: string;
  /** React 19 attaches `on<event>` props of custom elements as event listeners */
  'ong92-help'?: (e: CustomEvent) => void;
  /** "Menu" pressed — preventDefault() to handle leaving yourself (or use guardLeave) */
  'ong92-back'?: (e: CustomEvent<{ href: string }>) => void;
  'ong92-settings'?: (e: CustomEvent) => void;
  'ong92-fullscreen'?: (e: CustomEvent<{ active: boolean }>) => void;
};

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'g92-appbar': G92AppbarAttributes;
    }
  }
}
