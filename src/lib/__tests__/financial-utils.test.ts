import { describe, it, expect } from "vitest";
import {
  formatCents,
  formatCentsCompact,
  parseDollarsTocents,
  accountTypeLabel,
  investmentTypeLabel,
  ACCOUNT_TYPES,
  INVESTMENT_TYPES,
  RETIREMENT_PLAN_TYPES,
  PROPERTY_TYPES,
} from "@/lib/financial-utils";
import { calculateRetirementProjection } from "@/app/actions/financial";

describe("formatCents", () => {
  it("formats positive cents as USD currency", () => {
    expect(formatCents(150000)).toBe("$1,500.00");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats negative cents", () => {
    expect(formatCents(-42567)).toBe("-$425.67");
  });

  it("formats small amounts", () => {
    expect(formatCents(99)).toBe("$0.99");
  });

  it("formats large amounts", () => {
    expect(formatCents(100000000)).toBe("$1,000,000.00");
  });
});

describe("formatCentsCompact", () => {
  it("formats millions with M suffix", () => {
    expect(formatCentsCompact(150000000)).toBe("$1.5M");
  });

  it("formats thousands with k suffix", () => {
    expect(formatCentsCompact(250000)).toBe("$2.5k");
  });

  it("falls back to full format for small amounts", () => {
    expect(formatCentsCompact(4599)).toBe("$45.99");
  });

  it("handles negative amounts", () => {
    expect(formatCentsCompact(-500000)).toBe("-$5.0k");
  });

  it("handles zero", () => {
    expect(formatCentsCompact(0)).toBe("$0.00");
  });
});

describe("parseDollarsTocents", () => {
  it("converts dollar string to cents", () => {
    expect(parseDollarsTocents("15.99")).toBe(1599);
  });

  it("handles strings with dollar sign", () => {
    expect(parseDollarsTocents("$1,500.00")).toBe(150000);
  });

  it("handles empty string", () => {
    expect(parseDollarsTocents("")).toBe(0);
  });

  it("handles negative values", () => {
    expect(parseDollarsTocents("-42.50")).toBe(-4250);
  });

  it("rounds to nearest cent", () => {
    expect(parseDollarsTocents("10.999")).toBe(1100);
  });
});

describe("accountTypeLabel", () => {
  it("returns label for known type", () => {
    expect(accountTypeLabel("checking")).toBe("Checking");
    expect(accountTypeLabel("credit_card")).toBe("Credit Card");
    expect(accountTypeLabel("retirement_401k")).toBe("401(k)");
  });

  it("returns raw type for unknown type", () => {
    expect(accountTypeLabel("unknown_type")).toBe("unknown_type");
  });
});

describe("investmentTypeLabel", () => {
  it("returns label for known type", () => {
    expect(investmentTypeLabel("rsu")).toBe("RSU");
    expect(investmentTypeLabel("iso")).toBe("ISO");
    expect(investmentTypeLabel("etf")).toBe("ETF");
    expect(investmentTypeLabel("mutual_fund")).toBe("Mutual Fund");
  });

  it("returns raw type for unknown type", () => {
    expect(investmentTypeLabel("nft")).toBe("nft");
  });
});

describe("constant arrays", () => {
  it("ACCOUNT_TYPES has all expected types", () => {
    const values = ACCOUNT_TYPES.map((t) => t.value);
    expect(values).toContain("checking");
    expect(values).toContain("savings");
    expect(values).toContain("credit_card");
    expect(values).toContain("investment");
    expect(values).toContain("retirement_401k");
    expect(values).toContain("property");
    expect(values).toContain("loan");
  });

  it("INVESTMENT_TYPES includes equity compensation types", () => {
    const values = INVESTMENT_TYPES.map((t) => t.value);
    expect(values).toContain("rsu");
    expect(values).toContain("iso");
    expect(values).toContain("nso");
    expect(values).toContain("espp");
  });

  it("RETIREMENT_PLAN_TYPES has common plan types", () => {
    const values = RETIREMENT_PLAN_TYPES.map((t) => t.value);
    expect(values).toContain("401k");
    expect(values).toContain("roth_401k");
    expect(values).toContain("traditional_ira");
    expect(values).toContain("roth_ira");
  });

  it("PROPERTY_TYPES has expected types", () => {
    const values = PROPERTY_TYPES.map((t) => t.value);
    expect(values).toContain("primary");
    expect(values).toContain("rental");
    expect(values).toContain("vacation");
    expect(values).toContain("commercial");
  });
});

describe("calculateRetirementProjection", () => {
  it("projects growth over time with compound interest", () => {
    const result = calculateRetirementProjection({
      currentBalance: 100000,
      monthlyContribution: 1000,
      employerMatchPercent: 0,
      annualReturnPercent: 0.07,
      currentAge: 30,
      retirementAge: 60,
    });

    // After 30 years of $1k/month at 7%, should be well over $1M
    expect(result.projectedBalance).toBeGreaterThan(1000000);
    expect(result.yearlyProjections).toHaveLength(30);
  });

  it("returns empty projections when already at retirement age", () => {
    const result = calculateRetirementProjection({
      currentBalance: 500000,
      monthlyContribution: 0,
      employerMatchPercent: 0,
      annualReturnPercent: 0.07,
      currentAge: 65,
      retirementAge: 65,
    });

    expect(result.projectedBalance).toBe(500000);
    expect(result.yearlyProjections).toHaveLength(0);
  });

  it("includes employer match in contributions", () => {
    const withoutMatch = calculateRetirementProjection({
      currentBalance: 0,
      monthlyContribution: 1000,
      employerMatchPercent: 0,
      annualReturnPercent: 0.07,
      currentAge: 30,
      retirementAge: 60,
    });

    const withMatch = calculateRetirementProjection({
      currentBalance: 0,
      monthlyContribution: 1000,
      employerMatchPercent: 0.5, // 50% match
      annualReturnPercent: 0.07,
      currentAge: 30,
      retirementAge: 60,
    });

    expect(withMatch.projectedBalance).toBeGreaterThan(withoutMatch.projectedBalance);
  });

  it("provides inflation-adjusted values", () => {
    const result = calculateRetirementProjection({
      currentBalance: 100000,
      monthlyContribution: 500,
      employerMatchPercent: 0,
      annualReturnPercent: 0.07,
      currentAge: 30,
      retirementAge: 60,
      inflationRate: 0.03,
    });

    const lastYear = result.yearlyProjections[result.yearlyProjections.length - 1];
    // Inflation-adjusted should be less than nominal
    expect(lastYear.balanceInflationAdjusted).toBeLessThan(lastYear.balance);
  });

  it("yearly projections have sequential ages", () => {
    const result = calculateRetirementProjection({
      currentBalance: 50000,
      monthlyContribution: 500,
      employerMatchPercent: 0,
      annualReturnPercent: 0.07,
      currentAge: 25,
      retirementAge: 35,
    });

    expect(result.yearlyProjections).toHaveLength(10);
    expect(result.yearlyProjections[0].age).toBe(26);
    expect(result.yearlyProjections[9].age).toBe(35);
  });

  it("balances grow monotonically with positive returns", () => {
    const result = calculateRetirementProjection({
      currentBalance: 10000,
      monthlyContribution: 100,
      employerMatchPercent: 0,
      annualReturnPercent: 0.05,
      currentAge: 40,
      retirementAge: 50,
    });

    for (let i = 1; i < result.yearlyProjections.length; i++) {
      expect(result.yearlyProjections[i].balance).toBeGreaterThan(
        result.yearlyProjections[i - 1].balance
      );
    }
  });
});
