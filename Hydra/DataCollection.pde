/*=========================================================================

  Name:        DataCollection.pde
  
  Author:      David Borland, The Renaissance Computing Institute (RENCI)

  Copyright:   The Renaissance Computing Institute (RENCI)

  Description: A collection of data elements.

=========================================================================*/


import java.util.*;


class DataCollection {
  // It is assumed that DataCollection names are unique
  private final String name;
  
  // List of data elements
  private List<DataElement> elements;

  DataCollection(String _name, List<DataElement> _elements) {
    name = _name;
    elements = _elements;
  }
}
