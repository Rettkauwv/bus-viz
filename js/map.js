mapboxgl.accessToken = 'pk.eyJ1IjoiY3dob25nIiwiYSI6IjAyYzIwYTJjYTVhMzUxZTVkMzdmYTQ2YzBmMTM0ZDAyIn0.owNd_Qa7Sw2neNJbK6zc1A';
const map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'mapbox://styles/mapbox/light-v9', //hosted style id
  center: [-73.95, 40.68], // starting position
  zoom: 12, // starting zoom
  hash: true
});

// add the zoom/rotate/pitch control to the map
map.addControl(new mapboxgl.NavigationControl());

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

  return csv.map((row) => {
    const object = {}
    headers.forEach((header, i) => {
      object[header] = row[i]
    })
    return object
  })
}



// renderVehicles will animate vehicles between their current position and their next position
// once done, it calls itself until reaching the end of the data
const renderVehicles = (timestamps, data, timestampCounter) => {
  // how many milliseconds === 1 minute in real life
  const minuteRate = 5000

  const currentTimestamp = timestamps[timestampCounter]
  const currentMoment = moment.unix(currentTimestamp)
  // get rows for this timestamp
  const observationsForTimestamp = data.filter(d => d.timestamp === currentTimestamp)
  const observationsForNextTimestamp = data.filter(d => {
    return d.timestamp === timestamps[timestampCounter + 1]
  })

  // remove sources and layers for non-reporting sources
  let sourcesOnMap = Object.keys(map.getStyle().sources)
    .filter(d => d.match(/MTA/))

  // iterate over observations for this timestamp
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

      map.setPaintProperty(`${observation.vehicleRef}-circle`, 'circle-color', observation.directionRef === '0' ? 'blue' : 'green');
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
          'circle-color': observation.directionRef === '0' ? 'blue' : 'green'
        }
      })
    }

    // determine position along string
    const startPosition = [observation.longitude, observation.latitude]
    const nextObservation = observationsForNextTimestamp.find(d => d.vehicleRef === observation.vehicleRef)
    if (nextObservation) {
      const endPosition = [nextObservation.longitude, nextObservation.latitude]


      const frames = 15

      const interval = minuteRate / frames

      const lineBetweenPoints = turf.lineString([startPosition, endPosition])
      const incrementLength = turf.length(lineBetweenPoints) / frames

      // create an interval to update the data {frames} times
      // we already rendered the initial position, so kick things off at 1, not 0
      let counter = 1
      const dataInterval = setInterval(() => {
        updateData(lineBetweenPoints, incrementLength, counter, frames, observation.vehicleRef)
        // the end position is just the 0 position of the next timestamp, so we are iterating over n-2
        if (counter === frames - 1) {
          clearInterval(dataInterval)
        } else {
          counter += 1;
        }
      }, interval)
    }
  })

  // update data for one frame
  const updateData = (line, incrementLength, counter, frames, sourceId) => {
    // length to visualize for this frame
    const frameLength = incrementLength * counter;

    // calculate where to place the marker
    const pointAlong = turf.along(line, frameLength);

    map.getSource(sourceId).setData(pointAlong);
  }

  // remove orphaned layers and sources
  sourcesOnMap.forEach((id) => {
    const style = map.getStyle()
    if (style.layers.find(d => d.id === `${id}-circle`)) map.removeLayer(`${id}-circle`)
    if (style.sources[id]) map.removeSource(id)
  })

  // move to the next frame after {minuteRate}, which should be the same amount
  // of time needed to animate {frames} frames
  if (timestampCounter < timestamps.length - 2 ) {
    setTimeout(() => {
      timestampCounter += 1
      renderVehicles(timestamps, data, timestampCounter)
    }, minuteRate)
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
