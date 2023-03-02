hermiteSpline <- function(x, y, tx=NULL, ty=NULL, n=10, a=0.5) {
  # Reference: http://cubic.org/docs/hermite.htm
  
  # Return the input if less than three points
  if (length(x) < 3) {
    return (list('x'=x, 'y'=y))
  }
  
  # Output x and y values
  outX <- vector()
  outY <- vector()
  
  for (i in 1:(length(x) - 1)) {    
    for (t in 1:n) {
      # Normalize to [0, 1]
      s <- (t - 1) / n
      
      # Compute the basis functions
      h1 <- 2*s^3 - 3*s^2 + 1
      h2 <- -2*s^3 + 3*s^2
      h3 <- s^3 -2*s^2 + s
      h4 <- s^3 - s^2
      
      # Get the tangents
      if (is.null(tx) | is.null(ty)) {
        # No tangents supplied, so compute a cardinal spline
        if (i == 1) {
          t1x <- 0
          t1y <- 0
          
          t2x <- a * (x[i+2] - x[i])
          t2y <- a * (y[i+2] - y[i])
        }
        else if (i == length(x) - 1) {
          t1x <- a * (x[i+1] - x[i-1])
          t1y <- a * (y[i+1] - y[i-1])
          
          t2x <- 0
          t2y <- 0
        }
        else {
          t1x <- a * (x[i+1] - x[i-1])
          t1y <- a * (y[i+1] - y[i-1])
          
          t2x <- a * (x[i+2] - x[i])
          t2y <- a * (y[i+2] - y[i])        
        }
      }
      else {
        # Use the supplied tangents
        t1x <- a * tx[i]
        t1y <- a * ty[i]
        
        t2x <- a * tx[i+1]
        t2y <- a * ty[i+1]
      }    
      
      # Compute the output point    
      outX <- c(outX, h1 * x[i] + h2 * x[i+1] + h3 * t1x + h4 * t2x)
      outY <- c(outY, h1 * y[i] + h2 * y[i+1] + h3 * t1y + h4 * t2y)
    }
  }
  
  # Add the last point
  outX <- c(outX, x[length(x)])
  outY <- c(outY, y[length(y)])
  
  return(list('x'=outX, 'y'=outY))
}




# Axes are an n x 4 matrix with x, y, vx, vy per row
createAxes <- function(n) {
#  x <- floor(0:(n-1) / 2)
#  y <- -x
  
#  vx <- 0:(n-1) %% 2
#  vy <- 1:n %% 2
  
  x <- floor(0:(n-1) / 2) * sqrt(2)
  y <- rep(0, n)
  
  vx <- rep(cos(pi/4), n)
  vx[seq(1, n, by=2)] <- vx[seq(1, n, by=2)] * -1
  
  vy <- rep(sin(pi/4), n)  
  
  return(matrix(c(x,y,vx,vy), nrow=n, ncol=4))
}


drawAxes <- function(data, axes) {    
  for (i in 1:ncol(data)) {  # Make axis naming more convenient  
    p <- axes[i,1:2]
    v <- axes[i,3:4]
    
    lines3d(x=c(p[1], p[1] + v[1]), y=c(p[2], p[2] + v[2]), z=0, color=rgb(0,0,0), alpha=1, lwd=3)
    
    # Draw axis labels
    text3d(x=p[1] + v[1] * 0.5, y=p[2] + v[2] * 0.5, z=0, texts=colnames(data)[i], adj=c(i%%2, 1), font=1, color=rgb(0.5, 0.5, 0.5))
  }
}


generatePoints <- function(drawData, fullData, axes) { 
  # Make axis naming more convenient 
  p <- axes[,1:2]
  v <- axes[,3:4]

  points <- list()
  
  for (i in 1:nrow(drawData)) {
    x <- vector()
    y <- vector()
    for (j in 1:ncol(drawData) - 1) {   
      if (!is.numeric(drawData[,j]) || !is.numeric(drawData[,j])) {
        next        
      } 
      
      norm1 <- (drawData[i,j] - min(fullData[,j])) / (max(fullData[,j]) - min(fullData[,j]))
      norm2 <- (drawData[i,j+1] - min(fullData[,j+1])) / (max(fullData[,j+1]) - min(fullData[,j+1]))

      # Get x and y values for points
      vx1 <- v[j,1] * norm1
      vy1 <- v[j,2] * norm1
           
      vx2 <- v[j+1,1] * norm2
      vy2 <- v[j+1,2] * norm2
      
      if (j %% 2 == 1) {
        x1 <- p[j,1]
        y1 <- p[j,2]
      }
      else {
        x1 <- p[j,1] - v[j+1,1]
        y1 <- p[j,2] - v[j+1,2]
      }
      
      x1 <- x1 + vx1 + vx2
      y1 <- y1 + vy1 + vy2
      
      
      x <- c(x, x1)
      y <- c(y, y1)      
    }

    points[[i]] <- list('x'=x, 'y'=y)
  }
    
  return(points)
}


interpolatePoints <- function(p, type, n) {  
  p2 <- list()
  
  for (i in 1:length(p)) {
    x <- p[[i]]$x
    y <- p[[i]]$y
    
    # Points aren't evenly sampled in x, so can't easily get sample point to fall on actual points.
    num <- n
    
    # Subdivide lines
    if (type == 'linear') {
      interp <- approx(x, y, n=num)
    }
    else if (type == 'spline') {
      interp <- spline(x, y, n=num)
    }
    else {
      print('Invalid interpolation type')
    }
    
    p2[[i]] <- interp
  }
  
  return(p2)
}


drawLines <- function(points, color=rgb(0,0,0), alpha=1, lineWidth=2) {  
  lines <- list()
  
  for (i in 1:length(points)) {    
    # Draw the lines
    lines <- c(lines, lines3d(x=points[[i]]$x, y=points[[i]]$y, z=0, lwd=lineWidth, color=color, alpha=alpha))
  }
  
  return (lines)
}


drawPoints <- function(points, color=rgb(0,0,0), alpha=1, pointSize=10) {  
  p <- list()
  
  for (i in 1:length(points)) {    
    # Draw the points
    p <- c(p, points3d(x=points[[i]]$x, y=points[[i]]$y, z=0, size=pointSize, color=color))
  }
  
  return (p)
}


stairCoordinates <- function(data, interpType='linear', lineAlpha=0.25, interpNum=1000) {
  # Input data checking
  if (!is.data.frame(data)) {
    stop('\n  input data is not a data frame')
  }
  
  # Set up window and mouse interaction
  windowRect <- c(64,128,1024,512)
  mouseMode <- c('user', 'zoom', 'zAxis')

  # Create window
  open3d(windowRect=windowRect)
  
  # Set up interaction
  par3d(mouseMode=mouseMode)
  
  # Remove tilted view
  view3d(0,0)  
  
  
  # Create axes  
  axes <- createAxes(ncol(data))
  
  # Create points
  points <- generatePoints(data, data, axes)
  str(points)
  
  # Interpolate points
#  interp <- interpolatePoints(points, interpType, n=interpNum)
  interp <- list()
  for (i in 1:length(points)) {
    interp[[i]] <- hermiteSpline(x=points[[i]]$x, y=points[[i]]$y, a=0.5, n=20)
  }
  
  
  # Draw
  axisIds <- drawAxes(data, axes)
  
  pointIds <- drawPoints(points, color=rgb(0.5, 0.5, 0.5), alpha=1, pointSize=8)
    
  lineIds <- drawLines(interp, color=rgb(0.8, 0.8, 0.8), alpha=lineAlpha, lineWidth=1)
  
    
  # Enable selection
  selectpoints3d(objects=c(pointIds, lineIds), value=FALSE, closest=FALSE,             
    multiple=selectFunction <- function(p) {
     
      id <- p[nrow(p),1]    
      rgl.pop(id=id)  
      
      w <- which(pointIds==id, arr.ind=TRUE)
      if (length(w) > 0) {
        drawPoints(points[w], color=rgb(0.75, 0.0, 0.0), alpha=1, pointSize=8)
      } 
       
      w <- which(lineIds==id, arr.ind=TRUE) 
      if (length(w) > 0) {
       drawLines(interp[w], color=rgb(0.75, 0.0, 0.0), alpha=lineAlpha, lineWidth=2)
      }    
     
      return (TRUE)
    }
  , button='left') 
}