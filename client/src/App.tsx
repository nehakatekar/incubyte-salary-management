import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { EmptyState, LoadingState } from './components/PageStates';
import { EmployeeDetailPage } from './features/employees/EmployeeDetailPage';
import { EmployeeListPage } from './features/employees/EmployeeListPage';

// Charts are only needed on the insights page, so they load on first visit there.
const InsightsPage = lazy(() =>
  import('./features/insights/InsightsPage').then((module) => ({ default: module.InsightsPage })),
);

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/employees" replace />} />
        <Route path="employees" element={<EmployeeListPage />} />
        <Route path="employees/:id" element={<EmployeeDetailPage />} />
        <Route
          path="insights"
          element={
            <Suspense fallback={<LoadingState label="Loading insights…" />}>
              <InsightsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<EmptyState title="Page not found" />} />
      </Route>
    </Routes>
  );
}
