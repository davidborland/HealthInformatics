# Match the rows of two data frames based on the values in one column per data frame.
# Assumes no duplicate values per column.  

matchByColumns <- function(x1, c1, x2, c2, removeUnmatched=TRUE) {
  if (!is.data.frame(x1)) {
    stop('\n  input data x1 is not a data frame')
  }
  
  if (!is.data.frame(x2)) {
    stop('\n  input data x2 is not a data frame')
  }
  
  x3 <- NULL
  
  for (i in 1:nrow(x1)) {    
    j <- which(as.character(x2[,c2]) == as.character(x1[i,c1]))   
    
    if (length(j) != 1) {         
      if (removeUnmatched) {
        next
      }
      else {
        d <- data.frame(matrix(rep(0, ncol(x2)), nrow=1))    
        colnames(d) <- colnames(x2)
        
        x3 <- rbind(x3, cbind(x1[i,], d))
        next
      }
    }
    
    x3 <- rbind(x3, cbind(x1[i,], x2[j,]))
  }
  
  return (x3)
}