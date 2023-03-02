# Create odds ratio matrix from co-occurrence matrix
#
# m: co-occurrence matrix
# n: population size
#
# Based on http://www.r-bloggers.com/computing-odds-ratios-in-r/
#
oddsRatio <- function(m, n) {
  n2 <- ncol(m)
  
  or <- matrix(0, nrow=n2, ncol=n2)
  colnames(or) <- colnames(m)
  rownames(or) <- rownames(m)
  
  for (i in 1:n2) {
    ni <- m[i,i]
    for (j in 1:n2) {
      if (i == j) next
      
      nj <- m[j,j]
      nij <- m[i,j]
  
      n00 <- n - ni - nj + nij
      n01 <- nj - nij
      n10 <- ni - nij
      n11 <- nij
  
      or[i,j] <- (n00 * n11) / (n01 * n10)
    }
  }

  return (or)
}