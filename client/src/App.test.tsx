import { screen } from '@testing-library/react';
import { App } from './App';
import { filterValues, mockApi, on, pageOf, renderWithProviders } from './test/utils';

describe('App', () => {
  it('opens on the employee list, with navigation to insights', async () => {
    mockApi(on('GET', '/employees', pageOf([])), on('GET', '/meta/filters', filterValues));

    renderWithProviders(<App />);

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('href', '/insights');
  });
});
