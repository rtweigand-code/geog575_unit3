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

        //draw states
        var statesMap = map.selectAll(".states")
            .data(statesGeo)
            .enter()
            .append("path")
            .attr("class", "states")
            .attr("d", path);

    }
}