/*
 * Copyright (c) 2014  Renaissance Computing Institute. All rights reserved.
 *
 * This software is open source. See the bottom of this file for the license.
 *
 * Renaissance Computing Institute,
 * (A Joint Institute between the University of North Carolina at Chapel Hill,
 * North Carolina State University, and Duke University)
 * http://www.renci.org
 *
 * For questions, comments please contact software@renci.org
 *
 */

(function() {
  d3.quantitativeSets = function() {
        // Size
    var margin = { top: 10, left: 10, bottom: 10, right: 10 },
        width = 400,
        height = 400,
        innerWidth = function() { return width - margin.left - margin.right; },
        innerHeight = function() { return height - margin.top - margin.bottom; },
		
        // Event handler
//        event = d3.dispatch("showDimension");
  
        // Data
        data = [],        
        dimensions = [],
        dimensionNameSizes = [],
        
        // Parameters
        labelAngle = 30,
        
        // Scales        
        xScale = d3.scale.ordinal(),
    
        // Layout
        maxDimensionNameSize,
        dimensionNameLabelOffset = 5,
        dimensionNameLabelHeight,
            
        // Start with empty selections
        svg = d3.select();
  
    // Create a closure
    function qs(selection) {
      selection.each(function(d) {        
        data = d;
      
        // Select the svg element, if it exists
        svg = d3.select(this).selectAll("svg").data([data]);
  
        // Otherwise create the skeletal chart
        var g = svg.enter().append("svg")
            .attr("class", "quantitativeSets")
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
        // Add groups to ensure correct z order
        g.append("g")
            .attr("class", "dimension");

        // Set the width and height        
        setWidth(width);
        setHeight(height);
        
        // Show all dimensions initially
        dimensions = data.map(function(d) { return d.name; });
        xScale.domain(dimensions);
        
        // Compute dimension name label offset
        dimensionNameSizes = textSize(dimensions, "dimension", "label");
        maxDimensionNameSize = maxTextSize(dimensionNameSizes);
        dimensionNameLabelHeight = rotatePoint({ x: maxDimensionNameSize.w, y: maxDimensionNameSize.h }, -labelAngle).y; 
        
        // Draw the dimensions
        drawDimensions();
      });
    }
    
    // Compute the width and height of each input string, rendered with the given classes
    function textSize(strings, class1, class2) {
      // Create temporary text
      var gTemp = svg.append("g")
          .attr("class", class1);
          
      var text = gTemp.selectAll("text")
          .data(strings)
        .enter().append("text")
          .attr("class", class2)
          .text(function(d) { return d; });   

      // Create associative array
      var sizes = {};
      text[0].forEach(function(d) {
        sizes[d.textContent] = { w: d.getBBox().width, h: d.getBBox().height };
      });

      gTemp.remove();

      return sizes;
    }
            
    function maxTextSize(textSizes) {
      var keys = d3.keys(textSizes);
      
      var w = d3.max(keys.map(function(d) { return textSizes[d].w; }));
      var h = d3.max(keys.map(function(d) { return textSizes[d].h; }));
      
      return { w: w, h: h };
    }
    
    function rotatePoint(p, t) {
      var r = t * Math.PI / 180;
      return { x: p.x * Math.cos(r) + p.y * Math.sin(r),
               y: p.y * Math.cos(r) - p.x * Math.sin(r) };
    }
    
    function drawDimensions() {    
      // Filter active dimension data
      var dims = data.filter(function(d) { return dimensions.indexOf(d.name) >= 0; });
      
      // Bind dimension data
      var dimension = svg.select(".dimension").selectAll(".numeric, .categorical")
          .data(dims, function(d) { return d.name; });  
          
      // Enter
      dimension.enter().append("g").call(createAxis);
      
      // Enter + update
      dimension.call(updateAxis);
      
      // Exit      
      dimension.exit().transition()
          .style("fill-opacity", 0)
          .style("stroke-opacity", 0)
          .remove()
        .selectAll(".handle")
          .style("fill-opacity", 0);
    }
    
    function createAxis(selection) {
      selection.each(function(d) {
        // XXX: Stub
        console.log("create", d);
      });  
    }
    
    function updateAxis(selection) {
      selection.each(function(d) {
        // XXX: Stub
        console.log("update", d);
      });
    }

 /*
    function drawDimensions() {
      // Filter active dimension data
      var dims = data.filter(function(d) { return dimensions.indexOf(d.name) >= 0; });
      
      // Bind dimension data
      var dimension = svg.select(".dimension").selectAll(".numeric, .categorical")
          .data(dims, function(d) { return d.name; });  
          
      // Update
      var t = 500;
      var tDimension = dimension.transition()
          .delay(t)
          .duration(t)
          .attr("transform", function(d) { return "translate(" + xScale(d.name) + ",0)"; })
      
      tDimension.selectAll(".label")
          .attr("transform", "translate(0," + dimensionNameLabelHeight + ")rotate(" + -labelAngle + ")");
           
      tDimension.call(axis());
      
      // Enter
      dimension.enter().append("g").call(axis());
                   
      // Enter + update
      dimension.transition()
          .delay(t * 2)
          .duration(t)
          .style("fill-opacity", 1)
          .style("stroke-opacity", 1)
        .selectAll(".handle")
          .style("fill-opacity", 0.25);
   
      // Exit
      dimension.exit().transition()
          .duration(t)
          .style("fill-opacity", 0)
          .style("stroke-opacity", 0)
          .remove()
        .selectAll(".handle")
          .style("fill-opacity", 0);
    }
*/    

    function axis() {        
      return function (selection) {
        selection.each(function(d) {  
          // Dimension group
          var gDimension = d3.select(this)
              .attr("class", function(d) { return d.type; })
              .attr("transform", function(d) { return "translate(" + xScale(d.name) + ",0)"; })
              .style("fill-opacity", 0)
              .style("stroke-opacity", 0);
          
          // Dimension label
          var gLabel = gDimension.append("g")
              .attr("class", "label")
              .attr("transform", "translate(0," + dimensionNameLabelHeight + ")rotate(" + -labelAngle + ")");
              
          // Label Text
          gLabel.append("text")
              .text(function(d) { return d.name; })
              .on("mousedown", function() {
                // Prevent text highlighting
                d3.event.preventDefault(); 
              })
              .call(function() {
                var offset;
                return d3.behavior.drag()
                    .on("dragstart", function(d) {
                      // Save offset to parent group
                      offset =  xScale(d.name) - d3.mouse(svg.node())[0];
                    })
                    .on("drag", function(d) {
                      // Get new position
                      var x = d3.mouse(svg.node())[0] + offset;
                      var i = dimensions.indexOf(d.name);
                      
                      // See if order has changed
                      if (i < dimensions.length - 1 && x > xScale(dimensions[i + 1])) {
                        var t = dimensions[i];
                        dimensions[i] = dimensions[i + 1];
                        dimensions[i + 1] = t;
                        xScale.domain(dimensions);
                        svg.select(".dimension").selectAll(".numeric, .categorical").filter(function(d) { return d.name === dimensions[i]; }).transition()
                            .attr("transform", function(d) { return "translate(" + xScale(d.name) + ",0)"; });
                      }
                      else if (i > 0 && x < xScale(dimensions[i - 1])) {
                        var t = dimensions[i];
                        dimensions[i] = dimensions[i - 1];
                        dimensions[i - 1] = t;
                        xScale.domain(dimensions);
                        svg.select(".dimension").selectAll(".numeric, .categorical").filter(function(d) { return d.name === dimensions[i]; }).transition()
                            .attr("transform", function(d) { return "translate(" + xScale(d.name) + ",0)"; });
                      }           
                      
                      // Move this axis
                      d3.select(this.parentNode.parentNode).attr("transform", "translate(" + x + ",0)");
                    })
                    .on("dragend", function(d) {
                      // Move to correct position
                      d3.select(this.parentNode.parentNode).transition()
                          .attr("transform", function(d) { return "translate(" + xScale(d.name) + ",0)"; });
                    });
              }());
                  
              
          // Label handle for changing angle
          var r = 3;
          gLabel.append("circle")
              .attr("class", "handle")
              .attr("cx", function(d) { return dimensionNameSizes[d.name].w + r; })
              .attr("cy", function(d) { return -r; })
              .attr("r", r)
              .on("mouseover", function() {
                d3.select(this).style("fill-opacity", 1);
              })
              .on("mouseout", function() {
                d3.select(this).style("fill-opacity", 0.25);
              })
              .call(d3.behavior.drag()
                  .on("dragstart", function() {
                    d3.event.sourceEvent.stopPropagation();
                    d3.select(this).style("fill-opacity", 1);
                  })
                  .on("drag", function() {
                    d3.select(this).style("fill-opacity", 1);
                  
                    var x = d3.event.x;
                    var y = d3.event.y;
                    
                    labelAngle -= Math.atan2(y, x) * 180 / Math.PI;
                    labelAngle = Math.max(0, Math.min(labelAngle, 90));
                    svg.select(".dimension").selectAll(".label")
                        .attr("transform", "translate(0," + dimensionNameLabelHeight + ")rotate(" + -labelAngle + ")");
                  })
                  .on("dragend", function() {
                    d3.select(this).style("fill-opacity", 0.25);
                    dimensionNameLabelHeight = rotatePoint({ x: maxDimensionNameSize.w, y: maxDimensionNameSize.h }, -labelAngle).y; 
                    drawDimensions();
                  })
              );
          
          // Build dimension axis
          // XXX: This is not quite right yet, but along the right path regarding enter/update for axis elements
          switch(d.type) {
            case "numeric":   
              // Draw Tufte-style quartile plot
              var yScale = d3.scale.linear()
                  .domain([d.quartiles.min, d.quartiles.max])
                  .range([innerHeight(), dimensionNameLabelHeight + dimensionNameLabelOffset]);
                  
              var data = [[d.quartiles.min, d.quartiles.q1],
                          [d.quartiles.q1, d.quartiles.med],
                          [d.quartiles.med, d.quartiles.q3],
                          [d.quartiles.q3, d.quartiles.max]];
              
              // Enter
              gDimension.selectAll("line")
                  .data(data)
                .enter().append("line");
                
              // Enter + update
              gDimension.selectAll("line").transition()
                  .attr("y1", function(d) { return yScale(d[0]); })
                  .attr("y2", function(d) { return yScale(d[1]); })
                  .attr("stroke-opacity", function(d, i) { return i === 1 || i === 2 ? 0 : null; });              
                          
/*                  
              // First quartile
              gDimension.append("line")
                  .attr("y1", yScale(d.quartiles.min))
                  .attr("y2", yScale(d.quartiles.q1));
                  
              // Second quartile
              gDimension.append("line")
                  .attr("y1", yScale(d.quartiles.q1))
                  .attr("y2", yScale(d.quartiles.med))
                  .style("stroke-opacity", 0);
                  
              // Median
              gDimension.append("circle")
                  .attr("cy", yScale(d.quartiles.med))
                  .attr("r", 3);
                  
              // Third quartile
              gDimension.append("line")
                  .attr("y1", yScale(d.quartiles.med))
                  .attr("y2", yScale(d.quartiles.q3))
                  .style("stroke-opacity", 0);
                  
              // Fourth quartile    
              gDimension.append("line")
                  .attr("y1", yScale(d.quartiles.q3))
                  .attr("y2", yScale(d.quartiles.max));
*/            
              break;
              
            case "categorical":            
              gDimension.append("line")
                .attr("y1", dimensionNameLabelHeight + dimensionNameLabelOffset)
                .attr("y2", innerHeight());
            
              break;
          }
        });  
      };
    }
    
    function setWidth(_) {
      width = _;
      svg.attr("width", width);
      xScale.rangePoints([0, innerWidth()]);
      drawDimensions();      
    }
    
    function setHeight(_) {    
      height = _;
      svg.attr("height", height);
      drawDimensions();
    }
    
    // Accessor functions  
    qs.width = function(_) {
      if (!arguments.length) return width;  
      setWidth(_);      
      return qs;
    };
    
    qs.height = function(_) {
      if (!arguments.length) return height;
      setHeight(_);
      return qs;
    };
    
    qs.showDimension = function(dimension, show) {
      if (arguments.length === 1) return dimensions;
      
      if (show) {
        if (dimensions.indexOf(dimension) < 0) {
          dimensions.unshift(dimension);
        }
      }
      else {
        var index = dimensions.indexOf(dimension);
        if (index >= 0) dimensions.splice(index, 1);
      }
      
      xScale.domain(dimensions);
      
      drawDimensions();
      
      return qs;
    }
    
    // Return closure
    return qs;
  };
})();

/*
RENCI Open Source Software License
The University of North Carolina at Chapel Hill

The University of North Carolina at Chapel Hill (the "Licensor") through
its Renaissance Computing Institute (RENCI) is making an original work of
authorship (the "Software") available through RENCI upon the terms set
forth in this Open Source Software License (this "License").  This License
applies to any Software that has placed the following notice immediately
following the copyright notice for the Software:  Licensed under the RENCI
Open Source Software License v. 1.0.

Licensor grants You, free of charge, a world-wide, royalty-free,
non-exclusive, perpetual, sublicenseable license to do the following to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

. Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimers.

. Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimers in the
documentation and/or other materials provided with the distribution.

. Neither You nor any sublicensor of the Software may use the names of
Licensor (or any derivative thereof), of RENCI, or of contributors to the
Software without explicit prior written permission.  Nothing in this
License shall be deemed to grant any rights to trademarks, copyrights,
patents, trade secrets or any other intellectual property of Licensor
except as expressly stated herein.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE CONTIBUTORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

You may use the Software in all ways not otherwise restricted or
conditioned by this License or by law, and Licensor promises not to
interfere with or be responsible for such uses by You.  This Software may
be subject to U.S. law dealing with export controls.  If you are in the
U.S., please do not mirror this Software unless you fully understand the
U.S. export regulations.  Licensees in other countries may face similar
restrictions.  In all cases, it is licensee's responsibility to comply
with any export regulations applicable in licensee's jurisdiction.
 ****************************************************************************/