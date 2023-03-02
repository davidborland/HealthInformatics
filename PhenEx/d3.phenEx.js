/*=========================================================================
 
 Name:        d3.phenEx.js
 
 Author:      David Borland, The Renaissance Computing Institute (RENCI)
 
 Copyright:   The Renaissance Computing Institute (RENCI)
 
 Description: Phenotype explorer visualization implemented in d3 using the  
              reusable charts convention: http://bost.ocks.org/mike/chart/
 
 =========================================================================*/

(function() {
  d3.phenEx = function() {
        // Size
    var margin = { top: 10, left: 10, bottom: 10, right: 10 },      
        width = 1000,
        height = 1000,
        innerWidth = function() { return width - margin.left - margin.right; },
        innerHeight = function() { return height - margin.top - margin.bottom; },
        
        // Data
        data = [],
        centerValue = {},
        
        // Scales

        svg = d3.select(),
        g = d3.select();

    // Create a closure that contains the above variables
    function pe(selection) {
      selection.each(function(d) {          
        data = d;
        processData();
        
        // Select the svg element, if it exists
        svg = d3.select(this).selectAll("svg")
            .data([data]);
  
        // Otherwise create the skeletal chart
        g = svg.enter().append("svg")
            .attr("class", "phenEx")
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            
        // Set scales

            
        // Set width and height
        setWidth(width);
        setHeight(height);             
        
        // Draw
        drawPhenEx();
      });
    }
    
    function processData() {
      // Get all data elements
      var de = d3.set(d3.merge(data.map(function(d) { return d3.keys(d); }))).values().map(function(d) { return { name: d, values: [] }; });
      console.log(de);
    }
    
    function drawPhenEx() {
      console.log(data);
    }
    
    function setWidth(_) {
      width = _;
      svg.attr("width", width);
//      xScale.rangeBands([0, innerWidth()]);
    }
    
    function setHeight(_) {
      height = _;
      svg.attr("height", height);
//      yScale.rangeBands([0, innerHeight()]);
    }
    
    pe.width = function(_) {
      if (!arguments.length) return width;
      setWidth(_);
      drawPhenEx();
      return pe;
    };
    
    pe.height = function(_) {
      if (!arguments.length) return height;
      setHeight(_);
      drawPhenEx();
      return pe;
    };

    pe.centerValue = function(_) {
      if (!arguments.length) return centerValue;
      centerValue = _;
      processData();
      drawPhenEx();
      return pe;
    }

    // Return the closure
    return pe;
  };
})();