computePCA <- function(x) {
  pca <- prcomp(data.matrix(x), scale=TRUE, center=TRUE)
  
  s <- 1.0 / max(abs(min(pca$x[,c(1,2)])), abs(max(pca$x[,c(1,2)])))
  
  pca <- pca$x * s
  
  return (pca[,c(1,2)])
}