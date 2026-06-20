import { describe, it, expect } from 'vitest';
import {
  calculateDailyCharge,
  calculateWeeklyReceiptTotal,
  calculateWeeklyChargeTotal,
} from '../js/utils/calc.js';

describe('calculateDailyCharge', () => {
  it('4명이면 48,000원', () => {
    expect(calculateDailyCharge(4)).toBe(48000);
  });
  it('5명이면 60,000원', () => {
    expect(calculateDailyCharge(5)).toBe(60000);
  });
  it('0명이면 0원', () => {
    expect(calculateDailyCharge(0)).toBe(0);
  });
});

describe('calculateWeeklyReceiptTotal', () => {
  it('영수증 실금액 합산', () => {
    const receipts = [
      { amount: 45000 },
      { amount: 52000 },
      { amount: 61000 },
    ];
    expect(calculateWeeklyReceiptTotal(receipts)).toBe(158000);
  });
  it('빈 배열이면 0', () => {
    expect(calculateWeeklyReceiptTotal([])).toBe(0);
  });
});

describe('calculateWeeklyChargeTotal', () => {
  it('요일별 참여 인원 기준 청구 합산', () => {
    const receipts = [
      { participants: ['A', 'B', 'C', 'D'] },      // 4명 × 12,000 = 48,000
      { participants: ['A', 'B', 'C', 'D', 'E'] }, // 5명 × 12,000 = 60,000
    ];
    expect(calculateWeeklyChargeTotal(receipts)).toBe(108000);
  });
});
