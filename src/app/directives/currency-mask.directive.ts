import { Directive, HostListener, ElementRef, forwardRef, Input } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Directive({
  selector: '[appCurrencyMask]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyMaskDirective),
      multi: true,
    },
  ],
})
export class CurrencyMaskDirective implements ControlValueAccessor {
  @Input() allowNegative = false;
  @Input() maxValue?: number;

  private el: HTMLInputElement;
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {
    this.el = this.elementRef.nativeElement;
  }

  writeValue(value: any): void {
    this.formatValue(value);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.el.disabled = isDisabled;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    let cleanValue = value.replace(/[^\d,-]/g, '');

    const parts = cleanValue.split(',');
    if (parts.length > 2) {
      cleanValue = parts[0] + ',' + parts.slice(1).join('');
    }

    if (parts.length === 2 && parts[1].length > 2) {
      cleanValue = parts[0] + ',' + parts[1].substring(0, 2);
    }

    const numericValue = this.getNumericValue(cleanValue);

    if (this.maxValue && numericValue > this.maxValue) {
      this.formatValue(this.maxValue);
      this.onChange(this.maxValue);
      return;
    }

    if (!this.allowNegative && numericValue < 0) {
        this.formatValue(0);
        this.onChange(0);
        return;
    }

    this.el.value = cleanValue;
    this.onChange(numericValue);
  }

  @HostListener('blur')
  onBlur() {
    this.onTouched();
    this.formatValue(this.el.value);
  }

  @HostListener('focus')
  onFocus() {
    const numericValue = this.getNumericValue(this.el.value);
    if (numericValue === 0) {
      this.el.value = '';
    } else {
      this.el.value = this.formatNumberForEditing(numericValue);
    }
  }

  private formatValue(value: any) {
    if (value === null || value === undefined || value === '') {
        this.el.value = '';
        return;
    }

    let numericValue = typeof value === 'string' ? this.getNumericValue(value) : value;

    if (isNaN(numericValue)) {
        numericValue = 0;
    }

    this.el.value = this.formatAsCurrency(numericValue);
  }

  private formatNumberForEditing(value: number): string {
    if (value === 0) return '';
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).replace(/\R\$\s?/, '');
  }

  private formatAsCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private getNumericValue(value: string): number {
    if (!value) return 0;

    let cleanValue = value.replace(/[^\d,-]/g, '');
    
    if (this.allowNegative) {
        const negativeSignCount = (cleanValue.match(/-/g) || []).length;
        if (negativeSignCount > 1) {
            // Remove all but the first hyphen
            cleanValue = cleanValue.replace(/-/g, (match, offset) => offset > 0 ? '' : match);
        }
        if (cleanValue.indexOf('-') > 0) {
            // If hyphen is not at the beginning, remove it
            cleanValue = cleanValue.replace(/-/g, '');
        }
    }

    cleanValue = cleanValue.replace(',', '.');
    const numericValue = parseFloat(cleanValue);
    return isNaN(numericValue) ? 0 : numericValue;
  }
}
