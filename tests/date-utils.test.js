import { describe, it, expect } from 'vitest';
import {
  getWeekRange,
  formatDate,
  getKoreanWeekday,
  getWeekLabel,
} from '../js/utils/date-utils.js';

describe('getWeekRange', () => {
  it('수요일 기준으로 해당 주 월~금 반환', () => {
    const wed = new Date('2026-06-17'); // 수요일
    const { monday, friday } = getWeekRange(wed);
    expect(formatDate(monday)).toBe('2026-06-15');
    expect(formatDate(friday)).toBe('2026-06-19');
  });
  it('월요일 기준 동일 주 반환', () => {
    const mon = new Date('2026-06-15');
    const { monday } = getWeekRange(mon);
    expect(formatDate(monday)).toBe('2026-06-15');
  });
  it('일요일은 다음 주가 아닌 이번 주 월요일 기준', () => {
    const sun = new Date('2026-06-14'); // 일요일
    const { monday } = getWeekRange(sun);
    expect(formatDate(monday)).toBe('2026-06-08');
  });
});

describe('getKoreanWeekday', () => {
  it('2026-06-15 → 월요일', () => {
    expect(getKoreanWeekday('2026-06-15')).toBe('월요일');
  });
  it('2026-06-19 → 금요일', () => {
    expect(getKoreanWeekday('2026-06-19')).toBe('금요일');
  });
});

describe('getWeekLabel', () => {
  it('레이블 형식 반환', () => {
    const monday = new Date('2026-06-15');
    const friday = new Date('2026-06-19');
    expect(getWeekLabel(monday, friday)).toBe('2026.06.15 ~ 06.19');
  });
});
