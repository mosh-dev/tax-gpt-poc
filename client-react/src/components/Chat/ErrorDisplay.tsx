/**
 * ErrorDisplay Component
 * Displays error messages in a modal
 */

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ErrorDisplayProps {
  error: string | null;
  onClose: () => void;
}

export default function ErrorDisplay({ error, onClose }: ErrorDisplayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Manage animation and mounting state
  useEffect(() => {
    if (error) {
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
      }, 300); // Match transition duration
      return () => clearTimeout(timeout);
    }
  }, [error]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 transition-all duration-300 ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-red-200 dark:border-red-800">
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400">Error</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
