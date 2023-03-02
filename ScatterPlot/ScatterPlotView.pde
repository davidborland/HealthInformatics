class ScatterPlotView {
  DataFrame dataFrame;
  
  List<Node> nodes;
  
  List<Float> xWeights;
  List<Float> yWeights;
  
  float xMin;
  float xMax;
  float yMin;
  float yMax;
  
  ScatterPlotView() { 
    xMin = -1.1;
    xMax = 1.1;
    yMin = -1.1;
    yMax = 1.1;
  }
  
  public void SetXWeight(int variable, float weight) {
    for (int i = 0; i < xWeights.size(); i++) {
      xWeights.set(i, 0.0); 
    }
    
    xWeights.set(variable, weight); 
  }
  
  public void SetYWeight(int variable, float weight) {
    for (int i = 0; i < yWeights.size(); i++) {
      yWeights.set(i, 0.0); 
    }
    
    yWeights.set(variable, weight); 
  }
  
  public void SetDataFrame(DataFrame _dataFrame) {
    dataFrame = _dataFrame;
    
    nodes = new ArrayList<Node>();
    
    for (DataElement e : dataFrame.entities) {
      nodes.add(new Node(e));
    }
    
    xWeights = new ArrayList<Float>();
    yWeights = new ArrayList<Float>();
    
    for (int i = 0; i < dataFrame.variables.size(); i++) {
      xWeights.add(0.0);
      yWeights.add(0.0); 
    }
    
    xWeights.set(1, 1.0);
    yWeights.set(0, 1.0);
  }
  
  public void Update() {
    float minX = 1.0;
    float maxX = -1.0;
    float minY = 1.0;
    float maxY = -1.0;
    for (int i = 0; i < dataFrame.entities.size(); i++) {
      PVector p = new PVector(0.0, 0.0);
      for (int j = 0; j < dataFrame.variables.size(); j++) {
        float x = dataFrame.matrix[i][j] * xWeights.get(j);
        float y = dataFrame.matrix[i][j] * yWeights.get(j);
        p = PVector.add(p, new PVector(x, y));
        
        minX = min(minX, x);
        maxX = max(maxX, x);
        minY = min(minY, y);
        maxY = max(maxY, y);
      }
      nodes.get(i).SetDestination(p);
    }
    
    for (Node n : nodes) {
      n.SetDestination(new PVector(map(n.destination.x, minX, maxX, -1.0, 1.0), 
                                   map(n.destination.y, minY, maxY, -1.0, 1.0)));
    } 
    
    for (Node n1 : nodes) {
      n1.Update();
    }
  }
  
  public void Draw() {   
    background(1.0, 1.0, 1.0);
    
    float aspect = (float)width / height;
    Ortho(xMin, xMax, yMin / aspect, yMax / aspect, -1.0, 1.0);
        
    for (Node n : nodes) {
      n.Draw(); 
    }
  }
  
  void Ortho(float xMin, float xMax, float yMin, float yMax, float zMin, float zMax) {    
    resetMatrix();
    
//    ortho(-1, 1, -1, 1);

    float tx = -(xMax + xMin) / (xMax - xMin);
    float ty = -(yMax + yMin) / (yMax - yMin);
    float tz = -(zMax + zMin) / (zMax - zMin);

    float a =  2.0 / (xMax - xMin);
    float b =  2.0 / (yMax - yMin);
    float c = -2.0 / (zMax - zMin);

    PMatrix3D mat = new PMatrix3D();
    mat.set(a, 0.0, 0.0, tx,
            0.0, b, 0.0, ty,
            0.0, 0.0, c, tz,
            0.0, 0.0, 0.0, 1.0);
            
    PGraphicsOpenGL gl = (PGraphicsOpenGL)g;
    gl.setProjection(mat);
  }
  
  class Node {
    final DataElement de;
    
    PVector pos;
    PVector destination;
    
    float radius;
    
    Node(DataElement _de) {
      this(_de, new PVector(0.0, 0.0)); 
    }
    
    Node(DataElement _de, PVector _pos) {
      de = _de;  
      
      pos = _pos;
      destination = _pos.get();
      
      radius = 0.01;
    }
    
    void SetDestination(PVector p) {
      destination = p.get();
    }
    
    void Update() {
      float s = 0.01;
      
      PVector v = PVector.sub(destination, pos);
     
      pos = PVector.add(pos, PVector.mult(v, s));
    }
    
    public boolean equals(Object other) {
      if (this == other) {
        return true;
      } 
      
      if (other == null || getClass() != other.getClass()) {
        return false;
      }
      
      final Node otherNode = (Node)other;
      
      return de.equals(otherNode.de);    
    }
    
    public int hashCode() {
      return de.hashCode(); 
    }
    
    public String toString() {
      return de.toString(); 
    }
    
    public void Draw() {
      Draw(g);
    }
    
    public void Draw(PGraphics pg) {
      if (dataFrame.entities.indexOf(de) >=0) {
        pg.fill(1.0, 0.25, 0.25, 1.0);
      }
      else {
        pg.fill(0.25, 0.25, 1.0, 1.0);  
      }
      pg.stroke(0.5, 0.5, 0.5, 1.0);
      pg.strokeWeight(2);
      
      pg.ellipse(pos.x, pos.y, radius * 2.0, radius * 2.0);
      
//      if (dataFrame.variables.indexOf(de) >= 0) {
        pg.fill(0.0, 0.0, 0.0, 1.0);
        pg.pushMatrix();
        float w = xMax - xMin;
        float h = yMax - yMin;
        pg.scale(w / width, -h / width, 1.0);
        pg.text(de.name, pos.x * width / w, pos.y * width / -h, 0.1);
        pg.popMatrix();
//      }
    }
  }
}
