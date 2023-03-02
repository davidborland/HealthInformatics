<script>
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

var networkOutputBinding = new Shiny.OutputBinding();
$.extend(networkOutputBinding, {
    find: function(scope) {
      return $(scope).find('.shiny-network-output');
    },
    renderValue: function(el, data) {					
		d3.select("#radialCoordinates").append("g")
			  .datum(data)
			.call(rc);
    }
  });
  Shiny.outputBindings.register(networkOutputBinding, 'timelyportfolio.networkbinding');
</script>
