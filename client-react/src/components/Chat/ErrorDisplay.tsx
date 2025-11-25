/**
 * ErrorDisplay Component
 * Displays error messages in the chat interface
 */

interface ErrorDisplayProps {
  error: string | null;
}

export default function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="px-6 py-4 mb-20">
      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm max-w-4xl mx-auto">
        {JSON.stringify(error)}
      </div>
    </div>
  );
}
