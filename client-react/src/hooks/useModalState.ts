/**
 * useModalState Hook
 * Manages modal state (open/close and pending data)
 */

import { useState, useCallback, type SetStateAction } from 'react';
import type { TaxDataToolResult } from '../components/Chat/Chat.types';

export const useModalState = () => {
  const [state, setState] = useState({
    isOpen: false,
    pendingToolResult: null as TaxDataToolResult | null,
  });

  const setIsModalOpen = useCallback((isOpen: SetStateAction<boolean>) => {
    setState(prev => ({
      ...prev,
      isOpen: typeof isOpen === 'function' ? isOpen(prev.isOpen) : isOpen
    }));
  }, []);

  const setPendingToolResult = useCallback((result: SetStateAction<TaxDataToolResult | null>) => {
    setState(prev => ({
      ...prev,
      pendingToolResult: typeof result === 'function' ? result(prev.pendingToolResult) : result
    }));
  }, []);

  return {
    isModalOpen: state.isOpen,
    pendingToolResult: state.pendingToolResult,
    setIsModalOpen,
    setPendingToolResult,
  };
};
