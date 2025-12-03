import { useCallback } from 'react';
import haptic from '@/lib/haptics';

type FeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface UseTouchFeedbackOptions {
  type?: FeedbackType;
  disabled?: boolean;
}

/**
 * Hook to add haptic feedback to touch interactions
 */
export const useTouchFeedback = (options: UseTouchFeedbackOptions = {}) => {
  const { type = 'light', disabled = false } = options;

  const triggerFeedback = useCallback(() => {
    if (!disabled) {
      haptic.trigger(type);
    }
  }, [type, disabled]);

  const touchProps = {
    onTouchStart: triggerFeedback,
  };

  return {
    triggerFeedback,
    touchProps,
  };
};

export default useTouchFeedback;
