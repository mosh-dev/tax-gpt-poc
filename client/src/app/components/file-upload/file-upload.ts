import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { PDFExtraction } from '../../models/tax.model';

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUpload {
  @Output() pdfExtracted = new EventEmitter<PDFExtraction>();

  selectedFile: File | null = null;
  isUploading = false;
  error: string | null = null;
  extractionResult: PDFExtraction | null = null;

  constructor(private apiService: ApiService) {}

  /**
   * Handle file selection
   */
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.error = null;
      this.extractionResult = null;
    }
  }

  /**
   * Handle drag and drop
   */
  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
      this.error = null;
      this.extractionResult = null;
    }
  }

  /**
   * Prevent default drag behavior
   */
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Upload and extract PDF
   */
  async uploadPDF() {
    if (!this.selectedFile) {
      this.error = 'Please select a PDF file';
      return;
    }

    if (this.selectedFile.type !== 'application/pdf') {
      this.error = 'Please select a valid PDF file';
      return;
    }

    this.isUploading = true;
    this.error = null;

    try {
      const result = await this.apiService.uploadPDF(this.selectedFile).toPromise();

      if (result) {
        this.extractionResult = result;
        this.pdfExtracted.emit(result);

        if (!result.success) {
          this.error = result.error || 'Failed to extract PDF';
        }
      }
    } catch (err: any) {
      this.error = err.message || 'Failed to upload PDF';
      console.error('Upload error:', err);
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Clear selection
   */
  clearFile() {
    this.selectedFile = null;
    this.error = null;
    this.extractionResult = null;
  }
}
