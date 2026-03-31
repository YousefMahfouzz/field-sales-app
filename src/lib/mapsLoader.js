import { Loader } from '@googlemaps/js-api-loader'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
let loaderPromise = null

export function loadGoogleMaps() {
  if (!MAPS_KEY) return Promise.resolve(false)
  if (window.google?.maps?.places) return Promise.resolve(true)
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: MAPS_KEY,
      version: 'weekly',
      libraries: ['places'],
    })
    loaderPromise = loader.load()
      .then(() => true)
      .catch(() => { loaderPromise = null; return false })
  }
  return loaderPromise
}
