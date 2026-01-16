# Task 05: Theme Integration

## Status: done

## Goal
Replace the existing ThemeProvider with the new settings-based theme system and ensure theme changes apply across the entire app.

## Files
- weather-app/src/main.tsx
- weather-app/src/App.tsx

## Steps
1. Replace ThemeProvider with SettingsProvider in main.tsx
2. Update App.tsx to use settings-based theme instead of ThemeProvider
3. Ensure theme toggle in SettingsPanel affects the entire app
4. Update any remaining theme-related components
5. Remove old ThemeProvider files if no longer needed

## Done When
- [ ] SettingsProvider replaces ThemeProvider in main.tsx
- [ ] App.tsx uses settings for theme management
- [ ] Theme toggle in SettingsPanel changes app theme immediately
- [ ] Dark/light mode applies consistently across all components
- [ ] Old theme system is cleanly replaced
- [ ] No theme-related console errors

## Notes
Ensure smooth transition - test both themes thoroughly. Follow existing patterns for provider setup and cleanup.