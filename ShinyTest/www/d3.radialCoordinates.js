/*=========================================================================
 
 Name:        d3.radialCoordinates.js
 
 Author:      David Borland, The Renaissance Computing Institute (RENCI)
 
 Copyright:   The Renaissance Computing Institute (RENCI)
 
 Description: A d3 implementation of radial coordinates following the 
              reusable charts convention: http://bost.ocks.org/mike/chart/
 
 =========================================================================*/

// TODO:
// Think about changing special key mappings to use chords with just two keys.
// Interactively change axis position.
// Look at R/shiny and adding correlation features
// Add chart to center
// Pan/zoom/resize circles
// Magic lens
// Clean up filtering
// Create angular scale function, similar to linear scale, but wraps around
// Order categorical values based on selection

d3.radialCoordinates = function() {
  // Constants
  var tau = 2 * Math.PI;
  var halfPI = 0.5 * Math.PI;
  var epsilon = 1e-6;
  
      // Size
  var margin = { top: 10, left: 10, bottom: 10, right: 10 },      
      width = 800,
      height = 800,
      
      // Normalized radii
      innerRadius = 0.5,
      outerRadius = 1.0,
      
      // Rotation angle
      rotateAngle = 90, 
      
      // Data
      data = [],
      axes = [],
      relations = [],
      curves = [],
      pca = [],
      pcaData = [],
      // XXX: Combine ribbons and ribbon overlays into one data structure?
      ribbons = [],
      ribbonOverlays = [],
      
      // Scales
      radiusScale = d3.scale.linear().domain([0, 1]),
      // Degrees are used by svg transform, radians by javascript trig functions.  They are offset by 90 degrees.
//      degreeScale = d3.scale.ordinal().rangePoints([0, 360]),        
//      radianScale = d3.scale.ordinal().rangePoints([-1.5 * Math.PI, halfPI]),
      degreeScale = d3.scale.ordinal().rangePoints([-90, 270]),        
      radianScale = d3.scale.ordinal().rangePoints([0, tau]),
      weightScale = d3.scale.linear().domain([0, 1]).range([0, outerRadius - innerRadius]),
      startScale = d3.scale.linear().domain([0, 1]).range([outerRadius - innerRadius, outerRadius]),
      
      // Start with empty selections
      svg = d3.select(),
      axis = d3.select(),
      curve = d3.select(),
      chord = d3.select(),
      pcaPoint = d3.select(),
      label = d3.select(),
      axisNameLabel = d3.select(),
      axisMinMaxLabel = d3.select(),
      axisValueLabel = d3.select(),
      tempLabel = d3.select(),
      
      // Parameters
      minOpacity = 0.1,
      maxOpacity = 0.5,
      axisOpacity = 0.5,
      labelAngle = 10,      
      currentGroup = 0,
      transitionTime = 750,
      curveSpread = 1 / 3,
      discreteThreshold = 10,
      axisWidth = 10,
      labelOffset = 40,
      showRibbons = false,
      ribbonOpacity = 0.25,
      ribbonOutlineOpacity = 0.5,
      ribbonOverlayOpacity = 0.5,
      useFilter = false,
      easeType = "sin-in-out",
      minRelation = 0.75,
      chordWidth = 0.25,
      decorateAxes = true,
      
      // Colors
      cursor,
      groupColors = ["grey", "firebrick", "mediumblue", "darkgreen"],
      groupColor = d3.scale.ordinal(),
      groupColorInvert = d3.scale.ordinal(),
      numericAxisColor = d3.scale.quantile()
          .range(["mediumblue", "grey", "grey", "firebrick"]),
      numericAxisOpacity = d3.scale.quantile()
          .range([maxOpacity, minOpacity, minOpacity, maxOpacity]),
      discreteAxisColor = d3.scale.quantize()
          .range(["mediumblue", "grey", "grey", "firebrick"]),
      discreteAxisOpacity = d3.scale.quantize()
          .range([maxOpacity, minOpacity, minOpacity, maxOpacity]),
      categoricalAxisColor,
      valueOpacity = d3.scale.linear().domain([0, 1]).range([0.5, 1]),
           
      // Hermite spline interpolator
      hermite = hermiteSpline();
      
  // Create a closure that contains the above variables
  function rc(selection) {
    selection.each(function(d) {    
      data = d;    
       
      // Select the svg element, if it exists
      svg = d3.select(this).selectAll("svg").data([data]);
      
      var center = d3.min([width, height]);
      
      // Otherwise create the skeletal chart
      var gTemp = svg.enter().append("svg")
        .append("g")
          .call(d3.behavior.zoom().translate([0,0]).scaleExtent([1, 2.5]).on("zoom", function() {
              d3.select(this).attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            }));
            
      var gMain = gTemp.append("g")
          .attr("id", "gMain")
          .attr("transform", "translate(" + (center / 2) + "," + (center / 2) + ")rotate(" + rotateAngle + ")");
  
      var gCenter = gTemp.append("g")
          .attr("id", "gCenter")
          .attr("transform", "translate(" + (center / 2) + "," + (center / 2) + ")rotate(" + rotateAngle + ")");
      
      // Update the outer size
      svg .attr("width", width)
          .attr("height", height);
  
      // Set initial colors
      setGroupColor(groupColors);
                           
      // Generate the axis data    
      createAxes();
      
      // Set the angle scale domain.  Need to add an extra dummy dimension for this.
      var domain = [].concat(axes.map(function(d) { return d.name; }), [0]);
      degreeScale.domain(domain);
      radianScale.domain(domain);
      
      // Convert numeric data from strings to numbers
      // XXX: Eventually make this a standalone function that can be used by other charts
      data.forEach(function(d) { axes.forEach(function(e) { if (e.type !== "categorical") d[e.name] = +d[e.name]; }); });      
      resetGroups();
          
      // Update the radius scale
      radiusScale.range([0, Math.min(width - margin.left - margin.right, 
          height - margin.top - margin.bottom) / 2 - maxAxisLabelLength() * 4 * Math.sin(d2r(labelAngle)) - labelOffset]); 
      
      // Generate curves
      createCurves();
      
      // Add groups for elements to ensure correct z order
      gMain.append("g").attr("class", "chord").attr("transform", "rotate(90)");
      gCenter.append("g").attr("class", "pcaPoint");
      gMain.append("g").attr("class", "ribbon");
      gMain.append("g").attr("class", "quartile");
      gMain.append("g").attr("class", "curve");
      gMain.append("g").attr("class", "median");
      gMain.append("g").attr("class", "ribbonOutline");
      gMain.append("g").attr("id", "circle");
      gCenter.append("g").attr("id", "centerCircle");
      gMain.append("g").attr("class", "axis");
      gMain.append("g").attr("class", "label");
           
      // Draw an axis for each dimension
      drawAxes();

      // Draw curves
      drawCurves();   
      
      // Draw circles 
      drawCircles();    
      makeCursor();          
      
      // Create filters
      createFilters();
      applyFilter(useFilter);
/*      
      // Add fisheye 
      var fisheye = d3.fisheye.circular()
          .radius(50)
          .distortion(5);
          
      var fishEyeCircle = g.append("circle")
          .attr("id", "fisheye")
          .attr("cx", fisheye.focus()[0])
          .attr("cy", fisheye.focus()[1])
          .attr("r", fisheye.radius())
          .attr("fill", "none")
          .attr("stroke", "#ccc");

      g.on("mousemove", function() {
        fisheye.focus(d3.mouse(this));
        
        fishEyeCircle
            .attr("cx", fisheye.focus()[0])
            .attr("cy", fisheye.focus()[1]);
            
        var path = d3.svg.line().interpolate("linear");
        
        curve.each(function(d) { d.fisheye = d.curve.map(function(e) { var f = fisheye({ x: e[0], y: e[1] }); return [f.x, f.y]; }); })
            .attr("d", function(d) { return path(d.fisheye); });
      });
*/               
    }); 
  };
  
  function setGroupColor(colors) {
    groupColor
        .domain(d3.range(-1, colors.length - 1))
        .range(colors);
    
    groupColorInvert
        .domain(groupColor.range())
        .range(groupColor.domain());

    currentGroup = 0;
  }
  
  function makeCursor() {
    cursor = document.createElement('canvas'),
        ctx = cursor.getContext('2d');

    var h = 18;
    var w = h * 0.7;
    
    var h2 = Math.sqrt(h*h - w*w);
        
    cursor.width = w;
    cursor.height = h;
    
    ctx.strokeStyle = "black";
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1;

    ctx.moveTo(1,1);
    ctx.lineTo(1, h-1);
    ctx.lineTo(w-1, h2);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();    
    
    setCursorColor(groupColor(currentGroup));
  };
  
  function setCursorColor(color) {
    var ctx = cursor.getContext('2d');
    
    ctx.fillStyle = color;
    ctx.fill();
    
    d3.selectAll(".background")
        .style("cursor", "url(" + cursor.toDataURL() + "), auto");

    d3.selectAll("#centerCircle")
        .style("cursor", "url(" + cursor.toDataURL() + "), auto");

    d3.selectAll(".curve")
        .style("cursor", "url(" + cursor.toDataURL() + "), auto");  

    d3.selectAll(".pcaPoint")
        .style("cursor", "url(" + cursor.toDataURL() + "), auto");
  }
  
  function orderCategorical() {
    var categorical = axes.filter(function(d) { return d.type === "categorical" && d.unique.length > 2; });
    
    categorical.forEach(function(d) { 
      d.unique.forEach(function(e) {
        var g = groupColor.domain().map(function() { return 0; });
        data.forEach(function(f) {
          if (f.group < 0) return;
          
          var v = f[d.name];
          if (v === e.value) {
            g[f.group]++;
          }
        });   
        
        var total = d3.sum(g);
        
        if (total === 0) {
          e.group = g.length;
          e.groupWeight = 0;
          return;
        }
        
        g.forEach(function(d) { d /= total; });
        
        e.group = 0;
        e.groupWeight = g[0];
        for (var i = 1; i < g.length; i++) {
          if (g[i] > e.groupWeight) {
            e.group = i;
            e.groupWeight = g[i];
          }
        }
      });
      
      d.unique.sort(function(a, b) { 
        if (a.group < b.group) return 1;
        if (a.group > b.group) return -1;        
        var diff = a.groupWeight - b.groupWeight;
        return a.group % 2 ? -diff : diff;
      });
    
      var weight = d.unique.map(function(e) { return e.weight * 2; });
      var start = weight.reduce(function(e, f, i, a) { e.push(i === 0 ? 0 : e[i-1] + a[i-1]); return e; }, []); 
      
      d.unique.forEach(function(d, i) { d.start = startScale(start[i]); });
      d.scale
          .domain(d.unique.map(function(e) { return e.value; }))
          .range(d.unique.map(function(e) { return e.start + e.weight / 2; }));
    }); 
      
    
    svg.select(".axis").selectAll("g").filter(function(d) { return d.type === "categorical"; }).call(function(selection) {       
      selection.each(function() {    
        d3.select(this).selectAll("rect").transition()
            .duration(transitionTime)
            .ease(easeType)
            .attr("y", function(d) { return radiusScale(d.start); });  
      });     
    });
    
    svg.selectAll(".categoricalValueLabel").call(function(selection) {        
      selection.each(function() { 
        d3.select(this).transition()
            .duration(transitionTime)
            .ease(easeType)
            .attr("transform", function(d) { return "translate(0," + (radiusScale(d.start)) + ")"; });  
      });     
    });
 
    createCurves();
    drawCurves(transitionTime);
    
    // Return true in case called from timer
    return true;
 /*   
    out.values = values;
        
          var unique = d3.set(values).values();          
          var weight = unique.map(function(d) { return values.filter(function(e) { return e === d;  }).length / values.length; });
          var start = weight.reduce(function(d, e, i, a) { d.push(i === 0 ? 0 : d[i-1] + a[i-1]); return d; }, []);  

          out.unique = unique.map(function(d, i) { return { value: d, weight: weightScale(weight[i]), start: startScale(start[i]), labelWeight: 0.5 }; });          
          out.scale = d3.scale.ordinal()
              .domain(unique)
              .range(out.unique.map(function(d) { return d.start + d.weight / 2; }));
          break;
*/    
    
 /*       
    // Get the categorical axes and set label weights for each value                  
    var categorical = axes.reduce(function(d, e) { if (e.type === "categorical") d.push(e); return d; }, []);
    categorical.forEach(function(d) { d.unique.forEach(function(e) { e.labelWeight = 0; }); });

    // Generate weights
    data.forEach(function(d) {
      if (d.tempGroup >= 0) {
        categorical.forEach(function(e) { 
          var v = d[e.name];
          for (var j = 0; j < e.unique.length; j++) {
            if (v === e.unique[j].value) {
              e.unique[j].labelWeight++;
            }
          }
        });
      }
    });
          
    // Normalize weights
    var maxLabelWeight = categorical.map(function(d) { return d3.max(d.unique.map(function(e) { return e.labelWeight; })); });        
    categorical.forEach(function(d, i) { d.unique.forEach(function(e) { e.labelWeight = maxLabelWeight[i] > 0 ? e.labelWeight / maxLabelWeight[i] : 0.5; }); });    
 */    
  }
  
  function createAxes() {
    axes = d3.keys(data[0]).filter(function(d) { return d !== "" && d !== "group" && d !== "tempGroup"; }).map(function(d) {
      var values = data.map(function(e) { return e[d]; });        
      var unique = d3.set(values).values();
      var numeric = values.map(function(e) { return !isNaN(+e); }).reduce(function(e, f) { return e && f; });
      var type = numeric ? unique.length <= discreteThreshold ? "discrete" : "continuous" : "categorical";
      
      var out = {};
      out.type = type;
      out.name = d;
      
      if (decorateAxes) {
        switch (type) {
          case "continuous":
            out.values = values.map(function(d) { return +d; }).sort(d3.ascending);
            out.unique = d3.set(values).values().map(function(d) { return +d; }).sort(d3.ascending)
                .map(function(d) { return { value: d }; });
            out.scale = d3.scale.linear()
                .domain(d3.extent(out.values))
                .range([innerRadius, outerRadius]);
            break;

          case "discrete":          
            out.values = values.map(function(d) { return +d; }).sort(d3.ascending);

            var unique = d3.set(values).values().map(function(d) { return +d; }).sort(d3.ascending);           
            var minDifference = unique.length > 1 ? unique.reduce(function(d, e, i, a) { return i < a.length - 1 ? Math.min(d, a[i+1] - e) : d; }, unique[1] - unique[0]) : 0;          
            var numDiscrete = d3.range(unique[0], unique[unique.length - 1] + minDifference * 0.9, minDifference).length;
            var range = unique[unique.length - 1] - unique[0];          
            var height = 1 / numDiscrete;
            var weight = unique.map(function(d) { return out.values.filter(function(e) { return e === d;  }).length / values.length; });
            var start = unique.map(function(d) { return (d - unique[0]) / range * (1 - height); });

            out.unique = unique.map(function(d, i) { return { value: d, weight: weightScale(weight[i]), start: startScale(start[i]) }; });
            out.numDiscrete = numDiscrete;          
            out.scale = d3.scale.linear()
                .domain(unique)
                .range(out.unique.map(function(d) { return d.start + weightScale(height) / 2; }));
            break;

          case "categorical":
            out.values = values;

            var unique = d3.set(values).values();          
            var weight = unique.map(function(d) { return values.filter(function(e) { return e === d;  }).length / values.length; });
            var start = weight.reduce(function(d, e, i, a) { d.push(i === 0 ? 0 : d[i-1] + a[i-1]); return d; }, []);  

            out.unique = unique.map(function(d, i) { return { value: d, weight: weightScale(weight[i]), start: startScale(start[i]), labelWeight: 0.5 }; });          
            out.scale = d3.scale.ordinal()
                .domain(unique)
                .range(out.unique.map(function(d) { return d.start + d.weight / 2; }));
            break;
        }
      }
      else {
        switch (type) {
          case "continuous":
          case "discrete":
              out.values = values.map(function(d) { return +d; }).sort(d3.ascending);
              out.unique = d3.set(values).values().map(function(d) { return +d; }).sort(d3.ascending)
                  .map(function(d) { return { value: d }; });
              out.scale = d3.scale.linear()
                  .domain(d3.extent(out.values))
                  .range([innerRadius, outerRadius]);
              break;
          
          case "categorical":
              out.values = values;

              var unique = d3.set(values).values();          
              var weight = unique.map(function(d) { return values.filter(function(e) { return e === d;  }).length / values.length; });
              var start = unique.map(function(d, i, a) { return i / (a.length - 1); });  

              out.unique = unique.map(function(d, i) { return { value: d, weight: weightScale(weight[i]), start: startScale(start[i]), labelWeight: 0.5 }; });          
              out.scale = d3.scale.ordinal()
                  .domain(unique)
                  .range(out.unique.map(function(d) { return d.start; }));
              break;
        }
      }

      return out; 
    });
  };
  
  function createCurves() {
    var scaleData = data.map(function(d) {
      out = {};
      axes.forEach(function(a) { out[a.name] = a.scale(d[a.name]); });
      return out;
    });
    
    var offsetData = data.map(function(d, i) {
      out = {};
      axes.forEach(function(a, j) { 
        switch(a.type) {
          case "continuous":
            out[a.name] = 0;
            break;
            
          case "discrete":          
          case "categorical":
            var a1 = axes[j === 0 ? axes.length - 1 : j - 1];
            var a2 = axes[j === axes.length - 1 ? 0 : j + 1];       
            out[a.name] = scaleData[i][a1.name] + scaleData[i][a2.name];
            break;
        }
      });
      return out;
    });
    
    axes.filter(function(a) { return a.type === "categorical" || a.type === "discrete"; }).forEach(function(a) {
      a.unique.forEach(function(u) {
        u.offsets = [];
        offsetData.forEach(function(d, i) { if (data[i][a.name] === u.value) u.offsets.push({ offset: d[a.name], index: i }); });
        u.offsets.sort(function(a, b) { return a.offset < b.offset ? -1 : a.offset > b.offset ? 1 : a.index < b.index ? -1 : 1; });
      });
    });           
         
    var spreadData = data.map(function(d, i) {
      out = {};
      axes.forEach(function(a, j) {
        if (decorateAxes) {
          switch (a.type) {
            case "continuous":
              out[a.name] = scaleData[i][a.name];
              break;

            case "discrete":                
              var max = d3.max(a.unique.map(function(e) { return e.offsets.length; }));
              var u = a.unique.filter(function(e) { return e.value === d[a.name]; })[0]; 
              var r = u.offsets.map(function(e) { return e.index; }).indexOf(i) / u.offsets.length;             
              out[a.name] = scaleData[i][a.name] + (-curveSpread / 2 + r * curveSpread) * 1 / a.unique.length * weightScale(u.offsets.length / max);
              break;

            case "categorical":                
              var u = a.unique.filter(function(e) { return e.value === d[a.name]; })[0]; 
              var r = u.offsets.map(function(e) { return e.index; }).indexOf(i) / u.offsets.length;             
              out[a.name] = scaleData[i][a.name] + (-curveSpread / 2 + r * curveSpread) * u.weight;
              break;
          }
        }
        else {
          out[a.name] = scaleData[i][a.name];
        }
      });
      return out;
    });
  
    curves = spreadData.map(function(d, i) {
      // XXX: Should use p2c here
      
      // Get the polar coordinates
      var polar = axes.map(function(a, i) { 
        return { r: radiusScale(d[a.name]), 
                 a: radianScale(a.name) }; 
      });          
      
      // Wrap around
      polar.push(polar[0]);
      
      // Get the cartesian coordinates and tangents
      var xy = polar.map(function(p) { return [ p.r * Math.cos(p.a), p.r * Math.sin(p.a) ]; }); 
      var t = polar.map(function(p) { return [ -radiusScale(Math.sin(p.a)), radiusScale(Math.cos(p.a)) ]; });
      
      // Bind the data and curve
      return { data: data[i], curve: hermite(xy, t) };
    });
    
    updateCurves();
  };
  
  function createRibbons() {
    // Add curves to each current group
    var groups = groupColor.domain().slice(1).map(function(d) { return []; });     
    curves.forEach(function(d) { if (d.data.tempGroup >= 0) groups[d.data.tempGroup].push(d); });     
    groups = groups.filter(function(d) { return d.length > 0; });
    
    // Store cartesian and polar representations for each point, per curve
    var points = groups.map(function(d) {
      return d.map(function(e) { return e.curve.map(function(f) { return { c: f, p: c2p(f) }; }); });
    });
    
    // Make last points have 2*PI instead of 0 so that the angular arithmetic works below, and pad with extra point
    points.forEach(function(d) {
      d.forEach(function(e) { e[e.length - 1].p[1] = tau; });
      d.forEach(function(e) { e.push({ c: [e[1].c[0], e[1].c[1]], p: [e[1].p[0], e[1].p[1]] }); });
      d.forEach(function(e) { e[e.length - 1].p[1] += tau; });
    });
    
    function createBoundaryLine(d, comparison) {
      // Assumptions:
      // All curves are aligned at the first point in each curve 
      
      // Add boundary indeces to each curve
      // XXX: Can move this above, where cartesian and polar points are added.  Would still need to initialize here
      var curves = d.map(function(e) { return { c: e, b0: 1, b1: 1 }; });
 
      // Find the starting point
      var p1 = curves.reduce(function(e, f, i) { return comparison(e.c[0].p[0], f.c[0].p[0]) ? e : f; }).c[0];
      var p2;
       
      // Initialize points that will be returned
      var p = [p1];
      
      // Find baseline points    
      do {   
        // Update left bracket
        curves.forEach(function(e) {
          for (var i = e.b0; i < e.c.length; i++) {
            if (e.c[i].p[1] > p1.p[1]) {
              e.b0 = i;
              break;
            }
          }
        });

        // Split into curves that share p1 and those that don't      
        var p1in = [];
        var p1out = [];        
        curves.forEach(function(e) {
          if (Math.abs(pointLineLocation(p1.c, e.c[e.b0 - 1].c, e.c[e.b0].c)) < epsilon) {
            p1in.push(e);
          }
          else {
            p1out.push(e);
          }
        });
        
        // Initialize candidate point to compare against.  
        // There should always be at least one point in p1in.  If not, check epsilon value.
        p2 = p1in[0].c[p1in[0].b0];   

        // Find first bracket point with maximum/minimum angle from current candidate segment.
        // Break ties by closest point.
        p1in.forEach(function(e) {
          var p = e.c[e.b0];
          var test = pointLineLocation(p.c, p1.c, p2.c);
          if (test === 0) {
            p2 = p.p[1] < p2.p[1] ? p : p2;
          }
          else {
            p2 = comparison(test, 0) ? p : p2;
          }
        });            
           
        // Update right brackets
        p1out.forEach(function(e) {    
          for (var i = e.b0; i < e.c.length; i++) {
            if (e.c[i].p[1] >= p2.p[1]) {
              e.b1 = i;
              break;
            }
          }
        }); 
      
        // Find intersection points
        var ix = [];    
        p1out.forEach(function(e) {
          for (var i = e.b0; i <= e.b1; i++) {
            // Check if above or below line
            var p = e.c[i];
            if (comparison(pointLineLocation(p.c, p1.c, p2.c), 0)) {
              // Compute intersection
              var ip = lineSegmentIntersectionPoint(p1.c, p2.c, e.c[i - 1].c, p.c);
              if (ip) {
                ix.push({ c: ip, p: c2p(ip) });
                break;
              }
            }
          }
        });
     
        if (ix.length > 0) {     
          // Find first intersection point
          p2 = ix.reduce(function(e, f) { return e.p[1] < f.p[1] ? e : f; });
        }
        
        p.push(p2);
        p1 = p2;
      } while (p1.p[1] < tau);
      
      return p;
    }
    
    // Create baseline and topline
    var p0 = points.map(function(d, i) { return createBoundaryLine(d, function(a, b) { return a < b; }); });
    var p1 = points.map(function(d, i) { return createBoundaryLine(d, function(a, b) { return a > b; }); }); 

    // Combine    
    return p1.map(function(d, i) { 
      var p = [{ p0: p0[i][0].c, p1: p1[i][0].c }];
      for (var j = 1, k = 1; j < p0[i].length || k < p1[i].length;) {
        var pj = p0[i][j],
            pk = p1[i][k];

        if (Math.abs(pj.p[1] - pk.p[1]) < epsilon) {
          p.push({ p0: pj.c, p1: pk.c });
          j++;
          k++;
        }
        else if (pj.p[1] < pk.p[1]) {
          // XXX: Ray line intersection would be better here
          p.push({ p0: pj.c, p1: lineSegmentIntersectionPoint(pj.c, [pj.c[0] * 2, pj.c[1] * 2], p1[i][k - 1].c, pk.c) });
          j++;
        }
        else {
          // XXX: Ray line intersection would be better here
          p.push({ p0: lineSegmentIntersectionPoint(pk.c, [0, 0], p0[i][j - 1].c, pj.c), p1: pk.c });
          k++;
        }
      } 
      
      p.group = groups[i][0].data.tempGroup;
      
      return p;
    });       
/*
    // KEEP FOR COMPARISON
  
    var extent = groups.map(function(d, i) {
      if (!d.length) return [];

      var e = [];        
      e.group = d[0].data.tempGroup;

      for (var j = 0; j < d[0].curve.length; j++) { 
        e.push({ min: d[0].curve[j], max: d[0].curve[j] });
        for (var i = 1; i < d.length; i++) {
          var v = d[i].curve[j];
          if (distance(v) < distance(e[j].min)) e[j].min = v;
          if (distance(v) > distance(e[j].max)) e[j].max = v;
        }
      } 

      return e;
    });
    
    return extent;
*/    
  }
  
  function matchRibbons(ribbon0, ribbon1) {
    // Recompute polar coordinates
    // XXX: probably better to just keep c and p for ribbon data
    function mapRibbon(d) { return { p0: { c: d.p0, p: c2p(d.p0) }, p1: { c: d.p1, p: c2p(d.p1) } }; }
    r0 = ribbon0.map(mapRibbon);
    r1 = ribbon1.map(mapRibbon);
    
    r0[r0.length - 1].p0.p[1] = r0[r0.length - 1].p1.p[1] = tau;
    r1[r1.length - 1].p0.p[1] = r1[r1.length - 1].p1.p[1] = tau;
    
    var r = { r0: [{ p0: r0[0].p0.c, p1: r0[0].p1.c }], 
              r1: [{ p0: r1[0].p0.c, p1: r1[0].p1.c }] };
    for (var j = 1, k = 1; j < r0.length || k < r1.length;) {
      var rj = r0[j],
          rk = r1[k];

      if (Math.abs(rj.p0.p[1] - rk.p0.p[1]) < epsilon) {
        r.r0.push({ p0: rj.p0.c, p1: rj.p1.c });
        r.r1.push({ p0: rk.p0.c, p1: rk.p1.c });
        j++;
        k++;
      }
      else if (rj.p0.p[1] < rk.p0.p[1]) {
        r.r0.push({ p0: rj.p0.c, p1: rj.p1.c });          
        var cj = [rj.p1.c[0] * 20, rj.p1.c[1] * 20];
        r.r1.push({ p0: lineSegmentIntersectionPoint([0, 0], cj, r1[k - 1].p0.c, rk.p0.c),
                    p1: lineSegmentIntersectionPoint([0, 0], cj, r1[k - 1].p1.c, rk.p1.c) });
        j++;
      }
      else {        
        var ck = [rk.p1.c[0] * 20, rk.p1.c[1] * 20];
        r.r0.push({ p0: lineSegmentIntersectionPoint([0, 0], ck, r0[j - 1].p0.c, rj.p0.c),
                    p1: lineSegmentIntersectionPoint([0, 0], ck, r0[j - 1].p1.c, rj.p1.c) });
        r.r1.push({ p0: rk.p0.c, p1: rk.p1.c });
        k++;  
      }
    }
    
    return r;
  }
  
  function createRibbonOverlays() {
    // XXX: Plan:
    // Use median and quartile values at axes.  In between, add points at each ribbon point, with
    // radius determined by interpolating between percentage distance at axes.
    
    // Add curves to each current group
    var groups = groupColor.domain().slice(1).map(function(d) { return []; });     
    curves.forEach(function(d) { if (d.data.tempGroup >= 0) groups[d.data.tempGroup].push(d); });     
    groups = groups.filter(function(d) { return d.length > 0; });
    
    // Store cartesian and polar representations for each curve point at the axes
    var points = groups.map(function(d) {
      return d.map(function(e) { 
        return e.curve.filter(function(f, i) { return i % hermite.steps() === 0; })
            .map(function(f) { return { c: f, p: c2p(f) }; }); 
      });
    });
     
    // Make last points have 2*PI instead of 0 so that the angular arithmetic works below
    points.forEach(function(d) {
      d.forEach(function(e) { e[e.length - 1].p[1] = tau; });
    });
    
    // Store cartesian and polar representations for each ribbon point
    var ribbonPoints = ribbons.sort(function(a, b) { return a.group - b.group; })
        .map(function(d) { return d.map(function(e) { 
          var p0 = { c: e.p0, p: c2p(e.p0) }; 
          var p1 = { c: e.p1, p: c2p(e.p1) };
          return { p0: p0, p1: p1 };
        }); });
      
    // Make last points have 2*PI instead of 0 so that the angular arithmetic works below      
    ribbonPoints.forEach(function(d) {
      d[d.length - 1].p0.p[1] = d[d.length - 1].p1.p[1] = tau;
    });
    
    function computeQuartileLine(group, q) {
      // Get the points at each axis
      var d = points[group];
      var p = [];
      for (var j = 0; j < d[0].length; j++) {
        // Find the radius for each curve at this axis
        var r = [];
        for (var k = 0; k < d.length; k++) {
          r.push(d[k][j].p[0]);
        }
        // Angle should be the same for all
        var a = d[0][j].p[1];

        // Compute the quantile
        r.sort(d3.ascending);
        p.push([d3.quantile(r, q), a]);
      }
      
      d = ribbonPoints[group];
      var p2 = [];
      for (var j = 0, k1 = 0, k2 = 0; j < p.length - 1; j++) {
        // Get the angles for the current two axes
        var a1 = p[j][1],
            a2 = p[j+1][1];
        
        // Find the ribbon index at the second axis
        for (; k2 < d.length && d[k2].p0.p[1] < a2-epsilon; k2++ );
        
        // Get the fractional values
        var f1 = (p[j][0] - d[k1].p0.p[0]) / (d[k1].p1.p[0] - d[k1].p0.p[0]),
            f2 = (p[j+1][0] - d[k2].p0.p[0]) / (d[k2].p1.p[0] - d[k2].p0.p[0]);
        
        // Add values to p2
        var s = d3.scale.linear()
            .domain([a1, a2])
            .range([f1, f2]);
        for (var k = k1; k <= k2; k++) {
          var f = s(d[k].p0.p[1]),
              p0 = d[k].p0.c,
              p1 = d[k].p1.c;
          p2.push([ p0[0] + f * (p1[0] - p0[0]), p0[1] + f * (p1[1] - p0[1]) ]);
        }
        
        // Update k1
        k1 = k2;
      }
      
      return p2;
    }
    
    return points.map(function(d, i) {
      var q1 = computeQuartileLine(i, 0.25);
      var m = computeQuartileLine(i, 0.5);
      var q3 = computeQuartileLine(i, 0.75);
      
      var p = [];
      for (var j = 0; j < m.length; j++) {
        p.push({p0: q1[j], m: m[j], p1: q3[j] });
      }

      p.group = groups[i][0].data.tempGroup;
      return p;
    });
  }
  
  function resetGroups() { 
    data.forEach(function(d) { d.group = d.tempGroup = -1; });
  };
  
  function drawAxes() {
    // Remove current axes
    axis.remove();
  
    if (decorateAxes) {
      // Draw the axes
      axis = svg.select(".axis").selectAll("axis")
          .data(axes)
        .enter().append("g")
          .call(rcAxis());
    }
    else {
      axis = svg.select(".axis").selectAll("axis")
          .data(axes)
        .enter().append("g")
          .attr("transform", function(d) { return "rotate(" + degreeScale(d.name) + ")"; });
  
      axis.append("line")
          .attr("y1", radiusScale(innerRadius))
          .attr("y2", radiusScale(outerRadius))        
          .on("mouseover", function(d) {
            d3.select(this).style("stroke", "grey");
            highlightChords(d);
          })
          .on("mouseout", function() {
            d3.select(this).style("stroke", "black");
            highlightChords();
          })
          .on("click", function(d, i) {
            var m = data.map(function(e) { return e[d.name]; }); 

            var scale = d3.scale.quantile()
                .domain(m)
                .range([1, 0, 0, 0]);

            valueClick(data.map(function(e) { return scale(e[d.name]); }));
          });
    }

    drawLabels();
  };
  
  function drawLabels() {     
    // Remove current labels
    label.remove();
          
    // Draw labels for each axis
    label = svg.select(".label").selectAll("label")
        .data(axes)
      .enter().append("g")
        .call(rcAxisLabel());
        
    // Store selections for labels
    axisNameLabel = label.selectAll(".nameLabel");
    axisMinMaxLabel = label.selectAll(".minMaxLabel");
    axisValueLabel = label.selectAll(".valueLabel");   
  
    flipLabels(rotateAngle);
  }
  
  function drawCurves(time) {   
    if (!arguments.length) time = 0;
    
    // XXX: Does there neeed to be a separate drawCurves and updateCurves?
    var path = d3.svg.line().interpolate("linear");
//          .interpolate("cardinal");

    var groupCounts = groupColor.domain().slice(1).map(function() { return 0; });    
    curves.forEach(function(d) { if (d.data.group >= 0) groupCounts[d.data.tempGroup]++; });
    function curveStrokeOpacity(d) { return d.data.tempGroup < 0 ? minOpacity : groupCounts[d.data.tempGroup] <= 1 && showRibbons ? d3.max([ribbonOpacity, ribbonOutlineOpacity, ribbonOverlayOpacity, maxOpacity]) : maxOpacity; }; 
    //function curveStrokeOpacity(d) { return d.data.tempGroup < 0 ? minOpacity : maxOpacity; }; 

    // Draw curves
    curve = svg.select(".curve").selectAll("path")
        .data(curves);
 
    if (time > 0) {
      curve.transition()
          .duration(time)
          .ease(easeType)
          .attr("d", function(d) { return path(d.curve); })
          .style("stroke", function(d) { return groupColor(d.data.tempGroup); })
          .style("stroke-opacity", function(d) { return curveStrokeOpacity(d); });
          
      curve.enter().append("path")
          .attr("d", function(d) { return path(d.curve); })
          .style("stroke", function(d) { return groupColor(d.data.tempGroup); })
          .style("stroke-opacity", 0)
        .transition()
          .duration(time)
          .ease(easeType)
          .style("stroke-opacity", function(d) { return curveStrokeOpacity(d); });
      
      curve.exit().transition()
          .duration(time)
          .ease(easeType)
          .style("stroke-opacity", 0)
          .remove();
    }
    else {
      curve.attr("d", function(d) { return path(d.curve); })
          .style("stroke", function(d) { return groupColor(d.data.tempGroup); })
          .style("stroke-opacity", function(d) { return curveStrokeOpacity(d); });
          
      curve.enter().append("path")
          .attr("d", function(d) { return path(d.curve); })
          .style("stroke", function(d) { return groupColor(d.data.tempGroup); })
          .style("stroke-opacity", function(d) { return curveStrokeOpacity(d); });
      
      curve.exit().remove();  
    }
  };
  
  function drawRibbons(time) {       
    if (!arguments.length) time = 0;
    
    if (!showRibbons) {
      if (time > 0) {
        svg.select(".ribbon").selectAll("path").transition()
            .duration(time)
            .ease(easeType)
            .style("fill-opacity", 0)
            .remove();
    
        svg.select(".ribbonOutline").selectAll("path").transition()
            .duration(time)
            .ease(easeType)
            .style("stroke-opacity", 0)
            .remove();
    
        svg.select(".quartile").selectAll("path").transition()
            .duration(time)
            .ease(easeType)
            .style("fill-opacity", 0)
            .remove();
    
        svg.select(".median").selectAll("path").transition()
            .duration(time)
            .ease(easeType)
            .style("stroke-opacity", 0)
            .remove();
      }
      else {
        svg.select(".ribbon").selectAll("path").remove(); 
        svg.select(".ribbonOutline").selectAll("path").remove();        
        svg.select(".quartile").selectAll("path").remove();
        svg.select(".median").selectAll("path").remove();
      }
          
      return; 
    }
	
    if (curves.length > 0) {
      // Create ribbons based on currently selected curves
      var oldRibbons = ribbons.slice();
      ribbons = createRibbons();
      
      var oldRibbonOverlays = ribbonOverlays.slice();
      ribbonOverlays = createRibbonOverlays();
                             
      var path = d3.svg.area()
          .interpolate("linear")
          .x0(function(d) { return d.p0[0]; })
          .y0(function(d) { return d.p0[1]; })
          .x1(function(d) { return d.p1[0]; })
          .y1(function(d) { return d.p1[1]; });
  
      var medianPath = d3.svg.line()
          .interpolate("linear")
          .x(function(d) { return d.m[0]; })
          .y(function(d) { return d.m[1]; });
                             
      function ribbonTween(transition) { 
        transition.attrTween("d", function(d, i) {
          var matchedRibbons = matchRibbons(oldRibbons.filter(function(e) { return e.group === d.group; })[0], ribbons[i]);
          var interpolate = d3.interpolate(path(matchedRibbons.r0), path(matchedRibbons.r1));
          return function(t) {
            return interpolate(t);
          };
        });
      }
      
      function quartileTween(transition) { 
        transition.attrTween("d", function(d, i) {
          var matchedRibbons = matchRibbons(oldRibbonOverlays.filter(function(e) { return e.group === d.group; })[0], ribbonOverlays[i]);
          var interpolate = d3.interpolate(path(matchedRibbons.r0), path(matchedRibbons.r1));
          return function(t) {
            return interpolate(t);
          };
        });
      }
      
      // XXX: Better to create matchRibbonOverlays function, or try to create ribbon overlays from interpolated ribbon?
                
      var ribbon = svg.select(".ribbon").selectAll("path")
          .data(ribbons, function(d) { return d.group; });
  
      var ribbonOutline = svg.select(".ribbonOutline").selectAll("path")
          .data(ribbons, function(d) { return d.group; });
  
      var median = svg.select(".median").selectAll("path")
          .data(ribbonOverlays, function(d) { return d.group; });
  
      var quartile = svg.select(".quartile").selectAll("path")
          .data(ribbonOverlays, function(d) { return d.group; });
  
      if (time > 0) {
        ribbon.transition()
            .delay(time * 2)
            .duration(time)
            .ease(easeType)
            .call(ribbonTween)
            .style("fill", function(d) { return groupColor(d.group); })
            .each("end", function() { d3.select(this).attr("d", path); });        
            
        ribbon.enter().append("path")
            .attr("d", path)
            .style("fill", function(d) { return groupColor(d.group); })
            .style("fill-opacity", 0)
          .transition()
            .duration(time)
            .ease(easeType)
            .style("fill-opacity", ribbonOpacity);

        ribbon.exit().transition()
            .duration(time)
            .ease(easeType)
            .style("fill-opacity", 0)
            .remove(); 
    
        ribbonOutline.transition()
            .delay(time * 2)
            .duration(time)
            .ease(easeType)
            .call(ribbonTween)
            .style("stroke", function(d) { return groupColor(d.group); });        
            
        ribbonOutline.enter().append("path")
            .attr("d", path)
            .style("stroke", function(d) { return groupColor(d.group); })
            .style("stroke-opacity", 0)
          .transition()
            .duration(time)
            .ease(easeType)
            .style("stroke-opacity", ribbonOutlineOpacity);

        ribbonOutline.exit().transition()
            .duration(time)
            .ease(easeType)
            .style("stroke-opacity", 0)
            .remove();
    
        quartile.transition()
            .delay(time * 2)
            .duration(time)
            .ease(easeType)
            .call(quartileTween)
            .style("fill", function(d) { return groupColor(d.group); })
            .each("end", function() { d3.select(this).attr("d", path); });;
    
        quartile.enter().append("path")
            .attr("d", path)
            .style("fill", function(d) { return groupColor(d.group); })
            .style("fill-opacity", 0)
          .transition()
            .duration(time)
            .ease(easeType)
            .style("fill-opacity", ribbonOverlayOpacity);
    
        quartile.exit().transition()
            .duration(time)
            .ease(easeType)
            .style("fill-opacity", 0)
            .remove();
        
        median.transition()
            .delay(time * 2)
            .duration(time)
            .ease(easeType)
            .attr("d", medianPath)
            .style("stroke", function(d) { return groupColor(d.group); });
    
        median.enter().append("path")
            .attr("d", medianPath)
            .style("stroke", function(d) { return groupColor(d.group); })
            .style("fill", "none")
            .style("stroke-opacity", 0)
          .transition()
            .duration(time)
            .ease(easeType)
            .style("stroke-opacity", ribbonOverlayOpacity * 2);
    
        median.exit().transition()
            .duration(time)
            .ease(easeType)
            .style("stroke-opacity", 0)
            .remove();
      }
      else {
        ribbon.attr("d", path)
            .style("fill", function(d) { return groupColor(d.group); });
            
        ribbon.enter().append("path")
            .attr("d", path)
            .style("fill", function(d) { return groupColor(d.group); })
            .style("fill-opacity", ribbonOpacity); 

        ribbon.exit().remove();        
        
        ribbonOutline.attr("d", path)
            .style("stroke", function(d) { return groupColor(d.group); });
            
        ribbonOutline.enter().append("path")
            .attr("d", path)
            .style("stroke", function(d) { return groupColor(d.group); })
            .style("stroke-opacity", ribbonOutlineOpacity); 

        ribbonOutline.exit().remove();
        
        quartile.attr("d", path)
            .style("fill", function(d) { return groupColor(d.group); });
    
        quartile.enter().append("path")
            .attr("d", path)
            .style("fill", function(d) { return groupColor(d.group); })
            .style("fill-opacity", ribbonOverlayOpacity);
    
        quartile.exit().remove();
        
        median.attr("d", medianPath)
            .style("stroke", function(d) { return groupColor(d.group); });
    
        median.enter().append("path")
            .attr("d", medianPath)
            .style("stroke", function(d) { return groupColor(d.group); })
            .style("fill", "none")
            .style("stroke-opacity", ribbonOverlayOpacity * 2)
            .style("stroke-width", 3)
            .style("stroke-dasharray", [10, 10]);
    
        median.exit().remove();
      }
    }      
  };
  
  function drawRelations() {  
    if (!relations.length) return;
        
    // Generate the chord data.
    // d3's built-in chord layout doesn't allow for even-spacing
    var maxVal = 0;
    for (var i = 0; i < axes.length - 1; i++) {      
      for (var j = i + 1; j < axes.length; j++) { 
        var v = Math.abs(+relations[i][axes[j].name]); 
        maxVal = v > maxVal ? v : maxVal;
      }
    }
    
    var maxWidth = tau / axes.length * chordWidth;
    var chordWidthScale = d3.scale.linear()
        .domain([0.0, 1])
        .range([0, maxWidth]);
    
    var hasChord = [];
    axes.forEach(function(d) { hasChord[d.name] = false; });
    
    var chords = [];
    for (var i = 0; i < axes.length - 1; i++) {   
      if (axes[i].type === "categorical" && axes[i].unique.length > 2) continue;
      for (var j = i + 1; j < axes.length; j++) { 
        if (axes[j].type === "categorical" && axes[j].unique.length > 2) continue;
        var v = +relations[i][axes[j].name];
        var w = chordWidthScale(Math.abs(v));
        var a1 = radianScale(axes[i].name);
        var a2 = radianScale(axes[j].name);
        
        var s = { startAngle: a1 - w/2, endAngle: a1 + w/2, value: v, axis: axes[i] };
        var t = { startAngle: a2 - w/2, endAngle: a2 + w/2, value: v, axis: axes[j] };
        
        chords.push({ source: s, target: t });
        
        if (Math.abs(v) >= minRelation) {
          hasChord[axes[i].name] = true;
          hasChord[axes[j].name] = true;
        }
      }
    }
        
    chords.sort(function(a, b) { return Math.abs(a.source.value) - Math.abs(b.source.value); });

    var chordScale = d3.scale.linear()
        .domain([minRelation, 1])
        .range([0, 1]);

    svg.select(".chord").selectAll("path").remove();
    
    chord = svg.select(".chord").selectAll("path")
        .data(chords)
      .enter().append("path")
        .attr("d", d3.svg.chord().radius(radiusScale(innerRadius) - 30))
        .style("fill", function(d) { return d.source.value >= 0 ? "firebrick" : "mediumblue"; })
        .style("fill-opacity", function(d) { return chordScale(Math.abs(d.source.value)); })
        .style("stroke", "none");

    // Draw markers for chord width of 1
/*    
    var w = maxWidth * 360 / Math.PI;
    
    svg.select(".chord").selectAll("g").remove();
    
    var gLine = svg.select(".chord").selectAll("g")
        .data(axes.filter(function(d) { return hasChord[d.name]; }))
      .enter().append("g")
        .attr("transform", function(d) { return "rotate(" + (degreeScale(d.name) - 90) + ")"; });

    gLine.append("g")
        .attr("transform", "rotate(" + (-w/4) + ")")
      .append("line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", radiusScale(innerRadius) - 30)
        .attr("y2", radiusScale(innerRadius) - 35)
        .style("fill", "none")
        .style("stroke", "#999");
    
    gLine.append("g")
        .attr("transform", "rotate(" + (w/4) + ")")
      .append("line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", radiusScale(innerRadius) - 30)
        .attr("y2", radiusScale(innerRadius) - 35)
        .style("fill", "none")
        .style("stroke", "#999");
*/    
  };
  
  function drawPCA(time) {
    if (!arguments.length) time = 0;
    
    var maxAbs = d3.max([d3.min(pca, function(d) { return Math.abs(d["PC1"]); }),
                         d3.max(pca, function(d) { return Math.abs(d["PC1"]); }),
                         d3.min(pca, function(d) { return Math.abs(d["PC2"]); }),
                         d3.max(pca, function(d) { return Math.abs(d["PC2"]); })] );
    
    var pcaScale = d3.scale.linear()
        .domain([-maxAbs, maxAbs])
        .range([-radiusScale(innerRadius) * 0.25, radiusScale(innerRadius) * 0.25]);

    // Draw points
    pcaPoint = svg.select(".pcaPoint").selectAll("circle")
        .data(pcaData);
 
    var r = 2;
    var opacity = 0.25;
 
    if (time > 0) {
      pcaPoint.transition()
          .duration(time)
          .ease(easeType)
          .attr("cx", function(d) { return pcaScale(d.pca["PC1"]); })
          .attr("cy", function(d) { return pcaScale(d.pca["PC2"]); })
          .attr("r", r)
          .style("fill", function(d) { return groupColor(d.data.tempGroup); })
          .style("fill-opacity", opacity);
          
      pcaPoint.enter().append("circle")
          .attr("cx", function(d) { return pcaScale(d.pca["PC1"]); })
          .attr("cy", function(d) { return pcaScale(d.pca["PC2"]); })
          .attr("r", r)
          .style("fill", function(d) { return groupColor(d.data.tempGroup); })
          .style("fill-opacity", 0)
        .transition()
          .duration(time)
          .ease(easeType)
          .style("fill-opacity", opacity);
      
      pcaPoint.exit().transition()
          .duration(time)
          .ease(easeType)
          .style("fill-opacity", 0)
          .remove();
    }
    else {
      pcaPoint
          .attr("cx", function(d) { return pcaScale(d.pca["PC1"]); })
          .attr("cy", function(d) { return pcaScale(d.pca["PC2"]); })
          .attr("r", r)
          .style("fill", function(d) { return groupColor(d.data.tempGroup); })
          .style("fill-opacity", opacity);
          
      pcaPoint.enter().append("circle")
          .attr("cx", function(d) { return pcaScale(d.pca["PC1"]); })
          .attr("cy", function(d) { return pcaScale(d.pca["PC2"]); })
          .attr("r", r)
          .style("fill", function(d) { return groupColor(d.data.tempGroup); })
          .style("fill-opacity", opacity);
      
      pcaPoint.exit().remove();  
    }
  };
  
  function drawCircles() {                   
    // Draw inner and outer circles, with drag for rotating
    circle = svg.select("#circle").selectAll("circle")
        .data([{ inner: radiusScale(innerRadius) - 10, outer: radiusScale(innerRadius) - 5 },
               { inner: radiusScale(outerRadius) + 5, outer: radiusScale(outerRadius) + 10 }])
      .enter().append("path")
        .attr("class", "circle") 
        .attr("d", d3.svg.arc()
            .startAngle(0)
            .endAngle(tau)
            .innerRadius(function(d) { return d.inner; })
            .outerRadius(function(d) { return d.outer; }))
        .call(function () {
          // Drag to rotate
          rotateAngle = 90;
          var startAngle = 0;
          return d3.behavior.drag()      
            .on("dragstart", function(d) {
              d3.event.sourceEvent.stopPropagation();
              startAngle = r2d(Math.atan2(d3.mouse(this)[1], d3.mouse(this)[0]));
            })
            .on("drag", function(d) {         
              rotateAngle += r2d(Math.atan2(d3.event.y, d3.event.x)) - startAngle;    
              rotateAngle = constrainDegrees(rotateAngle);
              
              var center = d3.min([width, height]);
              svg.select("#gMain").attr("transform", "translate(" + (center / 2) + "," + (center / 2) + ")rotate(" + rotateAngle + ")");
              
              flipLabels(rotateAngle);                                        
            });
        }());   
       
    // Draw an invisible arc over the curves with line brushing for selection
    svg.select("#circle").append("path")
        .attr("class", "background")
        .attr("d", d3.svg.arc()
            .startAngle(0)
            .endAngle(tau)
            .innerRadius(radiusScale(innerRadius))
            .outerRadius(radiusScale(outerRadius)))
        .attr("visibility", "hidden")
        .attr("pointer-events", "fill")
        .call(function() {
            var x1, y1, 
                x2, y2,
                selectLine,
                dragFlag;
            
            // It looks like onclick and drag don't work well together, so 
            // mimicking onclick via dragFlag variable.
            return d3.behavior.drag()
              .on("dragstart", function() {                         
                d3.event.sourceEvent.stopPropagation();    
                dragFlag = false;
                var m = d3.mouse(this);
                
                x1 = x2 = m[0];
                y1 = y2 = m[1];
                
                selectLine = svg.select("#gMain").append("line")
                    .attr("class", "brush")
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2)
                    .style("cursor", "url(" + cursor.toDataURL() + "), auto");
              })
              .on("drag", function() {
                dragFlag = true;
              
                x2 = d3.event.x;
                y2 = d3.event.y;
              
                selectLine
                    .attr("x2", x2)
                    .attr("y2", y2);
                
                // Key codes
                var ctrl = d3.event.sourceEvent.ctrlKey,
                    shift = d3.event.sourceEvent.shiftKey,
                    alt = d3.event.sourceEvent.altKey;
                                                       
                curves.forEach(function(d) {
                  // Ctrl adds to the current group, regardless of whether already brushed
                  // Shift adds to the current group if already brushed
                  // Alt subtracts from the current group
                
                  // Only edit the current group, unless ctrl or shift is pressed
                  if (d.data.group >= 0 && d.data.group != currentGroup && !(ctrl || shift)) return;
                  
                  // If shift is pressed, only edit if already in a group
                  if (shift && d.data.group < 0) return;
                  
                  // Clear group, unless ctrl, shift, or alt is pressed
                  if (!(ctrl || shift || alt)) {
                    d.data.group = -1;
                  }
                
                  // Check for intersection
                  // XXX: Could increase performance by only testing segments within the angular range of the selection line...
                  for (var i = 0; i < d.curve.length - 1; i++) {
                    if (lineSegmentIntersection(x1, y1, x2, y2, d.curve[i][0], d.curve[i][1], d.curve[i + 1][0], d.curve[i + 1][1])) {
                      if (alt) {
                        d.data.tempGroup = -1;
                      }
                      else {
                        d.data.tempGroup = currentGroup;
                      }
                      return;
                    }
                  }
                  
                  // If no intersection, set temp group to group
                  d.data.tempGroup = d.data.group;
                });
                
                updateCurves();                
              })
              .on("dragend", function() {       
                selectLine.remove();
                  
                if (dragFlag) {                           
                  data.forEach(function(d) { d.group = d.tempGroup; });    
                  orderCategorical();
                }
                else {
                  // Change group.  Shift-click moves forward, Ctrl-click moves backward, Alt-click removes all.
                  if (d3.event.sourceEvent.shiftKey) {
                    currentGroup = currentGroup === groupColor.range().length - 2 ? 0 : currentGroup + 1;
                  }
                  else if (d3.event.sourceEvent.ctrlKey) {
                    currentGroup = currentGroup === 0 ? groupColor.range().length - 2 : currentGroup - 1;
                  }
                  else if (d3.event.sourceEvent.altKey) {
                    // Reset colors
                    setGroupColor(groupColors);
                    data.forEach(function(d) { d.tempGroup = d.group = -1; });
                    updateCurves(transitionTime);
                  }
                  
                  setCursorColor(groupColor(currentGroup));
                }
              });
        }()); 
        
    // Draw an invisible circle over the pca scatterplot for selection
    var w = radiusScale(innerRadius) / Math.sqrt(2);
    svg.select("#centerCircle").append("circle")
        .attr("r", w/2)
        .attr("visibility", "hidden")
        .attr("pointer-events", "fill")
        .call(function() {
            var x1, y1, 
                x2, y2,
                selectRect,
                dragFlag;
            
            // It looks like onclick and drag don't work well together, so 
            // mimicking onclick via dragFlag variable.
            return d3.behavior.drag()
              .on("dragstart", function() {   
                d3.event.sourceEvent.stopPropagation();    
                dragFlag = false;
                var m = d3.mouse(this);
                
                x1 = x2 = m[0];
                y1 = y2 = m[1];
                
                selectRect = svg.select("#gCenter").append("rect")
                    .attr("class", "brush")
                    .attr("x", x1)
                    .attr("y", y1)
                    .attr("width", 0)
                    .attr("height", 0)
                    .style("cursor", "url(" + cursor.toDataURL() + "), auto");;
              })
              .on("drag", function() {
                dragFlag = true;             
              
                x2 = d3.event.x;
                y2 = d3.event.y;
              
                selectRect
                    .attr("x", d3.min([x1, x2]))
                    .attr("y", d3.min([y1, y2]))
                    .attr("width", Math.abs(x2 - x1))
                    .attr("height", Math.abs(y2 - y1));
                
                // Key codes
                var ctrl = d3.event.sourceEvent.ctrlKey,
                    shift = d3.event.sourceEvent.shiftKey,
                    alt = d3.event.sourceEvent.altKey;
            
                pcaData.forEach(function(d) {
                  // Ctrl adds to the current group, regardless of whether already brushed
                  // Shift adds to the current group if already brushed
                  // Alt subtracts from the current group
                
                  // Only edit the current group, unless ctrl or shift is pressed
                  if (d.data.group >= 0 && d.data.group != currentGroup && !(ctrl || shift)) return;
                  
                  // If shift is pressed, only edit if already in a group
                  if (shift && d.data.group < 0) return;
                  
                  // Clear group, unless ctrl, shift, or alt is pressed
                  if (!(ctrl || shift || alt)) {
                    d.data.group = -1;
                  }
                       
                  // XXX: Copied from drawPCA, should move to closure scope    
                  var maxAbs = d3.max([d3.min(pca, function(d) { return Math.abs(d["PC1"]); }),
                         d3.max(pca, function(d) { return Math.abs(d["PC1"]); }),
                         d3.min(pca, function(d) { return Math.abs(d["PC2"]); }),
                         d3.max(pca, function(d) { return Math.abs(d["PC2"]); })] );
    
                  var pcaScale = d3.scale.linear()
                      .domain([-maxAbs, maxAbs])
                      .range([-radiusScale(innerRadius) * 0.25, radiusScale(innerRadius) * 0.25]);

                  // Check for intersection                
                  var x = pcaScale(d.pca["PC1"]);
                  var y = pcaScale(d.pca["PC2"]);
                  
                  if (x >= d3.min([x1, x2]) && x <= d3.max([x1, x2]) && 
                      y >= d3.min([y1, y2]) && y <= d3.max([y1, y2])) { 
                    if (alt) {
                      d.data.tempGroup = -1;
                    }
                    else {
                      d.data.tempGroup = currentGroup;
                    }
                    
                    return;
                  }
                  
                  // If no intersection, set temp group to group
                  d.data.tempGroup = d.data.group;
                });
                
                updateCurves();                
              })
              .on("dragend", function() {       
                selectRect.remove();
                  
                if (dragFlag) {                           
                  data.forEach(function(d) { d.group = d.tempGroup; });
                  orderCategorical();
                }
                else {
                  // Change group.  Shift-click moves forward, Ctrl-click moves backward, Alt-click removes all.
                  if (d3.event.sourceEvent.shiftKey) {
                    currentGroup = currentGroup === groupColor.range().length - 2 ? 0 : currentGroup + 1;
                  }
                  else if (d3.event.sourceEvent.ctrlKey) {
                    currentGroup = currentGroup === 0 ? groupColor.range().length - 2 : currentGroup - 1;
                  }
                  else if (d3.event.sourceEvent.altKey) {
                    // Reset colors
                    setGroupColor(groupColors);
                    data.forEach(function(d) { d.tempGroup = d.group = -1; });
                    updateCurves(transitionTime);
                  }
                  
                  setCursorColor(groupColor(currentGroup));
                }
              });
        }()); 
  };
  
  function createFilters() {
    var textShadowRadius = 0.5;
  
    var defs = svg.append("defs");
    
    var textShadow = defs.append("filter")
        .attr("id", "textShadow");
        
    textShadow.append("feMorphology")
        .attr("in", "SourceAlpha")
        .attr("operator", "dilate")
        .attr("radius", textShadowRadius)
        .attr("result", "dilate");
        
    textShadow.append("feFlood")
        .attr("flood-color", "white")
        .attr("flood-opacity", 1);
        
    textShadow.append("feComposite")
        .attr("in2", "dilate")
        .attr("operator", "in")
        .attr("result", "shadow");
        
    textShadow.append("feComponentTransfer")
      .append("feFuncA")
        .attr("type", "linear")
        .attr("slope", 10)
        .attr("intercept", 0);
        
    var merge = textShadow.append("feMerge");
    merge.append("feMergeNode")
    merge.append("feMergeNode")
        .attr("in", "SourceGraphic")
    merge.append("feMergeNode")
        .attr("in", "SourceGraphic")
    merge.append("feMergeNode")
        .attr("in", "SourceGraphic");


 
/*        
    textShadow.append("feMorphology")
        .attr("in", "SourceAlpha")
        .attr("operator", "dilate")
        .attr("radius", textShadowRadius)
        .attr("result", "dilate");    
        
    textShadow.append("feComponentTransfer")
        .attr("in", "SourceGraphic")
        .attr("result", "text")
      .append("feFuncA")
        .attr("type", "linear")
        .attr("slope", 2)
        .attr("intercept", 0);    
    
    var shadowTransfer = textShadow.append("feComponentTransfer")
        .attr("in", "dilate")
        .attr("result", "threshold");
    
    function rep(x, n) { 
      var out = x;
      for (var i = 0; i < n - 1; i++) {
        out += x;
      }
      return out;
    }
    
    shadowTransfer.append("feFuncR")
        .attr("type", "linear")
        .attr("slope", -1)
        .attr("intercept", 1);
    shadowTransfer.append("feFuncG")
        .attr("type", "linear")
        .attr("slope", -1)
        .attr("intercept", 1);
    shadowTransfer.append("feFuncB")
        .attr("type", "linear")
        .attr("slope", -1)
        .attr("intercept", 1);
    shadowTransfer.append("feFuncA")
        .attr("type", "discrete")
        // XXX: 0.75 should be a variable
        .attr("tableValues", "0" + rep(" 0.75", 255));     
               
    textShadow.append("feGaussianBlur")
        .attr("in", "threshold")
        .attr("stdDeviation", textShadowRadius)
        .attr("result", "shadow"); 
        
    textShadow.append("feComposite")
        .attr("in", "text")
        .attr("in2", "shadow")
        .attr("operator", "over");
*/        
        
        
        
        
  
        
        
    var curveFilter = defs.append("filter")
        .attr("id", "curveFilter");
    
    var filterSize = 3;
                  
    curveFilter.append("feGaussianBlur")
        .attr("stdDeviation", filterSize);
   
/*        
    curveFilter.append("feMorphology")
        .attr("operator", "dilate")
        .attr("radius", filterSize)
        .attr("result", "dilate");
    
    curveFilter.append("feGaussianBlur")
        .attr("in", "dilate")
        .attr("stdDeviation", filterSize)
        .attr("result", "blur");
*/      
//    curveFilter.append("feComposite")
//        .attr("in", "SourceGraphic")
//        .attr("in2", "blur")
//        .attr("operator", "over");
/*        
    curveFilter.append("feMorphology")
        .attr("in", "SourceAlpha")
        .attr("operator", "dilate")
        .attr("radius", 2)
        .attr("result", "dilate");
    
    curveFilter.append("feGaussianBlur")
        .attr("in", "dilate")
        .attr("stdDeviation", 2)
        .attr("result", "blur");
        
    curveFilter.append("feSpecularLighting")
        .attr("in", "blur")
        .attr("surfaceScale", 5)
        .attr("specularConstant", 0.5)
        .attr("specularExponent", 20)
        .attr("lighting-color", "#bbbbbb")
        .attr("result", "specOut")
      .append("fePointLight")
        .attr("x", -5000)
        .attr("y", -10000)
        .attr("z", 20000);
        
    curveFilter.append("feComposite")
        .attr("in", "specOut")
        .attr("in2", "SourceAlpha")
        .attr("operator", "in")
        .attr("result", "specOut");
        
    curveFilter.append("feComposite")
        .attr("in", "SourceGraphic")
        .attr("in2", "specOut")
        .attr("operator", "arithmetic")
        .attr("k1", 0)
        .attr("k2", 1)
        .attr("k3", 1)
        .attr("k4", 0)
        .attr("result", "litPaint")
        
    var merge = curveFilter.append("feMerge");
    
    merge.append("feMergeNode")
        .attr("in", "blur");
    
    merge.append("feMergeNode")
        .attr("in", "litPaint");
        */
  };
  
  function applyFilter(apply) {
    if (apply) {
//      svg.select(".curve").attr("filter", "url(#curveFilter)");
      axisValueLabel.attr("filter", "url(#textShadow)");
    }
    else {
//      svg.select(".curve").attr("filter", null);
      axisValueLabel.attr("filter", null);
    }
  };

  // Update the curves
  function updateCurves(time) {          
    if (!arguments.length) time = 0;
    
    // Get the categorical axes and set label weights for each value                  
    var categorical = axes.filter(function(d) { return d.type === "categorical"; });
    categorical.forEach(function(d) { d.unique.forEach(function(e) { e.labelWeight = 0; }); });

    // Generate weights
    data.forEach(function(d) {
      if (d.tempGroup >= 0) {
        categorical.forEach(function(e) { 
          var v = d[e.name];
          for (var j = 0; j < e.unique.length; j++) {
            if (v === e.unique[j].value) {
              e.unique[j].labelWeight++;
            }
          }
        });
      }
    });
          
    // Normalize weights
    var maxLabelWeight = categorical.map(function(d) { return d3.max(d.unique.map(function(e) { return e.labelWeight; })); });        
    categorical.forEach(function(d, i) { d.unique.forEach(function(e) { e.labelWeight = maxLabelWeight[i] > 0 ? e.labelWeight / maxLabelWeight[i] : 0.5; }); });    
    
    var groupCounts = groupColor.domain().slice(1).map(function() { return 0; });    
    curves.forEach(function(d) { if (d.data.group >= 0) groupCounts[d.data.tempGroup]++; });
    function curveStrokeOpacity(d) { return d.data.tempGroup < 0 ? minOpacity : groupCounts[d.data.tempGroup] <= 1 && showRibbons ? d3.max([ribbonOpacity, ribbonOutlineOpacity, ribbonOverlayOpacity, maxOpacity]) : maxOpacity; }; 
    //function curveStrokeOpacity(d) { return d.data.tempGroup < 0 ? minOpacity : maxOpacity; }; 
          
    // Update curves and labels
    if (arguments.length) {
      curve.transition()
          .duration(time)
          .ease(easeType)
          .style("stroke", function(d) { return groupColor(d.data.tempGroup); })
          .style("stroke-opacity", function(d) { return curveStrokeOpacity(d); });
          
      axisValueLabel.transition()
          .duration(time)
          .ease(easeType)
          .style("fill", "black")
          .style("fill-opacity", function(d) { return valueOpacity(d.labelWeight); });
  
      pcaPoint.transition()
          .duration(time)
          .ease(easeType)
          .style("fill", function(d) { return groupColor(d.data.tempGroup); })
          .style("fill-opacity", function(d) { return d.data.tempGroup >= 0 ? 0.75 : 0.25; });
  
      d3.selectAll(".list").transition()
          .duration(time)
          .ease(easeType)
          .style("fill", function(d) { return groupColor(d.tempGroup); });
    }
    else {
      curve
          .style("stroke", function(d) { return groupColor(d.data.tempGroup); })
          .style("stroke-opacity", function(d) { return curveStrokeOpacity(d); });
          
      axisValueLabel
          .style("fill", "black")
          .style("fill-opacity", function(d) { return valueOpacity(d.labelWeight); });
    
      pcaPoint
          .style("fill", function(d) { return groupColor(d.data.tempGroup); })
          .style("fill-opacity", function(d) { return d.data.tempGroup >= 0 ? 0.75 : 0.25; });  
      
      d3.selectAll(".list")
          .style("fill", function(d) { return groupColor(d.tempGroup); });
    }
    
    // Update ribbons
    drawRibbons(time);
  };
  
  // Compute the maximum axis label length
  function maxAxisLabelLength() {
    // Create temporary text
    var svgTemp = d3.select("body").append("svg");
    var label = svgTemp.selectAll("lengthLabel")
        .data(axes)
      .enter().append("text")
        .text(function(d) { return d; })
        .attr("class", "axis");     
  
    // Compute the maximum length
    var maxLabelLength = d3.max(label[0].map(function(d) {
      return d.getComputedTextLength();
    }));
 
    svgTemp.remove();
    
    return maxLabelLength;
  };
  
  // Constrain angle to [0, 360)
  function constrainDegrees(x) {
 //   return x < 0 ? x + 360 : x >= 360 ? x - 360 : x;
 return x < -90 ? x + 360 : x >= 270 ? x - 360 : x;
  };
  
  // Constrain radians to [3 * PI / 2, PI / 2)
  function constrainRadians(x) {
 //   return x < -1.5 * Math.PI ? x + tau : x >= halfPI ? x - tau : x;
 return x < 0  ? x + tau : x >= tau ? x - tau : x;
  }
  
  // Convert between radians and degrees
  function r2d(a) {
    return a * 180 / Math.PI;
  };
  
  function d2r(a) {
    return a * Math.PI / 180;
  };
        
  // Distance of a point from the origin
  function distance(x) {
    return Math.sqrt(x[0] * x[0] + x[1] * x[1]);
  }

  // Convert between cartesian and polar coordinates
  function c2p(x) {
    return [ distance(x), constrainRadians(Math.atan2(x[1], x[0])) ];
  }

  function p2c(x) {
    return [ x[0] * Math.cos(x[1]), x[0] * Math.sin(x[1]) ];
  }

  // Line segment intersection
  // XXX: Change to work with 2 element arrays for points?
  function ccw(x1, y1, x2, y2, x3, y3) {
    return (y3 - y1) * (x2 - x1) > (y2 - y1) * (x3 - x1);
  };
  
  function lineSegmentIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Just return if there is an intersection
    return (ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4)) && 
           (ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4));
  };
  
  function pointLineLocation(p, p1, p2) {
    // Negative: left
    // Zero: on
    // Positive: right
    return (p1[0] - p2[0]) * (p[1] - p2[1]) - (p1[1] - p2[1]) * (p[0] - p2[0]);
  }
  
  function cross(p1, p2) {
    return p1[0] * p2[1] - p1[1] * p2[0];
  }
  
  function lineSegmentIntersectionPoint(p1, p2, p3, p4) {
    // Return the intersection point, based on algorithm found here:  
    // http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
    var r = [p2[0] - p1[0], p2[1] - p1[1]];
    var s = [p4[0] - p3[0], p4[1] - p3[1]];
    
    var pq = [p3[0] - p1[0], p3[1] - p1[1]];
    var rxs = cross(r, s);
 /*   
    var pqxr = cross(pq, r); 
    
    if (rxs === 0 && pqxr === 0) {
      // Co-linear, return true (even if disjoint)
      return true;
    }
*/    
    if (rxs !== 0) {    
      // Compute the intersection
      var rxsr = 1 / rxs;
      var t = cross(pq, s) * rxsr;
      var u = cross(pq, r) * rxsr;

      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return [p1[0] + t * r[0], p1[1] + t * r[1]];        
      } 
    }
   
    // No intersetion 
    return false;
  }
  
  function flipLabels(angle) {             
    function flip(d, angle) {
      var a = constrainDegrees(degreeScale(d) + angle);
      return a > 180 || a < 0;
    }
  
    axisNameLabel
        .attr("transform", function(d) { return "rotate(" + (flip(d.name, -(90 + labelAngle) + angle) ?  -labelAngle : 180 - labelAngle) + ")"; })
        .attr("text-anchor", function(d) { return flip(d.name, -(90 + labelAngle) + angle) ? "end" : "start"; })
        .attr("dy", function(d) { return flip(d.name, -(90 + labelAngle) + angle) ? ".7em" : "-.3em"; });
    
    axisMinMaxLabel
        .attr("transform", function(d) { return "rotate(" + (flip(d.name, -90 + angle) ?  0 : 180) + ")"; });
        
    axisValueLabel
        .attr("transform", function(d) { return "rotate(" + (flip(d.name, -90 + angle) ?  0 : 180) + ")"; })
        .attr("dy", function(d) { return flip(d.name, -90 + angle) ? "1em" : "-.3em"; });
        
    tempLabel
        .attr("transform", function(d) { return "rotate(" + (flip(d.name, -90 + angle) ?  0 : 180) + ")"; })
        .attr("dy", function(d) { return flip(d.name, -90 + angle) ? "1em" : "-.3em"; });
  };
        
  function valueClick(a, t, c) {                 
    if (d3.event.ctrlKey) {
      // Add to current group
      data.forEach(function(e, i) {
        if (a[i]) {
          e.group = e.tempGroup = currentGroup;
        }
      });
    }
    else if (d3.event.shiftKey) {
      // Add to current group if already selected
      data.forEach(function(e, i) {
        if (a[i] && e.group >= 0) {
          e.group = e.tempGroup = currentGroup;
        }
      });

      // Turn text selection back on
      if (arguments.length >= 3) d3.select(t).attr("class", c);
    }
    else if (d3.event.altKey) {
      // Remove from to current group
      data.forEach(function(e, i) { 
        if (a[i] && e.group === currentGroup) {
          e.group = e.tempGroup = -1;
        }
      });
    }
    else {
      // Replace current group with these
      data.forEach(function(e, i) { 
        if (a[i] > 0) {
          if (e.group <= -1) {
            e.group = e.tempGroup = currentGroup;
          }
        }
        else if (e.group === currentGroup) {
          e.tempGroup = e.group = -1;
        }
      });
    }
    updateCurves(transitionTime);
    d3.timer(orderCategorical, transitionTime);
  }
  
  function highlightChords(axis) {
    if (arguments.length) {
      chord.filter(function(d) { return d.source.axis.name === axis.name || d.target.axis.name === axis.name; })
          .style("fill-opacity", function(d) { return Math.abs(d.source.value); });

      chord.filter(function(d) { return d.source.axis.name !== axis.name && d.target.axis.name !== axis.name; })
          .style("fill-opacity", 0);
    }
    else {
      drawRelations();
    }
  }
  
  // Draw axis based on data type
  function rcAxis() {  
    function ax(selection) {    
      selection.each(function(axisData) {    
        var gAxis = d3.select(this)
            .attr("transform", function(d) { return "rotate(" + degreeScale(d.name) + ")"; });
          
        // Draw an axis
        switch (axisData.type) {  
          case "continuous":
            // Box plot         
/*            
            gAxis.append("line")
                .attr("y1", function(d) { return radiusScale(d.scale(d3.quantile(d.values, 0.25))); })
                .attr("y2", function(d) { return radiusScale(d.scale(d3.quantile(d.values, 0.5))); })
                .style("stroke-opacity", 0.25);          
            gAxis.append("line")
                .attr("y1", function(d) { return radiusScale(d.scale(d3.quantile(d.values, 0.5))); })
                .attr("y2", function(d) { return radiusScale(d.scale(d3.quantile(d.values, 0.75))); })
                .style("stroke-opacity", 0.25);
*/            
            gAxis.append("line")
                .attr("y1", radiusScale(innerRadius))
                .attr("y2", function(d) { return radiusScale(d.scale(d3.quantile(d.values, 0.25))); })        
                .on("mouseover", function(d) {
                  d3.select(this).style("stroke", "grey");
                  highlightChords(d);
                })
                .on("mouseout", function() {
                  d3.select(this).style("stroke", "black");
                  highlightChords();
                })
                .on("click", function(d, i) {
                  var m = data.map(function(e) { return e[d.name]; }); 
                  
                  var scale = d3.scale.quantile()
                      .domain(m)
                      .range([1, 0, 0, 0]);
                  
                  valueClick(data.map(function(e) { return scale(e[d.name]); }));
                });
            gAxis.append("circle")
                .attr("cy", function(d) { return radiusScale(d.scale(d3.quantile(d.values, 0.5))); })
                .attr("r", 2)
                .style("fill", "black")
                .style("stroke", "none")        
                .on("mouseover", function(d) {
                  d3.select(this).style("fill", "grey");
                  highlightChords(d);
                })
                .on("mouseout", function() {
                  d3.select(this).style("fill", "black");
                  highlightChords();
                })
                .on("click", function(d, i) {
                  var m = data.map(function(e) { return e[d.name]; }); 
                  
                  var scale = d3.scale.quantile()
                      .domain(m)
                      .range([0, 1, 1, 0]);
                  
                  valueClick(data.map(function(e) { return scale(e[d.name]); }));
                });      
            gAxis.append("line")
                .attr("y1", function(d) { return radiusScale(d.scale(d3.quantile(d.values, 0.75))); })
                .attr("y2", radiusScale(outerRadius))        
                .on("mouseover", function(d) {
                  d3.select(this).style("stroke", "grey");
                  highlightChords(d);
                })
                .on("mouseout", function() {
                  d3.select(this).style("stroke", "black");
                  highlightChords();
                })
                .on("click", function(d, i) {
                  var m = data.map(function(e) { return e[d.name]; }); 
                  
                  var scale = d3.scale.quantile()
                      .domain(m)
                      .range([0, 0, 0, 1]);
                  
                  valueClick(data.map(function(e) { return scale(e[d.name]); }));
                });           
            break;
            
          case "discrete":
            // Histogram
            var maxWeight = d3.max(axisData.unique.map(function(e) { return e.weight; }));
            
            gAxis.selectAll("rect")
                .data(axisData.unique)
              .enter().append("rect")
                .attr("x", function(d) { return -d.weight / maxWeight * axisWidth / 2; })
                .attr("y", function(d) { return radiusScale(d.start); })
                .attr("width", function(d) { return d.weight / maxWeight * axisWidth; })
                .attr("height", function(d) { return radiusScale(weightScale(1 / axisData.numDiscrete)); })
                .style("stroke", "none")
                .style("fill", "dimgrey")
                .style("fill-opacity", axisOpacity)
                .on("mouseover", function() {
                  d3.select(this).style("fill", "lightgrey");
                  highlightChords(axisData);         
                })
                .on("mouseout", function() {
                  d3.select(this).style("fill", "dimgrey");
                  highlightChords();
                })
                .on("click", function(d, i) {
                  valueClick(data.map(function(e) { return e[axisData.name] === d.value; }));
                });
                
            // Overwrite mouse events to add mouseover value label for interior values
            gAxis.selectAll("rect").filter(function(d, i) { return i != 0 && i != axisData.unique.length - 1; })
                .on("mouseover", function(d) {
                  d3.select(this).style("fill", "lightgrey");
          
                  tempLabel = gAxis.append("g")
                      .attr("class", "label")
                      .attr("transform", "translate(0," + radiusScale(d.start) + ")")
                      .attr("pointer-events", "none")
                    .append("text")
                      .text(d.value)
                      .attr("class", "tempLabel");
                      
                  flipLabels(rotateAngle);
                                   
                  highlightChords(axisData);
                })
                .on("mouseout", function() {
                  d3.select(this).style("fill", "dimgrey");
          
                  tempLabel = gAxis.select(".label").remove();
                  
                  highlightChords();
                });                                  
            break;
        
          case "categorical":
            // Stacked bar chart
            var maxWeight = d3.max(axisData.unique.map(function(e) { return e.weight; }));
            
            gAxis.selectAll("rect")
                .data(axisData.unique)
              .enter().append("rect")
                .attr("x", -axisWidth / 2)
                .attr("y", function(d) { return radiusScale(d.start); })
                .attr("width", axisWidth)
                .attr("height", function(d) { return radiusScale(d.weight); })                
                .style("stroke", "dimgrey")
                .style("fill", "white") 
                .style("fill-opacity", axisOpacity)
                .on("mouseover", function(d) {
                  d3.select(this).style("fill", "grey");
                  highlightChords(d);
                })
                .on("mouseout", function() {
                  d3.select(this).style("fill", "white");
                  highlightChords();
                })     
                .on("click", function(d) {
                  valueClick(data.map(function(e) { return e[axisData.name] === d.value; }));
                });  
            break;
        }
        
        // Line connecting to label
        gAxis.append("line")
            .attr("y1", radiusScale(outerRadius))
            .attr("y2", radiusScale(outerRadius) + labelOffset)
            .style("stroke-opacity", 0.1);
      });     
    }
    
    return ax;
  };
  
  function rcAxisLabel() {  
    function label(selection) {    
      selection.each(function(axisData) {    
        var gLabel = d3.select(this)
            .attr("transform", function(d) { return "rotate(" + degreeScale(d.name) + ")"; });
    
        function formatFloat(x) { 
          return Math.round(x * 100) / 100 === x ? x : x.toPrecision(1); 
        };
          
        // Draw labels
        switch (axisData.type) {  
          case "continuous":        
          case "discrete":               
            // Min and max values             
            gLabel.selectAll("text")
                .data([{ name: axisData.name, type: axisData.type, value: axisData.unique[0].value }, 
                       { name: axisData.name, type: axisData.type, value: axisData.unique[axisData.unique.length - 1].value }])
              .enter().append("g")
                .attr("transform", function(d, i) { 
                  return i === 0 ? "translate(0," + (radiusScale(innerRadius) - labelOffset / 2) + ")" : 
                                   "translate(0," + (radiusScale(outerRadius) + labelOffset / 2) + ")";
                })
              .append("text")
                .text(function(d) { return formatFloat(d.value); })
                .attr("class", "minMaxLabel")
                .on("mouseover", function(d) { 
                  highlightChords(d);
                })                
                .on("mouseout", function() { 
                  highlightChords();
                })
                .on("mousedown", function() {
                  if (d3.event.shiftKey) {
                    // Temporarily turn off text selection when shift is pressed
                    d3.select(this).attr("class", "minMaxLabel unselectable");
                  }
                })
                .on("click", function(d, i) {
                  var m = data.map(function(e) { return e[d.name]; }); 
                  
                  var scale = d.type === "continuous" ? d3.scale.quantile().domain(m) : d3.scale.quantize().domain(d3.extent(m));
                  scale.range(i === 0 ? [1, 0, 0, 0] : [0, 0, 0, 1]);
                  
                  valueClick(data.map(function(e) { return scale(e[d.name]); }), this, "minMaxLabel");
                });                  
            break;
        
          case "categorical":
            gLabel.selectAll("text")
                .data(axisData.unique)
              .enter().append("g")
                .attr("class", "categoricalValueLabel")
                .attr("transform", function(d) { return "translate(0," + (radiusScale(d.start)) + ")"; })
              .append("text")
                // Setting d.name here because it is needed in flipLabels()
                .text(function(d) { d.name = axisData.name; return d.value; })
                .attr("class", "valueLabel")
                .style("fill-opacity", function(d) { return valueOpacity(d.labelWeight); })
                .on("mouseover", function(d) {
                  d3.select(this).style("fill-opacity", 1);
                  highlightChords(d);
                })
                .on("mouseout", function() {
                  d3.select(this).style("fill-opacity", function(d) { return valueOpacity(d.labelWeight); });
                  highlightChords();
                })
                .on("mousedown", function() {
                  if (d3.event.shiftKey) {
                    // Temporarily turn off text selection when shift is pressed
                    d3.select(this).attr("class", "valueLabel unselectable");
                  }
                })
                .on("click", function(d) {
                  valueClick(data.map(function(e) { return e[d.name] === d.value; }), this, "valueLabel");
                });               
            break;
        }
            
        // Draw axis label
        gLabel.append("g")
            .attr("transform", "translate(0," + (radiusScale(outerRadius) + labelOffset) + ")")
          .append("text")
            .text(function(d) { return d.name; })
            .attr("class", "nameLabel")
            .on("mouseover", function(d) {
              highlightChords(d);
            })
            .on("mouseout", function(d) {
              highlightChords();
            })
            .on("click", function(d) {  
              // Clear groups
//              resetGroups();
//              updateCurves(transitionTime);
 /*             
              axisValueLabel.transition()
                  .duration(transitionTime)
                  .ease(easeType)
                  .style("fill-opacity", 0.5);
    */        
              // XXX: If I'm calling updateCurves below, probably only need to set the group for each curve and remove transitions from here...
              switch (d.type) {
                case "continuous":
                  // Use numeric color map
                  var m = data.map(function(e) { return e[d.name]; });   

                  numericAxisColor.domain(m);
                  numericAxisOpacity.domain(m);
                  
                  var r = numericAxisColor.range();
                  setGroupColor([ r[1], r[r.length - 1], r[0] ]);
                  data.forEach(function(e) { e.group = e.tempGroup = groupColorInvert(numericAxisColor(e[d.name])); });

                  break;
                  
                case "discrete":
                  var m = data.map(function(e) { return e[d.name]; });
                  
                  discreteAxisColor.domain(d3.extent(m));
                  discreteAxisOpacity.domain(d3.extent(m));
                  
                  var r = discreteAxisColor.range();
                  setGroupColor([ r[1], r[r.length - 1], r[0] ]);             
                  data.forEach(function(e) { e.group = e.tempGroup = groupColorInvert(discreteAxisColor(e[d.name])); });

                  break;
                  
                case "categorical":               
                  // Use categorical color map
                  var m = data.map(function(e) { return e[d.name]; });

                  categoricalAxisColor = d.unique.length > 10 ? d3.scale.category20() : d3.scale.category10();
                  categoricalAxisColor.domain(m);
                  
                  setGroupColor([].concat(groupColor(-1), categoricalAxisColor.range()));
                  data.forEach(function(e) { e.group = e.tempGroup = groupColorInvert(categoricalAxisColor(e[d.name])); });

                  break;
              }
              
              updateCurves(transitionTime);
              d3.timer(orderCategorical, transitionTime);
            });
      });     
    }
    
    return label;
  };
   
  // Roll our own hermite interpolation so we can specify the tangents
  // such that the curves cross perpendicular to axes.
  function hermiteSpline() {      
    var steps = 10,
        tension = 0.5,
        h = [];            // Basis functions
        
    function hs(p, t) {             
      var out = [];
      
      // Return the input if less than three points
      if (p.length < 3) {
        return p;
      }
      
      for (var i = 0; i < p.length - 1; i++) {
        for (var j = 0; j < steps; j++) {          
          // Use the supplied tangents
          var t1x = tension * t[i][0];
          var t1y = tension * t[i][1];
          
          var t2x = tension * t[i+1][0];
          var t2y = tension * t[i+1][1];
          
          // Compute the output point
          out.push([ h[j].h1 * p[i][0] + h[j].h2 * p[i+1][0] + h[j].h3 * t1x + h[j].h4 * t2x,
                     h[j].h1 * p[i][1] + h[j].h2 * p[i+1][1] + h[j].h3 * t1y + h[j].h4 * t2y ]);
        }
      }
     
      // Add the last point
      // XXX: Don't need this if we use cardinal-closed for drawing
      out.push(p[p.length - 1]);
      
      return out;
    }
      
    hs.steps = function(_) {
      if (!arguments.length) return steps;
      steps = _;
      computeBasisFunctions();
      return hs;
    };
    
    hs.tension = function(_) {
      if (!arguments.length) return tension;
      tension = _;
      return hs;
    };
    
    function computeBasisFunctions() {
      h.length = steps;
      for (var i = 0; i < steps; i++) {
        // Normalize to [0, 1]
        var s = i / steps;
        
        // Compute the basis functions
        h[i] = { h1:  2*Math.pow(s, 3) - 3*Math.pow(s, 2) + 1,
                 h2: -2*Math.pow(s, 3) + 3*Math.pow(s, 2),
                 h3:    Math.pow(s, 3) - 2*Math.pow(s, 2) + s,
                 h4:    Math.pow(s, 3) -   Math.pow(s, 2) };
      }
    }
    
    computeBasisFunctions();
    
    return hs;        
  };
  
  // Accessor functions
  rc.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return rc;
  };
  
  rc.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return rc;
  };
  
  rc.relations = function(_) {
    if (!arguments.length) return relations;
    relations = _;
    drawRelations();
    return rc;
  };
  
  rc.pca = function(_) {
    if (!arguments.length) return pca;
    pca = _;    
    pcaData = pca.map(function(d, i) { return { data: data[i], pca: d }; });
    drawPCA();
    return rc;
  };
  
  rc.minOpacity = function(_) {
    if (!arguments.length) return minOpacity;
    minOpacity = _;
    numericAxisOpacity.range([maxOpacity, minOpacity, minOpacity, maxOpacity]);
    discreteAxisOpacity.range([maxOpacity, minOpacity, minOpacity, maxOpacity]);
    updateCurves();
    return rc;
  };
  
  rc.maxOpacity = function(_) {
    if (!arguments.length) return maxOpacity;
    maxOpacity = _;
    numericAxisOpacity.range([maxOpacity, minOpacity, minOpacity, maxOpacity]);
    discreteAxisOpacity.range([maxOpacity, minOpacity, minOpacity, maxOpacity]),
    updateCurves();
    return rc;
  };
  
  rc.maxOpacity = function(_) {
    if (!arguments.length) return maxOpacity;
    maxOpacity = _;
    numericAxisOpacity.range([maxOpacity, minOpacity, minOpacity, maxOpacity]);
    discreteAxisOpacity.range([maxOpacity, minOpacity, minOpacity, maxOpacity]),
    updateCurves();
    return rc;
  };
  
  rc.axisOpacity = function(_) {    
    if (!arguments.length) return axisOpacity;
    axisOpacity = _;
    axis.selectAll("rect")      
        .style("fill-opacity", axisOpacity);
    return rc;
  };
  
  rc.labelAngle = function(_) {
    if (!arguments.length) return labelAngle;
    labelAngle = _;
    drawLabels();
    return rc;
  };
  
  rc.transitionTime = function(_) {
    if (!arguments.length) return transitionTime;
    transitionTime = _;
    return rc;
  };
  
  rc.curveSpread = function(_) {
    if (!arguments.length) return curveSpread;
    curveSpread = _;
    createCurves();
    drawCurves();
    return rc;
  };
  
  rc.curveSteps = function(_) {
    if (!arguments.length) return hermite.steps();
    hermite.steps(_);
    createCurves();
    drawCurves();
    return rc;
  }
    
  rc.curveTension = function(_) {
    if (!arguments.length) return hermite.tension();
    hermite.tension(_);
    createCurves();
    drawCurves();
    return rc;
  }
  
  rc.discreteThreshold = function(_, updateCurves) {
    if (!arguments.length) return discreteThreshold;
    else if (arguments.length < 2) updateCurves = true;  
    
    discreteThreshold = _;
    // XXX: Probably a bit of overkill here recreating everything.  
    //      Try to figure out how to update only axes/portions of curves that have changed?
    // XXX: Maybe add a highlightDiscrete function that draws a box around all axes with discrete values
    //      below threshold.
    createAxes();
    drawAxes();
    
    if (updateCurves) {
      createCurves();
      drawCurves(transitionTime);
    }
    
    return rc;
  };
  
  rc.showRibbons = function(_) {
    if (!arguments.length) return showRibbons;
    showRibbons = _;
    drawRibbons(transitionTime);
    return rc;
  };
  
  rc.ribbonOpacity = function(_) {
    if (!arguments.length) return ribbonOpacity;
    ribbonOpacity = _;
    // XXX: Make a separarate function?
    svg.select(".ribbon").selectAll("path")
        .style("fill-opacity", ribbonOpacity);
    updateCurves();
    return rc;
  };  
  
  rc.ribbonOutlineOpacity = function(_) {
    if (!arguments.length) return ribbonOutlineOpacity;
    ribbonOutlineOpacity = _;
    // XXX: Make a separarate function?svg.select(".ribbon").selectAll("path")
    svg.select(".ribbonOutline").selectAll("path")
        .style("stroke-opacity", ribbonOutlineOpacity);
    updateCurves();
    return rc;
  };
  
  rc.ribbonOverlayOpacity = function(_) {
    if (!arguments.length) return ribbonOverlayOpacity;
    ribbonOverlayOpacity = _;
    // XXX: Make a separarate function?svg.select(".ribbon").selectAll("path")
    svg.select(".quartile").selectAll("path")
        .style("fill-opacity", ribbonOverlayOpacity);
    svg.select(".median").selectAll("path")
        .style("stroke-opacity", ribbonOverlayOpacity * 2);
    updateCurves();
    return rc;
  };
  
  rc.minRelation = function(_) {
    if (!arguments.length) return minRelation;
    minRelation = _;
    drawRelations();
    return rc;
  };
  
  rc.chordWidth = function(_) {
    if (!arguments.length) return chordWidth;
    chordWidth = _;
    drawRelations();
    return rc;
  };

  rc.useFilter = function(_) {
    if (!arguments.length) return useFilter;
    useFilter = _;
    applyFilter(useFilter);
    return rc;
  };
  
  rc.decorateAxes = function(_) {
    if (!arguments.length) return decorateAxes;
    decorateAxes = _;
    createAxes();
    drawAxes();
    createCurves();
    drawCurves(transitionTime);
    return rc;
  };
  
  rc.groupColors = function(colors) {
    if (!arguments.length) return groupColors;
    groupColors = _;
//    updateCurves();
    return rc;
  };
  
  rc.numericAxisColors = function(colors) {
    numericAxisColor.range(colors);
    updateCurves();
    return rc;
  };
  
  rc.categoricalAxisColors = function(colors) {
    categoricalAxisColor.range(colors);
    updateCurves();
    return rc;
  };
       
  rc.currentGroup = function(_) {
    if (!arguments.length) return currentGroup;
    currentGroup = _;
    return rc;
  }
  
  rc.updateCurves = function(duration) {
    if (!arguments.length) duration = 0;
    updateCurves(duration);
  }
  
  // Return the closure
  return rc;
};