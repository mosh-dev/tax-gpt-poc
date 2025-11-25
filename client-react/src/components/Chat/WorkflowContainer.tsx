/**
 * WorkflowContainer Component
 * Container wrapper for workflow step forms in chat
 */

import type { ReactNode } from 'react';

interface WorkflowContainerProps {
  children: ReactNode;
}

export default function WorkflowContainer({ children }: WorkflowContainerProps) {
  return (
    <div className="mb-6">
      <div className="max-w-full sm:max-w-xl md:max-w-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-sm shadow-gray-300/50 dark:shadow-gray-700/50 px-4 py-3 md:px-6 md:py-4">
        {children}
      </div>
    </div>
  );
}
