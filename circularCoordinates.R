circularCoordinates <- function(data) {
  # Create window
  open3d(windowRect = c(64,128,512,512))
  
  
  par3d(mouseMode=c("zAxis", "zoom", "user"))
  
  
  # Remove tilted view
  view3d(0,0)
  
  
  nc <- ncol(data)
  nr <- nrow(data)  
  
  theta <- ((1:nc) - 1) / nc * -2 * pi + pi / 2
  
  normData <- data
  
  

  
  
  
  # Draw axes
  axes <- matrix(c(1:nc, rep(0,nc), rep(0,nc), rep(1,nc)), nrow=nc, ncol=4)
  axes[,1] <- axes[,1] / nc * -2 * pi + pi/2
  axes[,2] <- axes[,2] + 1
  for (i in 1:nc) {       
    p <- axes[i,1:2]
    v <- axes[i,3:4]
    
#    lines3d(x=axes[i,1:2], axes[i,3:4], z=0)
        
#    text3d(x=axes[i,1] - 0.1 * v[1], y=axes[i,3] - 0.1 * v[2], z=0, texts=colnames(data)[i])
#    text3d(x=axes[i,2] + 0.1 * v[1], y=axes[i,4] + 0.1 * v[2], z=0, texts=colnames(data)[i])
    
    normData[,i] <- (normData[,i] - min(normData[,i])) / (max(normData[,i]) - min(normData[,i]))
    
    # Compute summary statistics for normalized data
    normMed <- median(normData[,i])
    normMin <- min(normData[,i])
    normMax <- max(normData[,i])
    normQ1 <- quantile(normData[,i], probs=0.25)
    normQ2 <- quantile(normData[,i], probs=0.75)
    
    # Compute points for drawing box plot 
    pMed <- p + v * normMed
    pMin <- p + v * normMin
    pMax <- p + v * normMax
    pQ1 <- p + v * normQ1
    pQ2 <- p + v * normQ2
    
    # Convert from linear to polar
    
    p2c <- function(r, theta) {
      p <- 1:2
      p[1] <- r * cos(theta)
      p[2] <- r * sin(theta)
      
      return(p)
    }
    
    # Rotate points
    pMed <- p2c(pMed[2], pMed[1])
    pMin <- p2c(pMin[2], pMin[1])
    pMax <- p2c(pMax[2], pMax[1])
    pQ1 <- p2c(pQ1[2], pQ1[1])
    pQ2 <- p2c(pQ2[2], pQ2[1])
    
    # Two lines for min to lower quartile and upper quartile to max
#    lines3d(x=c(pMin[1], pQ1[1]), y=c(pMin[2], pQ1[2]), z=0, color=rgb(0,0,0), alpha=1, lwd=3)
    lines3d(x=c(pQ2[1], pMax[1]), y=c(pQ2[2], pMax[2]), z=0, color=rgb(0,0,0), alpha=1, lwd=3) 
    
    # Draw point for the median value
    points3d(x=pMed[1], y=pMed[2], z=0, color=rgb(0,0,0), size=10, alpha=1)   
  }
  
  
#  text3d(x=c(0,1),y=0,z=0,texts=c('Hello', 'Goodbye'))
  
  
  # Draw data  
  for (i in 1:nr) {    
    x <- (0:nc) / nc * -2 * pi + pi / 2
    
    y <- as.numeric(normData[i,] + 1)
    y <- c(y, y[1])
    
    n <- 10
    interp <- approx(x,y,n=length(x) * n - (n - 1))
#    interp <- spline(x,y,n=length(x) * n - (n - 1), method='periodic')
#    interp <- spline(x,y,n=length(x) * n - (n - 1), method='natural')
    
    x2 <- y * cos(x)
    y2 <- y * sin(x)
    
    
    x1 <- interp$y * cos(interp$x)
    y1 <- interp$y * sin(interp$x)

    
    color <- rgb(0.75, 0.75, 0.75)
    lines3d(x=x1, y=y1, z=0, lwd=1, color=color)
    points3d(x=x2, y=y2, z=0, size=8, color=color)
  }
}