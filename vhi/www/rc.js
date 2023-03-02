// Execute function body when the HTML document is ready
$(document).ready(function() {
	var rc = d3.radialCoordinates()
		.width(2000)
		.height(1200)
		.minOpacity(0.1)
		.maxOpacity(0.5)
		.axisOpacity(0.5)
		.labelAngle(10)
		.discreteThreshold(10)
		.curveSteps(10)
		.curveTension(0.1);
  
  // Send data to shiny server
  d3.select("#rcDiv").on("click", function() {
    console.log("hello");
    Shiny.onInputChange("test", "hello");
  });

	// Receive data from server
  Shiny.addCustomMessageHandler("onData", function(data) {    
    if (!data) return;
    
    // Convert data
    var data2 = [];
    var keys = d3.keys(data);

    var n = data[keys[0]].length;
    for (var i = 0; i < n; i++) {
      var a = [];
      keys.forEach(function(d) { a[d] = data[d][i]; });				
      data2.push(a);
    }

    d3.select("#rcDiv")
      .datum(data2)
      .call(rc);
  });
});

