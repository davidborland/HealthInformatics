co_occurrence2 <- function(data) {
  # Create co-occurrence matrix
  n <- ncol(data)
  m <- matrix(0, nrow=n, ncol=n)
  rownames(m) <- colnames(data)
  colnames(m) <- colnames(data)
  
  # Fill in matrix
  for (i in 1:nrow(data)) {
    for (j in 1:n) {
      if (data[i, j] > 0) {
        for (k in j:n) {
          m[j, k] <- m[j, k] + data[i, k]
          m[k, j] <- m[j, k]
        }
      }
    }
  }
  
  return(m)
}