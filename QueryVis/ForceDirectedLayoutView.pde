class ForceDirectedLayoutView extends QueryView {  
  int[][] nodeMatrix;
 
  
  float selectScale = 0.1;
  float distanceScale = 4.0;

  int maxCount;
  int maxMatrix;

  float minRadius = 0.02;
  float maxRadius = 0.1;
//  float minRadius = 0.001;
//  float maxRadius = 0.005;

  boolean drawAbsoluteEdges = false;
    
  ForceDirectedLayoutView(int[] _pos, PGraphics _pg) {
    super(_pos, _pg);
    
    // Set up graphics object
    pg.beginDraw();
    
    pg.smooth();
    pg.colorMode(RGB, 1.0);
    pg.textAlign(CENTER, CENTER);
    
    pg.endDraw();
    
    int s = min(pg.width, pg.height);
    view2pixels = s / 2.0;
    pixels2view = 2.0 / s; 
    
    nodes = new ArrayList<Node>();
    
    outside = new HashSet<Node>();
    union = new HashSet<Node>();
    difference = new HashSet<Node>();
    intersection = new HashSet<Node>();
    
    selected = new ArrayList<Integer>();
  }
 
 
  void SetNodeData(List<QueryElement> data ) {
    maxCount = data.get(0).count;
    
    for (int i = 0; i < data.size(); i++) {
      nodes.add(new Node(data.get(i)));
    }
    
    // Set node radii based on maximum node count
    for (int i = 0; i < nodes.size(); i++) {
      Node n = nodes.get(i);
      n.radius = minRadius + (float)n.qe.count / maxCount * (maxRadius - minRadius);
    } 
    
    // Begin with only an outside set
    outside.addAll(nodes);
  }
  
  void SetNodeMatrix(int[][] matrix) {
    nodeMatrix = matrix; 
    
    // Find the maximum matrix value
    maxMatrix = 0;
    for (int i = 0; i < nodes.size(); i++) {
      for (int j = 0; j < nodes.size(); j++) {
        if (nodeMatrix[i][j] > maxMatrix) {
          maxMatrix = nodeMatrix[i][j];
        }
      }
    } 
  }
 
  
  PVector Pixels2View(int x, int y) {
    float aspect = (float)pg.width / pg.height;
    if (pg.width >= pg.height) {
      return new PVector(x * pixels2view - aspect, y * pixels2view - 1.0);
    }
    else {
      return new PVector(x * pixels2view - 1.0, y * pixels2view - 1.0 / aspect);
    }
  }
  
  void KeyPressed(char c) {
    if (key == CODED) {
      if (keyCode == CONTROL) {
        selecting = true; 
      }
    }
    else {
      switch(c) {
        
        case 'q':
          distanceScale += 0.1;
          break;
          
        case 'a':
          distanceScale = max(distanceScale - 0.1, 0.1);
          break;
          
        case 'e':
          drawAbsoluteEdges = !drawAbsoluteEdges;
          break;
      }
    }
  }
  
  void KeyReleased(char c) {
    selecting = false;
  }
  
  void MousePressed(int x, int y) {       
    x -= pos[0];
    y -= pos[1];
    PVector m = Pixels2View(x, y);
    
    if (mouseButton == LEFT) {  
      // Check in reverse order, as it is harder to pick smaller nodes
      for (int i = nodes.size() - 1; i >= 0; i--) {
        if (nodes.get(i).Pick(m)) {             
          mousedOver = -1;
          
          if (selecting) {
            if (selected.contains(i)) {
              selected.remove(selected.indexOf(i));
              selected.add(0, i);
              break;
            }
              
            SelectNode(i);
  
            break;  
          }
          else {
            selected.clear();
            selected.add(i);
  //          oldSelected = i;
            break;
          }
        }
      }
    }

    oldMousePos = m.get();
  }
  
  void MouseDragged(int x, int y) {
    x -= pos[0];
    y -= pos[1];
    PVector m = Pixels2View(x, y);
    
    if (mouseButton == LEFT) {   
      if (selected.size() > 0 ) {        
        nodes.get(selected.get(0)).pos.add(PVector.sub(m, oldMousePos));
       
        oldMousePos = m.get(); 
      }
    }
  }
  
  void MouseReleased(int x, int y){
    x -= pos[0];
    y -= pos[1];
    PVector m = Pixels2View(x, y);
   
    if (mouseButton == LEFT) {   
      if (!selecting) {
        selected.clear();   
        
        ConstructSets();
        
        mousedOver = -1;
      }     
    }
    else if (mouseButton == RIGHT) {
      // Check in reverse order, as it is harder to pick smaller nodes
      for (int i = nodes.size() - 1; i >= 0; i--) {
        if (nodes.get(i).Pick(m)) {
          DeselectNode(i);
          
          return;
        }
      }
      
      selected.clear();   
        
      ConstructSets();
        
      mousedOver = -1;
    }
  }
  
  void MouseMoved(int x, int y){      
    if (mousePressed || !InView(x, y)) return;    

    x -= pos[0];
    y -= pos[1];
    
    PVector m = Pixels2View(x, y);
    
    if (mousedOver > -1) {
      if (!nodes.get(mousedOver).Pick(m)) {
        DeselectNode(mousedOver);
        mousedOver = -1;
      } 
    }
    else {
      // Check in reverse order, as it is harder to pick smaller nodes
      for (int i = nodes.size() - 1; i >= 0; i--) {
        if (nodes.get(i).Pick(m)) {
          if (!selected.contains(i)) {
            mousedOver = i;
            SelectNode(i);
//            selected.remove(new Integer(i));
          }
          
          break; 
        }
      }
    }
  }
  
  
  void Update() {           
    for (int i = 0; i < nodes.size(); i++) {
//  for (int i = 0; i < 5; i++) {
//      if (i == oldSelected) continue;
      if (selected.contains(i)) {
        continue; 
      }
      
      Node ni = nodes.get(i);
      
      PVector f = new PVector(0.0, 0.0);
      
      for (int j = 0; j < nodes.size(); j++) {
//    for (int j = 0; j < 5; j++) {
        if (i == j) {
          continue;
        }
        
        Node nj = nodes.get(j);
              
        PVector p1 = ni.pos.get();      
        float r1 = ni.radius;
        
        PVector p2 = nj.pos.get();        
        float r2 = nj.radius;
        
//r1 *= 0.5;
//r2 *= 0.5;

        if (p1.equals(p2)) {
          float r = minRadius;
          p2.add(new PVector(random(-r, r), random(r, r)));
          
          println("here");
          
          continue;
        } 
        
        PVector v = PVector.sub(p1, p2);      
        float d = v.mag();
        v.normalize();        
        
       
//        d *= distanceScale;
        
        
        
        // XXX: TESTING COLOUMB AND SPRING FORCES
        float repulsiveForce = 0.0001;
        f.add(PVector.mult(v, repulsiveForce / (d * d)));
        
                //d -= r1 + r2; 
                
        float ks = 0.1;
        float kd = 10; 
        float r = 1.0 - (float)(nodeMatrix[i][j] + 1) / (maxMatrix + 1);
        r += r1 + r2;
      
       boolean isSelected = false;
        for (int k = 0; k < selected.size(); k++) {
          if (j == selected.get(k) && nodeMatrix[i][j] > 0 && j != mousedOver) { 
            isSelected = true;
            break;
          }
        } 
        
        if (isSelected) {
//          r = pow(r, 8);
        }
      
        f.add(PVector.sub(PVector.mult(v, -ks * (d - r)), PVector.mult(PVector.sub(ni.vel, nj.vel), kd)));
        
        
        // Attract to zero...
        f.add(PVector.sub(PVector.mult(v, -ni.radius / maxRadius * ks * 0.1 * p1.mag()), PVector.mult(ni.vel, kd)));
/*        

               
        // Always compute a repulsive force
        float forceScale = 0.001;
        
        boolean isSelected = false;
        for (int k = 0; k < selected.size(); k++) {
          if (j == selected.get(k) && nodeMatrix[i][j] == 0 && j != mousedOver) { 
            isSelected = true;
            break;
          }
        }   
        
        if (isSelected) {  
          f.sub(PVector.mult(v, selectScale * 0.1 / pow(d, 2)));
        }
        else {
          f.sub(PVector.mult(v, 1.0 / pow(d, 2) * forceScale));
        }
        
        
        // Compute an attractive force based on co-occurence
        float attraction = (float)(nodeMatrix[i][j] + 1) / (maxMatrix + 1);
        
        isSelected = false;
        for (int k = 0; k < selected.size(); k++) {
          if (j == selected.get(k) && nodeMatrix[i][j] > 0 && j != mousedOver) { 
            isSelected = true;
            break;
          }
        } 
        
        if (isSelected) {
          f.add(PVector.mult(v, attraction * selectScale * pow(d, 2)));
        }
        else { 
          f.add(PVector.mult(v, attraction * pow(d, 2) * forceScale));
        }
*/        
      }      
      
      // Attract to center
/*      
      float s = 0.01;
      PVector v = nodes.get(i).pos.get();
      float d = v.mag();
      v.normalize();
      v.mult(-s);
//      f.add(PVector.mult(v, pow(d, 1.0 / pow(d, 9))));
      f.add(PVector.mult(v, s));
*/      
     
      
            
      f.limit(0.015);
      if (f.mag() < 0.001) {
//        f.set(0.0, 0.0); 
      }
          
      ni.pos.add(f);
      
      // XXX: This should be in a set method for node, or add proximity to edge to force calculation
//      float halfWidth = textWidth(ni.qe.name) * 0.5 * pixels2view;
//      nodes.get(i).pos.x = min(max(-0.99 + halfWidth, nodes.get(i).pos.x), 0.99 - halfWidth);
//      nodes.get(i).pos.y = min(max(-0.95, nodes.get(i).pos.y), 0.95);

//      ni.pos.limit(0.95);
      
      ni.vel = PVector.sub(ni.pos, ni.oldPos);
      ni.oldPos = ni.pos;
    }
    
    // XXX: Hack to highlight nodes that have moved under the mouse
    MouseMoved(mouseX, mouseY);
  }
  
  void Draw() {
    pg.beginDraw();
    
    pg.background(0.95, 0.95, 0.9);
    
    pg.translate(pg.width / 2.0, pg.height / 2.0);
    pg.scale(view2pixels, view2pixels);

//    ortho(-1, 1, -1, 1);
      
      
    // Draw selection background    
    for (Node n : difference) {
      n.DrawBackground(1); 
    }
    for (Node n : intersection) {
      n.DrawBackground(2); 
    }


    // Draw lines  
    pg.blendMode(BLEND);
    for (int i = 0; i < nodes.size(); i++) {
      for (int j = i + 1; j < nodes.size(); j++) {
        int val = nodeMatrix[i][j];
        if (val > 0) {
          if (drawAbsoluteEdges) {
            DrawEdgeAbsolute(i, j);
          }
          else {
            DrawEdgeRelative(i, j);
          }
        }
      }
    }
    pg.blendMode(BLEND);
    
    
    // Draw nodes
    for (Node n : outside) {
      n.Draw(0); 
    }
    for (Node n : difference) {
      // XXX: Ugly
      int j = nodes.indexOf(n);
      if (selected.contains(j)) {
        n.Draw(3);
      }
      else {
        n.Draw(1);
      } 
    }
    for (Node n : intersection) {
      // XXX: Ugly
      int j = nodes.indexOf(n);
      if (selected.contains(j)) {
        n.Draw(4);
      }
      else {
        n.Draw(2); 
      }
    }   
    
    // Draw labels
    for (Node n : outside) {
      n.DrawLabel(0); 
    }
    for (Node n : difference) {
      // XXX: Ugly
      int j = nodes.indexOf(n);
      if (selected.contains(j)) {
        n.DrawLabel(3);
      }
      else {
        n.DrawLabel(1);
      } 
    }
    for (Node n : intersection) {
      // XXX: Ugly
      int j = nodes.indexOf(n);
      if (selected.contains(j)) {
        n.DrawLabel(4);
      }
      else {
        n.DrawLabel(2); 
      }
    } 
          
    pg.endDraw();
    
    image(pg, pos[0], pos[1]);
  }
  
  
  void DrawEdgeRelative(int i, int j) {
    float maxWidth = minRadius * 2.0;
    float minWidth = pixels2view;
    
    Node n1 = nodes.get(i);
    Node n2 = nodes.get(j);    
    
    float val = float(nodeMatrix[i][j]);  
    
    float frac = val / maxMatrix;    
    
    float frac1 = val / n1.qe.connectionCount; 
    float frac2 = val / n2.qe.connectionCount;
    
    
//    if (frac1 > 1) println("1HERELHERLEH");
    
//    if (frac2 > 1) println("2HERELHERLEH");
    
    PVector p1 = nodes.get(i).pos.get();
    PVector p2 = nodes.get(j).pos.get();
    
    PVector v1 = PVector.sub(p2, p1);
    v1.normalize();
    
    PVector v2 = new PVector(v1.y, -v1.x);
    
    p1.add(PVector.mult(v1, nodes.get(i).radius));
    p2.sub(PVector.mult(v1, nodes.get(j).radius));
    
    float w1 = (minWidth + (maxWidth - minWidth) * frac1) * 0.5;
    float w2 = (minWidth + (maxWidth - minWidth) * frac2) * 0.5;
    
    PVector p1_1 = PVector.add(p1, PVector.mult(v2, w1));
    PVector p1_2 = PVector.sub(p1, PVector.mult(v2, w1));
    PVector p2_1 = PVector.sub(p2, PVector.mult(v2, w2));
    PVector p2_2 = PVector.add(p2, PVector.mult(v2, w2));
            
    pg.noStroke();    
    
    if (selected.contains(i) || selected.contains(j) || 
        i == mousedOver || j == mousedOver) {
      if (intersection.contains(nodes.get(i)) && intersection.contains(nodes.get(j))) {
        pg.fill(0.0, 0.75, 0.0, 0.5 + frac * 0.5);        
      }
      else {
        pg.fill(0.0, 0, 0.75, 0.5 + frac * 0.5);
      }
    }
    else if (selected.size() > 0 || mousedOver >= 0) {
      pg.fill(0.75, 0.0, 0.0, 0.025 + frac * 0.2475); 
//pg.fill(0.0, 0, 0.0, 0.05 + frac * 0.2);
    }
    else {
      pg.fill(0.75, 0.0, 0.0, 0.1 + frac * 0.9);
//float a = 0.1 + frac * 0.9;
//pg.fill(1.0, 1-a,1-a);
    }
    
    pg.beginShape(QUADS);
    
    pg.vertex(p1_1.x, p1_1.y);
    pg.vertex(p1_2.x, p1_2.y);    
    pg.vertex(p2_1.x, p2_1.y);
    pg.vertex(p2_2.x, p2_2.y);
    
    pg.endShape();
  }
  
  void DrawEdgeAbsolute(int i, int j) {
    float val = float(nodeMatrix[i][j]);       
    float frac = val / maxMatrix; 
    
    if (selected.contains(i) || selected.contains(j) || 
        i == mousedOver || j == mousedOver) {
      if (intersection.contains(nodes.get(i)) && intersection.contains(nodes.get(j))) {
        pg.stroke(0.0, 0.75, 0.0, 0.5 + frac * 0.5);        
      }
      else {
        pg.stroke(0.0, 0, 0.75, 0.5 + frac * 0.5);
      }
    }
    else if (selected.size() > 0 || mousedOver >= 0) {
      pg.stroke(0.75, 0.0, 0.0, 0.05 + frac * 0.2); 
//pg.stroke(0.0, 0, 0.0, 0.05 + frac * 0.2);
    }
    else {
      pg.stroke(0.75, 0.0, 0.0, 0.1 + frac * 0.9);
//pg.stroke(0.0, 0.0, 0.0, 0.1 + frac * 0.9);
    }
//    pg.strokeWeight(1 + frac * 19);  // P3D
    pg.strokeWeight((1 + frac * 19) * pixels2view);
    pg.strokeCap(SQUARE);
    
    PVector p1 = nodes.get(i).pos.get();
    PVector p2 = nodes.get(j).pos.get();
    
    PVector v = PVector.sub(p2, p1);
    v.normalize();

    p1.add(PVector.mult(v, nodes.get(i).radius));
    p2.sub(PVector.mult(v, nodes.get(j).radius));
    
    pg.line(p1.x, p1.y, p2.x, p2.y); 
  }


  
  void SelectNode(int i) {
    if (selected.contains(i)) return;
    
    selected.add(0, i);
    
    ConstructSets(); 

    println(nodes.size() + " " + intersection.size() + " " + difference.size() + " " + outside.size() + " " +
                                (intersection.size() + difference.size() + outside.size()));
  }
  
  void DeselectNode(int i) {
    if (!selected.contains(i)) return;
    
    selected.remove(new Integer(i));
    
    ConstructSets();   
    
    println(nodes.size() + " " + intersection.size() + " " + difference.size() + " " + outside.size() + " " +
                            (intersection.size() + difference.size() + outside.size()));
  }
  
  void ConstructSets() {
    intersection.clear();
    difference.clear();
    union.clear();
    outside.clear();
      
    if (selected.size() == 0) {
      // Do nothing
    }
    else if (selected.size() == 1) {     
      // Treat this as the difference, not the intersection
      union.addAll(GetConnectedNodes(selected.get(0)));
      difference.addAll(union); 
    }
    else {         
      // Compute the intersection and difference
      for (int i = 0; i < selected.size(); i++) {
        union.addAll(GetConnectedNodes(selected.get(i))); 
      }
      
      intersection.addAll(GetConnectedNodes(selected.get(0)));
      for (int i = 1; i < selected.size(); i++) {
        intersection.retainAll(GetConnectedNodes(selected.get(i))); 
      }
      
      difference.addAll(union);
      difference.removeAll(intersection);
    }
    
    // Update outside nodes
    outside.addAll(nodes);
    outside.removeAll(union);
  }
  
  Set<Node> GetConnectedNodes(int i) {
    Set<Node> set = new HashSet<Node>();
    for (int j = 0; j < nodes.size(); j++) {
      if (nodeMatrix[i][j] > 0) {
        set.add(nodes.get(j));
/*      
        if (nodes.get(i).qe.type == 1) {
          for (int k = 0; k < nodes.size(); k++) {
            if (nodeMatrix[j][k] > 0 && nodes.get(k).qe.type == 1) {
              set.add(nodes.get(k));
            } 
          }
        }
*/        
      }      
    }
    
    // Include the root node 
    set.add(nodes.get(i));   
    
    return set;
  }
  
  class Node implements Comparable<Node> {
    QueryElement qe;
    
    PVector pos;
    PVector oldPos;
    PVector vel;
    
    float radius;
    
    float ringRadius = 0.05;
      
    Node(QueryElement queryElement) {
      qe = queryElement;

//      float s = 1.0 / ((float)qe.count / maxCount * 10000.0);
      float s = 0.01;
      pos = new PVector(random(-s, s), random(-s, s));
      
      oldPos = pos.get();
      
      vel = new PVector(0.0, 0.0);
    }
    
    public boolean equals(Object other) {
      if (this == other) {
        return true;
      } 
      
      if (other == null || getClass() != other.getClass()) {
        return false;
      }
      
      final Node otherNode = (Node)other;
      
      return qe.equals(otherNode.qe);    
    }
  
    public int hashCode() {
      return qe.hashCode(); 
    }
    
    public int compareTo(Node other) {
      return qe.compareTo(other.qe);
    }
    
    public String toString() {
      return qe.toString();
    }
    
    public boolean Pick(PVector p) {
      return pos.dist(p) <= radius;
    }
    
    public void Draw() {
      Draw(0); 
    }
      
    public void Draw(int selection) {      
      float frac = (float)qe.count / maxCount;
      
      pg.ellipseMode(CENTER);
      
      float a = 0.5 + frac * 0.25;
//      a = 0.5;
//      pg.fill(0.95, 0.95, 0.9, a);
      
      float strokeScale = pixels2view;    // 1.0 for P3D
      
      if (selection == 4) {        
        pg.fill(0.0, 0.75, 0.0, a * 0.75);
        pg.stroke(0.0, 0.75, 0.0, a);
        pg.strokeWeight(5 * strokeScale);          
      }
      else if (selection == 3) {
        pg.fill(0.0, 0.0, 0.75, a * 0.75);
        pg.stroke(0.0, 0.0, 0.75, a);
        pg.strokeWeight(5 * strokeScale);  
      }
      else if (selection == 2) {
        pg.fill(1.0, 1.0, 1.0, a);
        pg.stroke(0.0, 0.75, 0.0, a);
        pg.strokeWeight(3 * strokeScale); 
      }
      else if (selection == 1) {
        pg.fill(1.0, 1.0, 1.0, a);
        pg.stroke(0.0, 0.0, 0.75, a);
        pg.strokeWeight(3 * strokeScale);
      }
      else {
        if (selected.size() == 0) {
          pg.stroke(0.75, 0.0, 0.0, a);
          pg.fill(1.0, 1.0, 1.0, a);
        }
        else {
          pg.stroke(0.75, 0.0, 0.0, a * 0.5); 
          pg.fill(1.0, 1.0, 1.0, a * 0.5); 
        }
        pg.strokeWeight(strokeScale);
      }

      pg.rectMode(CENTER);
      if (qe.type == 1) {      
        pg.rect(pos.x, pos.y, radius * 2.0, radius * 2.0);
      }
      else {
        pg.ellipse(pos.x, pos.y, radius * 2.0, radius * 2.0);
      }
    }
    
    public void DrawLabel(int selected) {          
      if (!drawAllLabels && selected == 0) return;
      
      float frac = (float)qe.count / maxCount;
      
      float a = 0.5 + frac * 0.25;
      
      float shadow = 0.9;
            
      String label = drawShortLabels ? qe.shortName : qe.name;
      
      // Text shadow
      pg.pushMatrix();
      pg.scale(pixels2view);
      if (selected == 0) {
        pg.fill(shadow, shadow, shadow, a);  
      }
      else {
        pg.fill(shadow, shadow, shadow, 0.9);
      }
      pg.text(label, pos.x * view2pixels - 1, pos.y * view2pixels + 1);
      pg.text(label, pos.x * view2pixels + 1, pos.y * view2pixels - 1);
      pg.text(label, pos.x * view2pixels + 1, pos.y * view2pixels + 1);
      pg.text(label, pos.x * view2pixels - 1, pos.y * view2pixels - 1);      
      pg.popMatrix();
      
      // Text
      pg.pushMatrix();
      pg.scale(pixels2view);
      if (selected == 0) {
        pg.fill(0.0, 0.0, 0.0, a);  
      } 
      else if (selected == 4) {
        pg.fill(0.0, 0.25, 0.0, 0.9);
      }      
      else if (selected == 3) {
        pg.fill(0.0, 0.0, 0.5, 0.9);
      }
      else {
        pg.fill(0.0, 0.0, 0.0, 0.9);
      }
      
      pg.text(label, pos.x * view2pixels, pos.y * view2pixels);
      pg.popMatrix();  
    }
      
    public void DrawBackground(int selected) {       
      pg.noFill();
      
      if (selected == 2) {
        pg.stroke(0.85, 0.95, 0.85, 1.0);
      }
      else if (selected == 1) {
        pg.stroke(0.85, 0.85, 0.95, 1.0); 
      }
      
      pg.strokeWeight(ringRadius * 2.0);    
      pg.ellipse(pos.x, pos.y, (radius + ringRadius) * 2.0, (radius + ringRadius) * 2.0); 
      
  //    strokeCap(ROUND);
  //    strokeWeight(s + rad);
  //    line(pos.x, pos.y, nodes.get(mousedOver).pos.x, nodes.get(mousedOver).pos.y);
    }  
  }
}
