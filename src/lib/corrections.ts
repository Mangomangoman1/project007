/**
 * Material corrections, newest first, listed on /corrections. Add one entry per correction that
 * changes a claim, a date, a figure or advice (not typos or wording). `date` is ISO (YYYY-MM-DD).
 */
export type Correction = { date: string; page: string; path: string; summary: string };

export const CORRECTIONS: Correction[] = [];
