# January 2026 UI Refinements To-Do List

**Source:** Bike Maps: Annual Incidents Comparison feedback & UI review  
**Date Created:** 2026-01-13  
**Status:** Planning

---

## Quick Task Overview

**Overall Progress:** 1/12 tasks complete (1 flagged for removal)

- [x] **Task 1 (Priority 1):** Auto-select Santa Barbara County on Load - `COMPLETED`
- [ ] **Task 2 (Priority 1):** Restructure Sidebar: Remove "Analysis" Section & Consolidate Location Indicator - `NOT STARTED`
- [ ] **Task 3 (Priority 1):** Improve Year Toggle Clarity with Smart Defaults in Annual Incidents Comparison - `NOT STARTED`
- [ ] **Task 4 (Priority 1):** Add Chart Type Toggle (Line vs Bar) for Annual Incidents - `NOT STARTED`
- [ ] **Task 5 (Priority 2):** Fix Bottom Margin When "Time of Day" and "Weekdays vs. Weekends" Toggled Off - `NOT STARTED`
- [ ] **Task 6 (Priority 2):** Add "Infrastructure" and "Equity" Buttons with "Coming Soon" Functionality - `NOT STARTED`
- [ ] **Task 7 (Priority 2):** Add Header Theme Color Selector with Navy Blue Gradient (5+ options) - `NOT STARTED`
- [ ] **Task 8 (Priority 2):** Add Spatial Logo to About Page and Header - `NOT STARTED`
- [ ] **Task 9 (Priority 3):** Fix Annual Incidents Chart Y-Axis Positioning - `NOT STARTED`
- [ ] **Task 10 (Priority 3):** Fix Pedestrian Button in Conflict Type - `NOT STARTED` (verify if bug still exists)
- [ ] **Task 11 (Priority 3):** Update "Geographic Level" Label to "Select Geographic Level" - `NOT STARTED`
- [ ] **Task 12 (Priority 3):** Fix Incidents vs. Volumes Ratios Hover Alignment - `NOT STARTED`
- [ ] **Task 13 (Priority 3):** Add Time Frame Zoom Capability - `FLAGGED FOR REMOVAL` (may negatively impact UI)

---

## Priority 1: Safety App - Annual Incidents Comparison

### 1. Auto-select Santa Barbara County on Load
- [x] **Task:** Set the Analysis bar to automatically select "Santa Barbara County" on initial page load
- **Current Behavior:** Users must manually select a region
- **Expected Behavior:** SB County should be pre-selected, allowing immediate data display
- **Files Updated:** 
  - `ui/safety-app/SafetyApp.tsx` - Changed default `geographicLevel` from `'city-service-area'` to `'county'`
  - `lib/data-services/GeographicBoundariesService.ts` - Added failsafe logic to append " County" to area name
- **Assignee:** 
- **Priority:** High
- **Notes:** Implementation leveraged the existing `autoSelectSantaBarbaraCounty()` method in `GeographicBoundariesService` which is automatically triggered when `geographicLevel === 'county'`. Added failsafe to ensure LocationIndicator displays "Santa Barbara County" (not just "Santa Barbara").

---

### 2. Restructure Sidebar: Remove "Analysis" Section & Consolidate Location Indicator
- [ ] **Task:** Remove the old "safety-location-indicator" section from the sidebar
- [ ] **Task:** Move its contents (location indicator) into the "safety-analysis-title" box
- [ ] **Task:** Rename the ID from "safety-analysis-title" to "safety-location-indicator" (or similar semantic name)
- [ ] **Task:** Remove the "Analysis" title text from that box
- [ ] **Task:** Update location label from "Santa Barbara" to "Place: Santa Barbara County"
- [ ] **Task:** Preserve the height of the current "safety-analysis-title" box
- **Current Behavior:** 
  - Standalone "safety-location-indicator" section at top with "Analysis" label
  - Shows "Analysis Location: Santa Barbara" 
  - "Please select a region on the map" instruction text
  - Separate "safety-analysis-title" box below it
  - This creates redundant structure
- **Expected Behavior:**
  - Remove old "safety-location-indicator" section entirely
  - Repurpose the "safety-analysis-title" box to hold location indicator content
  - Rename its ID to "safety-location-indicator" (since it now holds location info, not an "Analysis" title)
  - **CRITICAL:** Maintain the same height as current "safety-analysis-title" (correctly aligned with map subheader)
  - Remove the "Analysis" title text
  - Display "Place: Santa Barbara County" (full county name)
  - Cleaner sidebar hierarchy without redundant labels
- **Files to Update:**
  - Safety App sidebar component structure
  - Potentially `ui/safety-app/SafetyApp.tsx` or related sidebar components
  - Location label text/formatting
  - Element ID attribute
- **Assignee:**
- **Priority:** High
- **Notes:** The current "safety-analysis-title" box height is correctly aligned with the map subheader - we must preserve this height in our new "safety-location-indicator" box. See screenshot for visual reference.

---

### 3. Improve Year Toggle Clarity with Smart Defaults
- [ ] **Task:** Implement smart default toggling for years to reduce visual noise
- [ ] **Task:** Add instructional text to make toggle functionality obvious
- **Current Issue:** 
  - Users may not realize years are toggleable
  - Too many lines (e.g., 10 years = 10 lines) creates noisy, hard-to-read charts
- **Implementation Strategy:**
  - **Default Behavior:** If there are more than 2 years available:
    - Toggle ON: First year and last year only
    - Toggle OFF: All middle years
  - Add label text: "Click year toggles to show additional years"
  - Users should still be able to toggle on all years if desired (not restricted)
- **Rationale:** 
  - First and last years give users a sense of the full time range
  - Cleaner initial visualization is easier to interpret
  - Clear instruction empowers users to explore additional years
- **Files to Update:**
  - Annual Incidents Comparison component
  - Year selection UI logic
  - Default state initialization for year toggles
- **Assignee:**
- **Priority:** Medium
- **Notes:**

---

### 4. Add Chart Type Toggle (Line vs Bar) for Annual Incidents
- [ ] **Task:** Add toggle switch to allow users to switch between line chart and bar chart views
- [ ] **Task:** Implement for Day, Month, and Year time aggregation views
- [ ] **Task:** Set appropriate default chart types for each view
- **Default Chart Types:**
  - **Year view:** Bar chart (default)
  - **Day view:** Line chart (default)
  - **Month view:** Line chart (default)
- **Functionality:**
  - Easy-to-use toggle control (e.g., button group, switch, or icon buttons)
  - Toggle should be clearly visible near the chart
  - Chart should smoothly transition when user switches types
  - Preserve user's selection when switching between time aggregations (optional enhancement)
- **Rationale:**
  - Different time scales benefit from different visualizations
  - User preference varies - giving choice improves UX
  - Bar charts can be clearer for year-over-year comparisons
  - Line charts better show trends over shorter time periods
- **Files to Update:**
  - Annual Incidents Comparison chart component
  - Chart configuration/rendering logic
  - UI controls for chart type selection
  - State management for selected chart type
- **Assignee:**
- **Priority:** Medium
- **Notes:**

---

## Priority 2: General Dashboard Enhancements

### 5. Fix Bottom Margin When "Time of Day" and "Weekdays vs. Weekends" Toggled Off
- [ ] **Task:** Reduce excessive bottom margin when both toggle sections are collapsed
- **Current Issue:**
  - When "Time of Day" and "Weekdays vs. Weekends" are toggled off, bottom margin is too large
  - Creates unnecessary whitespace
  - Makes UI feel unbalanced
- **Expected Behavior:**
  - Appropriate spacing when sections are collapsed
  - Clean, balanced layout regardless of toggle state
- **Files to Update:**
  - Safety App sidebar component
  - Toggle section styling/spacing
  - Potentially conditional margin logic
- **Assignee:**
- **Priority:** Medium
- **Notes:** Should adjust dynamically based on which sections are visible

---

### 6. Add "Infrastructure" and "Equity" Buttons with "Coming Soon" Functionality
- [ ] **Task:** Add "Infrastructure" button to header
- [ ] **Task:** Add "Equity" button to header
- [ ] **Task:** Add tooltip on hover showing "coming soon" message
- [ ] **Task:** Add modal popup on click with "coming soon" message
- **Location:** Header, to the right side
- **Implementation Details:**
  - Position buttons in header to the right
  - Hover: Display tooltip with "coming soon" or similar performant message
  - Click: Open modal popup displaying "coming soon!" message
  - Research best practices for tooltip/modal implementation when implementing
- **Files to Update:**
  - Header component
  - Modal component (may need to create)
  - Tooltip component or library
  - Potentially `ui/home/` or `ui/components/` 
- **Assignee:**
- **Priority:** Medium
- **Notes:** Research best tooltip library/approach before implementing

---

### 7. Add Header Theme Color Selector with Navy Blue Gradient
- [ ] **Task:** Implement navy blue gradient for header (default theme)
- [ ] **Task:** Add dropdown theme color selector to the left of "Safety"/"Infrastructure"/"Equity" page buttons
- [ ] **Task:** Create at least 5 different blue gradient options for selection
- **Design Requirements:**
  - **Primary Theme:** Navy blue gradient (dark blue at top → slightly lighter blue at bottom)
  - Color should feel trustworthy and professional
  - Smooth, subtle gradient (not jarring)
  - **Minimum 5 gradient options** for Lizzy to choose from
- **Theme Selector:**
  - Dropdown positioned to the left of main page navigation buttons
  - Allows users to select different theme colors for the header
  - Should persist selection (localStorage or similar)
- **Implementation Approach:**
  - Create at least 5 blue gradient variations to test
  - Make gradient customizable through theme system
  - Ensure accessibility (contrast ratios, readability)
- **Files to Update:**
  - Theme configuration (`ui/theme/` or similar)
  - Header component styles
  - Tailwind config (if using Tailwind gradients)
  - Theme selector dropdown component (may need to create)
- **Assignee:**
- **Priority:** Low
- **Notes:** Start with navy blue as primary, create at least 5 variations for dropdown selection. May still consult with Lizzy for final approval.

---

### 8. Add Spatial Logo
- [ ] **Task:** Add Spatial logo to About page
- [ ] **Task:** Add Spatial logo to header
- **Requirements:**
  - Obtain logo file from @Spatial branding
  - Ensure proper sizing and placement
  - Maintain accessibility (alt text)
- **Files to Update:**
  - About page component
  - Header component
  - Add logo file to `public/icons/` or similar
- **Assignee:**
- **Priority:** Low
- **Notes:**

---

## Priority 3: Bug Fixes & Minor Improvements

### 9. Fix Annual Incidents Chart Y-Axis Positioning
- [ ] **Task:** Fix y-axis label and line positioning to prevent chart width changes
- [ ] **Task:** Ensure consistent chart rendering regardless of number of years displayed
- **Current Issue:**
  - When there are many years on the chart, the y-axis label gets pushed to the right
  - Y-axis label sometimes gets cut off
  - Chart width shrinks and expands inconsistently ("willy nilly fashion")
  - Creates jarring visual experience when toggling years
- **Expected Behavior:**
  - Y-axis line and y-axis label render in exactly the same spot every time
  - Chart width remains constant regardless of data displayed
  - No label cutoff or positioning issues
- **Implementation Approach:**
  - Set fixed width/padding for y-axis area
  - Ensure label text doesn't overflow allocated space
  - May need to adjust chart container sizing logic
- **Files to Update:**
  - Annual Incidents Comparison chart component
  - Chart configuration (axis settings, padding)
  - Chart container styling
- **Assignee:**
- **Priority:** High
- **Notes:** This affects chart readability and professional appearance

---

### 10. Fix Pedestrian Button in Conflict Type
- [ ] **Task:** Debug and fix non-functional pedestrian button
- **Current Issue:** Pedestrian button in Conflict Type area is not working
- **Investigation Notes:**
  - Bug was not replicable in public version
  - Check latest codebase to see if already fixed
  - May be an intermittent issue or already resolved
- **Files to Investigate:**
  - Conflict Type filter component
  - Safety App filter handlers
  - Potentially `ui/safety-app/` components
- **Assignee:**
- **Priority:** High
- **Notes:** Verify if bug still exists in current codebase before proceeding. May already be resolved.

---

### 11. Update "Geographic Level" Label to "Select Geographic Level"
- [ ] **Task:** Change left sidebar label from "Geographic Level" to "Select Geographic Level"
- **Rationale:** More actionable, clearer instruction to users
- **Files to Update:**
  - Safety App left sidebar component
  - Potentially `ui/safety-app/` components or geographic level selection UI
- **Assignee:**
- **Priority:** Low
- **Notes:** Minor copy improvement for better UX

---

### 12. Fix Incidents vs. Volumes Ratios Hover Alignment
- [ ] **Task:** Fix hover color alignment for "Low", "Medium", and "High" labels
- **Current Issue:**
  - Hover colors over "Low", "Medium", and "High" are not perfectly aligned
  - May be zoom level or screen size dependent
- **Investigation Required:**
  - Test at different Google Chrome zoom levels
  - Test at different screen sizes/resolutions
  - Determine if issue is CSS-based or rendering-related
- **Files to Investigate:**
  - Incidents vs. Volumes Ratios component
  - Hover state styling
  - Potentially layout/alignment CSS
- **Assignee:**
- **Priority:** Medium
- **Notes:** User to investigate at different zoom levels and screen sizes before implementation

---

### 13. Add Time Frame Zoom Capability - **FLAGGED FOR POTENTIAL REMOVAL**
- [ ] **Task:** Add ability to zoom in on a specific time frame in the Annual Incidents chart
- **Functionality:**
  - Allow users to focus on subset of years (or days/months depending on view)
  - Could use range slider, brush selection, or zoom controls
  - Should work across different time aggregation views
- **Files to Update:**
  - Annual Incidents chart component
  - Chart interaction handlers
- **Assignee:**
- **Priority:** Low
- **Notes:** **⚠️ FLAGGED FOR REMOVAL** - This feature may negatively impact UI/UX. Not required for completion of this plan. May be revisited in future iterations if user feedback suggests value.

---

## Implementation Notes

### Testing Requirements
- All changes should include unit tests where applicable
- E2E tests for critical user flows (auto-selection, chart interactions)
- Visual regression testing for UI changes

### Accessibility Considerations
- Ensure all new buttons/controls are keyboard accessible
- Maintain proper ARIA labels
- Test with screen readers for any structural changes

### Documentation Updates
- Update relevant docs in `docs/` folder after implementation
- Add JSDoc comments for any new utility functions
- Update README if user-facing features change significantly

---

## ⚠️ IMPORTANT: Instructions for AI Assistants Working on This Plan

**Follow these steps when tackling ANY task from this plan:**

### Step 1: Gather Context
- **Read through the codebase** to understand the current implementation
- Search for relevant components, utilities, and related code
- Review existing patterns and conventions used in the project
- Identify dependencies and potential impact areas

### Step 2: Align Before Implementation
- **Ask clarifying questions** to ensure proper alignment with the user
- Confirm your understanding of:
  - The exact scope of the change
  - Expected behavior/outcomes
  - Which files will be modified
  - Any edge cases or considerations
- **Wait for user confirmation** before proceeding with implementation

### Step 3: Implement & Document
- Make the required changes
- Follow the project's coding standards and user rules
- Keep changes focused and atomic

### Step 4: Verification Protocol
- When implementation is complete, explicitly state:
  
  **"How to Manually Verify Completeness"**
  
  Then provide:
  - Clear step-by-step instructions for manual testing
  - Expected outcomes at each step
  - What to look for to confirm success
  - Any edge cases to test
  - Note: If manual verification is straightforward, avoid verbosity in this section.

### Step 5: Completion & Plan Update
- **Wait for user to something like:** "okay this task is complete"
- **Only then**, update this plan document:
  - Check off the completed task (change `[ ]` to `[x]`)
  - Update the task status from `NOT STARTED` to `COMPLETED`
  - Update the "Overall Progress" count at the top
  - Add any notes about implementation decisions for future reference
  - If needed, add context notes to related upcoming tasks so future AI assistants have necessary background
  - Finally, draft a commit message for the user to review. Expect the user to be in charge of
  commiting work, unless you are explicitly asked to perform a git commit.

### Step 6: Add Context for Future Tasks (When Needed)
- If your implementation affects other tasks in this plan, add notes to those tasks
- Document any patterns, utilities, or conventions that future AI agents should be aware of
- Flag any tasks that may no longer be relevant based on your changes
- The purpose of this section is to increase efficiency and minimize token usage without
witholding necessary context to allow the future AI agent to perform its tasks effectively.

---

## Changelog

| Date | Change | Notes |
|------|--------|-------|
| 2026-01-13 | Initial plan created | Based on PDF feedback and sidebar screenshot |
| 2026-01-13 | Task 1 completed | Auto-select Santa Barbara County on load - changed default geographicLevel to 'county' |

