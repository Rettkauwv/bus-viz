
const containers = document.getElementsByClassName('route-column-left')

const {
  offsetWidth: containerWidth,
  offsetHeight: containerHeight
} = containers[0]

const margin = { top: 15, right: 140, bottom: 25, left: 50 }
const width = containerWidth - margin.left - margin.right
const height = containerHeight - margin.top - margin.bottom

const x = d3.scaleTime()
  .range([0, width])
  .domain([new Date(1580209201 * 1000), new Date((1580219941 + 60) * 1000)])

const y = d3.scaleLinear()
  .range([height, 0])
  .domain([0, 30])

const xAxis = d3.axisBottom(x)
  .ticks(10, 'm')
  .tickFormat(d3.timeFormat('%H:%M %p'))

const yAxis = d3.axisLeft(y)
  .scale(y)
  .ticks(5, 's')

const svg = d3.select('#chart-container').append('svg')
  .attr('width', width + margin.left + margin.right)
  // .attr('height', height + margin.top + margin.bottom)
  .attr('height', 0)
  .append('g')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

svg.append('g')
  .attr('class', 'x axis')
  .attr('transform', 'translate(0,' + height + ')')
  .call(xAxis).append('text')
  .attr('x', 350)
  .attr('y', 36)
  .attr('fill', '#000')
  .text('Hour of Time')
  .style('font-weight', 'bold')

svg.append('g')
  .attr('class', 'y axis')
  .call(yAxis)
  .append('text')
  .attr('transform', 'rotate(-90)')
  .attr('x', -250)
  .attr('y', -40)
  .attr('dy', '0.3408em')
  .attr('fill', '#000')
  .text('Minutes')
  .style('font-weight', 'bold')

// define the line
var busline = d3.line()
  .x(function (d) { return x(d.timestamp * 1000) })
  .y(function (d) { return y(d.mph) })
  .curve(d3.curveMonotoneX)

const chartData = {}

svg.append('line')
  .attr('x1', x(1580209201000))
  .attr('y1', height)
  .attr('x2', x(1580209201000))
  .attr('y2', 0)
  .attr('class', 'time-marker')

const updateLine = (currentTimestamp) => {
  svg.selectAll('.time-marker')
    .transition()
    .duration(2000)
    .ease(d3.easeLinear)
    .attr('x1', x(currentTimestamp * 1000))
    .attr('x2', x(currentTimestamp * 1000))
}

// gets data from map animation
const refreshChart = (data, currentTimestamp) => {
  data.forEach(({ vehicleRef, mph }) => {
    const dataPoint = {
      timestamp: currentTimestamp,
      mph
    }
    // if it exists, push
    if (chartData[vehicleRef]) {
      chartData[vehicleRef].push(dataPoint)
    } else {
      chartData[vehicleRef] = [dataPoint]
    }
  })

  // clear the chart
  svg.selectAll('.bus-line').remove()

  // draw new lines
  Object.keys(chartData).forEach((vehicleRef) => {
    svg.append('path')
      .datum(chartData[vehicleRef])
      .attr('class', 'bus-line')
      .attr('d', busline)
  })
}

// {
//   MTA_FOO: [
//     {
//       mph,
//       timestamp
//     }
//   ]
// }

const renderStopChart = (stopId) => {
  console.log(stopId)

  const container = document.getElementById(stopId)
    .getElementsByClassName('stop-chart')[0]

  const {
    offsetWidth: containerWidth,
    offsetHeight: containerHeight
  } = container

  const margin = { top: 2, right: 8, bottom: 1, left: 8 }
  const width = containerWidth - margin.left - margin.right
  const height = containerHeight - margin.top - margin.bottom

  const x = d3.scaleTime()
    .range([0, width])
    .domain([new Date(1580209201 * 1000), new Date((1580219941 + 60) * 1000)])

  const y = d3.scaleLinear()
    .range([height, 0])
    .domain([0, 30])

  const xAxis = d3.axisBottom(x)
    .ticks(10, 'm')
    .tickFormat(d3.timeFormat('%H:%M %p'))

  const yAxis = d3.axisLeft(y)
    .scale(y)
    .ticks(5, 's')

  const svg = d3.select(`[id="${stopId}"]`).select('.stop-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  const trimmedStopId = stopId.slice(stopId.length - 6)
  const thisStopData = window.stopData.filter(d => d.stopId === trimmedStopId)
  // draw rectangles
  // append the bar rectangles to the svg element
  svg.selectAll('rect')
    .data(thisStopData)
    .enter()
    .append('rect')
    .attr('x', function (d) { return x(d.timestamp * 1000) })
    .attr('y', function (d) { return y(Math.abs(d.expectedArrivalSeconds) / 60)})
    .attr('width', (width / 180) + 1)
    .attr('height', function (d) { return height - y(Math.abs(d.expectedArrivalSeconds) / 60) })
    .style('fill', '#69b3a2')

}

const renderStopList = () => {
  // populate the route columns with divs
  $.getJSON('data/stop-list.json', (stopList) => {
    console.log(stopList)
    const northbound = stopList.filter(d => d.stopId.match(/0-/))
    const southbound = stopList.filter(d => d.stopId.match(/1-/))

    // populate left column
    northbound.forEach((d) => {
      $('.route-column-left').append(`
        <div class="stop-container" id="${d.stopId}">
          <div class="stop-chart">
          </div>
          <div class="stop-name">
            ${d.stopName}
          </div>
        </div>
      `)

      renderStopChart(d.stopId)
    })

    southbound.forEach((d) => {
      $('.route-column-right').append(`
        <div class="stop-container" id="${d.stopId}">
          <div class="stop-chart">
          </div>
          <div class="stop-name">
            ${d.stopName}
          </div>
        </div>
      `)

      renderStopChart(d.stopId)
    })
  })
}
