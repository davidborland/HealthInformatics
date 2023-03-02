library(shiny)
#source('helpers.R')

function filterData(data, variables, ranges) {
  filteredData <- data[,variables]
  for (i in 1:ncol(filteredData)) {
    filteredData <- filteredData[which(filteredData[,i] >= ranges[i][0] && filteredData[,i] <= ranges[i][1]),]
  }
}

shinyServer(function(input, output, session) {
  # Use reactiveValues to store state
  values <- reactiveValues()
  
  # Dataset selection
  observe({
    values$data <- get(input$datasetSelect)
    values$filteredData <- data.frame(data.matrix(values$data))
  })
  
  # Variable selection
  output$filterCheckboxes <- renderUI({
    variables <- colnames(values$data)
    checkboxGroupInput("filterCheckboxGroup", 
                       label = NULL, 
                       choices = variables,
                       selected = variables)  
  })
  
  observe({
    # Check that filterCheckboxGroup has been updated
    if (FALSE %in% (input$filterCheckboxGroup %in% colnames(values$data))) return()
       
    values$filteredData <- data.frame(data.matrix(values$data[,input$filterCheckboxGroup]))
    session$sendCustomMessage(type='onData', values$filteredData) 
  })
  
  # Entity count       
  output$entityCountText <- renderText({
    paste(as.character(nrow(values$filteredData)), 'Data Entities')
  })
  
  # Range selection
  output$filterSliders <- renderUI({    
    sliders <- list(ncol(values$filteredData))
    for (i in 1:ncol(values$filteredData)) {      
      print(i)
      name <- colnames(values$filteredData)[i]            
      v1 <- min(values$filteredData[,i])
      v2 <- max(values$filteredData[,i])
      
      sliders[[i]] <- sliderInput(paste(name, "Slider", sep=""),
                                  name,
                                  min = v1, max = v2, value = c(v1, v2))
    }      
    sliders
  })
  
   observe({
     for (i in 1:ncol(values$filteredData)) { 
       sliderName = paste(colnames(values$filteredData)[i], "Slider", sep="")
     }
   })
})