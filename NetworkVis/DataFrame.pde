// XXX: Should probably be immutable


class DataFrame {
  // XXX: Eventually should be ArrayList?
  List<DataElement> entities;
  List<DataElement> variables;
  
  float[][] matrix;
  
  DataFrame(String fileName) { 
    LoadFile(fileName);
  }
  
  float Get(DataElement de1, DataElement de2) {
    int ei = entities.indexOf(de1); 
    int vi;
    if (ei == -1) {
      ei = entities.indexOf(de2);
      vi = variables.indexOf(de1);
    }
    else {
      vi = variables.indexOf(de2); 
    }
    
    if (ei == -1 || vi == -1) {
//      println("DataFrame:Get() : Error.");
      return 0.0; 
    }
      
//      println("here");
      
    return matrix[ei][vi];
  }
  
  private void LoadFile(String fileName) {
    // Load the file into an array of strings
    String fileLines[] = loadStrings(fileName);
    
    // Create variables
    String[] v = split(fileLines[0], ',');
    variables = new ArrayList<DataElement>();
    for (int i = 1; i < v.length; i++) {
      variables.add(new DataElement(v[i].replace("\"", ""))); 
    }
   
    // Get number of entities
    int numEntities = 0;
    for (int i = 1; i < fileLines.length; i++) {
      String[] s = split(fileLines[1], ',');
      
      if (s.length != variables.size() + 1) {
        println("Warning: line " + i + " has wrong number of entries.  Skipping.");
        continue;
      } 
      
      numEntities++;
    }
    
    // Create entities
    entities = new ArrayList<DataElement>();
    
    // Create matrix
    matrix = new float[numEntities][variables.size()];
    
    // Set entities and matrix
    int entityIndex = 0;
    for (int i = 1; i < fileLines.length; i++) {   
      String[] s = split(fileLines[i], ',');
      
      if (s.length != variables.size() + 1) {
        continue; 
      }
      
      entities.add(new DataElement(s[0].replace("\"", "")));
      
      for (int j = 1; j < s.length; j++) {
        matrix[entityIndex][j - 1] = Float.parseFloat(s[j]);
      }
      
      entityIndex++;
    }
  }
}
