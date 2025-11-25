export default function LoadingBubble() {
  return (
    <div className="flex mb-4 md:mb-6">
      <div
        className="max-w-full sm:max-w-xl md:max-w-2xl bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 md:px-6 md:py-4 shadow-sm shadow-gray-300/50 dark:shadow-gray-700/50">
        {/* Icon and title side by side */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 md:w-8 md:h-8 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 md:w-5 md:h-5">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
              <path d="M9 15c.5.5 1.5 1 3 1s2.5-.5 3-1" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round"/>
            </svg>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistant</div>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
               style={{animationDelay: '0ms'}}></div>
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
               style={{animationDelay: '150ms'}}></div>
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
               style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
    </div>
  );
}