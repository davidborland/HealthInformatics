/*=========================================================================

  Name:        DataElement.pde
  
  Author:      David Borland, The Renaissance Computing Institute (RENCI)

  Copyright:   The Renaissance Computing Institute (RENCI)

  Description: The DataElement class is used for both entities and 
               variables.

=========================================================================*/


class DataElement implements Comparable<DataElement> {
  // It is assumed that DataElement names are unique
  private final String name;
  
  // Used for display to reduce clutter
  private final String shortName;
 
  // Constructor
  DataElement(String _name) {
    name = _name; 
    
    shortName = ComputeShortName();
  }
  
  public String GetName() {
    return name; 
  }
  
  public String GetShortName() {
    return shortName; 
  }
  
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    } 
    
    if (other == null || getClass() != other.getClass()) {
      return false;
    }
    
    final DataElement otherDataElement = (DataElement)other;
    
    return name.equals(otherDataElement.name);  
  }
  
  public int hashCode() {
    return name.hashCode(); 
  }
  
  public int compareTo(DataElement other) {
    return name.compareTo(other.name); 
  }
  
  public String toString() {
    return name; 
  }
  
  private String ComputeShortName() {
    String newName = new String();    
    
    String[] strings = split(name, ' ');
    int len = min(strings[0].length(), 3);
    newName += strings[0].substring(0, len);
    for (int i = 1; i < strings.length; i++) {
      newName += '_';
      newName += strings[i].charAt(0); 
    }
    
    return newName;
  }
}
