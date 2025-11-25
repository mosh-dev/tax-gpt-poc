import { OCRResultOne } from '@/types/ocr-result.types';

export interface OCROptions {
  language?: string;
  canton?: string;
  quality?: 'fast' | 'balanced' | 'accurate';
}

export interface IOCRService {
  processDocument(filePath: string, options?: OCROptions): Promise<OCRResultOne>;
  processMultiple(filePaths: string[], options?: OCROptions): Promise<OCRResultOne[]>;
  isSupported(mimeType: string): boolean;
}
