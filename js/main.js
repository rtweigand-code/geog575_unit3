// ================================
// GLOBAL VARIABLES
// ================================

// all attributes we will use (5 required for lab)
var attrArray = [
    "median_income",
    "unemployment_rate",
    "poverty_rate",
    "gdp_per_capita",
    "population_growth"
];

// start with first attribute
var expressed = attrArray[0];

// run when page loads
window.onload = setMap;


// ================================
// CREATE MAP + LOAD DATA
// ================================
function setMap(){

    var width = 960,
        height = 600;

    // create svg for map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // projection (same as class, works well for US)
    var projection = d3.geoAlbersUsa()
        .scale(1200)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    // load data
    var promises = [];
    promises.push(d3.csv("data/lab3_state_economic_data.csv"));
    promises.push(d3.json("data/states-10m.json"));

    Promise.all(promises).then(callback);

    function callback(data){

        var csvData = data[0];
        var states = data[1];

        // convert numbers (important or everything breaks)
        csvData.forEach(function(d){
            attrArray.forEach(function(attr){
                d[attr] = +d[attr];
            });
        });

        // convert topojson → geojson
        var statesGeo = topojson.feature(states, states.objects.states).features;

        // join csv to geojson
        statesGeo = joinData(statesGeo, csvData);

        // create color scale
        var colorScale = makeColorScale(csvData);

        // draw states
        var statesMap = map.selectAll(".states")
            .data(statesGeo)
            .enter()
            .append("path")
            .attr("class", "states")
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                return value ? colorScale(value) : "#ccc";
            });

        // create chart
        setChart(csvData, colorScale);

        // create dropdown
        createDropdown(csvData);
    }
}


// ================================
// JOIN DATA
// ================================
function joinData(geoData, csvData){

    for (var i = 0; i < csvData.length; i++){
        var csvState = csvData[i];
        var csvKey = csvState.state;

        for (var a = 0; a < geoData.length; a++){
            var geoProps = geoData[a].properties;
            var geoKey = geoProps.name;

            if (geoKey === csvKey){

                attrArray.forEach(function(attr){
                    geoProps[attr] = csvState[attr];
                });
            }
        }
    }

    return geoData;
}


// ================================
// COLOR SCALE
// ================================
function makeColorScale(data){

    var colorClasses = [
        "#edf8fb",
        "#b2e2e2",
        "#66c2a4",
        "#2ca25f",
        "#006d2c"
    ];

    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    var domainArray = [];

    for (var i = 0; i < data.length; i++){
        domainArray.push(data[i][expressed]);
    }

    colorScale.domain(domainArray);

    return colorScale;
}


// ================================
// CREATE CHART
// ================================
function setChart(csvData, colorScale){

    var chartWidth = 500,
        chartHeight = 600;

    var chart = d3.select("body")
        .append("svg")
        .attr("class", "chart")
        .attr("width", chartWidth)
        .attr("height", chartHeight);

    updateChart(csvData, colorScale);
}


// ================================
// UPDATE CHART
// ================================
function updateChart(csvData, colorScale){

    var chartHeight = 600;
    var chartWidth = 500;

    var yScale = d3.scaleLinear()
        .range([0, chartHeight - 60])
        .domain([0, d3.max(csvData, function(d){
            return d[expressed];
        })]);

    // sort data
    csvData.sort(function(a, b){
        return a[expressed] - b[expressed];
    });

    // JOIN
    var bars = d3.selectAll(".bars")
        .data(csvData);

    // ENTER
    bars.enter()
        .append("rect")
        .attr("class", "bars")
        .merge(bars)
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .transition()
        .duration(1000)
        .attr("height", function(d){
            return yScale(d[expressed]);
        })
        .attr("y", function(d){
            return chartHeight - yScale(d[expressed]);
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    // labels (cleaner, not cluttered)
    var labels = d3.selectAll(".numbers")
        .data(csvData);

    labels.enter()
        .append("text")
        .attr("class", "numbers")
        .merge(labels)
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + fraction / 2;
        })
        .transition()
        .duration(1000)
        .attr("y", function(d){
            return chartHeight - yScale(d[expressed]) - 5;
        })
        .text(function(d, i){
            return (i % 6 === 0) ? Math.round(d[expressed]) : "";
        });

    // title
    var title = d3.selectAll(".chartTitle")
        .data([expressed]);

    title.enter()
        .append("text")
        .attr("class", "chartTitle")
        .attr("x", 20)
        .attr("y", 30)
        .merge(title)
        .text(expressed.replace(/_/g, " "));
}


// ================================
// DROPDOWN
// ================================
function createDropdown(csvData){

    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData);
        });

    dropdown.selectAll("option")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d; })
        .text(function(d){ return d.replace(/_/g, " "); });
}


// ================================
// CHANGE ATTRIBUTE
// ================================
function changeAttribute(attribute, csvData){

    expressed = attribute;

    var colorScale = makeColorScale(csvData);

    // update map
    d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            var value = d.properties[expressed];
            return value ? colorScale(value) : "#ccc";
        });

    // update chart
    updateChart(csvData, colorScale);
}