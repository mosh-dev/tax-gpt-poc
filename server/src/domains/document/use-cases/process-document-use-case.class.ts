/**
 * Process Document Use Case
 * Handles OCR processing of uploaded documents
 */
import { IFileRepository } from '@infrastructure/database/mongodb/repositories/interfaces/file-repository.interface';
import { IOCRService } from '@infrastructure/interfaces/ocr-service.interface';
import { ProcessDocumentDTO, ProcessDocumentResultDTO } from '@domains/document/dtos/file-dto';
import { FileId } from '@domains/document/value-objects/file-id.class';

export class ProcessDocumentUseCase {
  constructor(
    private fileRepository: IFileRepository,
    private ocrService: IOCRService
  ) {}

  async execute(data: ProcessDocumentDTO): Promise<ProcessDocumentResultDTO> {
    // 1. Get file from repository
    const fileId = FileId.create(data.fileId);
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new Error(`File not found: ${data.fileId}`);
    }

    // 2. Check if already processed
    if (file.processed) {
      const extractedText = file.getExtractedText();
      if (extractedText) {
        return {
          fileId: file.id.value,
          originalName: file.metadata.originalName,
          extractedText,
          confidence: file.getOCRConfidence(),
          language: file.ocrResult?.language,
          wordCount: file.ocrResult?.wordCount,
          processingTime: file.ocrResult?.processingTime,
        };
      }
    }

    // 3. Process with OCR
    const ocrResult = await this.ocrService.processDocument(file.storedPath, {
      language: data.language,
      canton: data.canton,
      quality: data.quality || 'balanced',
    });

    // 4. Update file entity
    file.markAsProcessed(ocrResult);

    // 5. Persist updates
    await this.fileRepository.update(file);

    // 6. Return result
    return {
      fileId: file.id.value,
      originalName: file.metadata.originalName,
      extractedText: ocrResult.text,
      confidence: ocrResult.confidence,
      language: ocrResult.language,
      wordCount: ocrResult.wordCount,
      processingTime: ocrResult.processingTime,
    };
  }

  /**
   * Process multiple documents
   */
  async executeMultiple(documents: ProcessDocumentDTO[]): Promise<ProcessDocumentResultDTO[]> {
    const results: ProcessDocumentResultDTO[] = [];

    for (const doc of documents) {
      try {
        const result = await this.execute(doc);
        results.push(result);
      } catch (error: any) {
        console.error(`[ProcessDocumentUseCase] Failed to process ${doc.fileId}:`, error);
        // Continue processing other documents
      }
    }

    return results;
  }
}
