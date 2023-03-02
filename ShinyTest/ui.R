library(shiny)

datasets <- c(
  "mycars",
  "NHS_PCT_sample04"
)

shinyUI(fluidPage(     
  # Different pages for visualizations
  navbarPage("VHI",
    tabPanel("Data Selection",
      sidebarPanel(
        selectInput("datasetSelect", label="Select dataset", choices=datasets),
        textOutput("entityCountText"),
        uiOutput("filterCheckboxes")
      ),
      mainPanel(
        uiOutput("filterSliders"),
        tableOutput("data")
      )
    ),
             
    tabPanel("Radial Coordinates", 
      sidebarPanel(), 
      mainPanel(div(id="rcDiv"))
    )    
  ),
   
  # Include style sheets and javascript components
  tags$head(
    tags$link(rel="stylesheet", href="d3.radialCoordinates.css"),
    tags$script(type="text/javascript", src="d3.v3.js"),
    tags$script(type="text/javascript", src="d3.radialCoordinates.js")
  ),
  
  includeScript("rc.js")
))
