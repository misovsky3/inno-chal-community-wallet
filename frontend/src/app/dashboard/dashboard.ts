import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Account {
  name: string;
  iban: string;
  balance: string;
  chart: string;
}

interface DashboardMetric {
  title: string;
  amount: string;
  detail?: string;
  overdue?: string;
}

interface QuickAction {
  label: string;
  icon: 'scanner' | 'upload' | 'invoice' | 'pending';
  count?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly accounts: Account[] = [
    {
      name: 'Demo firemný účet',
      iban: 'SK98 1100 0000 0001 5000 0548',
      balance: '5 821,91',
      chart: 'M0 44 13 38 25 47 39 31 52 35 67 24 82 32 98 19 117 22',
    },
    {
      name: 'Demo rezervný účet',
      iban: 'SK98 1100 0000 0001 1242 6678',
      balance: '3 890,00',
      chart: 'M0 38 14 43 28 30 42 36 56 26 70 34 84 21 100 25 117 13',
    },
    {
      name: 'Demo prevádzkový účet',
      iban: 'SK98 1100 0000 0029 5621 7895',
      balance: '5 392,20',
      chart: 'M0 44 14 36 28 41 42 29 56 33 70 23 84 29 100 17 117 21',
    },
  ];

  readonly quickActions: QuickAction[] = [
    { label: 'Skener', icon: 'scanner' },
    { label: 'Nahrať doklad', icon: 'upload' },
    { label: 'Vystaviť faktúru', icon: 'invoice' },
    { label: 'Nespracované doklady', icon: 'pending', count: '12' },
  ];

  readonly documentMetrics: DashboardMetric[] = [
    { title: 'Vystavené faktúry', amount: '305 292,00', detail: '(12)' },
    { title: 'Prijaté faktúry', amount: '420 292,00', detail: '(12)', overdue: '3 po splatnosti' },
    { title: 'Nahraté bločky', amount: '5 292,00', detail: '(12)' },
  ];

  readonly vatMetrics: DashboardMetric[] = [
    { title: 'Na zaplatenie za uplynulý mesiac', amount: '1 637,60', detail: '1. - 31.10.2025' },
    { title: 'Očakávané DPH za aktuálny mesiac', amount: '1 813,92', detail: '1. - 17.11.2025' },
  ];

  readonly cardActions = ['Internetová platba', 'Benefity karty'];
}
