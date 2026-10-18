import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { SORTABLE_FIELDS, type ListEmployeesParams, type SortField } from '../../api/types';

export const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

/** "ALL" is a UI-only value: the API treats a missing status as "any status". */
export type StatusFilter = 'ACTIVE' | 'TERMINATED' | 'ALL';

type Patch = Partial<
  Record<
    | 'page'
    | 'pageSize'
    | 'search'
    | 'country'
    | 'department'
    | 'jobTitle'
    | 'status'
    | 'sortBy'
    | 'sortDir',
    string
  >
>;

/**
 * List state (page, filters, sort) lives in the URL, so a filtered view can be
 * bookmarked or shared, and the back button behaves as expected.
 */
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = parseStatus(searchParams.get('status'));
  const params = useMemo<ListEmployeesParams>(() => {
    const pageSize = Number(searchParams.get('pageSize'));
    const sortBy = searchParams.get('sortBy') as SortField;
    return {
      page: Math.max(1, Number(searchParams.get('page')) || 1),
      pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
      search: searchParams.get('search') ?? undefined,
      country: searchParams.get('country') ?? undefined,
      department: searchParams.get('department') ?? undefined,
      jobTitle: searchParams.get('jobTitle') ?? undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      sortBy: SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'fullName',
      sortDir: searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc',
    };
  }, [searchParams, statusFilter]);

  /** Applies changes; anything other than paging sends the user back to page 1. */
  const update = useCallback(
    (patch: Patch) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    update({
      search: undefined,
      country: undefined,
      department: undefined,
      jobTitle: undefined,
      status: undefined,
    });
  }, [update]);

  const hasFilters = Boolean(
    params.search ||
    params.country ||
    params.department ||
    params.jobTitle ||
    statusFilter !== 'ACTIVE',
  );

  return { params, statusFilter, update, clearFilters, hasFilters };
}

/** HR mostly works with current staff, so the list defaults to active employees. */
function parseStatus(value: string | null): StatusFilter {
  return value === 'TERMINATED' || value === 'ALL' ? value : 'ACTIVE';
}
