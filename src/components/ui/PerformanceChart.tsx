'use client';

import React from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Trade } from '../../types';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartProps {
  trades: Trade[];
  height?: number;
}

// 1. CUMULATIVE EQUITY CURVE
export const EquityCurveChart: React.FC<ChartProps> = ({ trades, height = 240 }) => {
  // Sort trades by date (ascending) for equity curve
  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  
  let currentEquity = 10000; // starting default balance
  const labels = ['Start', ...sorted.map((t, idx) => `Trade ${idx + 1}`)];
  const dataPoints = [currentEquity, ...sorted.map(t => {
    currentEquity += t.pnl;
    return currentEquity;
  })];

  const data = {
    labels,
    datasets: [
      {
        label: 'Account Equity',
        data: dataPoints,
        fill: true,
        borderColor: '#6366f1', // Indigo
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        tension: 0.2,
        pointBackgroundColor: '#818cf8',
        pointBorderColor: '#0b0c10',
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0d0f17',
        titleColor: '#94a3b8',
        bodyColor: '#f1f3f9',
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', font: { size: 10 } },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
};

// 2. DAILY PNL GRAPH
export const DailyPnlChart: React.FC<ChartProps> = ({ trades, height = 240 }) => {
  // Group trades by date
  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  const pnlByDate: { [date: string]: number } = {};
  
  sorted.forEach(t => {
    pnlByDate[t.date] = (pnlByDate[t.date] || 0) + t.pnl;
  });

  const labels = Object.keys(pnlByDate).slice(-10); // last 10 days
  const values = labels.map(l => pnlByDate[l]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Daily PnL ($)',
        data: values,
        backgroundColor: values.map(v => v >= 0 ? 'rgba(8, 153, 129, 0.7)' : 'rgba(242, 54, 69, 0.7)'),
        borderColor: values.map(v => v >= 0 ? '#089981' : '#f23645'),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0d0f17',
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', font: { size: 10 } },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
};

// 3. DRAWDOWN CHART
export const DrawdownChart: React.FC<ChartProps> = ({ trades, height = 240 }) => {
  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  
  let currentBalance = 10000;
  let peak = 10000;
  const labels = ['Start', ...sorted.map((_, idx) => `T${idx + 1}`)];
  
  const drawdowns = [0];
  sorted.forEach(t => {
    currentBalance += t.pnl;
    if (currentBalance > peak) {
      peak = currentBalance;
    }
    const dd = peak > 0 ? ((peak - currentBalance) / peak) * 100 : 0;
    drawdowns.push(-dd); // negative representation
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Peak Drawdown (%)',
        data: drawdowns,
        fill: true,
        borderColor: '#f23645',
        backgroundColor: 'rgba(242, 54, 69, 0.05)',
        tension: 0.1,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#0b0c10',
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0d0f17',
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', font: { size: 10 } },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
};

// 4. WIN RATE ARC (DOUGHNUT)
export const WinRateChart: React.FC<ChartProps> = ({ trades, height = 180 }) => {
  const wins = trades.filter(t => t.status === 'Win').length;
  const losses = trades.filter(t => t.status === 'Loss').length;
  const be = trades.filter(t => t.status === 'Break Even').length;
  const open = trades.filter(t => t.status === 'Open').length;

  const data = {
    labels: ['Wins', 'Losses', 'Break Even', 'Open'],
    datasets: [
      {
        data: [wins, losses, be, open],
        backgroundColor: [
          '#089981', // Win
          '#f23645', // Loss
          '#787b86', // BE
          '#2962ff'  // Open
        ],
        borderColor: '#0d0f17',
        borderWidth: 2,
        hoverOffset: 4
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11, weight: 'bold' as any },
          boxWidth: 12,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: '#0d0f17',
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        padding: 12,
      }
    },
    cutout: '70%',
  };

  return (
    <div style={{ height }} className="relative flex items-center justify-center">
      <Doughnut data={data} options={options} />
    </div>
  );
};
