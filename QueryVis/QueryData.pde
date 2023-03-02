// Class to hold query element data
class QueryElement implements Comparable<QueryElement> {
  String name;
  String shortName;
  
  int count; 
  
  int connections;
  int connectionCount;
  
  // XXX: Hack for column name vs. owner
  int type;
  
  QueryElement(String _name, int _count) {
    this(_name, _count, 0);
  }
  
  QueryElement(String _name, int _count, int _type) {
    name = _name;
    count = _count; 
    
    connections = 0;
    connectionCount = 0;
    
    type = _type;
    
    ComputeShortName();
  }
  
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    } 
    
    if (other == null || getClass() != other.getClass()) {
      return false;
    }
    
    final QueryElement otherQueryElement = (QueryElement)other;
    
    return name.equals(otherQueryElement.name);
  }
  
  public int hashCode() {
    return name.hashCode(); 
  }
  
  public int compareTo(QueryElement other) {
    return count - other.count;
  }
  
  public String toString() {
    return (name + ": " + count);
  }
  
  private void ComputeShortName() {
    shortName = new String();    
    
    String[] strings = split(name, ' ');
    int len = min(strings[0].length(), 3);
    shortName += strings[0].substring(0, len);
    for (int i = 1; i < strings.length; i++) {
      shortName += '_';
      shortName += strings[i].charAt(0); 
    }
  }
}


class QueryData {
  List<List<Query>> queries;
  
  List<QueryElement> columnNameData;
  int[][] columnNameMatrix;
  
  List<QueryElement> ownerData;
  int[][] columnNameOwnerMatrix;
  
  List<QueryElement> combinedData;
  int[][] combinedMatrix;
  
  QueryData() {
    queries = new ArrayList<List<Query>>(); 
    
    columnNameData = new ArrayList<QueryElement>();
    ownerData = new ArrayList<QueryElement>();
    
    combinedData = new ArrayList<QueryElement>();
  }

  // Read the query data from a CSV file
  void ReadData(String fileName) {
    // Load the file into an array of strings
    String fileLines[] = loadStrings(fileName);
    
    // Find how many columns per query
    String columnNames[] = split(fileLines[0], ',');
    int numColumns = 0;
    for (int i = 1; i < columnNames.length; i++) {
      if (columnNames[i].equals(columnNames[0])) {
        numColumns = i;
        break;
      }
    }
   
   
    // Create a hashmap so we can index by column
    Map<String, Integer> columnMap = new HashMap();
    for (int i = 0; i < numColumns; i++) {
      columnMap.put(columnNames[i], new Integer(i));
    }
   
   
    // Loop over the lines in the file, skipping the first
    for (int i = 1; i < fileLines.length; i++) {
      // Split the current line by commas
      String row[] = split(fileLines[i], ',');
     
      ArrayList<Query> q = new ArrayList<Query>();   
      for (int j = 0; j < row.length; j += numColumns) {
        if (row[j].length() == 0) {
          break;
        }
        
        int idIndex =             j + columnMap.get("QF_ID");
        int ownerIndex =          j + columnMap.get("QF_OWNER");
        int dateIndex =           j + columnMap.get("QF_UPDATE_DTS");
        int columnNameIndex =     j + columnMap.get("DISPLAY_COL_NAME");
        int operatorIndex =       j + columnMap.get("QF_RELOP");
        int patientCountIndex =   j + columnMap.get("QFL_ROW_COUNT");
        int encounterCountIndex = j + columnMap.get("QFL_ENCOUNTER_ROW_COUNT");
  
        q.add(new Query(int(row[idIndex]), 
                            row[ownerIndex], 
                            row[dateIndex], 
                            row[columnNameIndex], 
                            row[operatorIndex],
                        int(row[patientCountIndex]), 
                        int(row[encounterCountIndex])));
      }
      
      if (q.size() > 0) {
        queries.add(q);
      }
    } 


    columnMap = ProcessColumnNames();
    ProcessOwners(columnMap);
    
    
    // Combine
    
    while (ownerData.size() > 2) {
      ownerData.remove(ownerData.size() - 1);
    }
  
    println(ownerData);
    
    
    combinedData.addAll(columnNameData);
    combinedData.addAll(ownerData);
    
//    float ratio = (float)columnNameData.get(0).count / ownerData.get(0).count;
float ratio = 1;
    
    combinedMatrix = new int[combinedData.size()][combinedData.size()];
    for (int i = 0; i < columnNameData.size(); i++) {
      for (int j = 0; j < columnNameData.size(); j++) {
        combinedMatrix[i][j] = columnNameMatrix[i][j]; 
      }
    }    
    for (int i = 0; i < columnNameData.size(); i++) {
      for (int j = 0; j < ownerData.size(); j++) {
        combinedMatrix[i][j + columnNameData.size()] = (int)(columnNameOwnerMatrix[i][j] * ratio);
        combinedMatrix[j + columnNameData.size()][i] = (int)(columnNameOwnerMatrix[i][j] * ratio);
      }
    }    
    for (int i = 0; i < ownerData.size(); i++) {
      for (int j = 0; j < ownerData.size(); j++) {
        combinedMatrix[i + columnNameData.size()][j + columnNameData.size()] = 0;
      }
    }
  }
  
   Map<String, Integer> ProcessColumnNames() {     
    // Create a map for column names, with value equal to number of occurrences
    Map<String, Integer> columnMap = CreateColumnMap();
   
    // Get all the unique names
    String columnNames[] = columnMap.keySet().toArray(new String[0]);
    
    
    // Create a list of ColumNameData holding column name information
    for (int i = 0; i < columnNames.length; i++) {
      columnNameData.add(new QueryElement(columnNames[i], columnMap.get(columnNames[i])));
    }
    
    
    // Sort the column names in reverse order
    Collections.sort(columnNameData, Collections.reverseOrder());   
    
    
    // Create a hash map with value equal to sorted order
    columnMap = new HashMap();
    for (int i = 0; i < columnNameData.size(); i++) {
      columnMap.put(columnNameData.get(i).name, new Integer(i));
    }
   
    // Create a matrix of column name co-occurrences
    columnNameMatrix = CreateMatrix(columnNames, columnMap);
    
    // Set the number of co-occurences for each column name
    for (int i = 0; i < columnNameData.size(); i++) {
      int num = 0;
      for (int j = 0; j < columnNameData.size(); j++) {
        if (j == i) continue;
        
        if (columnNameMatrix[i][j] > 0) {
          columnNameData.get(i).connections++;
          columnNameData.get(i).connectionCount += columnNameMatrix[i][j];
        }
      } 
    }
  
    // Save the matrix
    SaveMatrix(columnNames);
    
    // Save as an R-compatible data frame
    SaveDataFrame(columnNames); 
    
    return columnMap;
  }
  
  void ProcessOwners(Map<String, Integer> columnMap) {
    // Create a map for owners, with value equal to number of occurrences
    Map<String, Integer> ownerMap = CreateOwnerMap();
   
    // Get all the unique owners
    String owners[] = ownerMap.keySet().toArray(new String[0]);
    
    
    // Create a list of owner data holding owner information
    for (int i = 0; i < owners.length; i++) {
      ownerData.add(new QueryElement(owners[i], ownerMap.get(owners[i]), 1));
    }
    
    
    // Sort the owners in reverse order
    Collections.sort(ownerData, Collections.reverseOrder());   
    
    
    // Create a hash map with value equal to sorted order
    ownerMap = new HashMap();
    for (int i = 0; i < ownerData.size(); i++) {
      ownerMap.put(ownerData.get(i).name, new Integer(i));
    }
    
//    println(ownerMap);
   
    // Create a matrix of column name / owner co-occurrences
    columnNameOwnerMatrix = new int[columnNameData.size()][ownerData.size()];
    
    for (int i = 0; i < queries.size(); i++) {
      for (int j = 0; j < queries.get(i).size(); j++) {    
        int jIndex = columnMap.get(queries.get(i).get(j).columnName);
        for (int k = 0; k < queries.get(i).size(); k++) {
          if (j == k) {
            continue;
          }
          
          int kIndex = ownerMap.get(queries.get(i).get(k).owner);
          columnNameOwnerMatrix[jIndex][kIndex]++;
        }
      }
    }
    
    // Set the number of co-occurences for each owner name/owner
    for (int i = 0; i < columnNameData.size(); i++) {
      int num = 0;
      for (int j = 0; j < ownerData.size(); j++) {
        if (j == i) continue;
        
        if (columnNameOwnerMatrix[i][j] > 0) {
          ownerData.get(i).connections++;
          ownerData.get(i).connectionCount += columnNameOwnerMatrix[i][j];
        }
      } 
    }

    // De-identify owners
    for (int i = 0; i < ownerData.size(); i++) {
//      ownerData.get(i).name = i + 1 + "";
      ownerData.get(i).shortName = i + 1 + "";
    }    
  }
  
  Map<String, Integer> CreateColumnMap() { 
    Map<String, Integer> map = new HashMap();
    
    for (int i = 0; i < queries.size(); i++) {
      for (int j = 0; j < queries.get(i).size(); j++) {
        String columnName = queries.get(i).get(j).columnName;
        
        if (map.containsKey(columnName)) {
          map.put(columnName, map.get(columnName) + 1);
        }
        else {
          map.put(columnName, 1);
        }
      }
    }
    
    return map;
  }
  
  Map<String, Integer> CreateOwnerMap() {
    // XXX: This is redundant with CreateColumnMap.  How to combine??? 
    Map<String, Integer> map = new HashMap();
    
    for (int i = 0; i < queries.size(); i++) {
      for (int j = 0; j < queries.get(i).size(); j++) {
        String owner = queries.get(i).get(j).owner;
        
        if (map.containsKey(owner)) {
          map.put(owner, map.get(owner) + 1);
        }
        else {
          map.put(owner, 1);
        }
      }
    }
    
    return map;
  }
  
  int[][] CreateMatrix(String[] columnNames, Map<String, Integer> columnMap) {
    int[][] m = new int[columnNames.length][columnNames.length];
    
    for (int i = 0; i < queries.size(); i++) {
      for (int j = 0; j < queries.get(i).size(); j++) {    
        int jIndex = columnMap.get(queries.get(i).get(j).columnName);
        for (int k = 0; k < queries.get(i).size(); k++) {
          if (j == k) {
            continue;
          }
          
          int kIndex = columnMap.get(queries.get(i).get(k).columnName);
          m[jIndex][kIndex]++;
        }
      }
    }
    
    return m;
  }
  
  void SaveMatrix(String[] columnNames) {
    String[] matrixStrings = new String[columnNames.length + 1];
    
    matrixStrings[0] = columnNames[0];
    for (int i = 1; i < columnNames.length; i++) {
      matrixStrings[0] += "," + columnNames[i];
    }
     
    for (int i = 0; i < columnNames.length; i++) {
      matrixStrings[i+1] = columnNames[i];
      for (int j = 0; j < columnNames.length; j++) {
        matrixStrings[i+1] += "," + str(columnNameMatrix[i][j]);
      }
    }
    
    saveStrings("data/columnNamesMatrix.dat", matrixStrings);
  }
    
  void SaveDataFrame(String[] columnNames) {
    String[] strings = new String[queries.size() + 1];
   
    strings[0] = "QF_OWNER";
    for (int i = 0; i < columnNames.length; i++) {
      strings[0] += "," + columnNames[i];
    } 
    
    // Create map to maintain count of column names per query
    Map<String, Integer> map = new HashMap();
    
    for (int i = 0; i < queries.size(); i++) {      
      List<Query> q = queries.get(i);
      
      // Write id
      strings[i + 1] = "" + i;
      
      // Write owner
      // XXX: Assuming same owner for all...
      strings[i + 1] += "," + q.get(0).owner;
      
      // Reset column name map
      for (int j = 0; j < columnNames.length; j++) {
        map.put(columnNames[j], 0); 
      }
       
      // Get column name counts for this query
      for (int j = 0; j < queries.get(i).size(); j++) {
        String columnName = queries.get(i).get(j).columnName;
        
        map.put(columnName, map.get(columnName) + 1);
      }
       
      // Write column name counts
      for (int j = 0; j < columnNames.length; j++) {
        strings[i + 1] += "," + map.get(columnNames[j]);
      } 
    }
    
    saveStrings("data/queryDataFrame.csv", strings);
  }
    
  public String toString() {       
    String s = new String();
    for (int i = 0; i < queries.size(); i++) {
      s = s + i;
      for (int j = 0; j < queries.get(i).size(); j++) {
        s = s + " || " + queries.get(i).get(j); 
      }
      s = s + "\n";
    }   
    
    return s;
  }

  // Class to hold information for each individual query
  class Query {
    int id;
    String owner;
    String date;
    String columnName;
    String operator;
    // Not sure what filterValue should be
    int patientCount;
    int encounterCount;
    
    // Constructor
    Query(int _id, String _owner, String _date, String _columnName, String _operator, int _patientCount, int _encounterCount) {
      id = _id;
      owner = _owner;
      date = _date;
      columnName = _columnName;
      operator = _operator;
      patientCount = _patientCount;
      encounterCount = _encounterCount; 
    }
    
    public String toString() {
      return (id + " " + owner + " " + date + " " + columnName + " " + operator + " " + patientCount + " " + encounterCount);
    }
  }
}
