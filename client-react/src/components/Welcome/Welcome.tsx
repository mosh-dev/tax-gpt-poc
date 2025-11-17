import ChatInput from '../Chat/ChatInput';

interface WelcomeProps {
  onStartChat: (message: string) => void;
  onSendMessage: (message: string, files: File[]) => void;
}

const starterPrompts = [
  {
    icon: '✨',
    title: 'Explain Tax calculation in simple terms',
  },
  {
    icon: '📊',
    title: 'Calculate my Tax with all the document required',
  },
  {
    icon: '💡',
    title: 'Advise me - How can I reduce my taxes effectively?',
  },
];

export default function Welcome({ onStartChat, onSendMessage }: WelcomeProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl w-full text-center">
        {/* Greeting */}
        <div className="mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hey, Mate!
          </h1>
          <p className="text-2xl text-gray-700">
            Let's plan your taxes <span className="text-primary-600 font-semibold">together</span>
          </p>
        </div>

        {/* Starter Prompts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {starterPrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onStartChat(prompt.title)}
              className="group relative bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-primary-500 hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl group-hover:bg-primary-50 transition-colors">
                  {prompt.icon}
                </div>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">
                  {prompt.title}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Message Input */}
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSendMessage={onSendMessage}
            disabled={false}
          />
        </div>
      </div>
    </div>
  );
}
