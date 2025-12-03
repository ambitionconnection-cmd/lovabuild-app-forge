// Haptic feedback utility for mobile devices
// Uses the Web Vibration API (supported on Android, limited on iOS)

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const hapticPatterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [30, 50, 30],
  error: [50, 100, 50, 100, 50],
  selection: 5,
};

export const haptic = {
  /**
   * Trigger haptic feedback
   * @param style - The style of haptic feedback
   */
  trigger: (style: HapticStyle = 'light') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(hapticPatterns[style]);
      } catch (e) {
        // Silently fail if vibration is not supported
      }
    }
  },

  /**
   * Light tap feedback - for selections, toggles
   */
  light: () => haptic.trigger('light'),

  /**
   * Medium tap feedback - for button presses
   */
  medium: () => haptic.trigger('medium'),

  /**
   * Heavy tap feedback - for important actions
   */
  heavy: () => haptic.trigger('heavy'),

  /**
   * Success feedback - for completed actions
   */
  success: () => haptic.trigger('success'),

  /**
   * Warning feedback - for alerts
   */
  warning: () => haptic.trigger('warning'),

  /**
   * Error feedback - for errors
   */
  error: () => haptic.trigger('error'),

  /**
   * Selection feedback - for list selections
   */
  selection: () => haptic.trigger('selection'),

  /**
   * Check if haptics are supported
   */
  isSupported: () => typeof navigator !== 'undefined' && 'vibrate' in navigator,
};

export default haptic;
