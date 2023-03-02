/*=========================================================================
 
 Name:        d3.pathMap.js
 
 Author:      David Borland, The Renaissance Computing Institute (RENCI)
 
 Copyright:   The Renaissance Computing Institute (RENCI)
 
 Description: Path map temporal visualization using d3  following the 
              reusable charts convention: http://bost.ocks.org/mike/chart/
 
 =========================================================================*/

(function() {
  d3.pathMap = function() {
        // Size
    var margin = { top: 10, left: 10, bottom: 10, right: 10 },      
        width = 800,
        height = 800,
        innerWidth = function() { return width - margin.left - margin.right; },
        innerHeight = function() { return height - margin.top - margin.bottom; },
        
        // Data
        data = [],
        columns = [],
        currentColumn,
        
        // Scales
        xScale = d3.scale.ordinal(),
        yScale = d3.scale.ordinal(),
        values = ["Missing", "Normal", "BorderlineDiab", "ControlledDiab", "Uncontrolled"],
        valueScale = d3.scale.ordinal()
            .domain(values)
            .range(d3.range(values.length)),
//            .range([0, 1, 1, 1, 2])
        colorScale = d3.scale.ordinal()
            .domain(values)
//            .range(["#ccc", "#2ca02c", "#1f77b4", "#ff7f0e", "#d62728"]),
//            .range(["#ccc", "#2ca02c", "#2ca02c", "#2ca02c", "#d62728"]),
//            .range(["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"]),
            .range(["grey", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"]),
//            .range(["grey", "#2ca02c", "#1f77b4", "#ff7f0e", "#d62728"]),
        
        // Start with empty selections
        svg = d3.select(),
        g = d3.select(),
      
        // Parameters
        sortBy = "weightedAverage";

    // Create a closure containing the above variables
    function pm(selection) {
      selection.each(function(d) {   
        // Get column names and reverse them, as Death comes first
        columns = d3.keys(d[0]).reverse();
        
        // Create data as arrays from input objects
        data = [];
        d.forEach(function(d) { 
          var row = [];
          columns.forEach(function(e) { row.push(d[e]); });
          data.push(row);
        });
        
        currentColumn = data[0].length - 1;
        
        // Select the svg element, if it exists
        svg = d3.select(this).selectAll("svg")
            .data([data]);
  
        // Otherwise create the skeletal chart
        g = svg.enter().append("svg")
            .attr("class", "pathMap")
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
/*
 * Experiment with zoom behavior
          .append("g")
            .call(d3.behavior.zoom().scaleExtent([1, 100]).on("zoom", function() {
              d3.select(this).attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            }));            
*/     
        // Groups for correct z order
        g.append("g").attr("class", "row");
        g.append("g").attr("class", "rowLine2");
        g.append("g").attr("class", "rowLine");
        g.append("g").attr("class", "columnHighlight");
        g.append("g").attr("class", "columnSelect");
            
        // Set x scale domain
        xScale.domain(d3.range(columns.length));  
        
        // Sort rows
        sortRows();
            
        // Set width and height
        setWidth(width);
        setHeight(height);             
        
        // Draw
        drawPathMap();
      });
    }
    
    function sortRows() {
      switch (sortBy) {          
        case "weightedAverage":
          // Sort by weighted average around the current column
          var avg = data.map(function(d) {
            var r = 20,
                v = 0,
                count = 0;
            for (var i = Math.max(currentColumn - r, 0); i <= Math.min(currentColumn + r, d.length); i++) {
              if (valueScale(d[i]) === 0) continue;
              v += valueScale(d[i]) * (r - Math.abs(currentColumn - i) + 1);
              count++;
            }
            return count === 0 ? 0 : v / count;              
          });

          yScale.domain(d3.range(data.length).sort(function(a, b) { 
            var v1 = valueScale(data[a][currentColumn]),
                v2 = valueScale(data[b][currentColumn]);

            return v1 === v2 ? d3.descending(avg[a], avg[b]) : d3.descending(v1, v2); 
          }));
          
          break;
          
        case "propagateForward":
          // Sort data by value at the current column
          yScale.domain(d3.range(data.length).sort(function(a, b) {
            var nCol = data[0].length;
            
            // Break ties moving forward from this currentColumn, then backward
            for (var i = currentColumn, inc = 1; i >= 0; i += inc) {
              var v1 = valueScale(data[a][i]),
                  v2 = valueScale(data[b][i]);

              if (v1 !== v2) return d3.descending(v1, v2); 

              if (i === nCol - 1) {
                i = currentColumn;
                inc = -1;
              }
            }
          }));  
          
          break;
          
        case "propagateBackward":
          // Sort by value at the current column
          yScale.domain(d3.range(data.length).sort(function(a, b) {
            var nCol = data[0].length;
            
            // Break ties moving backward from this currentColumn, then forward
            for (var i = currentColumn, inc = -1; i < nCol; i += inc) {
              var v1 = valueScale(data[a][i]),
                  v2 = valueScale(data[b][i]);

              if (v1 !== v2) return d3.descending(v1, v2); 

              if (i === 0) {
                i = currentColumn;
                inc = 1;
              }
            }
          }));
          
          break;
          
        case "lastValue":
          // Sort by value at the current column
          yScale.domain(d3.range(data.length).sort(function(a, b) {
            var nCol = data[0].length;
            
            var v1 = valueScale(data[a][currentColumn]),
                v2 = valueScale(data[b][currentColumn]);

            if (v1 !== v2) return d3.descending(v1, v2); 
            
            // Break ties moving backward from the last column
            for (var i = nCol - 1; i >= 0; i--) {
              var v1 = valueScale(data[a][i]),
                  v2 = valueScale(data[b][i]);

              if (v1 !== v2) return d3.descending(v1, v2); 
            }
          }));
          
          break;
          
        case "firstValue":
          // Sort by value at the current column
          yScale.domain(d3.range(data.length).sort(function(a, b) {
            var nCol = data[0].length;
            
            var v1 = valueScale(data[a][currentColumn]),
                v2 = valueScale(data[b][currentColumn]);

            if (v1 !== v2) return d3.descending(v1, v2); 
            
            // Find first non-missing values for each
            var i1;
            for (var i1 = 0; i1 < nCol; i1++) {
              if (valueScale(data[a][i1]) > 0) break;
            }
            
            var i2;
            for (var i2 = 0; i2 < nCol; i2++) {
              if (valueScale(data[b][i2]) > 0) break;
            }
            
            // Break ties moving forward 
            do {                          
              var v1 = valueScale(data[a][i1]),
                  v2 = valueScale(data[b][i2]);

              if (v1 !== v2) return d3.descending(v1, v2); 
              
              // Increment
              if (i1 < i2) {
                i1++;
              }
              else if (i2 < i1) {
                i2++;
              }
              else {
                i1++;
                i2++;
              }
            }
            while (i1 < nCol && i2 < nCol)
          }));
          
          break;    
      }
    }
    
    function drawPathMap() {
      // Transition duration
      var duration = 0;
    
      //////////////////////////////////////////////////////////////////////////
      // Bind row data  
       
      var row = g.select(".row").selectAll(".row > g")
          .data(data);
        
      // Update 
      row.transition()
          .duration(duration)
          .attr("transform", function(d, i) { return "translate(0," + yScale(i) + ")"; });
           
      // Enter      
      var rowEnter = row.enter().append("g")
          .attr("transform", function(d, i) { return "translate(0," + yScale(i) + ")"; });
          
      // Bind cell data per row
      var cell = rowEnter.selectAll(".cell")
          .data(function(d) { return d; });
          
      // Enter 
      cell.enter().append("g")
          .attr("class", "cell")
          .attr("transform", function(d, i) { return "translate(" + xScale(i) + ",0)"; })
          .on("click", function(d, i) {          
            // Save current column
            currentColumn = i;
            
            // Sort rows based on this column
            sortRows();            
       
            // Redraw
            drawPathMap();
          })
          .on("mouseover", function(d, i) {
            // Update column highlight rectangle
            var columnHighlight = g.selectAll(".columnHighlight")
                .data([0]);
              
            // Enter
            columnHighlight.enter().append("rect")
                .attr("class", "columnHighlight");
              
            // Enter + update
            columnHighlight
                .attr("x", xScale(i))
                .attr("y", 0)
                .attr("width", xScale.rangeBand())
                .attr("height", innerHeight());
          })
          .on("mouseout", function() {
            // Remove highlight rectangle
            g.select(".columnHighlight").remove();
          })
        .append("rect")
          .attr("width", xScale.rangeBand())
          .attr("height", yScale.rangeBand())
          .attr("fill", function(d) { return colorScale(d); })
          .attr("stroke", function(d) { return colorScale(d); }); 
      
      //////////////////////////////////////////////////////////////////////////
      // Column select rectangle
      var columnSelect = g.select(".columnSelect").selectAll("rect")
          .data([0]);

      // Enter
      columnSelect.enter().append("rect");

      // Enter + update
      columnSelect
          .attr("x", xScale(currentColumn))
          .attr("y", 0)
          .attr("width", xScale.rangeBand())
          .attr("height", innerHeight());
        
      //////////////////////////////////////////////////////////////////////////  
      // Row lines

      // Find changes for row lines separating categories
      var change = [],
          column = yScale.domain().map(function(d) { return data[d][currentColumn]; });

      var rowYScale = d3.scale.linear()
          .domain([0, data.length])
          .rangeRound([0, innerHeight()]);

      for (var i = 1; i < column.length; i++) {
        if (column[i] !== column[i - 1]) change.push(i);
      }
      
      // Bind row line data
      var rowLine = g.select(".rowLine").selectAll("line")
          .data(change);

      // Enter
      rowLine.enter().append("line");

      // Enter + update
      rowLine
          .attr("x1", 0)
          .attr("x2", innerWidth())
          .attr("y1", function(d) { return rowYScale(d); })
          .attr("y2", function(d) { return rowYScale(d); });               

      // Exit
      rowLine.exit().remove();
                
      //////////////////////////////////////////////////////////////////////////
      // Secondary row lines when sorting by last value
      
      if (sortBy === "lastValue") {
        var last = data[0].length - 1;

        // Find changes for row lines separating categories at last value
        var change = [],
            column = yScale.domain().map(function(d) { return data[d][last]; });

        for (var i = 1; i < column.length; i++) {
          if (column[i] !== column[i - 1]) change.push(i);
        }

        // Bind secondary row line data
        var rowLine2 = g.select(".rowLine2").selectAll("line")
            .data(change);

        // Enter
        rowLine2.enter().append("line");

        // Enter + update  
        rowLine2
            .attr("x1", xScale(currentColumn))
            .attr("x2", innerWidth())
            .attr("y1", function(d) { return rowYScale(d); })
            .attr("y2", function(d) { return rowYScale(d); });               

        // Exit
        rowLine2.exit().remove();
      }
      else {
        // Remove if not sorting by last value
        g.select(".rowLine2").selectAll("line").remove();
      }
    }
    
    function setWidth(_) {
      width = _;
      svg.attr("width", width);
      xScale.rangeBands([0, innerWidth()]);
    }
    
    function setHeight(_) {
      height = _;
      svg.attr("height", height);
      yScale.rangeBands([0, innerHeight()]);
    }
    
    pm.width = function(_) {
      if (!arguments.length) return width;
      setWidth(_);
      drawPathMap();
      return pm;
    };
    
    pm.height = function(_) {
      if (!arguments.length) return height;
      setHeight(_);
      drawPathMap();
      return pm;
    };
    
    pm.sortBy = function(_) {
      if (!arguments.length) return sortBy;
      sortBy = _;
      sortRows();
      drawPathMap();
    };

    // Return the closure
    return pm;
  };
})();