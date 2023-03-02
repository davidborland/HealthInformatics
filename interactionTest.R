interactionTest <- function() {
  open3d()  
  view3d(0,0)
  
  points <- points3d(x=rnorm(20), y=rnorm(20), z=0, color=rgb(0.0, 0.0, 0.0), size=10, alpha=0.5)
    
  newPoints <- c()
  
  selectpoints3d(objects=points, value=FALSE, closest=FALSE, multiple=selectFunction <- function(p) {
      id <- p[nrow(p),1]       
      w <- which(points==p, arr.ind=TRUE)
    
      if (length(newPoints) > 0) {
        rgl.pop(id=newPoints)
      }
      
      newPoints <<- points3d(points[w], color='red')    
                   
      return (TRUE)
    }
    , button='left')
}