'use client';

import { createContext, useContext } from 'react';

/**
 * The report's state selector, shared with sections rendered as server-made slots inside the
 * report (the era sections), which cannot take it as a prop. Null = all states (the static HTML).
 */
export const ReportStateContext = createContext<string | null>(null);

export const useReportState = () => useContext(ReportStateContext);
