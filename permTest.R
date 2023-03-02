permTest <- function(cors, perms) {
  
  maxSum <- 0
  maxIndex <- 0
  
  for (i in 1:length(perms)) {
    p <- perms[[i]]    
    s <- 0
    for (j in 1:(length(p) - 1)) {
      s <- s + cors[p[j], p[j+1]]
    } 
    
    if (s > maxSum) {
      maxSum <- s
      maxIndex <- i
    }
  }
  
  print(maxSum)
  print(maxIndex)
  
  return(maxIndex)
}