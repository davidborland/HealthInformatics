processEthnicData <- function(x) {
  x <- x[,c(8,12:43)]
  
  l <- levels(x[,1])
  
  y <- data.frame(x[0, c(1,seq(3,ncol(x),2))])
    
  for (i in 1:length(l)) {
    xx <- data.frame(x[which(x[,1] == l[i], arr.ind=TRUE),])
    
    yy <- data.frame(matrix(rep(NA, ncol(y)), nrow=1))    
    colnames(yy) <- colnames(y)
    y <- rbind(y, yy)
    
    y[nrow(y),1] <- l[i]
    
    for (j in seq(2, length(xx), 2)) {
      s <- sum(xx[,j])
      
      v <- xx[,j] * xx[,j + 1]
      v <- sum(v)
      v <- v / s
      
      y[nrow(y),j / 2 + 1] <- v
    }
  }
  
  y <- data.frame(rapply(y, f=function(x) ifelse(is.nan(x),0,x), how="replace" ))
  
  return (y)
}