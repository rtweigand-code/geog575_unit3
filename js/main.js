// ======================================
// GLOBAL VARIABLES
// ======================================

// variables user can switch between
var attrArray = [
    "median_income",
    "unemployment_rate",
    "poverty_rate",
    "gdp_per_capita"
];

// start with income as default
var expressed = attrArray[0];

// chart settings
var chartWidth = 620,
    chartHeight = 600,
    leftPadding = 70,
    rightPadding = 25,
    topBottomPadding = 50,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2;

// run everything when page loads
window.onload = setMap;


// ======================================
// SET UP MAP + LOAD DATA
// ======================================
function setMap() {

    var mapWidth = 960,
        mapHeight = 600;

    // create the map svg
    var map = d3.select(".vizRow")
        .append("svg")
        .attr("class", "map")
        .attr("width", mapWidth)
        .attr("height", mapHeight);

    // projection we’ve been using in class
    var projection = d3.geoAlbersUsa()
        .scale(1200)
        .translate([mapWidth / 2, mapHeight / 2]);

    var path = d3.geoPath()
        .projection(projection);

    // load csv + topojson
    var promises = [];
    promises.push(d3.csv("data/lab3_state_economic_data.csv"));
    promises.push(d3.json("data/states-10m.json"));

    Promise.all(promises).then(function(data) {
        callback(data, map, path);
    });

    function callback(data, map, path) {

        var csvData = data[0];
        var states = data[1];

        // convert strings to numbers
        csvData.forEach(function(d) {
            d.median_income = +d.median_income;
            d.unemployment_rate = +d.unemployment_rate;
            d.poverty_rate = +d.poverty_rate;
            d.gdp_per_capita = +d.gdp_per_capita;
            d.population_growth = +d.population_growth;
        });

        // convert topojson to geojson
        var statesGeo = topojson.feature(states, states.objects.states).features;

        // join csv data into the geojson
        joinData(statesGeo, csvData);

        // build color scale based on current variable
        var colorScale = makeColorScale(csvData);

        // draw states
        map.selectAll(".states")
            .data(statesGeo)
            .enter()
            .append("path")
            .attr("class", function(d) {
                return "states " + d.properties.name.replace(/\s+/g, "_");
            })
            .attr("d", path)
            .style("fill", function(d) {
                var value = d.properties[expressed];
                return value != null ? colorScale(value) : "#ccc";
            })
            .on("mouseover", function(event, d) {
                highlight(d.properties);
                setLabel(event, d.properties);
            })
            .on("mousemove", function(event) {
                moveLabel(event);
            })
            .on("mouseout", function(event, d) {
                dehighlight(d.properties);
                d3.select(".infolabel").style("display", "none");
            });

        // add legend
        addLegend(map, colorScale);

        // add dropdown + chart
        createDropdown(csvData);
        setChart(csvData, colorScale);
    }
}


// ======================================
// JOIN CSV DATA TO GEOJSON
// ======================================
function joinData(statesGeo, csvData) {

    for (var i = 0; i < csvData.length; i++) {
        var csvState = csvData[i];
        var csvKey = csvState.state;

        for (var a = 0; a < statesGeo.length; a++) {
            var geoProps = statesGeo[a].properties;
            var geoKey = geoProps.name;

            if (geoKey === csvKey) {

                geoProps.state = csvState.state;
                geoProps.abbr = csvState.abbr;

                // attach all attributes so we can use them later
                geoProps.median_income = csvState.median_income;
                geoProps.unemployment_rate = csvState.unemployment_rate;
                geoProps.poverty_rate = csvState.poverty_rate;
                geoProps.gdp_per_capita = csvState.gdp_per_capita;
                geoProps.population_growth = csvState.population_growth;
            }
        }
    }
}


// ======================================
// DROPDOWN
// ======================================
function createDropdown(csvData) {

    var dropdown = d3.select(".controls")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function() {
            changeAttribute(this.value, csvData);
        });

    dropdown.selectAll("option")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d) { return d; })
        .text(function(d) { return formatAttributeName(d); });
}


// ======================================
// COLOR SCALE
// ======================================
function makeColorScale(data) {

    var colors = [
        "#8fd19e",
        "#63be7b",
        "#3fae63",
        "#228b45",
        "#0f6b35"
    ];

    var scale = d3.scaleQuantile()
        .range(colors);

    var domain = [];

    for (var i = 0; i < data.length; i++) {
        var val = data[i][expressed];
        if (val != null && !isNaN(val)) {
            domain.push(val);
        }
    }

    scale.domain(domain);

    return scale;
}


// ======================================
// LEGEND
// ======================================
function addLegend(map, colorScale) {

    var legend = map.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(540, 35)"); // more centered

    var colors = colorScale.range();

    // make boxes bigger + spaced better
    legend.selectAll("rect")
        .data(colors)
        .enter()
        .append("rect")
        .attr("x", function(d, i) { return i * 60; })
        .attr("y", 0)
        .attr("width", 60)
        .attr("height", 16)
        .attr("fill", function(d) { return d; })
        .attr("stroke", "#666");

    // get min + max
    var domain = colorScale.domain();
    var minVal = d3.min(domain);
    var maxVal = d3.max(domain);

    // left (low)
    legend.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .text(minVal.toFixed(1))
        .style("font-size", "11px");

    // right (high)
    legend.append("text")
        .attr("x", (colorScale.range().length - 1) * 60)
        .attr("y", 30)
        .attr("text-anchor", "end")
        .text(maxVal.toFixed(1))
        .style("font-size", "11px");

    // title above legend
    legend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .text(formatAttributeName(expressed))
        .style("font-size", "13px")
        .style("font-weight", "bold");
}


// ======================================
// CREATE CHART
// ======================================
function setChart(csvData, colorScale) {

    var chart = d3.select(".vizRow")
        .append("svg")
        .attr("class", "chart")
        .attr("width", chartWidth)
        .attr("height", chartHeight);

    // title
    chart.append("text")
        .attr("class", "chartTitle")
        .attr("x", 20)
        .attr("y", 30);

    // x-axis label
    chart.append("text")
        .attr("class", "xAxisLabel")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight - 15)
        .attr("text-anchor", "middle")
        .text("U.S. States (sorted)");

    // axis group
    chart.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + leftPadding + "," + topBottomPadding + ")");

    // create bars
    chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .attr("class", function(d) {
            return "bars " + d.state.replace(/\s+/g, "_");
        })
        .on("mouseover", function(event, d) {
            highlight(d);
            setLabel(event, d);
        })
        .on("mousemove", function(event) {
            moveLabel(event);
        })
        .on("mouseout", function(event, d) {
            dehighlight(d);
            d3.select(".infolabel").style("display", "none");
        });

    updateChart(csvData, colorScale, chartWidth, chartHeight, leftPadding, rightPadding, topBottomPadding, chartInnerWidth, chartInnerHeight);
}


// ======================================
// UPDATE CHART
// ======================================
function updateChart(csvData, colorScale, chartWidth, chartHeight, leftPadding, rightPadding, topBottomPadding, chartInnerWidth, chartInnerHeight) {

    // sort bars based on current variable
    csvData.sort(function(a, b) {
        return b[expressed] - a[expressed];
    });

    var yScale = d3.scaleLinear()
        .range([chartInnerHeight, 0])
        .domain([0, d3.max(csvData, function(d) {
            return d[expressed];
        }) * 1.05]);

    var yAxis = d3.axisLeft(yScale)
        .ticks(8)
        .tickFormat(function(d) {
            if (expressed === "median_income" || expressed === "gdp_per_capita") {
                return "$" + d3.format(",.0f")(d);
            } else {
                return d3.format(".1f")(d) + "%";
            }
        });

    d3.select(".axis")
        .transition()
        .duration(1000)
        .call(yAxis);

    var barWidth = chartInnerWidth / csvData.length;

    d3.selectAll(".bars")
        .data(csvData, function(d) { return d.state; })
        .transition()
        .duration(1000)
        .attr("x", function(d, i) {
            return leftPadding + 6 + i * barWidth;
        })
        .attr("width", barWidth - 2)
        .attr("y", function(d) {
            return topBottomPadding + yScale(d[expressed]);
        })
        .attr("height", function(d) {
            return chartInnerHeight - yScale(d[expressed]);
        })
        .style("fill", function(d) {
            return colorScale(d[expressed]);
        });

    d3.select(".chartTitle")
        .text("State Ranking by " + formatAttributeName(expressed));
}


// ======================================
// DROPDOWN CHANGE
// ======================================
function changeAttribute(attribute, csvData) {

    expressed = attribute;

    var colorScale = makeColorScale(csvData);

    // update map colors
    d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d) {
            var value = d.properties[expressed];
            return value != null ? colorScale(value) : "#ccc";
        });

    // update legend when dropdown changes
    d3.select(".legend").remove();
    addLegend(d3.select(".map"), colorScale);

    // update chart
    updateChart(csvData, colorScale, chartWidth, chartHeight, leftPadding, rightPadding, topBottomPadding, chartInnerWidth, chartInnerHeight);
}


// ======================================
// HIGHLIGHT
// ======================================
function highlight(props) {

    var className = props.state
        ? props.state.replace(/\s+/g, "_")
        : props.name.replace(/\s+/g, "_");

    d3.selectAll("." + className)
        .classed("selected", true)
        .raise();
}


// ======================================
// DEHIGHLIGHT
// ======================================
function dehighlight(props) {

    var className = props.state
        ? props.state.replace(/\s+/g, "_")
        : props.name.replace(/\s+/g, "_");

    d3.selectAll("." + className)
        .classed("selected", false);
}


// ======================================
// TOOLTIP
// ======================================
function setLabel(event, props) {

    var labelName =
        "<strong>" + props.state + "</strong><br>" +
        formatAttributeName(expressed) + ": " + formatValue(expressed, props[expressed]) + "<br>" +
        "Population Growth: " + formatValue("population_growth", props.population_growth);

    d3.select(".infolabel")
        .style("display", "block")
        .html(labelName);

    moveLabel(event);
}


// move tooltip with mouse
function moveLabel(event) {

    var x = event.pageX + 15;
    var y = event.pageY - 60;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
}


// ======================================
// HELPERS
// ======================================
function formatAttributeName(attribute) {
    if (attribute === "median_income") return "Median Income";
    if (attribute === "unemployment_rate") return "Unemployment Rate";
    if (attribute === "poverty_rate") return "Poverty Rate";
    if (attribute === "gdp_per_capita") return "GDP per Capita";
    if (attribute === "population_growth") return "Population Growth";
    return attribute;
}

function formatValue(attribute, value) {

    if (value == null || isNaN(value)) return "No data";

    if (attribute === "median_income" || attribute === "gdp_per_capita") {
        return "$" + d3.format(",.0f")(value);
    }

    if (attribute === "unemployment_rate" || attribute === "poverty_rate" || attribute === "population_growth") {
        return d3.format(".1f")(value) + "%";
    }

    return value;
}