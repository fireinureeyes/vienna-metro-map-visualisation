let scale = 128000;
let xc = 16.312819;
let yc = 48.215176;
const colors = ["red", "purple", "orange", "green", "brown"];
const u = ["U1", "U2", "U3", "U4", "U6"];
let flag = 0;
let h;
let expanded_h;

window.onload = function () {
    var element = d3.select("#slider").node();
    element.addEventListener("mousedown", function(){
        flag = 0;
    }, false);
    element.addEventListener("mousemove", function(){
        flag = 1;
    }, false);

    const margin = {top: 0, right: 0, bottom: 0, left: 0},
        width = 1200 - margin.left - margin.right,
        height = 550 - margin.top - margin.bottom;

    //svg
    let svg = d3.select("#container").append("svg")
        .attr("id", "svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    //tooltip
    let toolTip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .attr("opacity", 0);

    let info = d3.select("#info").append("div")
        .attr("class", "stationInfo")
        .attr("opacity", 0);

    for(let j=0; j<5; j++) {
      let i = j;
      d3.selectAll("#"+u[i]+"-text")
          .on("mouseover", function (d) {
              d3.select(this).style("font-weight", "bold");
              svg.selectAll("#path"+i).transition().duration(300)
                .attr("stroke-width", "5px")
          })
          .on("mouseout", function (d) {
            d3.select(this).style("font-weight", "normal");
              svg.selectAll("#path"+i).transition().duration(300)
                .attr("stroke-width", "1px")
          })
    }

    // set projection
    let projection = d3.geo.mercator();

    let calculateDistance = function(lat1, lon1, lat2, lon2) {
        let p = 0.017453292519943295;    // Math.PI / 180
        let c = Math.cos;
        let a = 0.5 - c((lat2 - lat1) * p)/2 +
            c(lat1 * p) * c(lat2 * p) *
            (1 - c((lon2 - lon1) * p))/2;

        let km = 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
        return (Math.round(km*1000));
    };

    let getDistanceBetweenPoints = function(station){

        //let long coordinates from current station
        let lat0 = station[0];
        let lon0 = station[1];

        let prev = station[5];
        let next = station[4];

        if(prev.length>0){
            let lat1 = prev[0];
            let lon1 = prev[1];
            prev = calculateDistance(lat0,lon0,lat1, lon1);

        }

        if(next.length>0){
            let lat2 = next[0];
            let lon2 = next[1];
            next = calculateDistance(lat0,lon0,lat2, lon2);
        }


        station[5] = prev;
        station[4] = next;

        return station;

    };

    let makeMetroStations = function (dataset, color, line, mapStyle) {


        d3.json(dataset, function (error, topo) {

            // set projection parameters
            projection
                .scale(scale)
                .center([xc, yc, "Wien"]);

            let feature = topo.features;
            let locations = [];

            for (let i = 0; i < feature.length; i++) {
                //let and lat
                let orderNumber = feature[i].properties.order;
                let geometry = feature[i].geometry.coordinates;
                let stationName = feature[i].properties.name;

                geometry.push(stationName);
                geometry.push(parseInt(orderNumber));
                locations.push(geometry);
            }


            //order array
            let locations_new = locations.slice();

            for (let j = 0; j < locations.length; j ++){
                let orderNo = locations[j][3];
                locations_new[orderNo] = locations[j];
            }

            locations = locations_new;

            //Get distance between stations
            for (let k = 0; k < locations.length; k++) {

                let nextGeometry = [];
                let prevGeometry = [];

                //there is a prev
                if(k>0){
                    let prevLat = locations[k-1][0];
                    let prevLong = locations[k-1][1];
                    prevGeometry.push(prevLat);
                    prevGeometry.push(prevLong);

                }

                //there is a next
                if(k<locations.length-1){
                    let nextLat = locations[k+1][0];
                    let nextLong = locations[k+1][1];
                    nextGeometry.push(nextLat);
                    nextGeometry.push(nextLong);

                }

                locations[k].push(nextGeometry);
                locations[k].push(prevGeometry);


                //calculate distance and overwrite geometry
                locations[k] = getDistanceBetweenPoints(locations[k]);
            }

            // add circles to svg
            svg.selectAll("circle." + line)
                .data(locations).enter()
                .append("circle")
                .attr("cx", function (d) {
                    return projection(d)[0];
                })
                .attr("cy", function (d) {
                    return projection(d)[1];
                })
                .attr("name", function (d) {
                    return d[2];
                })
                .attr("class", line + " " + mapStyle)
                .attr("r", 3)
                .attr("fill", color)
                .on("mouseover", function (d) {
                  if (expanded_h != null) {
                    d3.select("#info").transition().duration(500)
                      .style("height", expanded_h + "px")}

                    d3.select(this)
                        .transition().duration(300)
                        .attr("r", 8)
                    toolTip.transition().duration(200)
                        .style("opacity", .9);

                    toolTip.html("<p>"+d[2]+"</p>")
                        .style("left", (d3.event.pageX + 10) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")
                    info.transition().duration(200)
                        .style("opacity", .9);

                    if (d[5] == "") {
                      d[5] = "0";
                      }

                    if (d[4] == "") {
                      d[4] = "0";
                      }

                    info.html("<p><b>Station: </b>"+d[2]+"</p><p><b>Next Station in: </b>"+d[4]+" m</p><p><b>Prev Station in: </b>"+d[5]+" m</p>")
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")

                    if (expanded_h == null) {
                        expanded_h = $('#info').height();
                    }
                })
                .on("mouseout", function (d) {
                    d3.select(this)
                        .transition().duration(300)
                        .delay(100)
                        .attr("r", 3)
                    toolTip.transition().duration(500)
                        .delay(100)
                        .style("opacity", 0);

                    info.transition().duration(500)
                        .style("opacity", 0);

                    d3.select("#info").transition().duration(500)
                        .delay(1000)
                        .style("height", h + "px")
                });

        });
    };

    let makeMetroLines = function (dataset, color, line, mapStyle) {

        d3.json(dataset, function (error, topo) {

            // set projection parameters
            projection
                .scale(scale)
                .center([xc, yc, "Wien"]);

            let feature = topo.features;

            //array containing multiple arrays for locations to draw lines between
            let locations = [];

            for (let i = 0; i < feature.length; i++) {
                let geometry = feature[i].geometry.coordinates;

                if (mapStyle === "vis" && geometry.length === 1) {
                    locations.push(geometry[0]);
                }
                else {
                    locations.push(geometry);
                }
            }

            geoJSON = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "MultiLineString",
                            "coordinates": locations
                        }
                    }
                ]
            };

            var path = d3.geo.path().projection(projection);

            svg.selectAll("path." + line)
                .data(geoJSON.features)
                .enter().append("path")
                .attr("id", line + " " + mapStyle)
                .attr("d", path)
                .attr("stroke-width", "1px")
                .attr("stroke", color)
                .attr("fill", "none")
                .attr("class", line + " " + mapStyle)

        });
    };

    let drawMap = function(){
        //Map Vis Stations
        makeMetroStations("./datasets/datasets/vis/stations/u1.geojson", colors[0], "U1_v", "vis");
        makeMetroStations("./datasets/datasets/vis/stations/u2.geojson", colors[1], "U2_v", "vis");
        makeMetroStations("./datasets/datasets/vis/stations/u3.geojson", colors[2], "U3_v", "vis");
        makeMetroStations("./datasets/datasets/vis/stations/u4.geojson", colors[3], "U4_v", "vis");
        makeMetroStations("./datasets/datasets/vis/stations/u6.geojson", colors[4], "U6_v", "vis");

        //Map Geo Stations
        makeMetroStations("./datasets/datasets/geo/stations/u1.geojson", colors[0], "U1_g", "geo");
        makeMetroStations("./datasets/datasets/geo/stations/u2.geojson", colors[1], "U2_g", "geo");
        makeMetroStations("./datasets/datasets/geo/stations/u3.geojson", colors[2], "U3_g", "geo");
        makeMetroStations("./datasets/datasets/geo/stations/u4.geojson", colors[3], "U4_g", "geo");
        makeMetroStations("./datasets/datasets/geo/stations/u6.geojson", colors[4], "U6_g", "geo");

        //Map Vis Lines
        makeMetroLines("./datasets/datasets/vis/routes/u1.geojson", colors[0], "U1_v", "vis");
        makeMetroLines("./datasets/datasets/vis/routes/u2.geojson", colors[1], "U2_v", "vis");
        makeMetroLines("./datasets/datasets/vis/routes/u3.geojson", colors[2], "U3_v", "vis");
        makeMetroLines("./datasets/datasets/vis/routes/u4.geojson", colors[3], "U4_v", "vis");
        makeMetroLines("./datasets/datasets/vis/routes/u6.geojson", colors[4], "U6_v", "vis");

        //Map Geo Lines
        makeMetroLines("./datasets/datasets/geo/routes/u1.geojson", colors[0], "U1_g", "geo");
        makeMetroLines("./datasets/datasets/geo/routes/u2.geojson", colors[1], "U2_g", "geo");
        makeMetroLines("./datasets/datasets/geo/routes/u3.geojson", colors[2], "U3_g", "geo");
        makeMetroLines("./datasets/datasets/geo/routes/u4.geojson", colors[3], "U4_g", "geo");
        makeMetroLines("./datasets/datasets/geo/routes/u6.geojson", colors[4], "U6_g", "geo");
    };

    drawMap();
};

///////////////
/* MORPHING */
/////////////

//switches the states between real geographic map and abstraction
let switchMaps = function (val) {
    //create paths
    if(d3.select('svg').selectAll(".generated").size() < 5) {
        for(i=0; i<5; i++) {
            let svg = d3.select('svg')
                .append("path")
                .attr("d", d3.select("path."+u[i]+"_g").attr("d"))
                .attr("id", "path"+i)
                .attr("class", "generated")
                .attr("stroke-width", "1px")
                .attr("stroke", colors[i])
                .attr("fill", "none")
        }
    }

    //morph all 5 paths
    for(i=0; i<5; i++) {
        var morphFrom = d3.select("path."+u[i]+"_g");
        var morphTo = d3.select("path."+u[i]+"_v");
        if (flag == 1) {
            d3.select("#path"+i)
                .attr("d", transition(morphFrom.node(), morphTo.attr('d'), 1, val))
        } else {
            d3.select("#path"+i)
                .attr('d', d3.select("#path"+i).attr("d"))
                .transition().duration(1000)
                .attrTween("d", morph(transition(morphFrom.node(), morphTo.attr('d'), 1, val), 1))
        }
    }

    //hide or show parts of svg + rename text on button
    if (val == 0) {
        d3.selectAll("circle.vis").style("display", "none");
        d3.selectAll("circle.geo").style("display", "block");
    } else if (val == 1) {
        d3.selectAll("circle.geo").style("display", "none");
        d3.selectAll("circle.vis").style("display", "block");
    } else {
        d3.selectAll("circle").style("display", "none");
    }
}

//interpolate transition (pathTween)
let transition = function (d0, d1, precision, val) {
    var path0 = d0,
        path1 = path0.cloneNode(),
        n0 = path0.getTotalLength(),
        n1 = (path1.setAttribute("d", d1), path1).getTotalLength();
    //uniform sampling of distance based on specified precision.
    var distances = [0], i = 0, dt = precision / Math.max(n0, n1);
    while ((i += dt) < 1) distances.push(i);
    distances.push(1);

    //compute point-interpolators at each distance.
    var points = distances.map(function(t) {
        var p0 = path0.getPointAtLength(t * n0),
            p1 = path1.getPointAtLength(t * n1);
        return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
    });

    return "M" + points.map(function(p) { return p(val); }).join("L");
}

//interpolate transition (pathTween)
let morph = function (d1, precision) {

    return function() {
        var path0 = this,
            path1 = path0.cloneNode(),
            n0 = path0.getTotalLength(),
            n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

        //uniform sampling of distance based on specified precision.
        var distances = [0], i = 0, dt = precision / Math.max(n0, n1);
        while ((i += dt) < 1) distances.push(i);
        distances.push(1);

        //compute point-interpolators at each distance.
        var points = distances.map(function(t) {
            var p0 = path0.getPointAtLength(t * n0),
                p1 = path1.getPointAtLength(t * n1);
            return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
        });

        return function(t) {
            return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : d1;
        };
    };
}

document.onload = setTimeout(function () {
    try {
        if(d3.select('svg').selectAll(".generated").size() < 5) {
            switchMaps(0);
        }        
        h = $('#info').height();
    }
    catch(err) {
        console.log("Loading took longer than expected, retrying...");
        console.log(err);
        setTimeout(function () {
            try {
                if(d3.select('svg').selectAll(".generated").size() < 5) {
                    switchMaps(0);
                }
                h = $('#info').height();
            }
            catch(err) {
                console.log("Couldn't load the paths (tried twice)");
                console.log(err);
                setTimeout(function () {
                    try {
                        if(d3.select('svg').selectAll(".generated").size() < 5) {
                            switchMaps(0);
                        }
                        h = $('#info').height();
                    }
                    catch(err) {
                        console.log("Couldn't load the paths (tried three times, giving up!)");
                        console.log(err);
                    }

                }, 1000);
            }
        }, 1000);
    }
}, 300);
