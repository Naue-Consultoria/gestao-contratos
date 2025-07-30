
import { Directive, HostListener, ElementRef, OnInit, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appCurrencyMask]',
  standalone: true,
})
export class CurrencyMaskDirective implements OnInit {
  private el: HTMLInputElement;

  constructor(
    private elementRef: ElementRef,
    @Optional() private ngControl: NgControl
  ) {
    this.el = this.elementRef.nativeElement;
  }

  ngOnInit() {
    if (this.ngControl?.control?.value) {
      this.format(String(this.ngControl.control.value));
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.format(value);
  }

  private format(value: string) {
    if (!this.ngControl?.control) {
      return;
    }

    if (!value) {
      this.ngControl.control.setValue(null);
      this.el.value = '';
      return;
    }

    let cleanValue = value.replace(/[^\d]/g, '');
    if (!cleanValue) {
      this.ngControl.control.setValue(null);
      this.el.value = '';
      return;
    }

    const numericValue = parseFloat(cleanValue) / 100;

    const formattedValue = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);

    this.ngControl.control.setValue(numericValue);
    this.el.value = formattedValue;
  }
}
