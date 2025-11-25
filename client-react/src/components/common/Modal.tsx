/**
 * Modal Component
 * Reusable modal with smooth animations
 */

import { useEffect, useState, type ReactNode } from 'react';
import { ANIMATION_DURATION, ANIMATION_CLASS } from '../../constants/animation';
import { Z_INDEX_CLASS } from '../../constants/zIndex';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Animated modal component with backdrop blur
 * Handles smooth enter/exit transitions
 */
export const Modal = ({ isOpen, onClose, children, className = '' }: ModalProps) => {
  function useModalAnimation(isOpen: boolean) {
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
      let timeoutId: number;

      if (isOpen) {
        // Mount the modal first
        setShouldRender(true);
        // Animate in on next frame
        requestAnimationFrame(() => setIsAnimating(true));
      } else if (shouldRender) {
        // Animate out
        setIsAnimating(false);
        // After animation, unmount
        timeoutId = setTimeout(() => setShouldRender(false), ANIMATION_DURATION.MODAL);
      }
      // Cleanup any pending timeout
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [isOpen, shouldRender]);

    return { shouldRender, isAnimating };
  }

  const { shouldRender, isAnimating } = useModalAnimation(isOpen);

  return shouldRender ? (
    <div
      className={`fixed inset-0 ${Z_INDEX_CLASS.MODAL} flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity ${ANIMATION_CLASS.MODAL} ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl transition-all ${ANIMATION_CLASS.MODAL} ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        } ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  ) : null;
};
