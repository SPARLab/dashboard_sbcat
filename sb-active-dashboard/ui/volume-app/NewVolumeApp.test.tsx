import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewVolumeApp from './NewVolumeApp';

// Mock the complex components to focus on the prop flow bug we're testing
vi.mock('./components/map/NewVolumeMap', () => ({
  default: vi.fn((props) => (
    <div data-testid="volume-map">
      <span data-testid="map-selected-year">{props.selectedYear}</span>
      <span data-testid="map-model-type">{props.modelCountsBy}</span>
    </div>
  ))
}));

vi.mock('./layout/NewVolumeRightSidebar', () => ({
  default: vi.fn((props) => (
    <div data-testid="volume-right-sidebar">
      <span data-testid="sidebar-selected-year">{props.selectedYear}</span>
      <span data-testid="sidebar-active-tab">{props.activeTab}</span>
    </div>
  ))
}));

vi.mock('./layout/NewVolumeSubHeader', () => ({
  default: vi.fn(({ activeTab, onTabChange }) => (
    <div data-testid="volume-sub-header">
      <button 
        data-testid="modeled-data-tab"
        onClick={() => onTabChange('modeled-data')}
        className={activeTab === 'modeled-data' ? 'active' : ''}
      >
        Modeled Data
      </button>
    </div>
  ))
}));

vi.mock('../../lib/hooks/useSelection', () => ({
  useSelection: () => ({
    selectedGeometry: null,
    selectedAreaName: null,
    onSelectionChange: vi.fn()
  })
}));

describe('NewVolumeApp Year Selector Bug Prevention', () => {
  it('should prevent "onYearChange is not a function" error by ensuring prop flow', async () => {
    const user = userEvent.setup();
    
    // Capture any console errors
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<NewVolumeApp />);

    // Switch to Modeled Data tab to activate year selector
    await user.click(screen.getByTestId('modeled-data-tab'));

    // Find the year selector dropdown
    const yearDropdown = screen.getByDisplayValue('2023');
    expect(yearDropdown).toBeInTheDocument();

    // This should NOT throw "onYearChange is not a function" error
    fireEvent.change(yearDropdown, { target: { value: '2020' } });

    // Verify no errors were thrown
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('onYearChange is not a function')
    );

    // Verify the change was applied (state updated)
    expect((yearDropdown as HTMLSelectElement).value).toBe('2020');

    // Verify the map component received the updated year
    expect(screen.getByTestId('map-selected-year')).toHaveTextContent('2020');

    consoleError.mockRestore();
  });

  it('should pass selectedYear prop to both map and sidebar components by default', () => {
    render(<NewVolumeApp />);
    
    // Map should receive the default selectedYear (2023)
    expect(screen.getByTestId('map-selected-year')).toHaveTextContent('2023');
    
    // Sidebar should also receive the selectedYear prop
    expect(screen.getByTestId('sidebar-selected-year')).toHaveTextContent('2023');
  });

  it('should show year selector in modeled data tab', async () => {
    const user = userEvent.setup();
    render(<NewVolumeApp />);

    // Switch to modeled data tab
    await user.click(screen.getByTestId('modeled-data-tab'));

    // Year selector should be visible
    expect(screen.getByText('Model Year')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2023')).toBeInTheDocument();
  });

  it('should update map when year changes', async () => {
    const user = userEvent.setup();
    render(<NewVolumeApp />);

    // Switch to modeled data tab
    await user.click(screen.getByTestId('modeled-data-tab'));

    // Change year
    const yearSelect = screen.getByDisplayValue('2023');
    await user.selectOptions(yearSelect, '2019');

    // Both map and sidebar should receive updated year
    expect(screen.getByTestId('map-selected-year')).toHaveTextContent('2019');
    expect(screen.getByTestId('sidebar-selected-year')).toHaveTextContent('2019');
  });

  it('should have working onYearChange function for all available years', async () => {
    const user = userEvent.setup();
    render(<NewVolumeApp />);

    // Switch to modeled data tab
    await user.click(screen.getByTestId('modeled-data-tab'));

    const yearSelect = screen.getByDisplayValue('2023');
    
    // Test all available years (Cost Benefit Tool: 2019-2023)
    const years = ['2019', '2020', '2021', '2022', '2023'];
    
    for (const year of years) {
      await user.selectOptions(yearSelect, year);
      expect((yearSelect as HTMLSelectElement).value).toBe(year);
      expect(screen.getByTestId('map-selected-year')).toHaveTextContent(year);
      expect(screen.getByTestId('sidebar-selected-year')).toHaveTextContent(year);
    }
  });
});