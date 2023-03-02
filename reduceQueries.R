# Assumes first column is owner name and remaining columns are column names

reduceQueries <- function(q, columnThreshold=50, numOwners=5) {
  owners <- q[,1]
  
  q[,1] <- as.numeric(q[,1])

  
  # Threshold by owner name count
  i <- order(-table(q[,1]))
  i <- i[1:numOwners]  
  i <- q[,1] %in% i
  
  q <- q[i,]
  
  q <- q[,sapply(q, sd) > 0.0]
  
  
  # Threshold by column name count
  # XXX: This could break for owners with a low numeric value
  q <- q[,colSums(q) >= columnThreshold]
  

  q[,1] <- factor(q[,1])
#q[,1] <- owners[i]
  
  return (q)
}