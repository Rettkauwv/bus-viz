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

const getMphColor = (mph) => {
  if (mph >= 10) return '#33cc33'
  if (mph > 5) return '#ff9900'
  if (mph > 0) return '#cc0000'
}

// update data for one frame
const updateData = (line, incrementLength, counter, framesPerMinute, sourceId) => {
  // length to visualize for this frame
  const frameLength = incrementLength * counter;

  // calculate where to place the marker
  const pointAlong = turf.along(line, frameLength);

  map.getSource(sourceId).setData(pointAlong);
}



// renderVehicles will animate vehicles between their current position and their next position
// once done, it calls itself until reaching the end of the data
const renderVehicles = (timestamps, data, timestampCounter) => {
  // The markers on the map will update {framesPerMinute} times over {minuteRate}
  const minuteRate = 2000
  const framesPerMinute = 30

  const currentTimestamp = timestamps[timestampCounter]
  const currentMoment = moment.unix(currentTimestamp)
  $('.display-time').text(currentMoment.format('HH:mm'))

  // get rows for this timestamp
  const observationsForTimestamp = data.filter(d => d.timestamp === currentTimestamp)
  const observationsForNextTimestamp = data.filter(d => {
    return d.timestamp === timestamps[timestampCounter + 1]
  })

  // get all vehicle sources.  As we iterate we will check off the ones that
  // are still reporting, leaving an array of non-reporting vehicles
  // any that are left will be removed
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
        source: observation.vehicleRef
      })
    }

    // determine position along string
    const startPosition = [observation.longitude, observation.latitude]
    const nextObservation = observationsForNextTimestamp.find(d => d.vehicleRef === observation.vehicleRef)
    if (nextObservation) {
      const endPosition = [nextObservation.longitude, nextObservation.latitude]

      // now that we have the end position, we can calculate the average speed
      // for this minute as distance between points / 1 minute * 60 = mph
      const distanceBetweenPoints = turf.distance(startPosition, endPosition, { units: 'miles' })
      const mph = parseInt(distanceBetweenPoints * 60)
      // update the layer
      map.setPaintProperty(`${observation.vehicleRef}-circle`, 'circle-color', getMphColor(mph));


      const interval = minuteRate / framesPerMinute

      const lineBetweenPoints = turf.lineString([startPosition, endPosition])
      const incrementLength = turf.length(lineBetweenPoints) / framesPerMinute

      // create an interval to update the data {framesPerMinute} times
      // we already rendered the initial position, so kick things off at 1, not 0
      let counter = 1
      const dataInterval = setInterval(() => {
        updateData(lineBetweenPoints, incrementLength, counter, framesPerMinute, observation.vehicleRef)
        // the end position is just the 0 position of the next timestamp, so we are iterating over n-2
        if (counter === framesPerMinute - 1) {
          clearInterval(dataInterval)
        } else {
          counter += 1;
        }
      }, interval)
    }
  })

  // remove orphaned layers and sources
  sourcesOnMap.forEach((id) => {
    const style = map.getStyle()
    if (style.layers.find(d => d.id === `${id}-circle`)) map.removeLayer(`${id}-circle`)
    if (style.sources[id]) map.removeSource(id)
  })

  // move to the next frame after {minuteRate}, which should be the same amount
  // of time needed to animate {framesPerMinute} frames
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
