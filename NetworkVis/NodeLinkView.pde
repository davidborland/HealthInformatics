class NodeLinkView {
  DataFrame dataFrame;
  
  Set<Node> nodes;
  Set<Link> links;
  
  boolean useFixedPositions = true;
  
  NodeLinkView() { 
  }
  
  public void SetDataFrame(DataFrame _dataFrame) {
    dataFrame = _dataFrame;
    
    
    // Temporary node lists
    List<Node> eNodes = new ArrayList<Node>();
    List<Node> vNodes = new ArrayList<Node>();
      
    for (DataElement e : dataFrame.entities) {
      float s = 0.01;
      eNodes.add(new Node(e, new PVector(random(-s, s), random(-s, s))));
    }    
    
    for (DataElement v : dataFrame.variables) {
      float s = 0.1;
      vNodes.add(new Node(v, new PVector(random(-s, s), random(-s, s))));
    } 
    
    
    // Create links
    links = new HashSet<Link>();
    
    float[][] m = dataFrame.matrix;
    
    for (int i = 0; i < eNodes.size(); i++) {;
      for (int j = 0; j < vNodes.size(); j++) {
        links.add(new Link(eNodes.get(i), vNodes.get(j), m[i][j]));
      }
    }
    
        
    // Create node set
    nodes = new HashSet<Node>();
    nodes.addAll(eNodes);
    nodes.addAll(vNodes);
  }
  
    
  void LoadPositions(String fileName) {
    // Load the file into an array of strings
    String fileLines[] = loadStrings(fileName);
    
    // Find max and min values
    float xMin = 0.0;
    float xMax = 0.0;
    float yMin = 0.0;
    float yMax = 0.0;
    for (int i = 1; i < fileLines.length; i++) {
      String[] s = split(fileLines[i], ',');
      
      if (s.length < 2) {
        continue;
      }
      
      float x = Float.parseFloat(s[1]);
      float y = Float.parseFloat(s[2]);
      
      xMin = min(x, xMin);
      xMax = max(x, xMax);
      yMin = min(y, yMin);
      yMax = max(y, yMax);
    }
    
    float maxDiff = max(xMax - xMin, yMax - yMin);
    
    // Loop over all lines, skipping the first    
    for (int i = 1; i < fileLines.length; i++) {
      String[] s = split(fileLines[i], ',');
      
      if (s.length < 2) {
        continue;
      }
      
      String de = s[0].replace("\"", "");
      float x = Float.parseFloat(s[1]);
      float y = Float.parseFloat(s[2]);
      
      // Center
      x -= (xMin + xMax) * 0.5;
      y -= (yMin + yMax) * 0.5;
      
      // Scale
      x *= 2.0 / maxDiff * 0.8;
      y *= 2.0 / maxDiff * 0.8;
     
      
      // XXX: Want to index by element...keep nodes in a map???
      for (Node n : nodes) {
        if (n.de.name.equals(de)) {
          n.SetFixedPosition(new PVector(x, y));
          break;
        } 
      }
    }
  }
  
  
  public void Update() {
    // Fixed positions
    if (useFixedPositions) {
      for (Node n1 : nodes) {
        if (n1.fixed) {
          n1.MoveToFixed(); 
        }
      }  
    }
    
    
//    float repulsiveForce = 0.00001;
float repulsiveForce = 0;
    
    // Repulsive forces between all nodes
    for (Node n1 : nodes) {
      if (useFixedPositions && n1.fixed) continue;
      
      PVector f = new PVector(0.0, 0.0);
      for (Node n2 : nodes) {
        if (n1 == n2) continue;
        
        PVector v = PVector.sub(n2.pos, n1.pos);
        float d = v.magSq();
        
        if (d <= 0.0) continue;
        
        v.normalize();
        
        f.sub(PVector.mult(v, repulsiveForce / d)); 
      }
      
      n1.pos.add(f);
    }
    
    // Attractive forces for links
    for (Link l : links) {
      l.UpdateSpring(); 
    }
    
    // Constrain to circle
    for (Node n : nodes) {
      n.pos.limit(1.0); 
      
      n.vel = PVector.sub(n.pos, n.oldPos);
      n.oldPos = n.pos;
    }
  }
  
  public void Draw() {   
    background(1.0, 1.0, 1.0);
    
    float aspect = (float)width / height;
    Ortho(-1.0, 1.0, -1.0 / aspect, 1.0 / aspect, -1.0, 1.0);
        
    for (Node n : nodes) {
      n.Draw(); 
    }
    
    for (Link l : links) {
//      l.Draw();
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
    PVector oldPos;
    PVector vel;
    
    float radius;
    
    boolean fixed;
    PVector fixedPos;
    
    Node(DataElement _de, PVector _pos) {
      de = _de;  
      
      pos = _pos;
      oldPos = _pos.get();
      
      vel = new PVector(0.0, 0.0);
      
      radius = 0.01;
      
      fixed = false;
      fixedPos = new PVector(0.0, 0.0);
    }
    
    void SetFixedPosition(PVector p) {
      pos = p.get();
      fixedPos = p.get();
      fixed = true;
    }
    
    void MoveToFixed() {
      float s = 0.1;
      
      PVector v = PVector.sub(fixedPos, pos);
     
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
// XXX: Experimenting with Query data
/*
      if (dataFrame.entities.indexOf(de) >= 0) {
        //pg.fill(1.0, 0.25, 0.25, 0.1);       
//        pg.fill(dataFrame.Get(de, new DataElement("QF_OWNER")), 0.25, 0.25, 0.1);
        
        if (dataFrame.Get(de, new DataElement("QF_OWNER")) > 0.5) {
          pg.fill(1.0, 0.25, 0.25, 0.1);
        }
        else {
          pg.fill(0.25, 1.0, 0.25, 0.1);
        }
      }
      else {
        pg.fill(0.25, 0.25, 1.0, 0.1);  
      }
      
      pg.noStroke();
      pg.ellipse(pos.x, pos.y, 0.1, 0.1);
*/

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
        pg.scale(2.0 / width, -2.0 / width, 1.0);
        pg.text(de.name, pos.x * width / 2.0, pos.y * width / -2.0, 0.1);
        pg.popMatrix();
//      }

    }
  }
  
  
  class Link {
    final Node n1;
    final Node n2;
    
    final float value;
    
    Link(Node _n1, Node _n2, float _value) {
      n1 = _n1;
      n2 = _n2;
      
      value = _value; 
    }
    
    void UpdateSpring() {      
      if (value < 0.25) return;
      
      float ks = 0.01;
      float kd = 0.001; 
      float r = 1.0 - value;
      
      PVector v = PVector.sub(n1.pos, n2.pos);
      float d = v.mag();
      
      if (d <= 0.0) return;
      
      v.normalize();
      
      PVector f = PVector.sub(PVector.mult(v, -ks * (d - r)), PVector.mult(PVector.sub(n1.vel, n2.vel), kd));
     
      if (!useFixedPositions || !n1.fixed) {
        n1.pos.add(f);
      }
      
      if (!useFixedPositions || !n2.fixed) {
        n2.pos.sub(f);
      }
    }
    
    void Draw() {
      float w = pow(value, 2);
      stroke(0.5, 0.5, 0.5, w * 0.5);
      strokeWeight(1 + w * 4);
//      strokeWeight(1);
      line(n1.pos.x, n1.pos.y, -1.0, n2.pos.x, n2.pos.y, -1.0);
    }
    
    public boolean equals(Object other) {
      if (this == other) {
        return true;
      } 
      
      if (other == null || getClass() != other.getClass()) {
        return false;
      }
      
      final Link otherLink = (Link)other;
      
      return (n1.equals(otherLink.n1) &&
              n2.equals(otherLink.n2));    
    }
    
    public int hashCode() {
      return n1.hashCode() ^ n2.hashCode(); 
    }
    
    public String toString() {
      return n1.toString() + ", " + n2.toString() + ": " + value;
    }
  }
}
