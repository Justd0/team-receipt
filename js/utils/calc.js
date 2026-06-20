const CHARGE_PER_PERSON = 12000;

export function calculateDailyCharge(participantCount) {
  return participantCount * CHARGE_PER_PERSON;
}

export function calculateWeeklyReceiptTotal(receipts) {
  return receipts.reduce((sum, r) => sum + r.amount, 0);
}

export function calculateWeeklyChargeTotal(receipts) {
  return receipts.reduce((sum, r) => sum + calculateDailyCharge(r.participants.length), 0);
}
