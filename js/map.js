// helper function to convert papaparse's array of arrays to array of objects
const asJson = (csv) => {
  const headers = csv.shift()

  return csv.map((row) => {
    const object = {}
    headers.forEach((header, i) => {
      object[header] = row[i]
    })
    return object
  })
}

mapboxgl.accessToken = 'pk.eyJ1IjoiY3dob25nIiwiYSI6IjAyYzIwYTJjYTVhMzUxZTVkMzdmYTQ2YzBmMTM0ZDAyIn0.owNd_Qa7Sw2neNJbK6zc1A'
const map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'mapbox://styles/mapbox/light-v9', // hosted style id
  center: [-73.95, 40.68], // starting position
  zoom: 12, // starting zoom
  hash: true
})

// add the zoom/rotate/pitch control to the map
map.addControl(new mapboxgl.NavigationControl())

map.on('style.load', () => {
  // add static layers (bus route linestrings)
  map.addSource('b67-route-northbound', {
    type: 'geojson',
    data: 'data/b67-route-northbound.geojson'
  })

  map.addLayer({
    id: 'b67-route-northbound-line',
    type: 'line',
    source: 'b67-route-northbound',
    paint: {
      'line-color': '#aaa'
    }
  })

  map.addSource('b67-route-southbound', {
    type: 'geojson',
    data: 'data/b67-route-southbound.geojson'
  })

  map.addLayer({
    id: 'b67-route-southbound-line',
    type: 'line',
    source: 'b67-route-southbound',
    paint: {
      'line-color': '#aaa'
    }
  })

  // parse csv, convert to json, and kick off the animation
  Papa.parse('/data/vehicles.csv', {
    download: true,
    complete: ({ data }) => {
      const json = asJson(data)
      animateBuses(json) // eslint-disable-line
    }
  })
})
