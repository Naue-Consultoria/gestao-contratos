import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-page.html',
  styleUrls: ['./reports-page.css']
})
export class ReportsPage {
  @Input() currentPerformanceYear = 2024;
  
  @Output() generateReport = new EventEmitter<string>();
  @Output() updatePerformanceChart = new EventEmitter<number>();

  onGenerateReport(type: string) {
    this.generateReport.emit(type);
  }

  onUpdateChart(year: number) {
    this.currentPerformanceYear = year;
  }
}