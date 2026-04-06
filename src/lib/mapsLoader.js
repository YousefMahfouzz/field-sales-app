import { Loader } from '@googlemaps/js-api-loader'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
let loaderPromise = null
let placesPromise = null

export function loadGoogleMaps() {
  if (!MAPS_KEY) return Promise.resolve(false)

  // If Places is already available, return immediately
  if (window.google?.maps?.places?.PlacesService) return Promise.resolve(true)

  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: MAPS_KEY,
      version: 'weekly',
      libraries: ['places'],
    })
    loaderPromise = loader.load()
      .then(async () => {
        // Explicitly import places library to ensure it's ready
        try {
          await window.google.maps.importLibrary('places')
        } catch { /* already loaded */ }
        return true
      })
      .catch(() => { loaderPromise = null; return false })
  }
  return loaderPromise
}

// Separate function specifically for ensuring Places is ready
export async function loadPlaces() {
  if (!MAPS_KEY) return false
  const ok = await loadGoogleMaps()
  if (!ok) return false

  // Wait up to 5s for PlacesService to be available
  let waited = 0
  while (!window.google?.maps?.places?.PlacesService && waited < 5000) {
    await new Promise(r => setTimeout(r, 100))
    waited += 100
  }
  return !!window.google?.maps?.places?.PlacesService
}
