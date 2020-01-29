mapboxgl.accessToken = 'pk.eyJ1IjoiY3dob25nIiwiYSI6IjAyYzIwYTJjYTVhMzUxZTVkMzdmYTQ2YzBmMTM0ZDAyIn0.owNd_Qa7Sw2neNJbK6zc1A';
const map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'mapbox://styles/mapbox/light-v9', //hosted style id
  center: [-73.95, 40.68], // starting position
  zoom: 12, // starting zoom
  // hash: true,
});

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}


// add the zoom/rotate/pitch control to the map
map.addControl(new mapboxgl.NavigationControl());

map.on('style.load', () => {

  map.addSource('b67-route', {
    type: 'geojson',
    data: 'data/b67-route-linestring.geojson'
  })

  map.addLayer({
    id: 'b67-route-line',
    type: 'line',
    source: 'b67-route',
    paint: {
      'line-color': '#aaa'
    }
  })
  Papa.parse('/data/vehicles.csv', {
  	download: true,
  	complete: ({ data }) => {
      const json = asJson(data)
      startAnimation(json)
  	}
  });
})

// convert papaparse's array of arrays to array of objects
const asJson = (csv) => {
  const headers = csv.shift()

  const json = csv.map((row) => {
    const object = {}
    headers.forEach((header, i) => {
      object[header] = row[i]
    })
    return object
  })

  return json
}

const renderVehicles = (timestamps, data, timestampCounter) => {
  const currentTimestamp = timestamps[timestampCounter]
  const currentMoment = moment.unix(currentTimestamp)
  // get rows for this timestamp
  const observationsForTimestamp = data.filter(d => d.timestamp === currentTimestamp)

  // remove sources and layers for non-reporting sources
  let sourcesOnMap = Object.keys(map.getStyle().sources)
    .filter(d => d.match(/MTA/))

  observationsForTimestamp.forEach((observation) => {
    // remove this id from sourcesOnMap so we know which ones are missing later
    sourcesOnMap = sourcesOnMap.filter(d => d !== observation.vehicleRef)

    // map 'em
    const existingSource = map.getSource(observation.vehicleRef)
    if (existingSource) {
      existingSource.setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            observation.longitude,
            observation.latitude
          ]
        }
      })
    } else {
      map.addSource(observation.vehicleRef, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              observation.longitude,
              observation.latitude
            ]
          }
        }
      })

      map.addLayer({
        id: `${observation.vehicleRef}-circle`,
        type: 'circle',
        source: observation.vehicleRef,
        paint: {
          'circle-color': getRandomColor()
        }
      })
    }
  })

  // remove orphaned sources
  sourcesOnMap.forEach((id) => {
    const style = map.getStyle()
    if (style.layers.find(d => d.id === `${id}-circle`)) map.removeLayer(`${id}-circle`)

    if (style.sources[id]) map.removeSource(id)
  })

  if (timestampCounter < timestamps.length - 2 ) {
    setTimeout(() => {
      timestampCounter += 1
      renderVehicles(timestamps, data, timestampCounter)
    }, 1000)
  }
}

const startAnimation = (data) => {
  // get all of the unique timestamps
  const timestamps = data
    .map(d => d.timestamp)
    .filter((timestamp, i, self) => self.indexOf(timestamp) === i);

  let timestampCounter = 0
  // first timestamp
  let currentTimestamp = timestamps[timestampCounter]

  renderVehicles(timestamps, data, timestampCounter)

}
