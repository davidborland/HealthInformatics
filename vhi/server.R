library(shiny)
source('helpers.R')

datasets <- c(
  "mycars",
  "NHS_PCT_sample04"
)

shinyServer(function(input, output, session) {  
  # Use reactiveValues to store state
  values <- reactiveValues()
  
  # Send dataset list
  session$sendCustomMessage(type='onDatasets', datasets) 
  
  # Dataset selection
  observe({
    if (is.null(input$datasetSelect)) return()
    
    values$data <- get(input$datasetSelect)
    values$summaryData <- summaryData(values$data)
     
    session$sendCustomMessage(type='onSummaryData', values$summaryData)
  })
  
  # Test interaction
  observe({
    if (is.null(input$test)) return()
    
    print(input$test)
  })
})