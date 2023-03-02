/*
 * Copyright (c) 2013  Renaissance Computing Institute. All rights reserved.
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
  d3.summaryView = function() {
        // Size
    var margin = { top: 10, left: 10, bottom: 10, right: 10 },
        width = 200,
        height = 400,
        innerWidth = function() { return width - margin.left - margin.right; },
        innerHeight = function() { return height - margin.top - margin.bottom; },
		
        // Event handler
        event = d3.dispatch("showDimension"),
  
        // Data
        data = [],
        
        // Parameters
        spacing = 20,
        
        // Scales
        yScale = d3.scale.ordinal(),
    
        // Layout
        maxNameLength = 0,
            
        // Start with empty selections
        svg = d3.select(),
        g = d3.select();
  
    // Create a closure
    function sv(selection) {
      selection.each(function(d) {
        // Set the data
        data = d;
        
        // Decorate data
        // XXX: Remove this in favor of an associative array for selected or not
        data.forEach(function(d) { d.selected = true; });
        
        // Select the svg element, if it exists
        svg = d3.select(this).selectAll("svg").data([data]);
  
        // Otherwise create the skeletal chart
        svg.enter().append("svg")
            .attr("class", "summaryView")
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
        g = svg.select("g");
        
        // Compute the height
        height = data.length * spacing;
        
        // Set scales                      
        yScale.domain(d3.range(data.length));
        
        maxNameLength = computeMaxNameLength();

        // Set the width and height
        setWidth(width);
        setHeight(height);
        
        // Draw the dimensions
        drawDimensions();
        
        // Register callbacks		
//        dispatch.on("select_variant.variantList", selectVariant);
//        dispatch.on("select_gene.variantList", selectGene);
      });
    }
    
    function drawDimensions() {        
      // Remove all dimensions
      g.selectAll(".dimension").remove();
    
      // Draw dimensions
      var gDimension = g.selectAll(".dimension")
          .data(data)
        .enter().append("g")
          .attr("class", "dimension")
          .attr("transform", function(d, i) { return "translate(0," + yScale(i) + ")"; }); 
    
      var radius = 5;
    
      gDimension.append("circle")
          .attr("class", "button")
          .attr("r", radius)
          .on("click", function() {
            // Get the data bound to this element
            var d = d3.select(this).datum();
          
            // Toggle selected or not
            d.selected = !d.selected;
            d.selected ? d3.select(this.parentNode).style("fill-opacity", 1).style("stroke-opacity", 1) :
                         d3.select(this.parentNode).style("fill-opacity", 0.25).style("stroke-opacity", 0.25);
            event.showDimension(d.name, d.selected);
          });
          
      gDimension.append("text")
          .text(function(d) { return d.name; })
          .attr("class", "label")
          .attr("x", radius + 5)
          .attr("dy", "0.3em");
    }
    
    // Compute the maximum name length
    function computeMaxNameLength() {
      // Create temporary text
      var svgTemp = d3.select("body").append("svg");
      var name = svgTemp.selectAll("text")
          .data(data)
        .enter().append("text")
          .text(function(d) { return d.name; })
          .style("font-size", "small");     
    
      // Compute the maximum length
      var maxLength = d3.max(name[0], function(d) {
        return d.getComputedTextLength();
      });
   
      svgTemp.remove();
      
      return maxLength;
    }
    
    function setWidth(_) {
      width = _;
      svg.attr("width", width);         
    }
    
    function setHeight(_) {    
      height = _;
      svg.attr("height", height);
      yScale.rangeBands([0, innerHeight()]);  
    }
    
    // Accessor functions  
    sv.width = function(_) {
      if (!arguments.length) return width;  
      setWidth(_);      
      return sv;
    };
    
    sv.height = function(_) {
      if (!arguments.length) return height;
      setHeight(_);
      return sv;
    };
    
    // Return closure
    return d3.rebind(sv, event, "on");
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