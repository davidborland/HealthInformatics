/*=========================================================================

  Name:        DataFrame.pde
  
  Author:      David Borland, The Renaissance Computing Institute (RENCI)

  Copyright:   The Renaissance Computing Institute (RENCI)

  Description: The DataFrame class contains two DataCollection objects, 
               and the relationships between them.

=========================================================================*/


// XXX: Thoughts:  Use DataValues array.  DataValues can contain number of unique values, factor vs. numeric data, etc., along with data values.  
//                                        Can have floating point array and string array.


class DataFrame {
  private final DataCollection rows;
  private final DataCollection cols;
  
  
 
  private final List<DataValues> values;
 
  // Constructor
  DataFrame(DataCollection _rows, DataCollection _cols, List<DataValues> _data) {
    collection1 = _collection1;
    collection2 = _collection2;
    
    data = _data;
  } 
  
  DataCollection GetRows() {
    return rows; 
  }
  
  DataCollection GetCols() {
    return cols; 
  }
  
  DataValues GetValues(int index) {
    return values.get(index); 
  }
  
  DataValues.GetValues(String) {
    return values.get(values.indexOf(   
  }
}
