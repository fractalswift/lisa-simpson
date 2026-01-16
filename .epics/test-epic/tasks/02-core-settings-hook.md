# Task 02: Core Settings Hook

## Status: done

## Goal
Implement the main useSettings hook that manages settings state, handles localStorage persistence, and provides the settings API to components.

## Files
- weather-app/src/hooks/useSettings.ts
- weather-app/src/hooks/useSettingsHook.ts

## Steps
1. Create useSettings hook for accessing settings context
2. Implement useSettingsHook with state management logic
3. Add localStorage read/write functionality with error handling
4. Handle settings initialization from localStorage on app start
5. Implement settings update methods that persist to localStorage

## Done When
- [ ] useSettings hook provides access to current settings
- [ ] Settings persist to localStorage on change
- [ ] Settings load from localStorage on app initialization
- [ ] Error handling works when localStorage is unavailable
- [ ] Settings apply immediately without page reload

## Notes
Split into separate files if needed to avoid JSX syntax errors. Follow the existing hook patterns in the codebase (useWeather, etc.).