import { Directive, HostListener, ElementRef, forwardRef, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export class CurrencyMaskDirective implements ControlValueAccessor, OnChanges {
  @Input() allowNegative = false;
  @Input() maxValue?: number;
  @Input() currency: 'BRL' | 'USD' = 'BRL';

  private el: HTMLInputElement;
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private rawValue = '';

  constructor(private elementRef: ElementRef) {
    this.el = this.elementRef.nativeElement;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currency'] && !changes['currency'].firstChange) {
      // Re-format display when currency changes
      this.updateDisplay();
    }
  }

  writeValue(value: any): void {
    if (value === null || value === undefined || value === '' || value === 0) {
      this.rawValue = '';
      this.el.value = '';
      return;
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) {
      this.rawValue = '';
      this.el.value = '';
      return;
    }

    this.rawValue = Math.abs(numericValue * 100).toString();
    this.updateDisplay();
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
    let inputValue = input.value;

    // Extrair apenas números da entrada
    const numbersOnly = inputValue.replace(/\D/g, '');
    
    // Se não há números, resetar para vazio
    if (!numbersOnly) {
      this.rawValue = '';
      this.updateDisplay();
      this.onChange(0);
      return;
    }

    // Atualizar o valor bruto (sempre preenchendo da direita para esquerda)
    this.rawValue = numbersOnly;
    
    // Verificar limite máximo se definido
    const numericValue = this.getNumericValueFromRaw();
    if (this.maxValue && numericValue > this.maxValue) {
      this.rawValue = (this.maxValue * 100).toString();
    }

    this.updateDisplay();
    this.onChange(this.getNumericValueFromRaw());
  }

  @HostListener('blur')
  onBlur() {
    this.onTouched();
    // Manter sempre o formato com placeholder
    this.updateDisplay();
  }

  @HostListener('focus')
  onFocus() {
    // Manter sempre o formato com placeholder, sem mudanças no foco
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.rawValue) {
      this.el.value = '';
      return;
    }

    // Garantir que temos pelo menos 3 dígitos (para centavos)
    const paddedValue = this.rawValue.padStart(3, '0');

    // Separar inteiros e centavos
    const cents = paddedValue.slice(-2);
    let integerPart = paddedValue.slice(0, -2) || '0';

    // Remover zeros à esquerda
    integerPart = parseInt(integerPart).toString();

    // Formatar com separadores de milhar e montar valor final
    if (this.currency === 'USD') {
      // USD: $ 1,234.56
      const formattedInteger = this.addThousandsSeparator(integerPart, ',');
      this.el.value = `$ ${formattedInteger}.${cents}`;
    } else {
      // BRL: R$ 1.234,56
      const formattedInteger = this.addThousandsSeparator(integerPart, '.');
      this.el.value = `R$ ${formattedInteger},${cents}`;
    }
  }

  private addThousandsSeparator(value: string, separator: string): string {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }

  private getNumericValueFromRaw(): number {
    if (!this.rawValue) return 0;
    return parseInt(this.rawValue) / 100;
  }
}
