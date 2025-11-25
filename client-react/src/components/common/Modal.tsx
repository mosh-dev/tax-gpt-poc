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
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Manage animation and mounting state
  useEffect(() => {
    if (isOpen) {
      // Mount and then animate in
      setShouldRender(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      // Animate out, then unmount after animation completes
      setIsAnimating(false);
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, ANIMATION_DURATION.MODAL);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
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
  );
};
