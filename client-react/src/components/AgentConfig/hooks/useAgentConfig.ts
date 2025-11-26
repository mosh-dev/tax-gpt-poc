/**
 * useAgentConfig Hook
 * Manages agent configuration state and operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiService } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';

export interface UseAgentConfigReturn {
  instructions: string;
  originalInstructions: string;
  loading: boolean;
  saving: boolean;
  lastUpdated: string | null;
  hasChanges: boolean;
  setInstructions: (instructions: string) => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
}

export function useAgentConfig(): UseAgentConfigReturn {
  const { showToast } = useToast();
  const [instructions, setInstructions] = useState('');
  const [originalInstructions, setOriginalInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await apiService.getAgentConfig();
      setInstructions(config.instructions);
      setOriginalInstructions(config.instructions);
      setLastUpdated(config.updatedAt);
    } catch (err: any) {
      showToast(err.message || 'Failed to load agent configuration', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const saveConfig = useCallback(async () => {
    try {
      setSaving(true);
      const config = await apiService.updateAgentConfig(instructions);
      setOriginalInstructions(config.instructions);
      setLastUpdated(config.updatedAt);
      showToast('System instructions saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save agent configuration', 'error');
    } finally {
      setSaving(false);
    }
  }, [instructions, showToast]);

  // Load config on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadConfig();
  }, [loadConfig]);

  const hasChanges = instructions !== originalInstructions;

  return {
    instructions,
    originalInstructions,
    loading,
    saving,
    lastUpdated,
    hasChanges,
    setInstructions,
    loadConfig,
    saveConfig,
  };
}
