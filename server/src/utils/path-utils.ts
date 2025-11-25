/**
 * Path Utilities for ES Modules
 * Provides __dirname and __filename equivalents for ES modules
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Get __dirname equivalent in ES modules
 * @param importMetaUrl - Pass import.meta.url from the calling module
 * @returns Directory path of the calling module
 *
 * @example
 * const __dirname = getDirname(import.meta.url);
 */
export function getDirname(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl);
  return dirname(__filename);
}

/**
 * Get __filename equivalent in ES modules
 * @param importMetaUrl - Pass import.meta.url from the calling module
 * @returns File path of the calling module
 *
 * @example
 * const __filename = getFilename(import.meta.url);
 */
export function getFilename(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl);
}

/**
 * Get both __dirname and __filename in one call
 * @param importMetaUrl - Pass import.meta.url from the calling module
 * @returns Object with dirname and filename
 *
 * @example
 * const { dirname, filename } = getPathInfo(import.meta.url);
 */
export function getPathInfo(importMetaUrl: string): { dirName: string; fileName: string } {
  const fileName = fileURLToPath(importMetaUrl);
  return { dirName: dirname(fileName), fileName };
}
