export type TabType = 'modeled-data' | 'raw-data' | 'data-completeness';

export interface Tab {
  id: TabType;
  label: string;
}

export interface GeographicOption {
  id: string;
  label: string;
  icon: string;
}

export interface DateRange {
  start: number;
  end: number;
}

export interface FilterState {
  modelCountType: 'strava' | 'cost-benefit';
  pedestrianChecked: boolean;
  bicyclistChecked: boolean;
  dateRange: [number, number];
  geographicLevel: string;
} 