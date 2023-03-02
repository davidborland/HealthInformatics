co_occurrence <- function(data, c1, c2, removeDiagonal=FALSE) {
  # Create co-occurrence matrix for c1 values
  v1 <- levels(data[, c1])
  n <- length(v1)  
  m <- matrix(0, nrow=n, ncol=n)
  rownames(m) <- v1
  colnames(m) <- v1
   
  # Create list of c2 values
  v2 <- rep(list(list()), nlevels(data[, c2]))
  names(v2) <- levels(data[, c2])
  
  # Add c1 values to c2 list
  for (i in 1:nrow(data)) {
    d1 <- as.character(data[i, c1])
    d2 <- as.character(data[i, c2])
    
    v2[[d2]] <- c(v2[[d2]], d1)
  }
  
  # Keep only unique values
  for (i in 1:length(v2)) {
    v2[[i]] <- unique(v2[[i]])
  }

  # Fill in matrix
  for (i in 1:length(v2)) {
    for (j in 1:length(v2[[i]])) {
      vj <- as.character(v2[[i]][j])
      for (k in j:length(v2[[i]])) {
        vk <- as.character(v2[[i]][k])
        m[vj, vk] <- m[vj, vk] + 1
        
        if (vk != vj) {
          m[vk, vj] <- m[vk, vj] + 1
        }
      }
    }
  }
  
  if (removeDiagonal) {
    diag(m) <- 0
  }
  
  return(m)
}