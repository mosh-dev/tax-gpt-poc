import { Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ToolbarProps {
  onToggleSidebar: () => void;
}

export default function Toolbar({ onToggleSidebar }: ToolbarProps) {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center px-4">
      <button
        onClick={onToggleSidebar}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>
      <h1
        className="ml-4 text-xl font-semibold text-gray-900 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigate('/')}
      >
        TaxGPT
      </h1>
    </header>
  );
}
