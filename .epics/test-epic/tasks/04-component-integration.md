# Task 04: Component Integration

## Status: done

## Goal
Update existing components (WeatherCard, SearchBar, useWeather hook) to use settings for field visibility, default region, and unit preferences.

## Files
- weather-app/src/components/WeatherCard.tsx
- weather-app/src/components/SearchBar.tsx
- weather-app/src/hooks/useWeather.ts

## Steps
1. Update WeatherCard to conditionally render fields based on visibility settings
2. Modify SearchBar to pre-populate with default region from settings
3. Update useWeather hook to use temperature unit preferences
4. Ensure settings changes apply immediately to components
5. Handle edge cases (missing settings, loading states)

## Done When
- [ ] WeatherCard only shows fields that are toggled on in settings
- [ ] SearchBar pre-populates with user's default region
- [ ] Temperature displays in correct unit (°C/°F) based on settings
- [ ] Wind speed shows in correct unit (mph/kph) based on settings
- [ ] Settings changes apply without page reload
- [ ] Error states are handled gracefully

## Notes
Maintain existing component patterns and TypeScript interfaces. Ensure backward compatibility during transition.