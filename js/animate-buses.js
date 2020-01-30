// helper function for color based on speed
const getMphColor = (mph) => {
  if (mph >= 10) return '#33cc33'
  if (mph > 5) return '#ff9900'
  if (mph > 0) return '#cc0000'
}

// renders markers for one frame for one vehicle
const renderMarkersForVehicle = ({ vehicleRef, positions, mph }, i) => {
  const existingSource = map.getSource(vehicleRef)

  if (positions[i]) {
    if (existingSource) {
      existingSource.setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: positions[i]
        }
      })
    } else {
      map.addSource(vehicleRef, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: positions[i]
          }
        }
      })

      map.addLayer({
        id: `${vehicleRef}-circle`,
        type: 'circle',
        source: vehicleRef
      })
    }

    // color point based on speed
    map.setPaintProperty(`${vehicleRef}-circle`, 'circle-color', getMphColor(mph))
  }
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

  // compare vehicle sources on map with vehicles in this timestamp
  // remove any that don't need to be shown in this step
  let sourcesOnMap = Object.keys(map.getStyle().sources)
    .filter(d => d.match(/MTA/))

  observationsForTimestamp.forEach(({ vehicleRef }) => {
    sourcesOnMap = sourcesOnMap.filter(d => d !== vehicleRef)
  })

  // remove orphaned layers and sources
  sourcesOnMap.forEach((id) => {
    const style = map.getStyle()
    if (style.layers.find(d => d.id === `${id}-circle`)) map.removeLayer(`${id}-circle`)
    if (style.sources[id]) map.removeSource(id)
  })

  // prep the data for animation We need to generate a line between the current position and next postion
  const dataToAnimate = observationsForTimestamp.map((observation) => {
    // determine position along string
    const startPosition = [observation.longitude, observation.latitude]
    const positions = [startPosition]
    let mph = 0
    const nextObservation = observationsForNextTimestamp.find(d => d.vehicleRef === observation.vehicleRef)
    if (nextObservation) {
      const endPosition = [nextObservation.longitude, nextObservation.latitude]

      // now that we have the end position, we can calculate the average speed
      // for this minute as distance between points / 1 minute * 60 = mph
      const distanceBetweenPoints = turf.distance(startPosition, endPosition, { units: 'miles' })
      mph = parseInt(distanceBetweenPoints * 60)

      const lineBetweenPoints = turf.lineString([startPosition, endPosition])
      const incrementLength = turf.length(lineBetweenPoints) / framesPerMinute

      // calculate positions for each frame and fill positions[]
      for (let i = 1; i < (framesPerMinute - 1); i += 1) {
        // calculate the new position for this frame
        // length to visualize for this frame
        const frameLength = incrementLength * i
        // calculate where to place the marker
        positions.push(turf.along(lineBetweenPoints, frameLength).geometry.coordinates)
      }
    }
    return {
      vehicleRef: observation.vehicleRef,
      positions, // array of {frames - 1} positions
      mph
    }
  })

  const interval = minuteRate / framesPerMinute

  // initial render
  dataToAnimate.forEach((vehicle) => {
    renderMarkersForVehicle(vehicle, 0)
  })

  // create an interval to update the data {framesPerMinute} times
  // we already rendered the initial position, so kick things off at 1, not 0
  let counter = 1
  const dataInterval = setInterval(() => {
    // iterate over observations for this timestamp
    dataToAnimate.forEach((vehicle) => {
      renderMarkersForVehicle(vehicle, counter)
    })

    // updateData(lineBetweenPoints, incrementLength, counter, framesPerMinute, observation.vehicleRef)
    // the end position is just the 0 position of the next timestamp, so we are iterating over n-2
    if (counter === framesPerMinute - 2) {
      clearInterval(dataInterval)
      // move to the next minute
      if (timestampCounter < timestamps.length - 2) {
        setTimeout(() => {
          timestampCounter += 1
          renderVehicles(timestamps, data, timestampCounter)
        }, interval)
      }
    } else {
      counter += 1
    }
  }, interval)
}

const animateBuses = (data) => { // eslint-disable-line
  // get all of the unique timestamps
  const timestamps = data
    .map(d => d.timestamp)
    .filter((timestamp, i, self) => self.indexOf(timestamp) === i)

  const timestampCounter = 0
  renderVehicles(timestamps, data, timestampCounter)
}
