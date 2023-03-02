/*=========================================================================
 
 Name:        d3.healthLitScatter.js
 
 Author:      David Borland, The Renaissance Computing Institute (RENCI)
 
 Copyright:   The Renaissance Computing Institute (RENCI)
 
 Description: Visualization of health care visualization literature using
              the d3 reusable charts convention: 
              http://bost.ocks.org/mike/chart/
 
 =========================================================================*/

(function() {
  d3.healthLitScatter = function() {
        // Size
    var margin = { top: 50, left: 10, bottom: 10, right: 10 },      
        width = 800,
        height = 800,
        innerWidth = function() { return width - margin.left - margin.right; },
        innerHeight = function() { return height - margin.top - margin.bottom; },
        innerSize = function() { return Math.min(innerWidth(), innerHeight()); },
        
        // Data
        documents = [],
        clusters = [],
        topics = [],
        terms = [],
        
        // Scales
        xScale = d3.scale.linear(),
        yScale = d3.scale.linear(),
        documentRadiusScale = d3.scale.linear(),
        clusterRadiusScale = d3.scale.linear(),
        topicRadiusScale = d3.scale.linear(),
        clusterColor,
        opacityScale = d3.scale.linear()
            .domain([0, 1])
            .range([0.1, 1]),
        documentOpacityScale = d3.scale.linear()
            .range([0.1, 1]),
        radiusScale = d3.scale.linear()
            .domain([0, 1]),
        
        // Start with empty selections
        svg = d3.select(),
        g = d3.select(),
      
        // Parameters
        documentRadiusMax = 0.01,
        documentRadiusMin = 0.005,
        documentBackgroundRadius = 0.05,
        clusterRadiusMax = 0.005,
        clusterRadiusMin = 0.0025,
        
        documentDefaultOpacity = 0.25,
        documentHighlightOpacity = 0.5,
        
        // Layout
        innerRing = 0.4,
        innerRingRadius = function() { return innerRing * innerSize(); },
        outerRingRadius = function() { return innerSize() / 2 - 10; },      
        arc = d3.svg.arc().cornerRadius(5),
        
        freeze = false;

    // Create a closure containing the above variables
    function hls(selection) {
      selection.each(function(data) {   
        // Set data
        documents = data.documents;
        clusters = data.clusters;
        topics = data.topics;
        terms = data.terms;
        
        // Select the svg element, if it exists
        svg = d3.select(this).selectAll("svg")
            .data([0]);
  
        // Otherwise create the skeletal chart with groups for correct z order
        var gEnter = svg.enter().append("svg").append("g");  
        
        // Background        
        gEnter.append("rect").attr("class", "background").on("click", dispatch.unhighlight);
        
        // Title
        gEnter.append("text")
            .text("Document View")
            .attr("class", "title"); 
        
        // Scatter plot
        gEnter.append("g").attr("class", "documentBackground");
        gEnter.append("g").attr("class", "cluster");
        gEnter.append("g").attr("class", "topic");
        gEnter.append("g").attr("class", "document");
        
        // Ring
        gEnter.append("g").attr("class", "clusterArc");
        gEnter.append("g").attr("class", "topicArc");
        
        // Document info labels
        gEnter.append("text")
          .attr("class", "documentInfo1");        
        
        gEnter.append("text")
          .attr("class", "documentInfo2");
        
        // Update the outer dimensions
        svg .attr("class", "healthLitScatter")
            .attr("width", width)
            .attr("height", height);
          
        // Select the group
        g = svg.select("g");

        // Set x and y scale domains to center and maintain equal spacing in x and y
        var xMin = d3.min(documents, function(d) { return d.svd[0]; }),
            xMax = d3.max(documents, function(d) { return d.svd[0]; }),
            yMin = d3.min(documents, function(d) { return d.svd[1]; }),
            yMax = d3.max(documents, function(d) { return d.svd[1]; }),
            xSize = xMax - xMin,
            ySize = yMax - yMin, 
            size = Math.max(xSize, ySize),
            xDiff = (size - xSize) / 2,
            yDiff = (size - ySize) / 2;
        
        xScale.domain([ xMin - xDiff, xMax + xDiff ]);
        yScale.domain([ yMin - yDiff, yMax + yDiff ]);     
                      
        // Set radius scale domains
        documentRadiusScale.domain([ d3.min(documents, function(d) { return d.topics.length; }),
                                     d3.max(documents, function(d) { return d.topics.length; }) ]);
        clusterRadiusScale.domain([ d3.min(clusters, function(d) { return d.documents.length; }),
                                    d3.max(clusters, function(d) { return d.documents.length; }) ]);
        topicRadiusScale.domain([ d3.min(topics, function(d) { return d.documents.length; }),
                                  d3.max(topics, function(d) { return d.documents.length; }) ]);
        
        // Set cluster color scale
        clusterColor = d3.scale.category10();
                
        // Remove grey
        var colors = clusterColor.range().slice();
        colors.splice(7, 1);
        
        clusterColor
            .domain(clusters.map(function(d) { return d.id; }))
            .range(colors);
          
        // Create gradients
        createGradients();
            
        // Set width and height
        setWidth(width);
        setHeight(height);             
        
        // Register callbacks
        dispatch.on("highlight.scatter", highlight);        
        dispatch.on("highlightDocument.scatter", highlightDocument);
        dispatch.on("highlightTerm.scatter", highlightTerm);
        dispatch.on("unhighlight.scatter", unhighlight);
        dispatch.on("freeze.scatter", function(d) { freeze = d; });
        
        // Draw visualization
        drawVis();
      });
    }

    function highlight(d) {
      // Highlight based on selected cluster or topic
      highlightDocuments(d.documents);
      highlightClusters(d.documents);
      highlightTopics(d.documents);       
                        
      // Check if cluster or topic
      if (d.hasOwnProperty("description")) {
        showRmsstd(d);
        showTopicLine(null);
      }
      else {          
        showRmsstd(null);
        showTopicLine(d);
      }      
      
      // Hide document info
      g.select(".documentInfo1")
         .text("");
          
      function highlightDocuments(d) {
        function showDocument(e) { return d.indexOf(e) !== -1; } 
        
        // Highlight documents
        g.select(".document").selectAll("circle").transition()
            .style("fill-opacity", function(d) { return showDocument(d) ? documentHighlightOpacity : 0; })
            .style("pointer-events", function(d) { return showDocument(d) ? "all" : "none"; });

        // Show document backgrounds
        g.select(".documentBackground").selectAll("circle").transition()
            .attr("r", function(d) { return showDocument(d) ? documentBackgroundRadius * innerSize() : 0; });
      }
      
      function highlightClusters(d) {
        // Get counts of documents in each cluster
        var counts = clusters.map(function() { return 0; });
        d.forEach(function(d) { counts[clusters.indexOf(d.cluster)]++; });
        counts = counts.map(function(e) { return e / d.length; });

        // Highlight  clusters
        g.select(".cluster").selectAll("g").transition()
            .style("stroke-opacity", function(d, i) { return counts[i] === 0 ? 0 : opacityScale(counts[i]); })          
            .style("pointer-events", function(d, i) { return counts[i] === 0 ? "none" : "all"; });
                   
        // Change cluster arc radii
        g.select(".clusterArc").selectAll(".arc").transition()
            .attr("d", function(d, i) { return arc.outerRadius(radiusScale(counts[i]))(d); });
      }
      
      function highlightTopics(d) {
        // Get counts of documents in each topic
        var counts = topics.map(function() { return 0; });
        d.forEach(function(d) { 
          d.topics.forEach(function(d) { 
            counts[topics.indexOf(d)]++;
          }); 
        });
        
        counts = counts.map(function(e) { return e / d.length; });

        // Highlight  topics
        g.select(".topic").selectAll("circle").transition()
            .style("stroke-opacity", function(d, i) { return counts[i] === 0 ? 0 : opacityScale(counts[i]); })          
            .style("pointer-events", function(d, i) { return counts[i] === 0 ? "none" : "all"; });
                   
        // Change topic arc radii
        g.select(".topicArc").selectAll(".arc").transition()
            .attr("d", function(d, i) { return arc.outerRadius(radiusScale(counts[i]))(d); });
      }
    }

    function highlightDocument(d) {
      // Highlight based on selected document
      highlightDocuments(d);
      highlightClusters(d.cluster);
      highlightTopics(d.topics);
      
      // Show document info
      g.select(".documentInfo1")
         .text(parseName(d.name));
       
      g.select(".documentInfo2")
          .text("");
      
      function highlightDocuments(d) {
        var counts = documents.map(function(e) { 
          // Add one for cluster
          var count = e.cluster === d.cluster ? 1 : 0;
          
          // Add one for each topic
          d.topics.forEach(function(f) { count += e.topics.indexOf(f) !== -1 ? 1 : 0; });
          
          return count;
        });
        
        documentOpacityScale.domain([1, d3.max(counts)]);
        
        // Highlight documents
        g.select(".document").selectAll("circle").transition()
            .style("fill-opacity", function(d, i) { return counts[i] === 0 ? 0 : documentOpacityScale(counts[i]); })
            .style("stroke-opacity", function(e) { return e === d ? 1 : 0; })        
            .style("pointer-events", function(d, i) { return counts[i] === 0 ? "none" : "all"; });
            
        // Show background
        g.select(".documentBackground").selectAll("circle").transition()
//            .attr("r", function(e) { return e.cluster === d.cluster ? documentBackgroundRadius * innerSize() : 0; });
//            .attr("r", function(d, i) { return counts[i] ? documentBackgroundRadius * innerSize() : 0; });
            .attr("r", 0);

      }
        
      function highlightClusters(d) {
        function showCluster(e) { return e === d; }
      
        // Highlight  clusters
        g.select(".cluster").selectAll("g").transition()
            .style("stroke-opacity", function(d) { return showCluster(d) ? 1 : 0; })        
            .style("pointer-events", function(d) { return showCluster(d) ? "all" : "none"; });

        // Change cluster arc radii
        g.select(".clusterArc").selectAll(".arc").transition()
            .attr("d", function(d) { return arc.outerRadius(radiusScale(showCluster(d.data) ? 1 : 0))(d); });
                           
        // Hide rmsstd circle
        showRmsstd(null);
      }
      
      function highlightTopics(d) {      
        function showTopic(e) { return d.indexOf(e) === -1 ? false : true; }
        
        // Highlight  topics
        g.select(".topic").selectAll("circle").transition()
            .style("stroke-opacity", function(d) { return showTopic(d) ? 1 : 0; })
            .style("pointer-events", function(d) { return showTopic(d) ? "all" : "none"; });

        // Change topic arc radii
        g.select(".topicArc").selectAll(".arc").transition()
            .attr("d", function(e) { return arc.outerRadius(radiusScale(showTopic(e.data) ? 1 : 0))(e); });
        
        // Remove any topic lines
        showTopicLine(null);
      }
    }
    
    function highlightTerm(d) {
      // Highlight based on selected term
      highlightDocuments(d);
      highlightClusters(d);
      highlightTopics(d);
      
      // Remove any current topic line or rmsstd circle
      showRmsstd(null);
      showTopicLine(null);      
      
      // Hide document info
      g.select(".documentInfo1")
         .text("");
        
      function showCluster(e) { return d.clusters.indexOf(e) === -1 ? false : true; }
      function showTopic(e) { return d.topics.indexOf(e) === -1 ? false : true; }
      
      function highlightDocuments(d) {
        function showDocument(e) { return showCluster(e.cluster) || e.topics.reduce(function(p, c) { return p || showTopic(c); }, false); }
      
        // Highlight documents
        g.select(".document").selectAll("circle").transition()
            .style("fill-opacity", function(d) { return showDocument(d) ? documentHighlightOpacity : 0; })
            .style("pointer-events", function(d) { return showDocument(d) ? "all" : "none"; });

        // Show background
        g.select(".documentBackground").selectAll("circle").transition()
//            .attr("r", function(d) { return showDocument(d) ? documentBackgroundRadius * innerSize() : 0; });
            .attr("r", 0);
      }
      
      function highlightClusters(d) {           
        // Fade  clusters
        g.select(".cluster").selectAll("g").transition()
            .style("stroke-opacity", function(d) { return showCluster(d) ? 1 : 0; })
            .style("pointer-events", function(d) { return showCluster(d) ? "all" : "none"; });

        // Change cluster arc radii
        g.select(".clusterArc").selectAll(".arc").transition()
            .attr("d", function(d) { return arc.outerRadius(radiusScale(showCluster(d.data) ? 1 : 0))(d); });
      }
      
      function highlightTopics(d) {              
        // Fade  topics
        g.select(".topic").selectAll("circle").transition()
            .style("stroke-opacity", function(d) { return showTopic(d) ? 1 : 0; })
            .style("pointer-events", function(d) { return showTopic(d) ? "all" : "none"; });

        // Change topic arc radii
        g.select(".topicArc").selectAll(".arc").transition()
            .attr("d", function(d) { return arc.outerRadius(radiusScale(showTopic(d.data) ? 1 : 0))(d); });    
      }
    }

    function unhighlight() {
      unhighlightDocuments();
      unhighlightClusters();
      unhighlightTopics();     
      
      showRmsstd(null);
      showTopicLine(null);      
      
      // Hide document info
      g.select(".documentInfo1")
         .text("");
      
      dispatch.freeze(false);
      
      function unhighlightDocuments() {
        // Unhighlight documents
        g.select(".document").selectAll("circle").transition()
            .style("fill-opacity", documentDefaultOpacity)
            .style("stroke-opacity", 0)
            .style("pointer-events", "all");

        // Remove background
        g.select(".documentBackground").selectAll("circle").transition()
            .attr("r", 0);     
      }
      
      function unhighlightClusters() {
        // Restore clusters
        g.select(".cluster").selectAll("g").transition()
            .style("stroke-opacity", 1)
            .style("pointer-events", "all");
        
        // Restore cluster arcs        
        arc.outerRadius(outerRingRadius());

        g.select(".clusterArc").selectAll(".arc").transition()
            .attr("d", arc);
      }
      
      function unhighlightTopics() {
        // Restore topics
        g.select(".topic").selectAll("circle").transition()
            .style("stroke-opacity", 1)
            .style("pointer-events", "all");
        
        // Restore topic arcs        
        arc.outerRadius(outerRingRadius());

        g.select(".topicArc").selectAll(".arc").transition()
            .attr("d", arc);
      }  
    }
    
    function showRmsstd(d) {
      function radius(d) { return xScale(d.rmsstd) - xScale(0); }
      
      g.select(".cluster").selectAll(".rmsstd").transition()
          .attr("r", function(e) { return e === d ? radius(e) : clusterRadius(e); })         
          .style("stroke-opacity", function(e) { return e === d ? 1 : 0; });
    }
    
    function showTopicLine(d) {
      g.select(".topicArc").selectAll(".topicLine").transition()
          .style("stroke-opacity", function(e) { return e.data === d ? 1 : 0; });
    }
    
    function createGradients() {   
      // Add defs to svg
      svg.selectAll("defs")
          .data([0])
        .enter().append("defs");
      
      // Bind colors for gradients
      var gradient = svg.select("defs").selectAll("radialGradient")
          .data(clusterColor.domain());
        
      // Enter
      var gradientEnter = gradient.enter().append("radialGradient")
          .attr("id", function(d) { return "gradient" + d; });
          
      gradientEnter.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", function(d) { return clusterColor(d); })
          .attr("stop-opacity", 1);
        
      gradientEnter.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", function(d) { return clusterColor(d); })
          .attr("stop-opacity", 0);
    }
    
    function parseName(d) { 
      var s = d.split(/[._-]/),
          name = s[0].charAt(0).toUpperCase() + s[0].substr(1).toLowerCase(),
          title = s[1].replace(/([A-Z])/g, ' $1');
        
      s = name + ", " + title;
                     
      var maxLength = 110;
 
      return s.length > maxLength ? s.slice(0, maxLength - 3) + "..." : s;
    }
    
    function documentX(d) { return xScale(d.svd[0]); }
    function documentY(d) { return yScale(d.svd[1]); }
    function clusterRadius(d) { return clusterRadiusScale(d.documents.length); }
    
    function drawVis() {
      // Drawing functions
      var pie = d3.layout.pie()
          .value(function(d) { return d.documents.length; })
          .sort(null)
          .padAngle(0.01);
      
      // Scatter plot
      drawDocuments();
      drawClusters();
      drawTopics();
      
      // Ring        
      drawClusterArcs();
      drawTopicArcs();
      
      // Helper functions      
      function topicRadius(d) { return topicRadiusScale(d.documents.length); }
      
      function drawDocuments() {
        // Sort so larger circles on bottom
        documents.sort(function(a, b) { return d3.descending(a.topics.length, b.topics.length); });
        
        // Draw circles for documents
        g.select(".document").selectAll("circle")
            .data(documents)
          .enter().append("circle")
            .attr("cx", documentX)
            .attr("cy", documentY)
            //.attr("r", documentRadius * innerSize())
            .attr("r", function(d) { return documentRadiusScale(d.topics.length); })
            .style("fill", function(d) { return clusterColor(d.cluster.id); })
            .style("fill-opacity", documentDefaultOpacity)
            .each(function() {
              var selection = d3.select(this),
                  strokeOpacity = selection.style("stroke-opacity");
              
              selection
                  .on("click", function(d) {
                    dispatch.highlightDocument(d);
                    dispatch.freeze(true);
                    strokeOpacity = 1;
                  })
                  .on("mouseover", function() {
                    selection.style("stroke-opacity", 0.5);
                    
                    g.select(".documentInfo2")
                        .text(parseName(selection.data()[0].name));
                  })
                  .on("mouseout", function() {
                    selection.style("stroke-opacity", strokeOpacity);
                  
                    g.select(".documentInfo2")
                        .text("");
                  });
            });
                  
        // Add background
        g.select(".documentBackground").selectAll("circle")
            .data(documents)        
          .enter().append("circle")
            .attr("cx", documentX)
            .attr("cy", documentY)
            .attr("r", 0)
            //.style("fill", function(d) { return clusterColor(d.cluster.id); })
            .style("fill", function(d) { return "url(#gradient" + d.cluster.id + ")"; });
      }          
         
      function drawClusters() {
        // Create groups for clusters
        // XXX: Could sort to draw larger on bottom. Would need to change count code in highlighting
        var clusterEnter = g.select(".cluster").selectAll("g")
            .data(clusters)
          .enter().append("g")
            .attr("transform", function(d) { return "translate(" + xScale(d.means[0]) + "," + yScale(d.means[1]) + ")"; })
            .on("click", function(d) {
              dispatch.highlight(d);
              dispatch.freeze(true);
            });

        // Add border
        clusterEnter.append("circle")
            .attr("class", "border")
            .attr("r", clusterRadius);

        // Add circle
        clusterEnter.append("circle")
            .attr("r", clusterRadius)
            .style("stroke", function(d) { return clusterColor(d.id); });
          
        // Add rmsstd circle
        clusterEnter.append("circle")
            .attr("class", "rmsstd")
            .attr("r", clusterRadius)
            .style("stroke", function(d) { return clusterColor(d.id); })          
            .style("stroke-opacity", 0);
      }
      
      function drawTopics() {
        // Bind topic data
        var topic = g.select(".topic").selectAll("circle")
            .data(topics);

        // Enter
        topic.enter().append("circle")
            .attr("cx", function(d) { return xScale(d.x); })
            .attr("cy", function(d) { return yScale(d.y); })
            .attr("r", topicRadius)
            .on("click", function(d, i) {
              dispatch.highlight(d, i);
              dispatch.freeze(true);
            });
      }
      
      function drawClusterArcs() {
        // Set start and end angles for pie layout
        pie .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);
        
        // Bind cluster arc data
        var cluster = g.select(".clusterArc").selectAll("g")
            .data(pie(clusters));

        // Enter
        var clusterEnter = cluster.enter().append("g")
            .on("click", function(d) { 
              dispatch.highlight(d.data);
              dispatch.freeze(true);
            })
            .on("mouseover", function(d) { if (!freeze) dispatch.highlight(d.data); })
            .on("mouseout", function() { if (!freeze) dispatch.unhighlight(); });

        // Outline
        clusterEnter.append("path")
            .attr("class", "outline")
            .attr("d", arc)
            .attr("fill", function(d) { return clusterColor(d.data.id); });

        // Arc
        clusterEnter.append("path")
            .attr("class", "arc")
            .attr("d", arc)
            .attr("fill", function(d) { return clusterColor(d.data.id); });   
          
        // Label
        function label(d) { return "Cluster " + d.data.id; }
        
        clusterEnter.append("text")
            .text(label)
            .attr("class", "label")
            .attr("dy", ".5em")
            .attr("transform", function(d) {
              return "rotate(" + ((d.startAngle + d.endAngle) / 2 * 180 / Math.PI - 90) + ")"
                   + "translate(" + (outerRingRadius() + 12) + ",0)"
                   + "rotate(90)";
            });
      }
      
      function drawTopicArcs() {
        // Set start and end angles for pie layout
        pie .startAngle(3 * Math.PI / 2)
            .endAngle(Math.PI / 2);
          
        // Swap start and end angles to work with counter-clockwise pie layout
        var topicArcs = pie(topics);
        
        topicArcs.forEach(function(d) { 
          var temp = d.startAngle;
          d.startAngle = d.endAngle;
          d.endAngle = temp;
        });
        
        // Bind topic arc data
        var topicEnter = g.select(".topicArc").selectAll("g")
            .data(topicArcs)
          .enter().append("g")
            .on("click", function(d) { 
              dispatch.highlight(d.data); 
              freeze = true; 
            })
            .on("mouseover", function(d) { if (!freeze) dispatch.highlight(d.data); })
            .on("mouseout", function() { if (!freeze) dispatch.unhighlight(); });

        // Outline
        topicEnter.append("path")
            .attr("class", "outline")
            .attr("d", arc);

        // Arc
        topicEnter.append("path")
            .attr("class", "arc")
            .attr("d", arc);                
        
        // Label
        function label(d) { return "Topic " + d.data.id; }
        
        topicEnter.append("text")
            .text(label)
            .attr("class", "label")
            .attr("dy", ".2em")
            .attr("transform", function(d) {
              return "rotate(" + ((d.startAngle + d.endAngle) / 2 * 180 / Math.PI - 90) + ")"
                   + "translate(" + (outerRingRadius() + 12) + ",0)"
                   + "rotate(-90)";
            });
            
        // Line
        function angle(d) { return (d.startAngle + d.endAngle) / 2 - Math.PI / 2; }
        
        topicEnter.append("line")
            .attr("class", "topicLine")
            .attr("x1", function(d) { return xScale(d.data.x); })
            .attr("y1", function(d) { return yScale(d.data.y); })
            .attr("x2", function(d) { return Math.cos(angle(d)) * innerRingRadius(); })
            .attr("y2", function(d) { return Math.sin(angle(d)) * innerRingRadius(); })
            .style("stroke-opacity", 0);
      }
    }
    
    function updateSize() {      
      // Size of scatter plot
      var scatterRadius = innerRingRadius() / Math.sqrt(2);
      
      // Manual shift to center a bit better
      var xShift = -scatterRadius * 0.2,
          yShift = scatterRadius * 0.15;
      
      // Set scales
      xScale.range([-scatterRadius + xShift, scatterRadius + xShift]);
      yScale.range([-scatterRadius + yShift, scatterRadius + yShift]);
      documentRadiusScale.range([documentRadiusMin * innerSize(), documentRadiusMax * innerSize()]);
      clusterRadiusScale.range([clusterRadiusMin * innerSize(), clusterRadiusMax * innerSize()]);
      topicRadiusScale.range(clusterRadiusScale.range());
      radiusScale.range([innerRingRadius() + 2, outerRingRadius()]);
      
      // Arc size
      arc .outerRadius(outerRingRadius())
          .innerRadius(innerRingRadius());
        
      // Update the transform
      g.attr("transform", "translate(" + (margin.left + innerWidth() / 2) + "," + (margin.top + innerHeight() / 2) + ")"); 
      
      // Update the title
      g.select(".title")
          .attr("x", -innerRingRadius())
          .attr("y", -innerHeight() / 2 + 30);
        
      // Update the document info labels
      var yFraction = 0.5;
      
      g.select(".documentInfo1")
          .attr("y", innerRingRadius() * yFraction); 
        
      g.select(".documentInfo2")
          .attr("y", innerRingRadius() * yFraction + 30);        
        
      // Update the background
      g.select(".background")
          .attr("x", -width / 2)        
          .attr("y", -height / 2)
          .attr("width", width)
          .attr("height", height);
    }
    
    function setWidth(_) {
      width = _;
      svg.attr("width", width);
      
      updateSize();
    }
    
    function setHeight(_) {
      height = _;
      svg.attr("height", height);
      
      updateSize();
    }
    
    hls.width = function(_) {
      if (!arguments.length) return width;
      setWidth(_);
      drawVis();
      return hls;
    };
    
    hls.height = function(_) {
      if (!arguments.length) return height;
      setHeight(_);
      drawVis();
      return hls;
    };

    // Return the closure
    return hls;
  };
})();