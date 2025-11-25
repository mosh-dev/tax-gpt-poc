/**
 * Z-Index Constants
 * Centralized z-index values for consistent stacking order
 */

/**
 * Z-Index layers for UI elements
 * Higher values appear above lower values
 * Use these to maintain consistent stacking order across the app
 */
export const Z_INDEX = {
  /** Base content layer */
  BASE: 0,
  /** Dropdowns and popovers */
  DROPDOWN: 10,
  /** Sticky headers */
  STICKY: 20,
  /** Chat input and bottom bars */
  BOTTOM_BAR: 30,
  /** Sidebar overlay (mobile) */
  OVERLAY: 40,
  /** Sidebar (mobile) */
  SIDEBAR: 50,
  /** Toolbar / Top navigation */
  TOOLBAR: 50,
  /** Modals and dialogs */
  MODAL: 50,
} as const;

/**
 * Tailwind CSS z-index classes corresponding to Z_INDEX
 * Use these for consistent z-index classes
 */
export const Z_INDEX_CLASS = {
  BASE: 'z-0',
  DROPDOWN: 'z-10',
  STICKY: 'z-20',
  BOTTOM_BAR: 'z-30',
  OVERLAY: 'z-40',
  SIDEBAR: 'z-50',
  TOOLBAR: 'z-50',
  MODAL: 'z-50',
} as const;
