/* Lab 1 - Big Ten athletic revenue map
   proportional symbols + retrieve + sequence + legends */

var map;
var attributes = [];
var minValue;
var schoolsLayer;
var currentAttribute;


// set up the map
function createMap() {

  // center on the U.S. since the schools are spread across the conference footprint
  map = L.map("map", {
    center: [40, -96],
    zoom: 4
  });

  // light basemap so the circles stand out better
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);

  // get the revenue data
  getData();
}


// grab the revenue fields from the data
function processData(data) {
  var properties = data.features[0].properties;

  for (var attribute in properties) {
    if (attribute.indexOf("Rev_") === 0) {
      attributes.push(attribute);
    }
  }

  return attributes;
}


// find smallest value for proportional symbol scaling
function calcMinValue(data) {
  var allValues = [];

  for (var feature of data.features) {
    for (var attribute of attributes) {
      var value = Number(feature.properties[attribute]);
      if (!isNaN(value)) {
        allValues.push(value);
      }
    }
  }

  minValue = Math.min(...allValues);
}


// flannery scaling for circle sizes
function calcPropRadius(attValue) {
  var minRadius = 6;
  var radius = 1.0083 * Math.pow(attValue / minValue, 0.5715) * minRadius;
  return radius;
}


// popup text for each school
function buildPopupContent(props, attribute) {
  var year = attribute.split("_")[1];

  var popupContent = "<p><b>" + props.Name + "</b></p>";
  popupContent += "<p><b>Revenue " + year + ":</b> $" + Number(props[attribute]).toLocaleString() + "</p>";

  return popupContent;
}


// make the point features into circle markers
function pointToLayer(feature, latlng, attributes) {
  var attribute = attributes[0];
  var props = feature.properties;

  var options = {
    fillColor: "#c8102e",
    color: "#111",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
  };

  var attValue = Number(props[attribute]);
  options.radius = calcPropRadius(attValue);

  var layer = L.circleMarker(latlng, options);

  var popupContent = buildPopupContent(props, attribute);

  layer.bindPopup(popupContent, {
    offset: new L.Point(0, -options.radius)
  });

  return layer;
}


// add the proportional symbols to the map
function createPropSymbols(data, attributes) {
  schoolsLayer = L.geoJSON(data, {
    pointToLayer: function (feature, latlng) {
      return pointToLayer(feature, latlng, attributes);
    }
  }).addTo(map);
}


// update the circles + popups when year changes
function updatePropSymbols(attribute) {
  currentAttribute = attribute;

  schoolsLayer.eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties[attribute]) {
      var props = layer.feature.properties;

      var radius = calcPropRadius(Number(props[attribute]));
      layer.setRadius(radius);

      var popupContent = buildPopupContent(props, attribute);
      var popup = layer.getPopup();
      popup.setContent(popupContent);

      popup.options.offset = new L.Point(0, -radius);
    }
  });

  updateLegend(attribute);
}


// sequence slider control inside Leaflet
function createSequenceControls(attributes) {

  var SequenceControl = L.Control.extend({
    options: {
      position: "bottomleft"
    },

    onAdd: function () {
      var container = L.DomUtil.create("div", "sequence-control-container");

      container.innerHTML =
        '<button class="step" id="reverse" title="Previous year">&#9664;</button>' +
        '<input class="range-slider" type="range">' +
        '<button class="step" id="forward" title="Next year">&#9654;</button>';

      // stop map from dragging when using slider/buttons
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      return container;
    }
  });

  map.addControl(new SequenceControl());

  var slider = document.querySelector(".range-slider");
  slider.max = attributes.length - 1;
  slider.min = 0;
  slider.value = 0;
  slider.step = 1;

  document.querySelectorAll(".step").forEach(function (step) {
    step.addEventListener("click", function () {
      var index = Number(slider.value);

      if (step.id === "forward") {
        index++;
        index = index > attributes.length - 1 ? 0 : index;
      } else if (step.id === "reverse") {
        index--;
        index = index < 0 ? attributes.length - 1 : index;
      }

      slider.value = index;
      updatePropSymbols(attributes[index]);
    });
  });

  slider.addEventListener("input", function () {
    var index = Number(this.value);
    updatePropSymbols(attributes[index]);
  });
}


// circle legend + year legend
function createLegend(initialAttribute) {

  var LegendControl = L.Control.extend({
    options: {
      position: "bottomright"
    },

    onAdd: function () {
      var container = L.DomUtil.create("div", "legend-control-container");

      container.innerHTML =
        '<div class="temporal-legend">' +
          '<div id="legend-year">Year: ' + initialAttribute.split("_")[1] + '</div>' +
        '</div>' +
        '<div class="symbol-legend">' +
          '<div class="legend-title">Athletic Revenue</div>' +
          '<svg id="attribute-legend" width="160" height="100">' +
            '<circle class="legend-circle" id="max" fill="#c8102e" fill-opacity="0.8" stroke="#111" cx="60"/>' +
            '<circle class="legend-circle" id="mean" fill="#c8102e" fill-opacity="0.8" stroke="#111" cx="60"/>' +
            '<circle class="legend-circle" id="min" fill="#c8102e" fill-opacity="0.8" stroke="#111" cx="60"/>' +
            '<text id="max-text" x="95" y="20"></text>' +
            '<text id="mean-text" x="95" y="45"></text>' +
            '<text id="min-text" x="95" y="70"></text>' +
          '</svg>' +
        '</div>';

      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  });

  map.addControl(new LegendControl());
  updateLegend(initialAttribute);
}


// update both the year label and circle legend
function updateLegend(attribute) {
  var year = attribute.split("_")[1];

  var yearLabel = document.getElementById("legend-year");
  if (yearLabel) {
    yearLabel.innerHTML = "Year: " + year;
  }

  var circleValues = getCircleValues(attribute);

  for (var key in circleValues) {
    var radius = calcPropRadius(circleValues[key]);
    var cy = 80 - radius;

    var circle = document.getElementById(key);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", radius);

    var text = document.getElementById(key + "-text");
    text.setAttribute("y", cy + 5);
    text.textContent = "$" + Math.round(circleValues[key]).toLocaleString();
  }
}


// calculate values to show in legend
function getCircleValues(attribute) {
  var min = Infinity;
  var max = -Infinity;
  var total = 0;
  var count = 0;

  schoolsLayer.eachLayer(function (layer) {
    var value = Number(layer.feature.properties[attribute]);
    if (!isNaN(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      total += value;
      count++;
    }
  });

  var mean = total / count;

  return {
    max: max,
    mean: mean,
    min: min
  };
}


// load the GeoJSON
function getData() {
  fetch("data/BigTen_Revenue_wide.geojson")
    .then(function (response) {
      return response.json();
    })
    .then(function (json) {
      attributes = processData(json);
      calcMinValue(json);

      createPropSymbols(json, attributes);
      createSequenceControls(attributes);
      createLegend(attributes[0]);

      currentAttribute = attributes[0];
    })
    .catch(function (error) {
      console.log("error loading geojson:", error);
    });
}


// run map when page loads
document.addEventListener("DOMContentLoaded", createMap);