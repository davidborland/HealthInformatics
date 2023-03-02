summaryData <- function(data) {  
  doSummary <- function(name, data) {
    # Create the list, with name
    result <- list(name=name)
    
    # Check data type
    if (is.factor(data)) {
      # Set data type
      result$type <- 'categorical'
      
      # Set value frequencies
      t <- table(data)
      values <- as.numeric(t)
      names(values) <- names(t)
      result$values <- values
    }
    else {
      # Set data type
      result$type <- 'numeric'
      
      # Set number of unique values
      result$numValues <- length(unique(data))
      
      # Set quartiles  
      q <- quantile(data)
      names(q) <- c('min', 'q1', 'med', 'q3', 'max')
      result$quartiles <- q
    }
    
    # Return result
    result
  }
  
  # Create summary data
  s <- mapply(doSummary, names(data), data)
  
  # Remove names so an indexed array is sent
  names(s) <- NULL
  s
}