# Epic: test-epic

## Goal
Add a dedicated settings panel to the weather app using local storage for persistence. Users should be able to customize color theme, font size, default region, and toggle which weather information fields are displayed.

## Scope
- Theme: Dark/light mode toggle
- Font size: Slider control
- Default region: Persists across sessions, pre-populates search
- Weather fields toggle: Show/hide temperature, humidity, wind speed, UV index, pressure, visibility
- Units: °C/°F and mph/kph toggles
- Settings UI: Dedicated settings panel

### Out of Scope
- Custom color themes
- Language settings
- Advanced configuration options

## Acceptance Criteria
- [ ] Settings panel component exists and is accessible in the UI
- [ ] All settings persist to local storage
- [ ] Theme toggle correctly switches between dark/light modes
- [ ] Font size slider adjusts text size throughout the app
- [ ] Default region persists and pre-populates search
- [ ] Weather fields can be individually toggled on/off
- [ ] Unit preferences (°C/°F, mph/kph) persist and affect display

## Technical Constraints
- Use local storage for persistence
- Create `useSettings` hook for settings state management
- Integrate with existing components (SearchBar, WeatherCard, etc.)

## Notes
- Weather field toggles should show whatever fields are available from the API
- Settings should apply immediately upon change
