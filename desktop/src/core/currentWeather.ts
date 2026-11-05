import { getWeather } from './api'

export async function getWeatherForCurrentLocation() {
  if (!navigator.geolocation) return getWeather()

  let position: GeolocationPosition
  try {
    position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: 8000,
      })
    })
  } catch {
    return getWeather()
  }

  return getWeather(position.coords.latitude, position.coords.longitude, 'Current location')
}
