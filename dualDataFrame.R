dualDataFrame <- function(x) {
  # Store factors
  f <- x[sapply(x, is.factor)]
  
  # Remove factors
  d <- x[!sapply(x, is.factor)]
    
  # Add columns for factor levels
  for (i in 1:ncol(f)) {    
    l <- levels(f[,i])
    
    for (j in 1:length(l)) {
      d <- cbind(d, f[,i] == l[j])
      colnames(d)[ncol(d)] <- l[j]
    }
  }
  
  # Convert to matrix
  d <- data.matrix(d)
  
  # Normalize to [0, 1]
  d <- apply(d, 2, norm<-function(x) {return ((x - min(x)) / (max(x) - min(x)))} )
  
  # Transpose
  d <- t(d)  
  
  
  # Add 0 and 1 rows
  d <- rbind(d, rep(0, ncol(d)))
  d <- rbind(d, rep(1, ncol(d)))  
  
  rownames(d)[nrow(d) - 1] <- 'zero'
  rownames(d)[nrow(d)] <- 'one'
  
  return (data.frame(d))
}