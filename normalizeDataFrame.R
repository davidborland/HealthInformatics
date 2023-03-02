normalizeDataFrame <- function(x) {
  return (apply(data.matrix(x), 2, norm<-function(x) { return ((x - min(x)) / (max(x) - min(x))) } ))  
}