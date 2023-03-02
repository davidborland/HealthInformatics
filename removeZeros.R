removeZeros <- function(x) {  
  rows = apply(x, 1, function(row) all(row != 0))
  return (x[rows,])
}