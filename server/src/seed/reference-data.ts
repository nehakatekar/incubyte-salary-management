/**
 * Shape of the synthetic organisation. Base pay is a US-market annual salary
 * in USD; other countries are scaled by a cost-of-labour factor.
 */

export interface JobTitle {
  title: string;
  baseUsd: number;
  /** Relative headcount within its department. */
  weight: number;
}

export const DEPARTMENTS: Readonly<Record<string, readonly JobTitle[]>> = {
  Engineering: [
    { title: 'Software Engineer', baseUsd: 120_000, weight: 10 },
    { title: 'Senior Software Engineer', baseUsd: 160_000, weight: 6 },
    { title: 'Staff Engineer', baseUsd: 200_000, weight: 2 },
    { title: 'Engineering Manager', baseUsd: 190_000, weight: 2 },
    { title: 'QA Engineer', baseUsd: 95_000, weight: 3 },
    { title: 'DevOps Engineer', baseUsd: 130_000, weight: 2 },
  ],
  Product: [
    { title: 'Product Manager', baseUsd: 140_000, weight: 4 },
    { title: 'Senior Product Manager', baseUsd: 170_000, weight: 2 },
    { title: 'Product Designer', baseUsd: 115_000, weight: 3 },
  ],
  Sales: [
    { title: 'Sales Representative', baseUsd: 70_000, weight: 6 },
    { title: 'Account Executive', baseUsd: 95_000, weight: 4 },
    { title: 'Sales Manager', baseUsd: 130_000, weight: 1 },
  ],
  Marketing: [
    { title: 'Marketing Specialist', baseUsd: 75_000, weight: 4 },
    { title: 'Marketing Manager', baseUsd: 120_000, weight: 1 },
  ],
  Finance: [
    { title: 'Financial Analyst', baseUsd: 85_000, weight: 4 },
    { title: 'Finance Manager', baseUsd: 130_000, weight: 1 },
  ],
  'Human Resources': [
    { title: 'HR Generalist', baseUsd: 70_000, weight: 3 },
    { title: 'Recruiter', baseUsd: 75_000, weight: 3 },
    { title: 'HR Manager', baseUsd: 115_000, weight: 1 },
  ],
  'Customer Success': [
    { title: 'Support Specialist', baseUsd: 55_000, weight: 6 },
    { title: 'Customer Success Manager', baseUsd: 85_000, weight: 3 },
  ],
};

export const DEPARTMENT_WEIGHTS: Readonly<Record<string, number>> = {
  Engineering: 35,
  Product: 8,
  Sales: 18,
  Marketing: 8,
  Finance: 6,
  'Human Resources': 5,
  'Customer Success': 20,
};

export interface CountryProfile {
  /** Share of total headcount. */
  weight: number;
  /** Multiplier applied to US base pay. */
  payFactor: number;
}

export const COUNTRY_PROFILES: Readonly<Record<string, CountryProfile>> = {
  'United States': { weight: 30, payFactor: 1 },
  India: { weight: 25, payFactor: 0.3 },
  'United Kingdom': { weight: 12, payFactor: 0.75 },
  Germany: { weight: 10, payFactor: 0.8 },
  Canada: { weight: 8, payFactor: 0.82 },
  Netherlands: { weight: 5, payFactor: 0.78 },
  Australia: { weight: 5, payFactor: 0.85 },
  Singapore: { weight: 5, payFactor: 0.8 },
};
