import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SwissTaxData } from '../../models/tax.model';

@Component({
  selector: 'app-tax-data-modal',
  imports: [CommonModule],
  templateUrl: './tax-data-modal.html',
  styleUrl: './tax-data-modal.scss',
})
export class TaxDataModal {
  @Input() isOpen = false;
  @Input() taxData: SwissTaxData | null = null;
  @Input() scenario: string = '';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return 'CHF 0';
    return `CHF ${amount.toLocaleString()}`;
  }
}
