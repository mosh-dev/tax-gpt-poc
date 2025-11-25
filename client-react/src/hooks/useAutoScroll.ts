/**
 * useAutoScroll Hook
 * Automatically scrolls to a ref element when dependencies change
 */

import { useEffect, useRef } from 'react';

/**
 * Auto-scrolls to the bottom when dependencies change
 * @param dependencies - Array of values that trigger scroll when changed
 * @returns Ref to attach to the scroll target element
 */
export const useAutoScroll = <T extends HTMLElement = HTMLDivElement>(dependencies: any) => {
  const ref = useRef<T>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dependencies]);

  return ref;
};
