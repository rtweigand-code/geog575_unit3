var attrArray = ["median_income"];
var expressed = attrArray[0];

//run script when page loads
window.onload = setMap;

function setMap(){

    //map dimensions
    var width = 960,
        height = 600;

    //create svg container
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //projection (GOOD for US)
    var projection = d3.geoAlbersUsa()
        .scale(1200)
        .translate([width / 2, height / 2]);

    //path generator
    var path = d3.geoPath()
        .projection(projection);

    //load data
    var promises = [];
    promises.push(d3.csv("data/lab3_state_economic_data.csv"));
    promises.push(d3.json("data/states-10m.json"));

    Promise.all(promises).then(callback);

    function callback(data){

        var csvData = data[0];
        var states = data[1];

        console.log(csvData);
        console.log(states);

        //convert TopoJSON → GeoJSON
        var statesGeo = topojson.feature(states, states.objects.states).features;

        //join csv data to geojson
        statesGeo = joinData(statesGeo, csvData);

        //make color scale
        var colorScale = makeColorScale(csvData);

        //draw states
        var statesMap = map.selectAll(".states")
            .data(statesGeo)
            .enter()
            .append("path")
            .attr("class", "states")
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if (value){
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        //draw chart
        setChart(csvData, colorScale);

    }
}

function joinData(geoData, csvData){

    for (var i = 0; i < csvData.length; i++){
        var csvState = csvData[i];
        var csvKey = csvState.state;

        for (var a = 0; a < geoData.length; a++){
            var geoProps = geoData[a].properties;
            var geoKey = geoProps.name;

            if (geoKey === csvKey){

                attrArray.forEach(function(attr){
                    var val = parseFloat(csvState[attr]);
                    geoProps[attr] = val;
                });
            }
        }
    }

    return geoData;
}

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
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    }

    colorScale.domain(domainArray);

    return colorScale;
}

function setChart(csvData, colorScale){

    //chart dimensions
    var chartWidth = 500,
        chartHeight = 600;

    //create chart svg
    var chart = d3.select("body")
        .append("svg")
        .attr("class", "chart")
        .attr("width", chartWidth)
        .attr("height", chartHeight);

    //y scale
    var yScale = d3.scaleLinear()
        .range([0, chartHeight - 60])
        .domain([0, d3.max(csvData, function(d){
            return parseFloat(d[expressed]);
        })]);

    //draw bars
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed] - b[expressed];
        })
        .attr("class", "bars")
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .attr("height", function(d){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    //add numbers
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            return a[expressed] - b[expressed];
        })
        .attr("class", "numbers")
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        })
        .text(function(d, i){
            if (i % 5 === 0) { // show every 5th label
                return "$" + Math.round(d[expressed] / 1000) + "k";
            } else {
                return "";
            }
        });

    //add chart title
    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 30)
        .attr("class", "chartTitle")
        .text("Median Income by State");
}