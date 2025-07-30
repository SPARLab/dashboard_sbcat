/**
 * Shared filtering utilities for building WHERE clauses and validation
 */

export class FilterUtilService {
  /**
   * Build WHERE clause for count types (bike, ped, e-bike)
   */
  static buildCountTypeWhereClause(countTypes: string[]): string {
    if (countTypes.length === 0) return "1=0"; // No results
    const conditions = countTypes.map(type => `count_type = '${type}'`);
    return `(${conditions.join(' OR ')})`;
  }

  /**
   * Build WHERE clause for date filtering
   */
  static buildDateWhereClause(
    dateRange: { start: Date; end: Date }, 
    dateField = 'date_time'
  ): string {
    const startMs = dateRange.start.getTime();
    const endMs = dateRange.end.getTime();
    return `${dateField} >= ${startMs} AND ${dateField} <= ${endMs}`;
  }

  /**
   * Build WHERE clause for source filtering (survey sources, incident sources)
   */
  static buildSourceWhereClause(sources: string[], sourceField = 'source'): string {
    if (sources.length === 0) return "1=1"; // All sources
    const conditions = sources.map(source => `${sourceField} = '${source}'`);
    return `(${conditions.join(' OR ')})`;
  }

  /**
   * Combine multiple WHERE conditions with AND
   */
  static combineWhereConditions(conditions: string[]): string {
    const validConditions = conditions.filter(c => c && c !== "1=1");
    if (validConditions.length === 0) return "1=1";
    return validConditions.join(' AND ');
  }

  /**
   * Validate date ranges against data source constraints
   */
  static validateDateRangeForDataSource(
    dateRange: { start: Date; end: Date },
    dataSource: 'dillon' | 'lily' | 'hosted-counts'
  ): { isValid: boolean; adjustedRange?: { start: Date; end: Date }; message?: string } {
    // TODO: Implement validation logic based on data source constraints
    // Dillon: 2019-2023, Lily: 2023 only, Hosted: 2012-present
    return { isValid: true };
  }

  /**
   * Handle special count rules (City SB video counts)
   */
  static applySpecialCountRules(
    whereClause: string, 
    source: string, 
    date: Date
  ): string {
    // TODO: Implement special rules for City SB video counts
    // Before 2020: bikes only counted when crossing crosswalk
    // Pedestrians only counted when crossing street
    return whereClause;
  }
}