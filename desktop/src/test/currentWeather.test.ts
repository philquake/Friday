import { afterEach, describe, expect, it, vi } from 'vitest'
import { getWeather } from '../core/api'
import { getWeatherForCurrentLocation } from '../core/currentWeather'

vi.mock('../core/api', () => ({
  getWeather: vi.fn(),
}))

const mockedGetWeather = vi.mocked(getWeather)

describe('getWeatherForCurrentLocation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    mockedGetWeather.mockReset()
  })

  it('uses the browser coordinates when location access is granted', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn(success => success({ coords: { latitude: 47.6, longitude: -122.3 } })),
      },
    })
    mockedGetWeather.mockResolvedValue({ location: 'Current location' } as Awaited<ReturnType<typeof getWeather>>)

    await getWeatherForCurrentLocation()

    expect(mockedGetWeather).toHaveBeenCalledWith(47.6, -122.3, 'Current location')
  })

  it('uses the configured default weather location when geolocation is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    mockedGetWeather.mockResolvedValue({ location: 'Islamabad' } as Awaited<ReturnType<typeof getWeather>>)

    await getWeatherForCurrentLocation()

    expect(mockedGetWeather).toHaveBeenCalledWith()
  })

  it('falls back when the user denies location access', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_success, error) => error(new Error('Permission denied'))),
      },
    })
    mockedGetWeather.mockResolvedValue({ location: 'Islamabad' } as Awaited<ReturnType<typeof getWeather>>)

    await getWeatherForCurrentLocation()

    expect(mockedGetWeather).toHaveBeenCalledWith()
  })
})
