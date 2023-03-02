/*=========================================================================
 
 Name:        d3.healthLitTerms.js
 
 Author:      David Borland, The Renaissance Computing Institute (RENCI)
 
 Copyright:   The Renaissance Computing Institute (RENCI)
 
 Description: Visualization of health care visualization literature using
              the d3 reusable charts convention: 
              http://bost.ocks.org/mike/chart/
 
 =========================================================================*/

(function() {
  d3.healthLitTerms = function() {
        // Size
    var margin = { top: 50, left: 10, bottom: 10, right: 10 },      
        width = 800,
        height = 800,
        innerWidth = function() { return width - margin.left - margin.right; },
        innerHeight = function() { return height - margin.top - margin.bottom; },
        
        // Data
        documents = [],
        clusters = [],
        topics = [],
        terms = [],
        
        // Scales
        clusterXScale = d3.scale.ordinal(),
        topicXScale = d3.scale.ordinal(),
        clusterHeightScale = d3.scale.linear(),
        topicHeightScale = d3.scale.linear(),
        clusterWidthScale = d3.scale.linear()
            .domain([0, 1]),
        topicWidthScale = d3.scale.linear()
            .domain([0, 1]),
        clusterColor = d3.scale.category10(),
        clusterTermsYScale = d3.scale.ordinal(), 
        topicTermsYScale = d3.scale.ordinal(),      
        
        // Start with empty selections
        svg = d3.select(),
        g = d3.select(),
      
        // Layout
        termSplitSize = 10;
        maxHeaderHeight = function() { return innerHeight() * 0.2; },
        
        freeze = false;

    // Create a closure containing the above variables
    function hlt(selection) {
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
        gEnter.append("rect").attr("class", "background")
            .attr("x", -margin.left)
            .attr("y", -margin.top)
            .on("click", dispatch.unhighlight);
          
        // Title
        gEnter.append("text")
            .text("Term View")
            .attr("class", "title")
            .attr("y", 30);
        
        // List                
        gEnter.append("g").attr("class", "connection");
        gEnter.append("line").attr("class", "centerLine");
        gEnter.append("g").attr("class", "termBackground");
        gEnter.append("g").attr("class", "term");
        
        // Header
        gEnter.append("g").attr("class", "cluster");
        gEnter.append("g").attr("class", "topic");
                
        // Update the outer dimensions
        svg .attr("class", "healthLitTerms")
            .attr("width", width)
            .attr("height", height);
          
        // Select the group
        g = svg.select("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Set scale domains        
        clusterXScale.domain(clusters.map(function(d) { return d.id; }));
        topicXScale.domain(topics.map(function(d) { return d.id; }));
        
        clusterHeightScale.domain([ 0, d3.max(clusters, function(d) { return d.documents.length; }) ]);
        topicHeightScale.domain([ 0, d3.max(topics, function(d) { return d.documents.length; }) ]);

        var maxClusterTerms = d3.max(clusters, function(d) { return d3.merge(d.terms.map(function(d) { return splitTerm(d.term); })).length; }),
            maxTopicTerms = d3.max(topics, function(d) { return d3.merge(d.terms.map(function(d) { return splitTerm(d.term); })).length; });                
        
        clusterTermsYScale.domain(d3.range(maxClusterTerms));
        topicTermsYScale.domain(d3.range(maxTopicTerms));
                              
        // Set cluster color scale
        clusterColor = d3.scale.category10();              
                
        // Remove grey
        var colors = clusterColor.range().slice();
        colors.splice(7, 1);
        
        clusterColor
            .domain(clusters.map(function(d) { return d.id; }))
            .range(colors);
            
        // Set width and height
        setWidth(width);
        setHeight(height); 
        
        // Register callbacks
        dispatch.on("highlight.terms", highlight);
        dispatch.on("highlightDocument.terms", highlightDocument);
        dispatch.on("highlightTerm.terms", highlightTerm);
        dispatch.on("unhighlight.terms", unhighlight);
        dispatch.on("freeze.terms", function(d) { freeze = d; });
        
        // Draw visualization
        drawVis();
      });
    }
                
    // Find maximum number of rows for terms per topic/cluster, including splitting long lines
    function splitTerm(term) {
      // Split term
      var t1 = term.split(" ");

      // Greedily put back together
      var t2 = [ t1[0] ];
      for (var i = 1, j = 0; i < t1.length; i++) {
        if (t2[j].length + t1[i].length + 1 < termSplitSize) {
          t2[j] = t2[j].concat(" " + t1[i]);
        } 
        else {
          t2.push(t1[i]);
          j++;
        }
      }

      return t2;
    }
    
    function clusterX(d, w) { return clusterXScale(d.id) + clusterXScale.rangeBand() / 2 - clusterWidthScale(w) / 2; }
    function clusterY(d) { return maxHeaderHeight() - clusterHeight(d); }
    function topicX(d, w) { return topicXScale(d.id) + topicXScale.rangeBand() / 2 - topicWidthScale(w) / 2; }
    function topicY() { return innerHeight() - maxHeaderHeight(); }
    function clusterHeight(d) { return clusterHeightScale(d.documents.length); }
    function topicHeight(d) { return topicHeightScale(d.documents.length); }
    
    function highlight(d) {      
      // Get counts
      var clusterTermCounts = computeCounts(d.terms, "terms", clusters, "clusters"),
          clusterDocumentCounts = computeCounts(d.documents, "documents", clusters, "cluster"),
          topicTermCounts = computeCounts(d.terms, "terms", topics, "topics"),
          topicDocumentCounts = computeCounts(d.documents, "documents", topics, "topics");        
            
      // Highlight
      highlightClusters();
      highlightTopics();
      highlightTerms();
      
      function computeCounts(objects1, key1, objects2, key2) {
        // Get counts of objects1 in each object2
        var counts = objects2.map(function() { return 0; });

        objects1.forEach(function(d) { 
          if (key2 === "cluster") {
            counts[objects2.indexOf(d.cluster)]++;
          }
          else {
            d[key2].forEach(function(d) {
              counts[objects2.indexOf(d)]++;
            }); 
          }
        });
      
        // Normalize by number of objects1 in object2
        return counts.map(function(d, i) { return d / objects2[i][key1].length; });
      }
      
      function highlightClusters() {                   
        // Change cluster header width
        g.select(".cluster").selectAll(".header").transition()
            .attr("x", function(d, i) { return clusterX(d, clusterTermCounts[i]); })
            .attr("width", function(d, i) { return clusterWidthScale(clusterTermCounts[i]); });
      }
      
      function highlightTopics() {                   
        // Change topic header width
        g.select(".topic").selectAll(".header").transition()
            .attr("x", function(d, i) { return topicX(d, topicTermCounts[i]); })
            .attr("width", function(d, i) { return topicWidthScale(topicTermCounts[i]); });
      }
      
      function highlightTerms() {
        // Set opacity based on term and document counts
        g.select(".term").selectAll(".clusterTerm").transition()
            .style("fill-opacity", function(d, i) { return clusterTermCounts[i] > 0 || clusterDocumentCounts[i] > 0 ? 1 : 0.1; })
            .style("font-weight", function(d, i) { return clusterTermCounts[i] > 0 ? "bold" : "normal"; });
          
        g.select(".term").selectAll(".topicTerm").transition()
            .style("fill-opacity", function(d, i) { return topicTermCounts[i] > 0 || topicDocumentCounts[i] > 0 ? 1 : 0.1; })
            .style("font-weight", function(d, i) { return topicTermCounts[i] > 0 ? "bold" : "normal"; });
            
        // Set opacity based on cluster/topic
        function connectionOpacity(e) { 
          var c1 = e.term1.cluster === d || e.term1.topic === d,
              c2 = e.term2.cluster === d || e.term2.topic === d;

          return c1 || c2 > 0 ? 1 : 0;
        }
                   
        // Draw connections based on connection to cluster/topic
        g.select(".connection").selectAll("line").transition()
            .style("stroke-opacity", connectionOpacity);
        
        // Show term backgrounds based on connection to cluster/topic
        g.select(".termBackground").selectAll("g")
            .each(function(e) {
              var others = [];
              if (e.cluster === d || e.topic === d) {
                others = e.others;
              }
              else {
                others = e.others.filter(function(e) { return e.cluster === d || e.topic === d; });
              }
            
              d3.select(this).call(drawTermBackground, others);
            });       
      }            
    }   
    
    function highlightDocument(d) {
      // Highlight based on selected document
      highlightClusters(d);
      highlightTopics(d);
      highlightTerms(d);
      
      function showCluster(e) { return e === d.cluster ? true : false; }
      function showTopic(e) { return d.topics.indexOf(e) === -1 ? false : true; }
      
      function highlightClusters(d) {        
        // Change cluster header width
        g.select(".cluster").selectAll(".header").transition()
            .attr("x", function(e) { return clusterX(e, showCluster(e) ? 1 : 0); })
            .attr("width", function(e) { return clusterWidthScale(showCluster(e) ? 1 : 0); });
      }
      
      function highlightTopics(d) {
         // Change topic header width
        g.select(".topic").selectAll(".header").transition()
            .attr("x", function(e) { return topicXScale(e.id) + topicXScale.rangeBand() / 2 - topicWidthScale(showTopic(e) ? 1 : 0) / 2; })
            .attr("width", function(e) { return topicWidthScale(showTopic(e) ? 1 : 0); });      
      }
      
      function highlightTerms(d) {
        // Set term opacity based on document cluster and topics
        g.select(".term").selectAll(".clusterTerm").transition()
            .style("fill-opacity", function(e) { return showCluster(e) ? 1 : 0.1; })
            .style("font-weight", function(e) { return showCluster(e) ? "bold" : "normal"; });
          
        g.select(".term").selectAll(".topicTerm").transition()
            .style("fill-opacity", function(e) { return showTopic(e) ? 1 : 0.1; })
            .style("font-weight", function(e) { return showTopic(e) ? "bold" : "normal"; });  
          
        // Set connection opacity based on visible terms
        var visibleTerms = [];
        function connectionOpacity(e) { 
          // Get visibility
          var visible = (showCluster(e.term1.cluster) || showTopic(e.term1.topic)) &&
                        (showCluster(e.term2.cluster) || showTopic(e.term2.topic));
                       
          // Save visible terms
          if (visible) {
            visibleTerms.push(e.term1);
            visibleTerms.push(e.term2);
          }
          
          // Return opacity
          return visible ? 1 : 0;
        }
                   
        // Draw connections based on document cluster and topics
        g.select(".connection").selectAll("line").transition()
            .style("stroke-opacity", connectionOpacity);
          
        // Set term background visibility
        function visible(d) { return visibleTerms.indexOf(d) !== -1; }
        
        g.select(".termBackground").selectAll("g")
            .each(function(d) {
              var others = visible(d) ? d.others.filter(function(d) { return visible(d); }) : [];
              d3.select(this).call(drawTermBackground, others);
            });   
      }
    }
    
    function highlightTerm(d) {
      // Highlight based on term
      highlightClusters();
      highlightTopics();
      highlightTerms();
      
      function showCluster(e) { return d.clusters.indexOf(e) === -1 ? false : true; }
      function showTopic(e) { return d.topics.indexOf(e) === -1 ? false : true; }
      
      function highlightClusters() {        
        // Change cluster header width
        g.select(".cluster").selectAll(".header").transition()
            .attr("x", function(e) { return clusterX(e, showCluster(e) ? 1 : 0); })
            .attr("width", function(e) { return clusterWidthScale(showCluster(e) ? 1 : 0); });
      }
      
      function highlightTopics() {
         // Change topic header width
        g.select(".topic").selectAll(".header").transition()
            .attr("x", function(e) { return topicXScale(e.id) + topicXScale.rangeBand() / 2 - topicWidthScale(showTopic(e) ? 1 : 0) / 2; })
            .attr("width", function(e) { return topicWidthScale(showTopic(e) ? 1 : 0); });      
      }
      
      function highlightTerms() {
        // Set opacity based on term clusters
        var clusterTerm = g.select(".term").selectAll(".clusterTerm");
        
        clusterTerm.transition()
            .style("fill-opacity", function(e) { return showCluster(e) ? 1 : 0.1; });
        
        clusterTerm.selectAll("g").transition()
            .style("font-weight", function(e) { return e.term === d ? "bold" : "normal"; });
          
        // Set opacity based on term topics
        var topicTerm = g.select(".term").selectAll(".topicTerm");
          
        topicTerm.transition()
            .style("fill-opacity", function(e) { return showTopic(e) ? 1 : 0.1; });
        
        topicTerm.selectAll("g").transition()
            .style("font-weight", function(e) { return e.term === d ? "bold" : "normal"; });  
          
        // Set opacity based on cluster/topic
        function connectionOpacity(e) { return e.term1.term === d || e.term2.term === d ? 1 : 0; }
                   
        // Draw connections based on document cluster and topics
        g.select(".connection").selectAll("line").transition()
            .style("stroke-opacity", connectionOpacity);
        
        // Show backgrounds for this term
        g.select(".termBackground").selectAll("g")
            .each(function(e) {
              d3.select(this).call(drawTermBackground, e.term === d ? e.others : []);
            });    
      }        
    }
    
    function drawTermBackground(selection, others) {
      // Get bound data
      var d = selection.data()[0];
      
      // Magic numbers for layout
      var x = d.x - 4,
          y = d.y - 8,
          width = d.hasOwnProperty("cluster") ? clusterXScale.rangeBand() : topicXScale.rangeBand() - 26,
          height = 21,
          rx = 5,
          ry = 5,
          dash = 20,
          gap = 4;
        
      // Fill
      function fillOpacity(d, i) { return i === 0 ? 1 : 0; }
        
      // Stroke 
      function color(d) { return d.hasOwnProperty("cluster") ? clusterColor(d.cluster.id) : "grey"; }
      var dashArray = others.length === 1 ? null : dash + ", " + ((dash + gap) * (others.length - 1) + gap);
      function dashOffset(d, i) { return others.length === 1 ? null : i * (dash + gap); }
      
      // Bind others data
      var rect = selection.selectAll("rect")
          .data(others);

      // Enter
      rect.enter().append("rect")       
          .attr("x", x)
          .attr("y", y)
          .attr("width", width)
          .attr("height", height)
          .attr("rx", rx)
          .attr("ry", ry)
          .style("fill-opacity", fillOpacity)
          .style("stroke", color)
          .style("stroke-dasharray", dashArray)
          .style("stroke-dashoffset", dashOffset)
          .style("stroke-opacity", 0);

      // Enter + update  
      rect.transition()
          .style("stroke", color)
          .style("stroke-dasharray", dashArray)
          .style("stroke-dashoffset", dashOffset)
          .style("stroke-opacity", 1);

      // Exit
      rect.exit().transition()
          .style("stroke-opacity", 0)
          .remove();   
    }

    function unhighlight() {
      unhighlightClusters();
      unhighlightTopics();  
      unhighlightTerms();
      
      function unhighlightClusters() {
        g.select(".cluster").selectAll(".header").transition()
            .attr("x", function(d) { return clusterXScale(d.id); })
            .attr("width", clusterXScale.rangeBand());
      }
      
      function unhighlightTopics() {
        g.select(".topic").selectAll(".header").transition()
            .attr("x", function(d) { return topicXScale(d.id); })
            .attr("width", topicXScale.rangeBand());
      }  
      
      function unhighlightTerms() {          
        g.select(".term").selectAll("g").transition()
            .style("font-weight", null);
          
        g.select(".term").selectAll(".term > g").transition()
            .style("fill-opacity", 1)
            .style("font-weight", "normal");

        g.select(".connection").selectAll("line").transition()
            .style("stroke-opacity", 0);
          
        g.select(".termBackground").selectAll("rect").transition()
            .style("fill-opacity", 0)
            .style("stroke-opacity", 0)
            .remove();
      }
    }
    
    function drawVis() {
      drawClusters();
      drawTopics();
      drawTerms();
      
      function drawClusters() {
        // Bind cluster data
        var cluster = g.select(".cluster").selectAll("g")
            .data(clusters);
          
        // Enter
        var clusterEnter = cluster.enter().append("g")
            .on("click", function(d) { 
              dispatch.highlight(d);
              dispatch.freeze(true);
            })
            .on("mouseover", function(d) { if (!freeze) dispatch.highlight(d); })
            .on("mouseout", function() { if (!freeze) dispatch.unhighlight(); });
        
        // Outline
        clusterEnter.append("rect")
            .attr("class", "outline")
            .attr("x", function(d) { return clusterXScale(d.id); })
            .attr("y", clusterY)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("width", clusterXScale.rangeBand())
            .attr("height", clusterHeight);
          
        // Header
        clusterEnter.append("rect")
            .attr("class", "header")
            .attr("x", function(d) { return clusterXScale(d.id); })
            .attr("y", clusterY)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("width", clusterXScale.rangeBand())
            .attr("height", clusterHeight)
            .style("fill", function(d) { return clusterColor(d.id); });
          
        // Label
        function label(d, i) { return "Cluster " + clusters[i].id; }
        
        clusterEnter.append("text")
            .text(label)
            .attr("class", "label")
            .attr("x", function(d) { return clusterXScale(d.id) + clusterXScale.rangeBand() / 2; })
            .attr("y", maxHeaderHeight())
            .attr("dy", "1em");
      }
      
      function drawTopics() {
        // Bind topic data
        var topic = g.select(".topic").selectAll("g")
            .data(topics);
          
        // Enter
        var topicEnter = topic.enter().append("g")
            .on("click", function(d, i) { 
              dispatch.highlight(d, i);
              dispatch.freeze(true);
            })
            .on("mouseover", function(d, i) { if (!freeze) dispatch.highlight(d, i); })
            .on("mouseout", function() { if (!freeze) dispatch.unhighlight(); });
        
        // Outline
        topicEnter.append("rect")
            .attr("class", "outline")
            .attr("x", function(d) { return topicXScale(d.id); })
            .attr("y", topicY)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("width", topicXScale.rangeBand())
            .attr("height", topicHeight);
          
        // Header
        topicEnter.append("rect")
            .attr("class", "header")
            .attr("x", function(d) { return topicXScale(d.id); })
            .attr("y", topicY)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("width", topicXScale.rangeBand())
            .attr("height", topicHeight);
          
        // Label
        function label(d, i) { return "Topic " + topics[i].id; }
        
        topicEnter.append("text")
            .text(label)
            .attr("class", "label")
            .attr("x", function(d) { return topicXScale(d.id) + topicXScale.rangeBand() / 2; })
            .attr("y", innerHeight() - maxHeaderHeight())
            .attr("dy", "-.3em"); 
      }
      
      function drawTerms() {
        // Generate term data for each term cluster/topic term instance 
        var termData = [];

        var xOffset = 20;
        
        // Add cluster terms        
        clusters.forEach(function(d) { 
          // Get x for this cluster
          var x = clusterXScale(d.id) + xOffset;
             
          // Initialize termData for this cluster
          d.termData = [];
          
          var i = 0;
          d.terms.sort(function(a, b) { return d3.descending(a.term, b.term); })
                 .forEach(function(e) {
            // Split term, if necessary
            var t = splitTerm(e.term).reverse();
            i += t.length - 1;
             
            var y = clusterTermsYScale(i++);
            
            var td = {
              term: e, 
              x: x,
              y: y,
              cluster: d,
              others: []
            };
            
            termData.push(td);
            d.termData.push(td);
          });
        });
        
        // Add topic terms
        topics.forEach(function(d) { 
          // Get x for this topic
          var x = topicXScale(d.id) + xOffset;
              
          // Initialize termData for this topic
          d.termData = [];
          
          var i = 0;
          d.terms.sort(function(a, b) { return d3.ascending(a.term, b.term); })
                 .forEach(function(e) {
            // Split term, if necessary
            var t = splitTerm(e.term).reverse(),
                y = topicTermsYScale(i);
                       
            i += t.length;
            
            var td = {
              term: e,
              x: x,
              y: y,
              topic: d,
              others: []
            }
            
            termData.push(td);
            d.termData.push(td);
          });
        });   
                         
        // Generate term connection data
        var connections = [];
        for (var i = 0; i < termData.length; i++) {
          for (var j = i + 1; j < termData.length; j++) {
            // Get term data
            var t1 = termData[i],
                t2 = termData[j];

            // Check for same term
            if (t1.term === t2.term) {
                connections.push({ term1: t1, term2: t2 });
                t1.others.push(t2);
                t2.others.push(t1);
            }
          }
        }
                
        var xIndent = 5,
            ySpacing = 20;
        
        // Bind cluster data
        var cluster = g.select(".term").selectAll(".clusterTerm")
            .data(clusters);
          
        // Enter
        cluster.enter().append("g")
            .attr("class", "clusterTerm")
          .selectAll("g")
            .data(function(d) { return d.termData; })
          .enter().append("g").each(function(d) {
            d3.select(this).selectAll("text")
                .data(splitTerm(d.term.term).reverse())
              .enter().append("text")
                .text(function(d) { return d; })
                .attr("x", function(e, i) { return d.x + i * xIndent; })
                .attr("y", function(e, i) { return d.y + i * ySpacing })
                .attr("dy", ".5em")
                .on("click", function(e) {
                  dispatch.highlightTerm(d.term);
                  dispatch.freeze(true);
                });
          });
            
        // Bind topic data        
        var topic = g.select(".term").selectAll(".topicTerm")
            .data(topics);
          
        // Enter
        topic.enter().append("g")
            .attr("class", "topicTerm")
          .selectAll("g")
            .data(function(d) { return d.termData; })
          .enter().append("g").each(function(d) {
            d3.select(this).selectAll("text")
                .data(splitTerm(d.term.term))
              .enter().append("text")
                .text(function(d) { return d; })
                .attr("x", function(e, i) { return d.x + i * xIndent; })
                .attr("y", function(e, i) { return d.y + i * ySpacing; })
                .attr("dy", ".5em")
                .on("click", function(e) {
                  dispatch.highlightTerm(d.term);
                  dispatch.freeze(true);
                });
            });
                        
        function isClusterTerm(d) { return d.hasOwnProperty("cluster"); }
        function connectionX(d, term) { return term.x + (isClusterTerm(d) ? clusterXScale.rangeBand() : topicXScale.rangeBand()) / 2 - 15; }
        function connectionY(term) { return term.y + 3; }
                
        // Bind connection data for lines
        g.select(".connection").selectAll("g")
            .data(connections)
          .enter().append("line")
            .attr("x1", function(d) { return connectionX(d, d.term1); })
            .attr("x2", function(d) { return connectionX(d, d.term2); })
            .attr("y1", function(d) { return connectionY(d.term1); })
            .attr("y2", function(d) { return connectionY(d.term2); });
          
        // Bind term data for background
        g.select(".termBackground").selectAll("g")
            .data(termData.filter(function(d) { return d.others.length > 0; }))
          .enter().append("g");
      }
    }
        
    function setWidth(_) {
      width = _;
      svg.attr("width", width);
      
      // Set x ranges
      clusterXScale.rangeBands([0, innerWidth()], 0.05);
      topicXScale.rangeBands([0, innerWidth()], 0.05);
      clusterWidthScale.range([2, clusterXScale.rangeBand()]);
      topicWidthScale.range([2, topicXScale.rangeBand()]);
      
      // Set center line
      g.select(".centerLine")
            .attr("x1", 0)
            .attr("x2", width);
          
      // Update the title
      g.select(".title")
          .attr("x", clusterXScale.rangeBand());
        
      // Update the background
      g.select(".background")
          .attr("width", width);
    }
    
    function setHeight(_) {
      height = _;
      svg.attr("height", height);
      
      // Set y ranges
      clusterHeightScale.range([ 0, maxHeaderHeight() ]);
      topicHeightScale.range([ 0, maxHeaderHeight() ]);
      
      var maxClusterTerms = clusterTermsYScale.domain().length,
          maxTopicTerms = topicTermsYScale.domain().length;
      
      var border = 30,
          termSpace = innerHeight() - maxHeaderHeight() * 2 - border * 3,
          clusterTermHeight = termSpace * maxClusterTerms / (maxClusterTerms + maxTopicTerms);
        
      var split = maxHeaderHeight() + border * 1.5 + clusterTermHeight;
      
      clusterTermsYScale.rangePoints([ split - border / 2, maxHeaderHeight() + border ], 1.5);
      topicTermsYScale.rangePoints([ split + border / 2, innerHeight() - maxHeaderHeight() - border ], 1.5);
      
      // Set center line
      g.select(".centerLine")
            .attr("y1", split)
            .attr("y2", split);
          
      // Update the background
      g.select(".background")
          .attr("height", height);
    }
    
    hlt.width = function(_) {
      if (!arguments.length) return width;
      setWidth(_);
      drawVis();
      return hlt;
    };
    
    hlt.height = function(_) {
      if (!arguments.length) return height;
      setHeight(_);
      drawVis();
      return hlt;
    };

    // Return the closure
    return hlt;
  };
})();