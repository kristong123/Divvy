import { KeyboardEvent as ReactKeyboardEvent, useEffect } from 'react';

/**
 * Prevents Enter key from triggering form submission when typing in input fields
 * @param e - React keyboard event
 */
export const preventEnterKeySubmission = (e: ReactKeyboardEvent): void => {
  if (e.key === 'Enter') {
    e.stopPropagation();
  }
};

/**
 * Handles Enter key press to trigger a callback function
 * @param e - Keyboard event
 * @param callback - Function to call when Enter is pressed
 * @param isDisabled - Optional flag to disable the callback
 * @param condition - Optional additional condition function
 */
export const handleEnterKeyPress = (
  e: KeyboardEvent,
  callback: () => void,
  isDisabled?: boolean,
  condition?: (e: KeyboardEvent) => boolean
): void => {
  if (e.key === 'Enter' && !isDisabled && (!condition || condition(e))) {
    callback();
  }
};

/**
 * Custom hook to add Enter key press handler to a component
 * @param isActive - Whether the handler should be active
 * @param callback - Function to call when Enter is pressed
 * @param isDisabled - Optional flag to disable the callback
 * @param condition - Optional additional condition function
 */
export const useEnterKeyHandler = (
  isActive: boolean,
  callback: () => void,
  isDisabled?: boolean,
  condition?: (e: KeyboardEvent) => boolean
): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isActive) {
        handleEnterKeyPress(e, callback, isDisabled, condition);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, callback, isDisabled, condition]);
}; 