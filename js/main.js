// run script when page loads
window.onload = function(){

    // svg size
    var w = 900, h = 500;

    // create svg container
    var container = d3.select("body")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "container")
        .style("background-color", "rgba(0,0,0,0.1)");

    // Week 2 dataset
    var cityPop = [
        { city: "Madison", population: 233209 },
        { city: "Milwaukee", population: 594833 },
        { city: "Green Bay", population: 104057 },
        { city: "Superior", population: 27244 }
    ];

    // create circles
    var circles = container.selectAll(".circles")
        .data(cityPop)
        .enter()
        .append("circle")
        .attr("class", "circles")
        .attr("id", function(d){
            return d.city;
        })
        .attr("r", function(d){
            var area = d.population * 0.01;
            return Math.sqrt(area / Math.PI);
        })
        .attr("cx", function(d, i){
            return 90 + (i * 180);
        })
        .attr("cy", function(d){
            return 450 - (d.population * 0.0005);
        })
        .style("fill", "steelblue")
        .style("stroke", "#000");

};