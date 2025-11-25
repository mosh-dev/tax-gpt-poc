/**
 * useWorkflowState Hook
 * Manages workflow state (active workflow and submission status)
 */

import { useState, useCallback, type SetStateAction } from 'react';
import type { WorkflowStatus } from '../types/common.types';

export const useWorkflowState = () => {
  const [state, setState] = useState({
    active: null as WorkflowStatus | null,
    isSubmitting: false,
  });

  const setActiveWorkflow = useCallback((workflow: SetStateAction<WorkflowStatus | null>) => {
    setState(prev => ({
      ...prev,
      active: typeof workflow === 'function' ? workflow(prev.active) : workflow
    }));
  }, []);

  const setIsWorkflowSubmitting = useCallback((isSubmitting: SetStateAction<boolean>) => {
    setState(prev => ({
      ...prev,
      isSubmitting: typeof isSubmitting === 'function' ? isSubmitting(prev.isSubmitting) : isSubmitting
    }));
  }, []);

  return {
    activeWorkflow: state.active,
    isWorkflowSubmitting: state.isSubmitting,
    setActiveWorkflow,
    setIsWorkflowSubmitting,
    setWorkflowState: setState, // Expose full setState for bulk updates
  };
};
