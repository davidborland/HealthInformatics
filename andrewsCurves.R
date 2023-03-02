andrewsCurves <- function(data) {
  # Input data checking
  if (!is.data.frame(data)) {
    stop('\n  input data is not a data frame')
  }
  
  # Set up window and mouse interaction
  windowRect <- c(64,128,1024,512)
  mouseMode <- c('user', 'zoom', 'user')
  
  # Create window
  open3d(windowRect=windowRect)
  
  # Set up interaction
  par3d(mouseMode=mouseMode)
  
  # Remove tilted view
  view3d(0,0)   
  

  f <- function(x, t) { 
    y <- x[1] / sqrt(2)
    
    for (i in 2:length(x)) {
      if (i %% 2 == 0){
        y <- y + x[i] * sin(floor(i / 2) * t)
      }
      else {
        y <- y + x[i] * cos(floor(i / 2) * t)
      }
    }
    
    return(y)
  }
  
  m <- data.matrix(data)
  m <- sweep(m, 2, colSums(m), FUN="/")
  
  t <- seq(-pi, pi, 0.01)
  
  ft <- matrix(nrow=nrow(m), ncol=length(t))
  
  for (i in 1:nrow(m)) {
    for (j in 1:length(t)) {      
      ft[i,j] <- f(m[i,], t[j])
    }
  }
  
  ft <- (ft - min(ft)) / (max(ft) - min(ft)) * 2
  
  for (i in 1:nrow(ft)) {
    lines3d(x=t, y=ft[i,], z=0, alpha=0.5)
  }
}