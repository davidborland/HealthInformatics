#
# Currently not using ordered factors.  Could do so.
# 
# Think about ICD-9, either as sunburst in center of radial coordinates, or hierarchical axis.
# Use heatmap for sunburst for highlighted data.
#
# Think about bundling lines (see Holten, Hierarchical Edge Bundles)
#
# Try force-directed layout based on correlation
#
# Add axis distribution visualization for selected groups
#
# XXX: Test different ordering methods with different data sets and compare with "optimal"

#####################################################################
# Utility functions


uniqueValueThreshold=10;


bezierCurve <- function(x, y, n=10) {
  # Reference: http://rosettacode.org/wiki/Cubic_bezier_curves#R
  
  outx <- NULL
  outy <- NULL
  
  i <- 1
  for (t in seq(0, 1, length.out=n))
  {
    b <- bez(x, y, t)
    outx[i] <- b$x
    outy[i] <- b$y
    
    i <- i+1
  }
  
  return (list(x=outx, y=outy))
}

bez <- function(x, y, t) {  
  # Reference: http://rosettacode.org/wiki/Cubic_bezier_curves#R
  
  outx <- 0
  outy <- 0
  n <- length(x)-1
  for (i in 0:n)
  {
    outx <- outx + choose(n, i)*((1-t)^(n-i))*t^i*x[i+1]
    outy <- outy + choose(n, i)*((1-t)^(n-i))*t^i*y[i+1]
  }
  
  return (list(x=outx, y=outy))
}



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


# Mouse interaction function stubs 
mouseX <- 0
mouseY <- 0

panDown <- function(x, y) {
  mouseX <<- x
  mouseY <<- y
}

panMove <- function(x, y) {  
  deltaX <- x - mouseX
  deltaY <- y - mouseY
  
  s <- 0.005
  deltaX <- deltaX * s
  deltaY <- -deltaY * s
  
  tm <- translationMatrix(deltaX, deltaY, 0.0)
  
  m <- par3d('userMatrix')
  m <- m %*% t(tm)
  par3d(userMatrix=m)
  
  mouseX <<- x
  mouseY <<- y
}


# Axes are a list of x, y, vx, vy vectors
createAxes <- function(n) {
  axes <- matrix(c(0:(n-1), rep(0,n), rep(0,n), rep(1,n)), nrow=n, ncol=4) 
  
  return(list('x'=0:(n-1), 'y'=rep(0,n), 'vx'=rep(0,n), 'vy'=rep(1,n)))
}


# Converts points from linear parallel coordinates to radial
toRadial <- function(p, rotation=0, maxVal=NULL) {
  if (!is.null(maxVal)) {
    n <- maxVal
  }
  else {
    n <- max(p$x)
  }

  # Convert x dimension to theta
  x <- p$x / n * -2 * pi + rotation
  
  # Add 1 to y dimension to make inner radius 1
  y <- p$y + 1
  
  # Convert to cartesian coordinates
  pOut <- list('x' = y * cos(x), 'y' = y * sin(x))
  
  return(pOut)
}


generateColors <- function(data, colorBy) {  
  colors <- list()
  
  if (!is.null(colorBy)) {    
    for (i in 1:nrow(data)) {
      d <- data[,colorBy]
      
#      if (is.factor(d)) {
#        levels(d) <- as.character(1:(length(levels(d))))      
#        d <- as.numeric(levels(d))[d] 
#      }
      
      
      normMed <- median(d)
      normQ1 <- quantile(d, probs=0.25)
      normQ2 <- quantile(d, probs=0.75)
      
      if (d[i] < normQ1) col <- rgb(0.0, 0.0, 0.75)
#      else if (d[i] < normMed) col <- rgb(0.5, 0.5, 0.75)
#      else if (d[i] < normQ2) col <- rgb(0.75, 0.5, 0.5)
      else if (d[i] < normQ2) col <- rgb(0.75, 0.75, 0.75)
      else col <- rgb(0.75, 0.0, 0.0)
      
      
#      v <- (d[i] - min(d)) / (max(d) - min(d))
      
#      f <- colorRamp(c('blue2', 'grey75', 'green4'), space='rgb')     
#      f <- colorRamp(c('blue3', 'grey75', 'red3'), space='rgb')
#      f <- colorRamp(cm.colors(256))
#      col <- as.numeric(f(v)) / 255
      
#      colors[[i]] <- rgb(col[1], col[2], col[3])
      
      colors[[i]] <- col
    }
  }
  else {
    colors <- rep(rgb(0.75, 0.75, 0.75), nrow(data))
  }
  
  return(colors)
}

generateAlphas <- function(data, colorBy) {  
  alphas <- list()
  
  if (!is.null(colorBy)) {    
    for (i in 1:nrow(data)) {
      d <- data[,colorBy]
      
      #      if (is.factor(d)) {
      #        levels(d) <- as.character(1:(length(levels(d))))      
      #        d <- as.numeric(levels(d))[d] 
      #      }
      
      
      normMed <- median(d)
      normQ1 <- quantile(d, probs=0.25)
      normQ2 <- quantile(d, probs=0.75)
      
      if (d[i] < normQ1) alpha <- 1
      #      else if (d[i] < normMed) col <- rgb(0.5, 0.5, 0.75)
      #      else if (d[i] < normQ2) col <- rgb(0.75, 0.5, 0.5)
      else if (d[i] < normQ2) alpha <- 0.9
      else alpha <- 1
      
      
      #      v <- (d[i] - min(d)) / (max(d) - min(d))
      
      #      f <- colorRamp(c('blue2', 'grey75', 'green4'), space='rgb')     
      #      f <- colorRamp(c('blue3', 'grey75', 'red3'), space='rgb')
      #      f <- colorRamp(cm.colors(256))
      #      col <- as.numeric(f(v)) / 255
      
      #      colors[[i]] <- rgb(col[1], col[2], col[3])
      
      alphas[[i]] <- alpha
    }
  }
  else {
    alphas <- rep(0.9, nrow(data))
  }
  
  return(alphas)
}


#####################################################################
# Drawing functions


# Draw stacked bar plots for categorical data
drawStackedBarAxis <- function(data, axis, color=rgb(0,0,0), alpha=1, lineWidth=2, width=0.05) {
  # Make axis naming more convenient  
  p1 <- axis[1:2]
  v1 <- axis[3:4]
  
  p2 <- p1 + v1
  
  v2 <- v1[2:1] * width
  v2[1] <- v2[1]
  
  x <- c(p1[1] - v2[1], p1[1] + v2[1], p2[1] + v2[1], p2[1] - v2[1])
  x <- c(x, x[1])
  
  y <- c(p1[2] + v2[2], p1[2] - v2[2], p2[2] - v2[2], p2[2] + v2[2])
  y <- c(y, y[1])
  
  # Draw box outline
  lines3d(x=x, y=y, 
          # Horrible hack using z here...should be done be order of drawing...
          z=-0.01, color=color, alpha=alpha, lwd=lineWidth)
  
  t <- as.numeric(table(data))
  
  # Draw labels  
  count <- 0
  for (i in 1:length(t)) {    
    f1 <- count
    
    textOffset <- 0.25
    f2 <- t[i] / length(data) * textOffset
    
    text3d(x=p1[1] + v1[1] * f1 + v1[1] * f2, 
           y=p1[2] + v1[2] * f1 + v1[2] * f2, 
           z=0, levels(data)[i], adj=c(0.5,0.5), font=1, color=rgb(0.25, 0.25,0.25))
    
    count <- f1 + t[i] / length(data)
  }

  count <- 0
  for (i in 1:(length(t)-1)) {  
    f <- count + t[i] / length(data)
    
    # Draw horizontal lines separating regions
    lines3d(x=c(x[1] + v1[1] * f, x[2] + v1[1] * f),
            y=c(y[1] + v1[2] * f, y[2] + v1[2] * f),
            # Horrible hack using z here...should be done be order of drawing...
            z=-0.01, color=color, alpha=alpha, lwd=lineWidth)
    
    count <- f
  }
}

# Draw stacked line plots for categorical data
drawStackedLineAxis <- function(data, axis, color=rgb(0,0,0), alpha=1, lineWidth=2, width=0.05) {
  # Make axis naming more convenient  
  p1 <- axis[1:2]
  v1 <- axis[3:4]
  
  p2 <- p1 + v1
  
  v2 <- v1[2:1] * width
  v2[1] <- v2[1]
  
  x <- c(p1[1] - v2[1], p1[1] + v2[1], p2[1] + v2[1], p2[1] - v2[1])
  x <- c(x, x[1])
  
  y <- c(p1[2] + v2[2], p1[2] - v2[2], p2[2] - v2[2], p2[2] + v2[2])
  y <- c(y, y[1])
  
  # Draw line
  lines3d(x=c(p1[1], p2[1]), y=c(p1[2], p2[2]), z=0, color=color, alpha=alpha, lwd=lineWidth)
  
  t <- as.numeric(table(data))
  
  # Draw labels  
  count <- 0
  for (i in 1:length(t)) {
    f1 <- count
    
    textOffset <- 0.1
    f3 <- 1 / length(t) * textOffset
    f4 <- 1 / length(t) * (1-textOffset)
    text3d(x=p1[1] + v1[1] * f1 + v1[1] * f3 + v2[1] * 0, y=p1[2] + v1[2] * f1 + v1[2] * f3 - v2[2] * 0, z=0, levels(data)[i], adj=c(0.5,0.5), font=1, color=rgb(0.5, 0.5,0.5))
    
    count <- f1 + t[i] / length(data)
  }
  
  count <- 0
  for (i in 1:(length(t)-1)) {  
    f <- count + t[i] / length(data)
    
    # Draw horizontal lines separating regions
    lines3d(x=c(x[1] + v1[1] * f, x[2] + v1[1] * f),
            y=c(y[1] + v1[2] * f, y[2] + v1[2] * f),
            # Horrible hack using z here...should be done be order of drawing...
            z=-0.01, color=color, alpha=alpha, lwd=lineWidth)
    
    count <- f
  }
}


# Draw heat maps for interval data
drawHeatMapAxis <- function(data, axis, color=rgb(0,0,0), alpha=1, lineWidth=2, width=0.05) {
  # Make axis naming more convenient  
  p1 <- axis[1:2]
  v1 <- axis[3:4]
  
  p2 <- p1 + v1
  
  v2 <- v1[2:1] * width
#  v2[1] <- v2[1]
  
  x <- c(p1[1] - v2[1], p1[1] + v2[1], p2[1] + v2[1], p2[1] - v2[1])
  x <- c(x, x[1])
  
  y <- c(p1[2] + v2[2], p1[2] - v2[2], p2[2] - v2[2], p2[2] + v2[2])
  y <- c(y, y[1])
  
  # Draw box outline
  lines3d(x=x, y=y, 
          # Horrible hack using z here...should be done be order of drawing...
          z=-0.01, color=color, alpha=alpha, lwd=lineWidth)
  
  u <- sort(unique(data))  
  diff <- min(u[2:length(u)] - u[1:(length(u)-1)]) 
  u <- seq(u[1], u[length(u)], by=diff)
  
  
  for (i in 1:length(u)) {
    d <- sum(data == u[i]) / max(table(data))
    
    if (i == 1) {
      f1 <- 0
    }
    else {
      f1 <- (i-1) / length(u)
    }
    f2 <- i / length(u)
    
    # Draw labels  
    textOffset <- 0.1
    f3 <- 1 / length(u) * textOffset
    f4 <- 1 / length(u) * (1-textOffset)
    textColor <- ifelse(d > 0.5, 1-d + 0.25, 1-d - 0.25)        
    text3d(x=p1[1] + v1[1] * f1 + v1[1] * f3 + v2[1] * 0, y=p1[2] + v1[2] * f1 + v1[2] * f3 - v2[2] * 0, z=0, u[i], adj=c(0.5,0.5), font=1, color=rgb(textColor, textColor, textColor))
#    text3d(x=p1[1] + v1[1] * f1 + v1[1] * f4 + v2[1] * 0, y=p1[2] + v1[2] * f1 + v1[2] * f4 - v2[2] * 0, z=0, u[i], adj=c(0.5,0.5), font=1, color=rgb(textColor, textColor, textColor))
    
    # Draw colored rectangle for this region   
    quads3d(x=c(x[1] + v1[1] * f1, x[2] + v1[1] * f1, x[2] + v1[1] * f2, x[1] + v1[1] * f2),
            y=c(y[1] + v1[2] * f1, y[2] + v1[2] * f1, y[2] + v1[2] * f2, y[1] + v1[2] * f2),
            # Horrible hack using z here...should be done be order of drawing...
            z=-0.01, color=color, alpha=d, lit=FALSE)
  }
  
  for (i in 1:(length(u)-1)) {      
    f <- i / length(u)
    
    # Draw horizontal lines separating regions
    lines3d(x=c(x[1] + v1[1] * f, x[2] + v1[1] * f),
            y=c(y[1] + v1[2] * f, y[2] + v1[2] * f),
            # Horrible hack using z here...should be done be order of drawing...
            z=-0.01, color=color, alpha=alpha, lwd=lineWidth)
  }
  
  # Draw axis labels
#  text3d(x=p1[1] + v1[1] * -0.1, y=p1[2] + v1[2] * -0.1, z=0, min(data), adj=c(0.5,0.5), font=1, color=rgb(0.5, 0.5, 0.5))
#  text3d(x=p1[1] + v1[1] * 1.1, y=p1[2] + v1[2] * 1.1, z=0, texts=max(data), adj=c(0.5,0.5), font=1, color=rgb(0.5, 0.5, 0.5))
}

# Draw histogram axes for interval data
drawHistogramAxis <- function(data, axis, flipped=FALSE, color=rgb(0,0,0), alpha=1, lineWidth=2, width=0.05) {
  # Make axis naming more convenient  
  p1 <- axis[1:2]
  v1 <- axis[3:4]
  
  p2 <- p1 + v1
  
  v2 <- v1[2:1] * width
  #  v2[1] <- v2[1]
  
  x <- c(p1[1] - v2[1], p1[1] + v2[1], p2[1] + v2[1], p2[1] - v2[1])
  x <- c(x, x[1])
  
  y <- c(p1[2] + v2[2], p1[2] - v2[2], p2[2] - v2[2], p2[2] + v2[2])
  y <- c(y, y[1])
  
  u <- sort(unique(data))  
  diff <- min(u[2:length(u)] - u[1:(length(u)-1)]) 
  u <- seq(u[1], u[length(u)], by=diff)
  
u <- round(u, digits=2)
  
  numLabels <- min(length(u), uniqueValueThreshold)
  labelStep <- length(u) / (numLabels - 1)
  drawLabel <- 0
  
  for (i in 1:length(u)) {
    d <- sum(data == u[i]) / max(table(data))
    
    x <- c(p1[1] - v2[1] * d, p1[1] + v2[1] * d, p2[1] + v2[1] * d, p2[1] - v2[1] * d)
    x <- c(x, x[1])
    
    y <- c(p1[2] + v2[2] * d, p1[2] - v2[2] * d, p2[2] - v2[2] * d, p2[2] + v2[2] * d)
    y <- c(y, y[1])
        
    if (i == 1) {
      f1 <- 0
    }
    else {
      f1 <- (i-1) / length(u)
    }
    f2 <- i / length(u)
    
    # Draw labels  
    if (i >= drawLabel) {
      textOffset <- 0.1
      f3 <- 1 / length(u) * textOffset
      f4 <- 1 / length(u) * (1-textOffset)
      textColor <- 0.5     
      label <- ifelse(flipped, -u[i], u[i])
      text3d(x=p1[1] + v1[1] * f1 + v1[1] * f3 + v2[1] * 0, y=p1[2] + v1[2] * f1 + v1[2] * f3 - v2[2] * 0, z=0, texts=label, adj=c(0.5,0.5), font=1, color=rgb(textColor, textColor, textColor))
      #    text3d(x=p1[1] + v1[1] * f1 + v1[1] * f4 + v2[1] * 0, y=p1[2] + v1[2] * f1 + v1[2] * f4 - v2[2] * 0, z=0, texts=label, adj=c(0.5,0.5), font=1, color=rgb(textColor, textColor, textColor))
      drawLabel <- drawLabel + labelStep
    }
    
    
    # Draw colored rectangle for this region   
    quads3d(x=c(x[1] + v1[1] * f1, x[2] + v1[1] * f1, x[2] + v1[1] * f2, x[1] + v1[1] * f2),
            y=c(y[1] + v1[2] * f1, y[2] + v1[2] * f1, y[2] + v1[2] * f2, y[1] + v1[2] * f2),
            # Horrible hack using z here...should be done be order of drawing...
            z=-0.01, color=color, alpha=1, lit=FALSE)
  }
}

# Draw Tufte-style box-plots for axis
drawBoxPlotAxis <- function(data, axis, flipped=FALSE, color=rgb(0,0,0), alpha=1, lineWidth=2, pointSize=10) {
  # Make axis naming more convenient  
  p <- axis[1:2]
  v <- axis[3:4]
  
  # Normalize data
  normData <- (data - min(data)) / (max(data) - min(data))
  
  # Compute summary statistics for normalized data
  normMed <- median(normData)
  normMin <- min(normData)
  normMax <- max(normData)
  normQ1 <- quantile(normData, probs=0.25)
  normQ2 <- quantile(normData, probs=0.75)
  
  # Compute points for drawing box plot 
  pMed <- p + v * normMed
  pMin <- p + v * normMin
  pMax <- p + v * normMax
  pQ1 <- p + v * normQ1
  pQ2 <- p + v * normQ2
  
  # Two lines for min to lower quartile and upper quartile to max    
  lines3d(x=c(pMin[1], pQ1[1]), y=c(pMin[2], pQ1[2]), z=0, color=color, alpha=alpha, lwd=lineWidth)
  lines3d(x=c(pQ2[1], pMax[1]), y=c(pQ2[2], pMax[2]), z=0, color=color, alpha=alpha, lwd=lineWidth) 
  
  # Draw point for the median value
  points3d(x=pMed[1], y=pMed[2], z=0, color=color, size=pointSize, alpha=alpha)      
  
  # Draw axis labels  
  minLabel <- signif(ifelse(flipped, -min(data), min(data)), 3)
  maxLabel <- round(ifelse(flipped, -max(data), max(data)), 3)
  text3d(x=p[1] + v[1] * -0.1, y=p[2] + v[2] * -0.1, z=0, texts=minLabel, adj=c(0.5,0.5), font=1, color=rgb(0.5, 0.5, 0.5))
  text3d(x=p[1] + v[1] * 1.1, y=p[2] + v[2] * 1.1, z=0, texts=maxLabel, adj=c(0.5,0.5), font=1, color=rgb(0.5, 0.5, 0.5))
}

# Just draw a line for the axis
drawLineAxis <- function(data, axis, flipped=FALSE, color=rgb(0,0,0), alpha=1, lineWidth=2, pointSize=10) {
  data <- data.matrix(data)
  
  # Make axis naming more convenient  
  p1 <- axis[1:2]
  v <- axis[3:4]
  
  p2 <- p1 + v
  
  # Two lines for min to lower quartile and upper quartile to max    
  lines3d(x=c(p1[1], p2[1]), y=c(p1[2], p2[2]), z=0, color=color, alpha=alpha, lwd=lineWidth)
   
  # Draw axis labels
  minLabel <- ifelse(flipped, -min(data), min(data))
  maxLabel <- ifelse(flipped, -max(data), max(data))
  text3d(x=p1[1] + v[1] * -0.1, y=p1[2] + v[2] * -0.1, z=0, texts=minLabel, adj=c(0.5,0.5), font=1, color=rgb(0.5, 0.5, 0.5))
  text3d(x=p1[1] + v[1] * 1.1, y=p1[2] + v[2] * 1.1, z=0, texts=maxLabel, adj=c(0.5,0.5), font=1, color=rgb(0.5, 0.5, 0.5))
}

drawAxes <- function(data, axes, axisFlipped, decorateAxes=TRUE, lineWidth=2, width=0.04) {  
  axes <- do.call(rbind, axes)
  
  axisLabelIds <- list()
  
  for (i in 1:ncol(data)) {
    if (!decorateAxes) {
      drawLineAxis(data[,i], axes[,i], flipped=axisFlipped[i], color=rgb(0,0,0), alpha=1, lineWidth=lineWidth+1, pointSize=10)
    }
    else {
      if (is.factor(data[,i])) {
        drawStackedBarAxis(data[,i], axes[,i], color=rgb(0,0,0), alpha=1, lineWidth=lineWidth, width=width)
#        drawStackedLineAxis(data[,i], axes[,i], color=rgb(0,0,0), alpha=1, lineWidth=lineWidth, width=width)
      }
#      else if (is.integer(data[,i])) {
else if (length(unique(data[,i])) < uniqueValueThreshold) {      
#        drawHeatMapAxis(data[,i], axes[,i], color=rgb(0,0,0), alpha=1, lineWidth=lineWidth, width=width)
        drawHistogramAxis(data[,i], axes[,i], flipped=axisFlipped[i], color=rgb(0,0,0), alpha=1, lineWidth=lineWidth, width=width)
      }
      else if (is.numeric(data[,i])) {      
        drawBoxPlotAxis(data[,i], axes[,i], flipped=axisFlipped[i], color=rgb(0,0,0), alpha=1, lineWidth=lineWidth+1, pointSize=10)     
      }
    }
    
    # Make axis naming more convenient  
    p <- axes[1:2,i]
    v <- axes[3:4,i]
    
    # Draw axis labels
    col <- ifelse(axisFlipped[i], rgb(0.0, 0.0, 0.75), rgb(0.75, 0.0, 0.0))
    
    lines3d(x=c(p[1] + v[1], p[1] + v[1] * 1.4), y=c(p[2] + v[2], p[2] + v[2] * 1.4), z=0, color=rgb(0.0, 0.0, 0.0), alpha=0.1)
    
    axisLabelIds <- c(axisLabelIds, text3d(x=p[1] + v[1] * 1.4, y=p[2] + v[2] * 1.4, z=0, texts=colnames(data)[i], adj=c(0.5,0.5), font=1, color=col))
  }
  
  return(axisLabelIds)
}


drawCorrelationBackground <- function(data, axes) {
  cors <- cor(data.matrix(data), method='pearson')
  
  for (i in 1:(ncol(data)-1)) {
    v <- cors[i,i+1]
    
    if (v < 0) {
      f <- colorRamp(c('white', 'blue4'), space='rgb')     
      col <- as.numeric(f(abs(v))) / 255
#      col <- as.numeric(f(v^2)) / 255
      
      col <- c(0.0, 0.0, 0.5)
    }
    else{   
      f <- colorRamp(c('white', 'red4'), space='rgb')     
      col <- as.numeric(f(v)) / 255
#      col <- as.numeric(f(v^2)) / 255
      
      col <- c(0.5, 0.0, 0.0)
    }
    
    quads3d(x=c(axes$x[i], axes$x[i+1], axes$x[i+1] + axes$vx[i+1], axes$x[i] + axes$vx[i]),
            y=c(axes$y[i], axes$y[i+1], axes$y[i+1] + axes$vy[i+1], axes$y[i] + axes$vy[i]),
            z=-0.01, color=rgb(col[1], col[2], col[3]), alpha=abs(v) / 10, lit=FALSE)
#            z=-0.01, color=rgb(col[1], col[2], col[3]), alpha=v^2 / 10, lit=FALSE)
  }
}

drawCorrelations <- function(data, axes, axisType, factor=0.5, placeBy='distance', curvature=0.5, lineWidth=4) {  
  # Compute correlation
  #    cors <- cor(data.matrix(data), method='kendall')
  cors <- cor(data.matrix(data), method='pearson')  
  
  # Take the absolute value
  cors <- abs(cors)
#  cors <- cors^2
  
  # Only show values above the correlation factor
  cors <- (cors - factor) / (1 - factor)
  
  # Threshold negative values to zero
  cors <- ifelse(cors < 0, 0, cors)
  
  
  if (axisType=='parallel') {    
    for (i in 1:(ncol(data) - 1)) {
      for (j in (i+1):ncol(data)) {     
        v <- cors[i,j]
        
        if (placeBy=='distance') {
          # Draw Bezier curve from axis endpoints, with one control point based on the distance between the axes
          x <- c(axes$x[i], (axes$x[i] + axes$x[j]) / 2, axes$x[j])       
          y <- c(axes$y[i], -abs(axes$x[i] - axes$x[j]) * curvature, axes$y[j])
          
          interp <- bezierCurve(x, y, 20)
        }
        else if (placeBy=='value') {
          # Draw Hermite curve from axis endpoints, with height of middle point determined by correlation value
          x <- c(axes$x[i], (axes$x[i] + axes$x[j]) / 2, axes$x[j])            
          y <- c(0, -(1 - v), 0)  

          interp <- hermiteSpline(x, y, a=curvature, n=20)
        }
     
        
cors2 <- cor(data.matrix(data), method='pearson')

if (cors2[i,j] < 0) {
  f <- colorRamp(c('grey', 'blue3'), space='rgb')     
  col <- as.numeric(f(v)) / 255
}
else{
  
  f <- colorRamp(c('grey', 'red3'), space='rgb')     
  col <- as.numeric(f(v)) / 255        
}

        
        
        # Draw the lines
        lines3d(x=interp$x, y=interp$y, z=0.001 * v, lwd=lineWidth * v, color=rgb(col[1], col[2], col[3]), alpha=v)
      }
    }   
  }
  else if (axisType=='radial') {
    for (i in 1:(ncol(data) - 1)) {
      for (j in (i+1):ncol(data)) {     
        v <- cors[i,j]
        
        if (placeBy=='distance') {            
          # Draw Bezier curve from axis endpoints, with one control points extending inward from axis.
          # A curvature of 0 will produce straight lines
          x <- c(axes$x[i], (axes$x[i] - axes$vx[i] * curvature + axes$x[j] - axes$vx[j] * curvature) * 0.5, axes$x[j])       
          y <- c(axes$y[i], (axes$y[i] - axes$vy[i] * curvature + axes$y[j] - axes$vy[j] * curvature) * 0.5, axes$y[j])

          interp <- bezierCurve(x, y, 20)
        }
        else if (placeBy=='value') {
          # Compute the half vector between the two axes vector
          hx <- axes$vx[i] + axes$vx[j]
          hy <- axes$vy[i] + axes$vy[j]
          length <- sqrt(hx^2 + hy^2)
          hx <- hx / length
          hy <- hy / length
          
          
          # Draw Hermite curve from axis endpoints to halfway vector endpoint, modulated by the correlation value
          x <- c(axes$x[i], hx * v, axes$x[j])        
          y <- c(axes$y[i], hy * v, axes$y[j])
          
          interp <- hermiteSpline(x, y, a=curvature, n=20)
        }
        

cors2 <- cor(data.matrix(data), method='pearson')

if (cors2[i,j] < 0) {
  f <- colorRamp(c('grey', 'blue3'), space='rgb')     
  col <- as.numeric(f(v)) / 255
}
else{
  
  f <- colorRamp(c('grey', 'red3'), space='rgb')     
  col <- as.numeric(f(v)) / 255        
}

        
        
        # Draw the lines
        lines3d(x=interp$x, y=interp$y, z=0.001 * v, lwd=lineWidth * v, color=rgb(col[1], col[2], col[3]), alpha=v)
      }
    }      
  }
}


drawLines <- function(points, color=rgb(0,0,0), alpha=1, lineWidth=2) {  
  lineIds <- list()
  
  for (i in 1:length(points)) {    
    # Draw the lines    
    lineIds <- c(lineIds, lines3d(x=points[[i]]$x, y=points[[i]]$y, z=0, lwd=lineWidth, color=color[[i]], alpha=alpha[[i]]))
  }
  
  return(lineIds)
}


drawPoints <- function(points, color=rgb(0,0,0), alpha=1, pointSize=10) {  
  pointIds <- list()
  
#  if ('z' %in% names(points[[1]])) {
#    minZ <- 1000
#    maxZ <- -1000
#    for (i in 1:length(points)) {
#      minZ <- min(minZ, min(points[[i]]$z))
#      maxZ <- max(maxZ, max(points[[i]]$z))
#    }
#  }
  
  for (i in 1:length(points)) {    
    # Draw the points
    if ('z' %in% names(points[[i]])) {    
      # XXX: Think about ways to convey PC3 other than depth...
      pointIds <- c(pointIds, points3d(x=points[[i]]$x, y=points[[i]]$y, z=points[[i]]$z, size=pointSize, color=color[[i]], alpha=alpha[[i]]))
#      pointIds <- c(pointIds, points3d(x=points[[i]]$x, y=points[[i]]$y, z=0, size=points[[i]]$z * 20 + 10, color=color[[i]], alpha=alpha))
    }
    else {
      pointIds <- c(pointIds, points3d(x=points[[i]]$x, y=points[[i]]$y, z=0, size=pointSize, color=color[[i]], alpha=alpha[[i]]))
    }
  }
  
  return(pointIds)
}


drawDataLabels <- function(dataLabels, color=rgb(0,0,0), alpha=0.99) {
  labelIds <- list()  
  
  for (i in 1:length(dataLabels)) {
    labelIds <- c(labelIds, texts3d(x=dataLabels[[i]]$x, y=dataLabels[[i]]$y, z=0, texts=dataLabels[[i]]$label, color=color[[i]], alpha=alpha, adj=0.0))
  }
  
  return(labelIds)
}


#####################################################################
# Data manipulation functions


mapData <- function(data) {
  # Convert data frame to a matrix so we can perform arithmetic with factors
  mapData <- data.matrix(data)
  
  for (i in 1:ncol(data)) {
    d <- mapData[,i]
    
    print(length(sort(unique(d))))
    
    if (is.factor(data[,i])) {
      # Factor data
      # Place in the middle of the corresponding region, with region size based on fraction of items at that level
      
      # Compute the fraction of items at each level
      frac <- table(d) / nrow(data)
      
      # Cumulative sum of fractions
      sum <- cumsum(frac)
      
      # Space vertically based on fractions
      mapData[,i] <- sum[d] - frac[d] * 0.5
    }
#    else if (is.integer(data[,i])) {
else if (length(sort(unique(d))) < uniqueValueThreshold) {
      # Integer data      
      # Place in the middle of the corresponding region, with regions evenly spaced
      
      # Sort the unique integer values
      u <- sort(unique(d))
      
      # Find the minimum distance between values
      minDiff <- min(u[2:length(u)] - u[1:(length(u)-1)])
      
      # Generate a sequence spaced by the minimum distance
      u <- seq(u[1], u[length(u)], by=minDiff)
      
      # Compute the size of each region
      regionSize <- 1 / length(u)      
      
      # Normalize values to [0, 1]
      d <- (d - min(d)) / (max(d) - min(d))
      
      # Transform to middle of regions
      mapData[,i] <- d * (1 - regionSize) + regionSize * 0.5 
    }
    else {
      # Assume numeric data
      # Normalize to [0, 1]
      mapData[,i] <- (d - min(d)) / (max(d) - min(d))
    }
  }
  
  return(mapData)
}


spreadData <- function(mappedData, data, spreadFactor=1/3, wrapData=FALSE) {
  # Returns a value in [-spreadFactor/2, spreadFactor/2] based on this item's mapped value in column j2,
  # compared with other items with the same value in column j
  getSpreadValue <- function(i, j, j2) {   
    sameValue <- which(data[,j] == data[i,j], arr.ind=TRUE)
    
    spreadVal <- mappedData[i,j2]
    spreadMin <- min(mappedData[sameValue])
    spreadMax <- max(mappedData[sameValue])
    
    if (spreadMax == spreadMin) {
      val <- 0
    }      
    else {
      val <- (spreadVal - spreadMin) / (spreadMax - spreadMin)
      val <- val * spreadFactor - spreadFactor*0.5
    }
    
    return(val)
  }
  
  spreadValues <- mappedData
  
  for (i in 1:nrow(data)) {
    for (j in 1:ncol(data)) {            
      if (j == 1) {
        if (wrapData) {
          spreadValue <- getSpreadValue(i, j, ncol(data)) + getSpreadValue(i, j, j+1)
        }
        else {
          spreadValue <- getSpreadValue(i, j, j+1)
        }
      }
      else if (j == ncol(data)) {
        if (wrapData) {
          spreadValue <- getSpreadValue(i, j, j-1) + getSpreadValue(i, j, 1)
        }
        else {
          spreadValue <- getSpreadValue(i, j, j-1)
        }
      }
      else {
        spreadValue <- getSpreadValue(i, j, j-1) + getSpreadValue(i, j, j+1)
      }
      
      if (is.factor(data[,j])) {
        # XXX: Repeating code from mapData.  Should really be stored per column...
        t <- table(data[,j])
        frac <- as.numeric(t[data[i,j]]) / nrow(data)            
        spreadValues[i,j] <- mappedData[i,j] + frac * spreadValue
      }
#      else if (is.integer(data[,j])) { 
else if (length(sort(unique(data[,j]))) < uniqueValueThreshold) {      
        # XXX: Repeating code from mapData.  Should really be stored per column...
        u <- sort(unique(data[,j]))  
        minDiff <- min(u[2:length(u)] - u[1:(length(u)-1)]) 
        u <- seq(u[1], u[length(u)], by=minDiff)
        
        regionSize <- 1 / length(u)
        
        spreadValues[i,j] <- mappedData[i,j] + regionSize * spreadValue
      }
    }
  }  
  
  # Values are ordered, now space evenly
  spacedData <- spreadValues
  
  for (i in 1:nrow(data)) {        
    for (j in 1:ncol(data)) {
      if (is.factor(data[,j])) {        
        # XXX: Again, repeating code here.  Should be stored, or a function
        d <- mappedData[i,j]
        t <- table(data[,j])
        h <- as.numeric(t[data[i,j]]) / nrow(data)
        
        sameValue <- which(data[,j] == data[i,j])
        
        values <- vector()
        for (k in 1:length(sameValue)) {
          values[k] <- spreadValues[sameValue[k],j]
        }
        
        index <- which(sameValue[order(values)]==i)
        
        val <- index / (length(values) + 1)
        
        val <- val * spreadFactor - spreadFactor * 0.5
        
        spacedData[i,j] <- d + h * val
      }
#      else if (is.integer(data[,j])) {
else if (length(unique(data[,j])) < uniqueValueThreshold) {      
        # XXX: Again, repeating code here.  Should be stored, or a function
        d <- mappedData[i,j]
        t <- table(data[,j])        
        
        frac <- sum(data[,j] == data[i,j]) / max(t)
        
        u <- sort(unique(data[,j]))  
        minDiff <- min(u[2:length(u)] - u[1:(length(u)-1)]) 
        u <- seq(u[1], u[length(u)], by=minDiff)
        
        h <- 1 / length(u)
        
        sameValue <- which(data[,j] == data[i,j])
        
        values <- vector()
        for (k in 1:length(sameValue)) {
          values[k] <- spreadValues[sameValue[k],j]
        }
        
        index <- which(sameValue[order(values)]==i)
        
        val <- index / (length(values) + 1)
      
        val <- val * spreadFactor * frac - spreadFactor * frac * 0.5
        
        spacedData[i,j] <- d + h * val
      }
    }  
  }  
    
  return(spacedData)
}


generatePoints <- function(data, axes) {   
  points <- list()
  
  for (i in 1:nrow(data)) {
    x <- as.numeric(axes$x + data[i,] * axes$vx)
    y <- as.numeric(axes$y + data[i,] * axes$vy)
    
    points[[i]] <- list('x'=x, 'y'=y)
  }
  
  return(points)
}


generateScatterPoints <- function(points, data, mappedData, axes, type='axis') {
  scatterPoints <- list()
   
  # XXX: PCA and MDS are equivalent when using pairwise euclidean distances for MDS (and applying the same scaling to the data)
  #      Is there a standard MDS that will give a meaningful difference from PCA?  Go with non-metric for now...
  
  # XXX: To scale or not to scale...
  
  # For now, scale pca, not mds...
  
  if (type == 'pca') {
    pca <- prcomp(data.matrix(data), scale=TRUE, center=TRUE)
    
    s <- 1.0 / max(abs(min(pca$x[,1])), abs(max(pca$x[,1]))) * 0.25
    
    for (i in 1:nrow(pca$x)) {    
      x <- pca$x[i,1] * s
      y <- pca$x[i,2] * s
      z <- pca$x[i,3] * s
      
      scatterPoints[[i]] <- list('x'=x, 'y'=y, 'z'=z)
    }
  }
  else if (type == 'mds') {
    # Scale data
    # XXX: Make this an option?
#    normData <- scale(data.matrix(data), center=TRUE, scale=colSums(data.matrix(data)))
#    normData <- scale(data.matrix(data), center=TRUE, scale=TRUE)
    normData <- data
       
    mds <- cmdscale(dist(normData, method='euclidean'), k=3)
    
#    mds <- isoMDS(dist(normData), k=3)
#    mds <- mds$points
    
    
    s <- 1.0 / max(abs(min(mds[,1])), abs(max(mds[,1]))) * 0.25
    
    for (i in 1:nrow(mds)) {    
      x <- mds[i,1] * s
      y <- mds[i,2] * s
      z <- mds[i,3] * s
      
      scatterPoints[[i]] <- list('x'=x, 'y'=y, 'z'=z)
    }
  }
  else if (type == 'axis') {
    for (i in 1:length(points)) {
      x <- 0
      y <- 0
      
      for (j in 1:ncol(data)) {
        # XXX: This should really be based on normalized data value, as the points
        # have been jittered...
        x <- x + points[[i]]$x[j]
        y <- y + points[[i]]$y[j]
      }
      
      scale <- 0.25
      
      x <- x * scale
      y <- y * scale
      
      scatterPoints[[i]] <- list('x'=x, 'y'=y)
    }
  }

  
  #XXX: Need to clean up this code and add parameters for it
  
  
  
#  else if (type == 'multiple') {      
    # Generate new axes  

    for (i in 1:nrow(data)) {
      x <- vector()
      y <- vector()
      z <- vector()
      
      for (j in 1:ncol(data)) {            
        axisDepth <- 0.5
axisDepth <- sqrt((axes$x[j] - axes$x[j+1])^2 + (axes$y[j] - axes$y[j+1])^2) * 0.5

# Correct for differences in distance from center if axes are not evenly spaced
mpx <- (axes$x[j] + axes$x[j+1]) / 2
mpy <- (axes$y[j] + axes$y[j+1]) / 2
mpd <- sqrt(mpx^2 + mpy^2)

axisDepth <- axisDepth / mpd
        
        ox <- (axes$vx[j] + axes$vx[[j+1]]) / 2 * (1 - axisDepth)
        oy <- (axes$vy[j] + axes$vy[[j+1]]) / 2 * (1 - axisDepth)
        
        v1x <- axes$x[j] - ox
        v1y <- axes$y[j] - oy
        
        v2x <- axes$x[j+1] - ox
        v2y <- axes$y[j+1] - oy
        
        # Use half the length to ensure the points lie within a parallelogram with the endpoint at the inner circle of the radial axes
        v1x <- v1x * 0.5
        v1y <- v1y * 0.5
        v2x <- v2x * 0.5
        v2y <- v2y * 0.5
        
        d1 <- mappedData[i,j]      
        if (j == ncol(data)) {
          d2 <- mappedData[i,1]
        }
        else {          
          d2 <- mappedData[i,j+1]
        }              
        
        x <- c(x, ox + (v1x * d1 + v2x * d2))
        y <- c(y, oy + (v1y * d1 + v2y * d2))
        z <- c(z, 0)
      }
      
      scatterPoints[[i]]$x <- c(scatterPoints[[i]]$x, x)
      scatterPoints[[i]]$y <- c(scatterPoints[[i]]$y, y)
      scatterPoints[[i]]$z <- c(scatterPoints[[i]]$z, z)
    }
    
    
    
    
    # Draw the axes 
if (0) {
    for (j in 1:ncol(data)) {  
      axisDepth <- 0.5
      
axisDepth <- sqrt((axes$x[j] - axes$x[j+1])^2 + (axes$y[j] - axes$y[j+1])^2) * 0.5

mpx <- (axes$x[j] + axes$x[j+1]) / 2
mpy <- (axes$y[j] + axes$y[j+1]) / 2
mpd <- sqrt(mpx^2 + mpy^2)
      
axisDepth <- axisDepth / mpd
      
      ox <- (axes$vx[j] + axes$vx[[j+1]]) / 2 * (1 - axisDepth)
      oy <- (axes$vy[j] + axes$vy[[j+1]]) / 2 * (1 - axisDepth)
      
      v1x <- axes$x[j] - ox
      v1y <- axes$y[j] - oy
      
      v2x <- axes$x[j+1] - ox
      v2y <- axes$y[j+1] - oy
    
      v1x <- v1x * 0.5
      v1y <- v1y * 0.5
      v2x <- v2x * 0.5
      v2y <- v2y * 0.5
 
      lines3d(x=c(ox, ox+v1x*2), y=c(oy, oy+v1y*2), z=0, alpha=c(0.1, 0))
      lines3d(x=c(ox, ox+v2x*2), y=c(oy, oy+v2y*2), z=0, alpha=c(0.1, 0))
      
#      lines3d(x=c(ox, ox+v1x), y=c(oy, oy+v1y), z=0, alpha=0.1)
#      lines3d(x=c(ox, ox+v2x), y=c(oy, oy+v2y), z=0, alpha=0.1)
      
#      lines3d(x=c(ox+v1x, ox+v1x+v2x), y=c(oy+v1y, oy+v1y+v2y), z=0, alpha=0.05)
#      lines3d(x=c(ox+v2x, ox+v2x+v1x), y=c(oy+v2y, oy+v2y+v1y), z=0, alpha=0.05)
      
#      lines3d(x=c(ox+v1x, axes$x[j]), y=c(oy+v1y, axes$y[j]), z=0, alpha=0.05)
#      lines3d(x=c(ox+v2x, axes$x[j+1]), y=c(oy+v2y, axes$y[j+1]), z=0, alpha=0.05)
    }
}    

  
  return(scatterPoints)
}


generateDataLabels <- function(data) {  
  numLabels <- nrow(data)
  
  maxLabelsPerColumn <- 50
  
  numColumns <- ceiling(numLabels / maxLabelsPerColumn)
  labelsPerColumn <- ceiling(numLabels / numColumns)
  
  xStart <- -numColumns * 2 - 5
  x <- list()
  y <- list()
  for (i in 1:numColumns) {
    x <- c(x, rep(xStart + i * 2, labelsPerColumn))
    y <- c(y, seq(2.5, -2.5, len=labelsPerColumn))
  }
  
  labels <- rownames(data)
  x <- x[1:numLabels]
  y <- y[1:numLabels]
  
  dataLabels <- list()
  for (i in 1:length(labels)) {
    dataLabels[[i]] <- list('label'=labels[i], 'x'=x[i], 'y'=y[i])
  }
  
  return(dataLabels)
}


#####################################################################
# Axis manipulation functions


shouldFlipAxis <- function(data) {
  cors <- cor(data.matrix(data))
  
  diag(cors) <- 0
  
  flipAxis <- c(FALSE)
  for (i in 1:(ncol(cors) - 1)) {    
   flipAxis[i+1] <- (cors[i,i+1] < 0 && !flipAxis[i]) || (cors[i,i+1] > 0 && flipAxis[i])
  }
  
  if (sum(flipAxis==TRUE) > sum(flipAxis==FALSE)) {
    flipAxis <- !flipAxis
  }
  
  return(flipAxis)
}


doFlipAxes <- function(data, flipAxis) {  
  for (i in 1:ncol(data)) {
    if (flipAxis[i]) {
      if (is.factor(data[,i])) {
        data[,i] <- factor(data[,i], levels=rev(levels(data[,i])))
      }
      else {
        data[,i] <- -data[,i]
      }
    }
  }
  
  return(data)
}


orderAxes <- function(data, orderMethod=NULL) {
  
  # XXX: Think about using force-directed layout...
  
  
  if (is.null(orderMethod)) {
    return(data)
  }
  
  if (orderMethod=='cor1') {
    # Greedy method, starting with the two most correlated axes and progressing from there    
    cors <- abs(cor(data.matrix(data)))
#    cors <- cor(data.matrix(data))^2
    
    diag(cors) <- 0
    
    maxIndex <- which(cors==max(cors), arr.ind=TRUE)
    
    cors[maxIndex[1], maxIndex[2]] <- 0
    cors[maxIndex[2], maxIndex[1]] <- 0
    
    ord <- c(maxIndex[1], maxIndex[2])
    
    while (length(ord) < ncol(data)) {
      c1 <- cors[,ord[1]]
      
      maxIndex1 <- which(c1 == max(c1))
      
      cors[,ord[1]] <- 0
      cors[ord[1],] <- 0
      cors[maxIndex1, ord[length(ord)]] <- 0
      cors[ord[length(ord)], maxIndex1] <- 0
      
      ord <- c(maxIndex1, ord)
      
      
      c2 <- cors[,ord[length(ord)]]
      
      maxIndex2 <- which(c2 == max(c2))
      
      cors[,ord[length(ord)]] <- 0
      cors[ord[length(ord)],] <- 0    
      cors[maxIndex1, maxIndex2] <- 0
      cors[maxIndex2, maxIndex1] <- 0
      
      ord <- c(ord, maxIndex2)
    }
    
    ord <- ord[1:ncol(data)]
    
    data <- data[,ord]
  }
  else if (orderMethod=='cor2') {
    # Greedy method, placing axes with the highest remaining correlation next to each other
    
    # Compute correlation absolute values
    cors <- abs(cor(data.matrix(data)))
#    cors <- cor(data.matrix(data))^2
    
    # Zero out the lower triangle and diagonal
    cors[lower.tri(cors, diag=TRUE)] <- 0
    
    # Initialize order list of vectors
    maxIndex <- which(cors==max(cors), arr.ind=TRUE)
    orders <- list()
    orders[[1]] <- c(maxIndex[1], maxIndex[2])
    
    # Remove maximim correlation
    cors[maxIndex] <- 0
    cors[rev(maxIndex)] <- 0
    
    # Utility functions
    canMergeLists <- function(l1, l2) {
      return(l1[1] == l2[1]          || l1[1] == l2[length(l2)] ||
             l1[length(l1)] == l2[1] || l1[length(l1)] == l2[length(l2)])
    }

    mergeLists <- function(l1, l2) {
      if (l1[1] == l2[1]) {
        return(unique(c(rev(l2), l1)))
      }
      else if (l1[1] == l2[length(l2)]) {
        return(unique(c(l2, l1)))
      }
      else if (l1[length(l1)] == l2[1]) {
        return(unique(c(l1, l2)))
      }
      else if (l1[length(l1)] == l2[length(l2)]) {
        return(unique(c(l1, rev(l2))))
      }
      else {
        stop('\n  mergeLists(): cannot merge these lists')
      }
    }
    
    for (i in (1:ncol(cors) - 2)) {
      # Get the maximum remaining correlation
      maxIndex <- which(cors==max(cors), arr.ind=TRUE)
      maxIndex <- c(maxIndex[1], maxIndex[2])
      
      # Get array of ordered subsets than can be merged      
      canMerge <- lapply(orders, canMergeLists, maxIndex)
      j <- which(canMerge==TRUE, arr.ind=TRUE)
      j1 <- j[1]
      
      if (length(j) > 0) {
        orders[[j1]] <- mergeLists(orders[[j1]], maxIndex)
        if (length(j) > 1) {
          orders[[j1]] <- mergeLists(orders[[j1]], orders[[j[2]]])
          orders[[j[2]]] <- NULL
        }
        
        # The newly merged list
        o <- orders[[j1]]        
        len <- length(o)
        
        # Ensure only possible correlations are non-zero
        if (len > 2) {
          k <- o[2:(len - 1)]

          cors[,k] <- 0
          cors[k,] <- 0
        }
        
        cors[o[1],o[len]] <- 0
        cors[o[len],o[1]] <- 0
      }
      else {
        # Create a new ordered subset
        orders[[length(orders) + 1]] <- c(maxIndex[1], maxIndex[2])
        
        # Remove this correlation
        cors[maxIndex] <- 0
        cors[rev(maxIndex)] <- 0
      }
    }
    
    data <- data[,orders[[1]]]
  }
  else if (orderMethod=='cor3') {
    # Greedy method, placing axes with the highest remaining correlation next to each other
    
    # Compute correlation absolute values
    cors <- abs(cor(data.matrix(data)))
#    cors <- cor(data.matrix(data))^2
    
    # Zero out the lower triangle and diagonal
    cors[lower.tri(cors, diag=TRUE)] <- 0
    
    orders <- vector()
    
    while (length(orders) < ncol(cors)) {      
      # Get the maximum remaining correlation
      maxIndex <- which(cors==max(cors), arr.ind=TRUE)
      
      i1 <- which(orders==maxIndex[1], arr.ind=TRUE)
      i2 <- which(orders==maxIndex[2], arr.ind=TRUE)
      if (length(i1) > 0 && length(i2) > 0) {

      }
      else if (length(i1) > 0) {
        i1 <- i1[1]
        if (i1 > length(orders) / 2) {
          orders <- c(orders, maxIndex[2])
        }
        else {
          orders <- c(maxIndex[2], orders)
        }
      }
      else if (length(i2) > 0) {
        i2 <- i2[1]
        if (i2 > length(orders) / 2) {
          orders <- c(orders, maxIndex[1])
        }
        else {
          orders <- c(maxIndex[1], orders)
        }  
      }
      else {
        # XXX: Should handle this case better: start another subset, then paste together at 
        # the end?
        
        orders <- c(orders, maxIndex[1], maxIndex[2])
      }
      
      cors[maxIndex] <- 0
      cors[rev(maxIndex)] <- 0
    }
    
    data <- data[,orders]
  }
  else if (orderMethod=='cor4') {
    # Greedy clustering based on correlation.  Similar to cor3, but maintain separate clusters until joined instead of automatically joining.
   
    # Compute correlation absolute values
    cors <- abs(cor(data.matrix(data)))
#    cors <- cor(data.matrix(data))^2
    
    # Zero out the lower triangle and diagonal
    cors[lower.tri(cors, diag=TRUE)] <- 0
    
    orders <- c()
    
    while (length(orders[[1]]) < ncol(cors)) {      
      # Get the maximum remaining correlation
      maxIndex <- which(cors==max(cors), arr.ind=TRUE)  
      
#      print(cors)
#      print(orders)
#      print(maxIndex)
#      print('...........................')
      
      # Search for these indices
      i1 <- vector()
      i2 <- vector()
      for (i in 1:length(orders)) {
        i1[i] <- which(orders[[i]]==maxIndex[1], arr.ind=TRUE)[1]
        i2[i] <- which(orders[[i]]==maxIndex[2], arr.ind=TRUE)[1]
      }
      
      # Which subsets contains these indeces?
      o1 <- which(i1 > 0, arr.ind=TRUE)
      o2 <- which(i2 > 0, arr.ind=TRUE)
      
      if (length(o1) > 0 && length(o2) > 0 && o1 == o2) {
        # Same subset, can't do anything
      }      
      else if (length(o1) > 0 && length(o2) > 0) {
        # Separate subsets, join them
        i1 <- i1[o1]
        i2 <- i2[o2]
        
        s1 <- orders[[o1]]
        s2 <- orders[[o2]]

        if (o1 > o2) {
          tmp <- i1
          i1 <- i2
          i2 <- tmp 
          
          tmp <- o1
          o1 <- o2
          o2 <- tmp 
          
          tmp <- s1
          s1 <- s2
          s2 <- tmp 
        }
        
        if (i1 > length(s1) / 2 && i2 > length(s2) / 2) {    
          # Flip one and join the two subsets
          orders[[o1]] <- c(s1, rev(s2))
        }
        else if (i1 > length(s1) / 2) {
          # Join the two subsets
          orders[[o1]] <- c(s1, s2)
        }
        else if (i2 > length(s2) / 2) {
          # Flip both and joint the two subsets
          orders[[o1]] <- c(rev(s1), rev(s2))
        }
        else {
          # Flip one and join the two subsets
          orders[[o1]] <- c(rev(s1), s2)
        }
        
        orders[[o2]] <- NULL
      }
      else if (length(o1) > 0) {
        # First index is in a subset, add to it
        i1 <- i1[o1]
        
        s1 <- orders[[o1]]
        
        if (i1 > length(s1) / 2) {
          orders[[o1]] <- c(s1, maxIndex[2])
        }
        else {
          orders[[o1]] <- c(maxIndex[2], s1)
        }   
      }
      else if (length(o2) > 0) {
        # Second index is in a subset, add to it
        i2 <- i2[o2]
        
        s2 <- orders[[o2]]
        
        if (i2 > length(s2) / 2) {
          orders[[o2]] <- c(s2, maxIndex[1])
        }
        else {
          orders[[o2]] <- c(maxIndex[1], s2)
        }   
      }
      else {
        # Create new subset        
        orders[[length(orders)+1]] <- c(maxIndex[1], maxIndex[2])    
      }
      
      # Remove this correlation
      cors[maxIndex] <- 0
      cors[rev(maxIndex)] <- 0
    }
    
#    print(orders)
    
    data <- data[,orders[[1]]]
  }
  
  return(data)
}


spaceAxes <- function(axes, data, spacingMethod=NULL) {
  if (is.null(spacingMethod)) {
    return(axes)
  }
  
  if (spacingMethod == 'cor') {  
    # Space axes based on correlation
    cors <- cor(data.matrix(data))
    for (i in 2:ncol(data)) {
      axes$x[i] <- axes$x[i-1] + (1 - abs(cors[i,i-1]))
#      axes$x[i] <- axes$x[i-1] + (1 - cors[i,i-1]^2)
    }    
    axes$x <- axes$x * length(axes$x) / max(axes$x)
  }
  
  return(axes)
}


#####################################################################
# Main function


parallelCoordinates <- function(data, axisType='parallel', decorateAxes=TRUE, 
                                axisOrderMethod=NULL, flipAxes=FALSE, axisSpacingMethod=NULL,
                                curveTension=0.5, curveSteps=20, 
                                pointSize=4, colorBy=NULL, spreadFactor=1/3, 
                                correlationFactor=0.5, correlationPlaceBy='distance', correlationCurvature=0.75,
                                correlationBackground=FALSE,
                                scatterPlotType=NULL, showDataLabels=FALSE,
                                rotation=-pi/2) {  
  
  # Input data checking
  if (!is.data.frame(data)) {
    stop('\n  input data is not a data frame')
  }
  
  
  # Set up window and mouse interaction based on plot type
  if (axisType == 'parallel') {
    windowRect <- c(64,128,1024,512)
    
    # Only allow zooming.  
    # Apparently 'none' doesn't work to disable, but 'user' appears to
    mouseMode <- c('user', 'zoom', 'user')
  }
  else if (axisType == 'radial') { 
    windowRect <- c(64,128,728,728)
    
    # Allow zooming and spinning around the z axis
    # Apparently 'none' doesn't work to disable, but 'user' appears to
#    mouseMode <- c('user', 'zoom', 'zAxis')
    mouseMode <- c('user', 'zoom', 'user')
  }
  else {
    stop('\n  invalid axisType parameter')
  } 
  
  
  # Create window
  open3d(windowRect=windowRect)
  
  # Set up interaction
  par3d(mouseMode=mouseMode)
  
  # Remove tilted view
  view3d(0,0)
  
  
  rgl.setMouseCallbacks(3, panDown, panMove)
  
  
  # Should data be wrapped from last axis to first axis
  wrapData <- axisType=='radial'
  
  
  # Order axes
  data <- orderAxes(data, axisOrderMethod)
  
  # Flip axes
nonFlippedData <- data # XXX: Hack for correlation visualization
  axisFlipped <- rep(FALSE, ncol(data))
  if (flipAxes) {
    axisFlipped <- shouldFlipAxis(data)
    data <- doFlipAxes(data, axisFlipped)
  }  
  
  
  # Initial mapping of data to axis, based on data type
  mappedData <- mapData(data)
  
  # Spread data along axes, depending on data type
  mappedData <- spreadData(mappedData, data, spreadFactor=spreadFactor, wrapData=wrapData)
  
  
  # Create axes  
  axes <- createAxes(ncol(data))
  
  
  # Space axes
  axes <- spaceAxes(axes, data, spacingMethod=axisSpacingMethod)
  
  
  # Create points
  points <- generatePoints(mappedData, axes)
  
  
  # Setup for wrapped data
  if (wrapData) {
    # Create additional column 
    for (i in 1:length(points)) {
      points[[i]]$x <- c(points[[i]]$x, points[[i]]$x[length(points[[i]]$x)] + 1)
      points[[i]]$y <- c(points[[i]]$y, points[[i]]$y[1])
    }
  }
  
  # Extra setup for radial axes
  if (axisType == 'radial') {
    # XXX: This is a bit ugly...
    axes$x <- c(axes$x, axes$x[length(axes$x)] + 1)
    axes$y <- c(axes$y, axes$y[length(axes$y)])
    
    axes <- toRadial(axes, rotation)
  
    axes$vx <- axes$x
    axes$vy <- axes$y
     
    points <- lapply(points, toRadial, rotation)   
  }   
  
  
  # Interpolate points
  interpolatedPoints <- list()
  for (i in 1:length(points)) {
    interpolatedPoints[[i]] <- hermiteSpline(x=points[[i]]$x, y=points[[i]]$y, tx=axes$vy, ty=-axes$vx, a=curveTension, n=curveSteps)
  }
  
   
  # Draw correlations
  drawCorrelations(nonFlippedData, axes, factor=correlationFactor, placeBy=correlationPlaceBy, curvature=correlationCurvature, axisType=axisType)
  
  
  # Generate colors  
  colors <- generateColors(data, colorBy)
  alphas <- generateAlphas(data, colorBy)
  
  
  # Draw axes
  axisLabelIds <- drawAxes(data, axes, axisFlipped, decorateAxes=decorateAxes) 
  
  # Draw data
  pointIds <- drawPoints(points, color=colors, alpha=alphas, pointSize=pointSize)   
  lineIds <- drawLines(interpolatedPoints, color=colors, alpha=alphas, lineWidth=1)

  
  # Draw scatter plot
  scatterIds <- list()
  if (!is.null(scatterPlotType)) {
    if (axisType == 'radial') {
      scatterPoints <- generateScatterPoints(points, nonFlippedData, mappedData, axes, type=scatterPlotType)
      scatterIds <- drawPoints(scatterPoints, color=colors, alpha=alphas, pointSize=pointSize)
    }
  }
  
  
  # Draw data labels
  labelIds <- list()
  if (showDataLabels) {
    dataLabels <- generateDataLabels(data)
    dataLabelsSelected <- dataLabels
    labelIds <- drawDataLabels(dataLabels, color=colors)
  }
  
  
  # Draw correlation background
  if (correlationBackground) {
    drawCorrelationBackground(data, axes)
  }
   
  
  # Draw primitive GUI
  selectionColors <- c(rgb(0.75, 0.0, 0.0),
                       rgb(0.0, 0.0, 0.75),
                       rgb(0.75, 0.5, 0.0),
                       rgb(0.0, 0.75, 0.0),
                       rgb(0.75, 0.0, 0.75),
                       rgb(0.0, 0.75, 0.75))
  selectionColorIndex <- 1
  
  if (axisType == 'parallel') {
    guiX <- (ncol(data) - 1) / 2
    guiY <- -0.25
  }
  else if (axisType == 'radial') {    
    guiX <- 0
    guiY <- 2.5
  }
  guiIdColor <- points3d(x=guiX, y=guiY, z=0, size=15, color=selectionColors[selectionColorIndex])
  guiId1 <- points3d(x=guiX - 0.1, y=guiY, z=0, size=10)
  guiId2 <- points3d(x=guiX + 0.1, y=guiY, z=0, size=10)
  guiId3 <- points3d(x=guiX, y=guiY + 0.1, z=0, size=10)

    
  # Enable selection
  selection <- c()
  
  selectpoints3d(objects=c(pointIds, lineIds, scatterIds, labelIds, axisLabelIds, guiId1, guiId2, guiId3), value=FALSE, closest=FALSE, 
    multiple=selectFunction <- function(p) {      
      id <- p[nrow(p),1]    
      
      # First check GUI
      if (id == guiId1) {
        # XXX: Hack using <<- to change value in outer scope        
        selectionColorIndex <<- max(selectionColorIndex - 1, 1)
        
        rgl.pop(id=guiIdColor) 
        guiIdColor <<- points3d(x=guiX, y=guiY, z=0, size=15, color=selectionColors[selectionColorIndex])
        
        return(TRUE)
      }
      else if (id == guiId2) {
        # XXX: Hack using <<- to change value in outer scope        
        selectionColorIndex <<- min(selectionColorIndex + 1, length(selectionColors))     
        
        rgl.pop(id=guiIdColor) 
        guiIdColor <<- points3d(x=guiX, y=guiY, z=0, size=15, color=selectionColors[selectionColorIndex])
        
        return(TRUE)     
      }
      else if (id == guiId3) {
        if (length(selection) > 0) {
          rgl.pop(id=selection)        
          selection <<- c()
        }
        
        return(TRUE)         
      }
      
      
      # Check axis labels
      if (id %in% axisLabelIds) {
        
        w <- which(axisLabelIds==id, arr.ind=TRUE)
        
        # Generate colors  
        colors <- generateColors(data, w)
        alphas <- generateAlphas(data, w)
        
        # Clear selection 
        if (length(selection) > 0) {
          rgl.pop(id=selection)        
          selection <<- c()
        } 
        
        # Generate data
        selection <<- c(selection, drawLines(interpolatedPoints, color=colors, alpha=alphas, lineWidth=2))
        selection <<- c(selection, drawPoints(points, color=colors, alpha=alphas, pointSize=pointSize+1))
        
        if (length(scatterIds) > 0) {
          selection <<- c(selection, drawPoints(scatterPoints, color=colors, alpha=alphas, pointSize=pointSize+1))
        }
        
        if (length(labelIds) > 0) {
          selection <<- c(selection, drawDataLabels(dataLabels, color=colors, alpha=1))
        }
        
        return(TRUE)
      }
      
      
      # Lines and points     
      w <- max(c(which(lineIds==id, arr.ind=TRUE), 
                 which(pointIds==id, arr.ind=TRUE),
                 which(scatterIds==id, arr.ind=TRUE),
                 which(labelIds==id, arr.ind=TRUE)))
      
      if (length(w) > 0) {           
        selection <<- c(selection, drawLines(interpolatedPoints[w], color=selectionColors[selectionColorIndex], alpha=1, lineWidth=2))
        selection <<- c(selection, drawPoints(points[w], color=selectionColors[selectionColorIndex], alpha=1, pointSize=pointSize+1))
        
        if (length(scatterIds) > 0) {
          selection <<- c(selection, drawPoints(scatterPoints[w], color=selectionColors[selectionColorIndex], alpha=1, pointSize=pointSize+1))
        }
        
        if (length(labelIds) > 0) {
          selection <<- c(selection, drawDataLabels(dataLabels[w], color=selectionColors[selectionColorIndex], alpha=1))
        }
      } 
    
      return (TRUE)
    }
    , button='left')
}