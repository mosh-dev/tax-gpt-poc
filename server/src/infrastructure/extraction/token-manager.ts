import { encode } from 'gpt-tokenizer';

export interface TruncationOptions {
  preserveEnding?: boolean;
  truncationMarker?: string;
}

export interface TruncationResult {
  truncated: string | string[];
  originalTokens: number;
  finalTokens: number;
  wasTruncated: boolean;
}

export function countTokens(text: string): number {
  return encode(text).length;
}

export function truncateToTokenLimit(
  input: string | string[],
  maxTokens: number,
  options?: TruncationOptions
): TruncationResult {
  const { preserveEnding = false, truncationMarker = '\n\n[... truncated ...]' } = options || {};

  if (typeof input === 'string') {
    return truncateString(input, maxTokens, preserveEnding, truncationMarker);
  } else {
    return truncateStringArray(input, maxTokens, preserveEnding, truncationMarker);
  }
}

function truncateString(
  text: string,
  maxTokens: number,
  preserveEnding: boolean,
  truncationMarker: string
): TruncationResult {
  const originalTokens = countTokens(text);

  if (originalTokens <= maxTokens) {
    return {
      truncated: text,
      originalTokens,
      finalTokens: originalTokens,
      wasTruncated: false,
    };
  }

  const markerTokens = countTokens(truncationMarker);
  const targetTokens = maxTokens - markerTokens;

  if (targetTokens <= 0) {
    return {
      truncated: truncationMarker,
      originalTokens,
      finalTokens: markerTokens,
      wasTruncated: true,
    };
  }

  const truncatedText = binarySearchTruncate(text, targetTokens, preserveEnding);
  const result = preserveEnding
    ? truncationMarker + truncatedText
    : truncatedText + truncationMarker;

  return {
    truncated: result,
    originalTokens,
    finalTokens: countTokens(result),
    wasTruncated: true,
  };
}

function truncateStringArray(
  texts: string[],
  maxTokens: number,
  preserveEnding: boolean,
  truncationMarker: string
): TruncationResult {
  if (texts.length === 0) {
    return {
      truncated: [],
      originalTokens: 0,
      finalTokens: 0,
      wasTruncated: false,
    };
  }

  const originalTokens = texts.reduce((sum, text) => sum + countTokens(text), 0);

  if (originalTokens <= maxTokens) {
    return {
      truncated: texts,
      originalTokens,
      finalTokens: originalTokens,
      wasTruncated: false,
    };
  }

  const result: string[] = [];
  let currentTokens = 0;

  if (preserveEnding) {
    for (let i = texts.length - 1; i >= 0; i--) {
      const itemTokens = countTokens(texts[i]);

      if (currentTokens + itemTokens <= maxTokens) {
        result.unshift(texts[i]);
        currentTokens += itemTokens;
      } else {
        const remainingTokens = maxTokens - currentTokens;
        if (remainingTokens > countTokens(truncationMarker)) {
          const truncated = binarySearchTruncate(
            texts[i],
            remainingTokens - countTokens(truncationMarker),
            true
          );
          result.unshift(truncationMarker + truncated);
        } else {
          result.unshift(truncationMarker);
        }
        break;
      }
    }
  } else {
    for (let i = 0; i < texts.length; i++) {
      const itemTokens = countTokens(texts[i]);

      if (currentTokens + itemTokens <= maxTokens) {
        result.push(texts[i]);
        currentTokens += itemTokens;
      } else {
        const remainingTokens = maxTokens - currentTokens;
        if (remainingTokens > countTokens(truncationMarker)) {
          const truncated = binarySearchTruncate(
            texts[i],
            remainingTokens - countTokens(truncationMarker),
            false
          );
          result.push(truncated + truncationMarker);
        } else {
          result.push(truncationMarker);
        }
        break;
      }
    }
  }

  const finalTokens = result.reduce((sum, text) => sum + countTokens(text), 0);

  return {
    truncated: result,
    originalTokens,
    finalTokens,
    wasTruncated: true,
  };
}

function binarySearchTruncate(
  text: string,
  targetTokens: number,
  fromEnd: boolean
): string {
  if (targetTokens <= 0) return '';

  let left = 0;
  let right = text.length;
  let bestLength = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const candidate = fromEnd ? text.slice(-mid) : text.slice(0, mid);
    const tokens = countTokens(candidate);

    if (tokens <= targetTokens) {
      bestLength = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return fromEnd ? text.slice(-bestLength) : text.slice(0, bestLength);
}