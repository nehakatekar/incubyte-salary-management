import { employeesUrl } from './links';

describe('employeesUrl', () => {
  it('links to the employee list filtered by the given values', () => {
    expect(employeesUrl({ country: 'India', jobTitle: 'Staff Engineer' })).toBe(
      '/employees?country=India&jobTitle=Staff+Engineer',
    );
  });

  it('leaves out filters that are not set', () => {
    expect(employeesUrl({ department: 'Sales', country: undefined })).toBe(
      '/employees?department=Sales',
    );
    expect(employeesUrl({})).toBe('/employees');
  });
});
