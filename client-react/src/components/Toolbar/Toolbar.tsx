import { Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import type { MouseEvent } from 'react';
import { Z_INDEX_CLASS } from '../../constants/zIndex';

interface ToolbarProps {
  onToggleSidebar: () => void;
  onCloseSidebar?: () => void;
  isSidebarOpen?: boolean;
  isMobile?: boolean;
}

export default function Toolbar({ onToggleSidebar, onCloseSidebar, isSidebarOpen, isMobile }: ToolbarProps) {
  const navigate = useNavigate();

  const handleToolbarClick = () => {
    // Close sidebar when clicking on toolbar (except menu button) on mobile
    if (isMobile && isSidebarOpen && onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleTitleClick = (e: MouseEvent) => {
    e.stopPropagation();
    navigate('/');
    // Also close sidebar on mobile when navigating home
    if (isMobile && isSidebarOpen && onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleMenuClick = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleSidebar();
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${Z_INDEX_CLASS.TOOLBAR} flex items-center justify-between px-4`}
      onClick={handleToolbarClick}
    >
      <div className="flex items-center">
        <button
          onClick={handleMenuClick}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300"/>
        </button>
        <h1
          className="ml-4 text-xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleTitleClick}
        >
          TaxGPT
        </h1>
      </div>
      <ThemeToggle/>
    </header>
  );
}
