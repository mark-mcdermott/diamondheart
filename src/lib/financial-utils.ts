export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(dollars);
}

export function formatCentsCompact(cents: number): string {
  const dollars = Math.abs(cents / 100);
  const sign = cents < 0 ? "-" : "";
  if (dollars >= 1_000_000) {
    return `${sign}$${(dollars / 1_000_000).toFixed(1)}M`;
  }
  if (dollars >= 1_000) {
    return `${sign}$${(dollars / 1_000).toFixed(1)}k`;
  }
  return formatCents(cents);
}

export function parseDollarsTocents(dollars: string): number {
  const cleaned = dollars.replace(/[^0-9.-]/g, "");
  return Math.round(parseFloat(cleaned || "0") * 100);
}

export const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "investment", label: "Investment" },
  { value: "retirement_401k", label: "401(k)" },
  { value: "retirement_ira", label: "IRA" },
  { value: "property", label: "Property" },
  { value: "loan", label: "Loan" },
  { value: "other", label: "Other" },
] as const;

export const INVESTMENT_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "rsu", label: "RSU" },
  { value: "iso", label: "ISO" },
  { value: "nso", label: "NSO" },
  { value: "espp", label: "ESPP" },
  { value: "crypto", label: "Crypto" },
  { value: "bond", label: "Bond" },
  { value: "other", label: "Other" },
] as const;

export const RETIREMENT_PLAN_TYPES = [
  { value: "401k", label: "401(k)" },
  { value: "roth_401k", label: "Roth 401(k)" },
  { value: "traditional_ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "sep_ira", label: "SEP IRA" },
  { value: "simple_ira", label: "SIMPLE IRA" },
  { value: "403b", label: "403(b)" },
  { value: "457b", label: "457(b)" },
  { value: "pension", label: "Pension" },
] as const;

export const PROPERTY_TYPES = [
  { value: "primary", label: "Primary Residence" },
  { value: "rental", label: "Rental Property" },
  { value: "vacation", label: "Vacation Home" },
  { value: "commercial", label: "Commercial" },
] as const;

export function accountTypeLabel(type: string): string {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function investmentTypeLabel(type: string): string {
  return INVESTMENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function calculateRetirementProjection(params: {
  currentBalance: number;
  monthlyContribution: number;
  employerMatchPercent: number;
  annualReturnPercent: number;
  currentAge: number;
  retirementAge: number;
  inflationRate?: number;
}) {
  const {
    currentBalance,
    monthlyContribution,
    employerMatchPercent,
    annualReturnPercent,
    currentAge,
    retirementAge,
    inflationRate = 0.03,
  } = params;

  const yearsToRetirement = retirementAge - currentAge;
  if (yearsToRetirement <= 0) return { projectedBalance: currentBalance, yearlyProjections: [] };

  const monthlyReturn = annualReturnPercent / 12;
  const totalMonthlyContribution = monthlyContribution * (1 + employerMatchPercent);

  let balance = currentBalance;
  const yearlyProjections: Array<{ age: number; balance: number; balanceInflationAdjusted: number }> = [];

  for (let year = 1; year <= yearsToRetirement; year++) {
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyReturn) + totalMonthlyContribution;
    }
    const inflationAdjusted = balance / Math.pow(1 + inflationRate, year);
    yearlyProjections.push({
      age: currentAge + year,
      balance: Math.round(balance * 100) / 100,
      balanceInflationAdjusted: Math.round(inflationAdjusted * 100) / 100,
    });
  }

  return {
    projectedBalance: Math.round(balance * 100) / 100,
    yearlyProjections,
  };
}
