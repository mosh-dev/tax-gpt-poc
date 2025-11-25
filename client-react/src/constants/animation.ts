/**
 * Animation Constants
 * Centralized timing values for animations and transitions
 */

/**
 * Animation durations in milliseconds
 */
export const ANIMATION_DURATION = {
  /** Modal enter/exit animations */
  MODAL: 300,
  /** Toast notifications */
  TOAST: 200,
  /** Quick fade effects */
  FADE: 150,
  /** Loading spinners and skeleton screens */
  SKELETON: 1500,
} as const;

/**
 * Tailwind CSS duration classes corresponding to ANIMATION_DURATION
 * Use these for consistent transition-duration classes
 */
export const ANIMATION_CLASS = {
  MODAL: 'duration-300',
  TOAST: 'duration-200',
  FADE: 'duration-150',
  SKELETON: 'duration-1500',
} as const;

/**
 * Auto-hide durations for notifications and messages (milliseconds)
 */
export const NOTIFICATION_DURATION = {
  /** Standard success messages */
  SUCCESS: 3000,
  /** Extended success messages (e.g., file uploads) */
  SUCCESS_LONG: 5000,
  /** Error messages */
  ERROR: 5000,
  /** Info messages */
  INFO: 3000,
} as const;

/**
 * Debounce delays in milliseconds
 */
export const DEBOUNCE_DELAY = {
  /** Input fields (search, filters) */
  INPUT: 300,
  /** Window resize events */
  RESIZE: 150,
  /** Scroll events */
  SCROLL: 100,
} as const;
