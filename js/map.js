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
  center: [-73.98174, 40.66748], // starting position
  zoom: 12.46, // starting zoom
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

  // parse vehicles csv, convert to json, and kick off the animation
  Papa.parse('/data/vehicles.csv', {
    download: true,
    complete: ({ data }) => {
      const json = asJson(data)
      animateBuses(json) // eslint-disable-line
    }
  })

  // parse stops csv, convert to json
  Papa.parse('/data/stops.csv', {
    download: true,
    complete: ({ data }) => {
      const json = asJson(data)

      const someStopData = json.filter(d => d.stopId === '305674')
      console.log(someStopData)

      // var stopLine = d3.line()
      //   .x(function (d) { return x(d.timestamp * 1000) })
      //   .y(function (d) {
      //     console.log(d.expectedArrivalSeconds)
      //     console.log(Math.abs(d.expectedArrivalSeconds) / 60)
      //     return y((Math.abs(d.expectedArrivalSeconds) / 60))
      //   })
      //   .curve(d3.curveMonotoneX)
      // clear the chart
      svg.selectAll('.bus-line').remove()

      // // draw new lines
      // svg.append('path')
      //   .datum(someStopData)
      //   .attr('class', 'stop-line')
      //   .attr('d', stopLine)

      // append the bar rectangles to the svg element
      svg.selectAll('rect')
        .data(someStopData)
        .enter()
        .append('rect')
        .attr('x', function (d) { return x(d.timestamp * 1000) })
        .attr('y', function (d) { return y(Math.abs(d.expectedArrivalSeconds) / 60)})
        .attr('width', (width / 180) + 1)
        .attr('height', function (d) { return height - y(Math.abs(d.expectedArrivalSeconds) / 60) })
        .style('fill', '#69b3a2')
    }
  })
})
