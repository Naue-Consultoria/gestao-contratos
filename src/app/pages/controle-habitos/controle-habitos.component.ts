import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { HabitoService } from '../../services/habito.service';

interface Habit {
  id?: number;
  name: string;
  goal: number;
  description: string;
  notes: string;
  statuses: string[];
}

interface HabitMonth {
  id?: number;
  user_id?: number;
  year: number;
  month: number;
  days: number;
  habits: Habit[];
}

@Component({
  selector: 'app-controle-habitos',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './controle-habitos.component.html',
  styleUrl: './controle-habitos.component.css'
})
export class ControleHabitosComponent implements OnInit {
  currentDays = 31;
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  habits: Habit[] = [];

  // Modal state
  showAddHabitModal = false;
  showCelebration = false;

  // Modal form data
  newHabitName = '';
  newHabitGoal = 20;
  newHabitDescription = '';

  // Celebration
  celebrationMessage = '';

  isLoading = false;
  isSaving = false;

  monthOptions = [
    { value: 31, label: 'Janeiro (31 dias)', index: 0 },
    { value: 28, label: 'Fevereiro (28 dias)', index: 1 },
    { value: 29, label: 'Fevereiro Bissexto (29 dias)', index: 1 },
    { value: 31, label: 'Março (31 dias)', index: 2 },
    { value: 30, label: 'Abril (30 dias)', index: 3 },
    { value: 31, label: 'Maio (31 dias)', index: 4 },
    { value: 30, label: 'Junho (30 dias)', index: 5 },
    { value: 31, label: 'Julho (31 dias)', index: 6 },
    { value: 31, label: 'Agosto (31 dias)', index: 7 },
    { value: 30, label: 'Setembro (30 dias)', index: 8 },
    { value: 31, label: 'Outubro (31 dias)', index: 9 },
    { value: 30, label: 'Novembro (30 dias)', index: 10 },
    { value: 31, label: 'Dezembro (31 dias)', index: 11 }
  ];

  motivationalMessages = [
    "Meta alcançada! Você está no caminho certo! 🌟",
    "Incrível! Continue assim! 💪",
    "Você é imparável! Parabéns! 🚀",
    "Excelente trabalho! Sua disciplina é inspiradora! ✨",
    "Meta atingida! Você está construindo hábitos incríveis! 🎯",
    "Uau! Consistência é a chave do sucesso! 🏆",
    "Objetivo conquistado! Você é demais! 🌈",
    "Fantástico! Sua dedicação está valendo a pena! 💚",
    "Meta cumprida! Continue nessa jornada incrível! 🎊",
    "Sensacional! Você está transformando sua vida! 🌺"
  ];

  constructor(
    private breadcrumbService: BreadcrumbService,
    private habitoService: HabitoService
  ) {}

  ngOnInit() {
    this.setBreadcrumb();
    this.loadHabits();
  }

  private setBreadcrumb() {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Controle de Hábitos' }
    ]);
  }

  get selectedMonthOption() {
    return this.monthOptions[this.currentMonth];
  }

  get periodDisplay(): string {
    const monthName = this.monthOptions[this.currentMonth].label.split(' ')[0];
    return `${monthName} de ${this.currentYear}`;
  }

  get dayNumbers(): number[] {
    return Array.from({ length: this.currentDays }, (_, i) => i + 1);
  }

  get statistics() {
    const totalHabits = this.habits.length;
    let completedGoals = 0;
    let totalDone = 0;
    const totalPossible = totalHabits * this.currentDays;

    this.habits.forEach(habit => {
      const doneCount = habit.statuses.filter(s => s === 'done').length;
      totalDone += doneCount;
      if (doneCount >= habit.goal) {
        completedGoals++;
      }
    });

    const completionRate = totalPossible > 0 ? ((totalDone / totalPossible) * 100).toFixed(1) : '0.0';

    return {
      totalHabits,
      completedGoals,
      totalDone,
      completionRate
    };
  }

  updateDays() {
    // Ajustar número de dias nos hábitos existentes
    this.habits.forEach(habit => {
      const currentLength = habit.statuses.length;

      if (currentLength > this.currentDays) {
        // Remover dias extras
        habit.statuses = habit.statuses.slice(0, this.currentDays);
      } else if (currentLength < this.currentDays) {
        // Adicionar dias vazios
        const missing = this.currentDays - currentLength;
        habit.statuses.push(...Array(missing).fill('empty'));
      }
    });
  }

  onMonthChange(monthIndex: number) {
    this.currentMonth = monthIndex;
    this.currentDays = this.monthOptions[monthIndex].value;
    this.updateDays();
    this.loadHabits(); // Carregar dados do novo mês
  }

  loadHabits() {
    this.isLoading = true;
    this.habitoService.getHabitsByMonth(this.currentYear, this.currentMonth + 1).subscribe({
      next: (data: HabitMonth | null) => {
        if (data && data.habits) {
          this.habits = data.habits;
          this.currentDays = data.days;

          // Garantir que todos os hábitos tenham o número correto de dias
          this.habits.forEach(habit => {
            if (!habit.statuses) {
              habit.statuses = Array(this.currentDays).fill('empty');
            } else if (habit.statuses.length !== this.currentDays) {
              const diff = this.currentDays - habit.statuses.length;
              if (diff > 0) {
                habit.statuses.push(...Array(diff).fill('empty'));
              } else {
                habit.statuses = habit.statuses.slice(0, this.currentDays);
              }
            }
          });
        } else {
          this.habits = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar hábitos:', error);
        this.habits = [];
        this.isLoading = false;
      }
    });
  }

  saveHabits() {
    this.isSaving = true;
    const habitMonth: HabitMonth = {
      year: this.currentYear,
      month: this.currentMonth + 1,
      days: this.currentDays,
      habits: this.habits
    };

    this.habitoService.saveHabits(habitMonth).subscribe({
      next: () => {
        this.isSaving = false;
        alert('✅ Dados salvos com sucesso!');
      },
      error: (error) => {
        console.error('Erro ao salvar hábitos:', error);
        this.isSaving = false;
        alert('❌ Erro ao salvar dados. Tente novamente.');
      }
    });
  }

  // Modal methods
  openAddHabitModal() {
    this.newHabitName = '';
    this.newHabitGoal = 20;
    this.newHabitDescription = '';
    this.showAddHabitModal = true;
  }

  closeAddHabitModal() {
    this.showAddHabitModal = false;
  }

  confirmAddHabit() {
    if (!this.newHabitName.trim()) {
      alert('Por favor, insira o nome do hábito!');
      return;
    }

    if (!this.newHabitGoal || this.newHabitGoal < 1) {
      alert('Por favor, insira uma meta válida!');
      return;
    }

    const newHabit: Habit = {
      name: this.newHabitName,
      goal: this.newHabitGoal,
      description: this.newHabitDescription,
      notes: '',
      statuses: Array(this.currentDays).fill('empty')
    };

    this.habits.push(newHabit);
    this.closeAddHabitModal();
  }

  deleteHabit(index: number) {
    if (confirm('Tem certeza que deseja excluir este hábito?')) {
      this.habits.splice(index, 1);
    }
  }

  toggleStatus(habit: Habit, dayIndex: number) {
    const currentStatus = habit.statuses[dayIndex];

    if (currentStatus === 'done') {
      habit.statuses[dayIndex] = 'not-done';
    } else if (currentStatus === 'not-done') {
      habit.statuses[dayIndex] = 'not-needed';
    } else if (currentStatus === 'not-needed') {
      habit.statuses[dayIndex] = 'empty';
    } else {
      habit.statuses[dayIndex] = 'done';
      this.checkGoalReached(habit);
    }
  }

  checkGoalReached(habit: Habit) {
    const doneCount = habit.statuses.filter(s => s === 'done').length;
    if (doneCount === habit.goal) {
      this.showCelebrationMessage(habit.name);
    }
  }

  showCelebrationMessage(habitName: string) {
    const randomMessage = this.motivationalMessages[
      Math.floor(Math.random() * this.motivationalMessages.length)
    ];
    this.celebrationMessage = `"${habitName}" - ${randomMessage}`;
    this.showCelebration = true;

    setTimeout(() => {
      this.showCelebration = false;
    }, 3000);
  }

  getHabitProgress(habit: Habit): number {
    const doneCount = habit.statuses.filter(s => s === 'done').length;
    return Math.min((doneCount / habit.goal) * 100, 100);
  }

  getHabitProgressText(habit: Habit): string {
    const doneCount = habit.statuses.filter(s => s === 'done').length;
    return `${doneCount}/${habit.goal}`;
  }

  isGoalReached(habit: Habit): boolean {
    const doneCount = habit.statuses.filter(s => s === 'done').length;
    return doneCount >= habit.goal;
  }

  resetMonth() {
    if (confirm('Tem certeza que deseja limpar todos os registros deste mês?')) {
      this.habits.forEach(habit => {
        habit.statuses = Array(this.currentDays).fill('empty');
      });
    }
  }

  exportData() {
    const habitMonth: HabitMonth = {
      year: this.currentYear,
      month: this.currentMonth + 1,
      days: this.currentDays,
      habits: this.habits
    };

    const json = JSON.stringify(habitMonth, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitos_${this.currentYear}_${this.currentMonth + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data: HabitMonth = JSON.parse(e.target.result);

        this.currentYear = data.year || this.currentYear;
        this.currentMonth = (data.month - 1) || 0;
        this.currentDays = data.days;
        this.habits = data.habits || [];

        this.updateDays();
        alert('✅ Dados carregados com sucesso!');
      } catch (error) {
        console.error('Erro ao carregar arquivo:', error);
        alert('❌ Erro ao carregar arquivo. Verifique o formato.');
      }
    };
    reader.readAsText(file);
  }
}
