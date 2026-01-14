# January 2026 UI Refinements To-Do List

**Source:** Bike Maps: Annual Incidents Comparison feedback & UI review  
**Date Created:** 2026-01-13  
**Status:** Planning

---

## Quick Task Overview

**Overall Progress:** 8/13 tasks complete (1 flagged for removal)

- [x] **Task 1 (Priority 1):** Auto-select Santa Barbara County on Load - `COMPLETED`
- [x] **Task 2 (Priority 1):** Restructure Sidebar: Remove "Analysis" Section & Consolidate Location Indicator - `COMPLETED`
- [x] **Task 3 (Priority 1):** Improve Year Toggle Clarity with Smart Defaults in Annual Incidents Comparison - `COMPLETED`
- [x] **Task 4 (Priority 1):** Add Chart Type Toggle (Line vs Bar) for Annual Incidents - `COMPLETED`
- [x] **Task 5 (Priority 2):** Fix Bottom Margin When "Time of Day" and "Weekdays vs. Weekends" Toggled Off - `COMPLETED`
- [x] **Task 6 (Priority 2):** Add "Infrastructure" and "Equity" Buttons with "Coming Soon" Functionality - `COMPLETED`
- [x] **Task 7 (Priority 2):** Add Header Theme Color Selector with Navy Blue Gradient (5+ options) - `COMPLETED`
- [ ] **Task 8 (Priority 2):** Add Spatial Logo to About Page and Header - `NOT STARTED`
- [ ] **Task 9 (Priority 3):** Fix Annual Incidents Chart Y-Axis Positioning - `NOT STARTED`
- [ ] **Task 10 (Priority 3):** Fix Pedestrian Button in Conflict Type - `NOT STARTED` (verify if bug still exists)
- [ ] **Task 11 (Priority 3):** Update "Geographic Level" Label to "Select Geographic Level" - `NOT STARTED`
- [ ] **Task 12 (Priority 3):** Fix Incidents vs. Volumes Ratios Hover Alignment - `NOT STARTED`
- [x] **Task 13 (Priority 3):** Fix Initial Modal Top Positioning (White Gap Below Header) - `COMPLETED`
- [ ] **Task 14 (Priority 3):** Add Time Frame Zoom Capability - `FLAGGED FOR REMOVAL` (may negatively impact UI)

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
- [x] **Task:** Remove the old "safety-location-indicator" section from the sidebar
- [x] **Task:** Move its contents (location indicator) into the "safety-analysis-title" box
- [x] **Task:** Rename the ID from "safety-analysis-title" to "safety-location-indicator" (or similar semantic name)
- [x] **Task:** Remove the "Analysis" title text from that box
- [x] **Task:** Update location label from "Santa Barbara" to "Place: Santa Barbara County"
- [x] **Task:** Preserve the height of the current "safety-analysis-title" box
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
- **Files Updated:**
  - `ui/safety-app/layout/SafetyRightSidebar.tsx` - Removed separate "Analysis" header and `LocationIndicator` import, consolidated into single location indicator header with id `safety-location-indicator`
  - Icon size: `w-6 h-6` (24px)
  - Font size: `text-lg` (18px)
  - Padding: `py-[1.08rem]` for height alignment
  - Bottom divider only (no top divider)
  - No "Place:" prefix - just shows area name with location pin icon
- **Assignee:**
- **Priority:** High
- **Notes:** The consolidated location indicator now serves as the primary header for the right sidebar. The LocationIndicator component remains unchanged for use in the volume app. Icon and text are larger and more prominent than before for better visibility.

---

### 3. Improve Year Toggle Clarity with Smart Defaults
- [x] **Task:** Implement smart default toggling for years to reduce visual noise
- [x] **Task:** Add instructional text to make toggle functionality obvious
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
- **Files Updated:**
  - `ui/safety-app/components/right-sidebar/AnnualIncidentsComparison.tsx` - Added `selectedYears` state to track legend visibility, implemented smart defaults via useEffect that applies first/last year logic for Day/Month views with >2 years, added `legendselectchanged` event handler to sync state with ECharts, and added subtle hint text "Click year toggles to show additional years" that appears only when years are hidden
- **Assignee:**
- **Priority:** High
- **Notes:** Smart defaults apply differently based on time scale:
  - **Year view:** All years visible by default (no smart filtering)
  - **Day/Month views with ≤2 years:** All years visible
  - **Day/Month views with >2 years:** Only first and last year visible, middle years hidden
  - Smart defaults reset when filters or geography changes (via cacheKey dependency)
  - Users can freely toggle any year on/off via ECharts legend interaction
  - Hint text only appears when at least one year is hidden

---

### 4. Add Chart Type Toggle (Line vs Bar) for Annual Incidents
- [x] **Task:** Add toggle switch to allow users to switch between line chart and bar chart views
- [x] **Task:** Implement for Day, Month, and Year time aggregation views
- [x] **Task:** Set appropriate default chart types for each view
- **Default Chart Types:**
  - **Year view:** Bar chart (default)
  - **Day view:** Line chart (default)
  - **Month view:** Line chart (default)
- **Functionality:**
  - Easy-to-use toggle control (e.g., button group, switch, or icon buttons)
  - Toggle should be clearly visible near the chart
  - Chart should smoothly transition when user switches types
  - ~~Preserve user's selection when switching between time aggregations (optional enhancement)~~ Not implemented - always resets to smart defaults
- **Rationale:**
  - Different time scales benefit from different visualizations
  - User preference varies - giving choice improves UX
  - Bar charts can be clearer for year-over-year comparisons
  - Line charts better show trends over shorter time periods
- **Files Updated:**
  - `ui/safety-app/components/right-sidebar/AnnualIncidentsComparison.tsx` - Added `chartType` state with smart defaults, icon toggle buttons for line/bar chart selection, updated series generation to respect `chartType` instead of `timeScale`
- **Assignee:**
- **Priority:** Medium
- **Notes:** Toggle buttons positioned to the right of Day/Month/Year buttons. Chart type always resets to smart defaults when switching time scales (Year→bar, Day/Month→line). Line and bar icons provide clear visual indication of chart type.

---

## Priority 2: General Dashboard Enhancements

### 5. Fix Bottom Margin When "Time of Day" and "Weekdays vs. Weekends" Toggled Off
- [x] **Task:** Reduce excessive bottom margin when both toggle sections are collapsed
- **Current Issue:**
  - When "Time of Day" and "Weekdays vs. Weekends" are toggled off, bottom margin is too large
  - Creates unnecessary whitespace
  - Makes UI feel unbalanced
- **Expected Behavior:**
  - Appropriate spacing when sections are collapsed
  - Clean, balanced layout regardless of toggle state
- **Files Updated:**
  - `ui/safety-app/components/left-sidebar/SafetyFilterPanel.tsx` - Made `mb-3` margin conditional on toggle state for both `TimeOfDaySection` and `WeekdaysWeekendsSection` title elements
  - When enabled: `mb-3` added to create space between header and options
  - When disabled: `mb-3` removed to eliminate unnecessary whitespace
- **Assignee:**
- **Priority:** Medium
- **Notes:** The `mb-3` margin is now conditionally applied to the `<h3>` title elements (`safety-time-of-day-title` and `safety-weekdays-weekends-title`) based on each section's enabled state, reducing approximately 24px of unnecessary whitespace when both sections are collapsed.

---

### 6. Add "Infrastructure" and "Equity" Buttons with "Coming Soon" Functionality
- [x] **Task:** Add "Infrastructure" button to header
- [x] **Task:** Add "Equity" button to header
- [x] **Task:** Add modal popup on click with "coming soon" message
- **Location:** Header, to the right side
- **Implementation Details:**
  - Position buttons in header to the right (after Safety and Volume)
  - Click: Open modal popup displaying "Coming Soon!" message
  - Uses existing `DisclaimerModal` component for consistent styling
- **Files Updated:**
  - `ui/dashboard/Header.tsx` - Added TypeScript interfaces, coming soon button logic with muted styling (gray-400 text color), modal integration using `DisclaimerModal`
  - `ui/dashboard/DashboardLayout.tsx` - Added Infrastructure and Equity to apps array with `comingSoon: true`, made Volume show "coming soon" by default (removed unless `showVolumePage` feature flag is enabled)
- **Assignee:**
- **Priority:** Medium
- **Notes:** Modal-only approach (no tooltip). Coming soon buttons use subtle visual styling (muted gray text, light hover) to distinguish from active nav buttons. Button order: Safety | Volume | Infrastructure | Equity. Volume also shows "Coming Soon" unless feature flag enables it.

---

### 7. Add Header Theme Color Selector with Navy Blue Gradient
- [x] **Task:** Implement navy blue gradient for header (default theme)
- [x] **Task:** Add dropdown theme color selector to the left of "Safety"/"Infrastructure"/"Equity" page buttons
- [x] **Task:** Create at least 5 different blue gradient options for selection
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
- **Files Updated:**
  - `ui/theme/headerThemes.ts` - Created theme definitions with 7 gradient options (Dodger Blue, Navy Classic, Ocean Depth, Slate Steel, Midnight Blue, Royal Blue, Pacific)
  - `ui/dashboard/HeaderThemeSelector.tsx` - Created frosted-glass themed dropdown component with color swatch previews, checkmark indicators, and click-outside detection
  - `ui/dashboard/Header.tsx` - Migrated from MUI to pure Tailwind/HTML, applied gradient backgrounds, updated nav buttons to white solid backgrounds with consistent 8px/16px padding
- **Assignee:**
- **Priority:** Low
- **Notes:** Default theme set to "Ocean Depth" (dark blue gradient). Header uses vertical gradient with white nav buttons. Theme selector has transparent frosted-glass styling that blends with header. Selection persisted to localStorage. All Chrome dark mode issues resolved with inline styles and forced light color scheme.

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

### 13. Fix Initial Modal Top Positioning (White Gap Below Header)
- [x] **Task:** Remove white gap between header and initial modal
- **Current Issue:**
  - Initial modal (disclaimer/welcome screen) doesn't extend high enough
  - Visible white gap between bottom of header and top of modal
  - Creates visual disconnect and looks unpolished
- **Expected Behavior:**
  - Modal should seamlessly align with bottom of header
  - No visible gap or whitespace between header and modal
  - Clean, professional appearance
- **Files Updated:**
  - `ui/components/DisclaimerModal.tsx` - Changed overlay positioning from `top-[68px]` to `top-16` (64px) to match header height exactly
- **Assignee:**
- **Priority:** Medium
- **Notes:** The header has a fixed height of `h-16` (64px), so the modal overlay needed to start at exactly 64px from the top. The previous value of 68px created a 4-pixel white gap.

---

### 14. Add Time Frame Zoom Capability - **FLAGGED FOR POTENTIAL REMOVAL**
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
| 2026-01-13 | Task 2 completed | Consolidated sidebar location indicator - removed "Analysis" header, increased icon/text size for better visibility |
| 2026-01-13 | Task 3 completed | Implemented smart year toggle defaults for Annual Incidents Comparison - Day/Month views with >2 years now show only first and last year by default with hint text to guide users |
| 2026-01-14 | Task 4 completed | Added chart type toggle (line/bar) to Annual Incidents Comparison - icon buttons positioned right of time scale buttons, smart defaults reset on time scale change |
| 2026-01-14 | Task 5 completed | Fixed bottom margin when Time of Day and Weekdays vs. Weekends sections are toggled off - conditional mb-3 margin reduces unnecessary whitespace by ~24px |
| 2026-01-14 | Task 6 completed | Added Infrastructure and Equity buttons to header with "Coming Soon" modal functionality - buttons have muted styling and trigger DisclaimerModal on click |
| 2026-01-14 | Task 7 completed | Added header theme color selector with gradient backgrounds - created 7 blue gradient options (default: Ocean Depth), frosted-glass dropdown selector, migrated header from MUI to Tailwind with white nav buttons |
| 2026-01-14 | Task 13 completed | Fixed initial modal top positioning - changed overlay from top-[68px] to top-16 (64px) to eliminate 4px white gap below header |


