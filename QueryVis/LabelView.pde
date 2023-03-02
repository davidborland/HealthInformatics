class LabelView extends QueryView {
  List<Label> labels;
  
  // XXX: Should probably be static variables in QueryElement...
  int maxCount;   
  int maxConnections;
  
  LabelView(int[] _pos, PGraphics _pg) {
    super(_pos, _pg); 
    
    // Set up graphics object
    pg.beginDraw();
    
    pg.smooth();
    pg.colorMode(RGB, 1.0);
    pg.textAlign(LEFT, CENTER);
    
    pg.endDraw();
    
    view2pixels = pg.height / 2.0;
    pixels2view = 2.0 / pg.height; 
    
    labels = new ArrayList<Label>();
  }
    
  void SetLabelData(List<QueryElement> data) {
    for (int i = 0; i < data.size(); i++) {
      labels.add(new Label(data.get(i)));
    }
    
    // Set maximum count
    maxCount = labels.get(0).qe.count;
    
    // Set maximum connections
    maxConnections = 0;
    for (int i = 0; i < labels.size(); i++) { 
      if (labels.get(i).qe.connections > maxConnections) {
        maxConnections = labels.get(i).qe.connections;
      }
    }
    
    // Sort alphabetically
    Collections.sort(labels);
    
    // Place the labels
    for (int i = 0; i < labels.size(); i++) {
      labels.get(i).pos = new PVector(0.05, -0.95 + (float)i / labels.size() * 1.9);
    }
  }
  
  void Update() {
    // XXX: Hack to highlight labels that have moved under the mouse
    MouseMoved(mouseX, mouseY);
  }
  
  void Draw() {
    pg.beginDraw();
    
    pg.background(0.95, 0.95, 0.9);
    
    pg.translate(0.0, pg.height / 2.0);
    pg.scale(view2pixels, view2pixels);

//    ortho(-1, 1, -1, 1);
            
    // Draw selection background    
    for (Label l : labels) {
      // XXX: HACK
      int index = queryData.columnNameData.indexOf(l.qe);
      if (selected.contains(index)) {
        if (intersection.contains(nodes.get(index))) {
          l.Draw(4);
        }
        else {
          l.Draw(3);
        }
      }
      else {
        if (intersection.contains(nodes.get(index))) {
          l.Draw(2);
        }
        else if (difference.contains(nodes.get(index))) {
          l.Draw(1);
        }
        else {
          l.Draw(0);
        }
      } 
    }
    
    pg.endDraw();
    
    image(pg, pos[0], pos[1]);
  }
  
  PVector Pixels2View(int x, int y) {
    float aspect = (float)pg.width / pg.height;
    
    return new PVector(x * aspect * pixels2view, y * pixels2view - 1.0);
  }
  
  void KeyPressed(char c) {
    if (key == CODED) {
      if (keyCode == CONTROL) {
        selecting = true; 
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
    
    println(m);
  
    // Check each label
    for (int i = 0; i < labels.size(); i++) {
      if (labels.get(i).Pick(m)) {             
        mousedOver = -1;
        
        // XXX: HUGE HACK.  WILL BREAK
        i = queryData.columnNameData.indexOf(labels.get(i).qe);
                
        if (selecting) {
          if (selected.contains(i)) {
            selected.remove(selected.indexOf(i));
            selected.add(0, i);
            break;
          }
           
          // XXX: HACK         
          ((ForceDirectedLayoutView)views.get(0)).SelectNode(i);

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

    oldMousePos = m.get();
  }
  
  void MouseDragged(int x, int y) {}
  
  void MouseReleased(int x, int y){
    x -= pos[0];
    y -= pos[1];
    
    if (!selecting) {
      selected.clear();
      
      // XXX: HACK         
      ((ForceDirectedLayoutView)views.get(0)).ConstructSets();
    
      mousedOver = -1;
    } 
  }
  
  void MouseMoved(int x, int y){    
    if (mousePressed || !InView(x, y)) return;    

    x -= pos[0];
    y -= pos[1];
    
    PVector m = Pixels2View(x, y);
  
    if (mousedOver > -1) {      
      // XXX: HUGE HACK.  WILL BREAK
      QueryElement qe = queryData.columnNameData.get(mousedOver);
      int i;
      for (i = 0; i < labels.size(); i++) {
        if (labels.get(i).qe == qe) {
          break; 
        }
      }
      if (!labels.get(i).Pick(m)) {
        // XXX: HACK         
        ((ForceDirectedLayoutView)views.get(0)).DeselectNode(mousedOver);
        mousedOver = -1;
      } 
    }
    else {
      // Check labels
      for (int i = 0; i < labels.size(); i++) {
        if (labels.get(i).Pick(m)) {          
          // XXX: HUGE HACK.  WILL BREAK
          i = queryData.columnNameData.indexOf(labels.get(i).qe);
          if (!selected.contains(i)) {
            mousedOver = i;
                 
            // XXX: HUGE HACK.  WILL BREAK
            ((ForceDirectedLayoutView)views.get(0)).SelectNode(i);
          }
          
          break; 
        }
      }
    }
  }
  
  class Label implements Comparable<Label> {
    QueryElement qe;
    
    PVector pos;
    
    Label(QueryElement queryElement) {
      qe = queryElement;  
    }
    
    public int compareTo(Label other) {
      return qe.name.compareTo(other.qe.name);
    }
    
    public boolean Pick(PVector p) {       
      return p.x >= pos.x && 
             p.x <= pos.x + textWidth(qe.name) * pixels2view &&
             p.y >= pos.y - textDescent() * pixels2view && 
             p.y <= pos.y + (textAscent() - textDescent()) * pixels2view;
    }
    
    void Draw(int selected) {     
      float frac = (float)qe.count / maxCount;
      
      float a = 0.5 + frac * 0.25;
      
      /*
      pg.rectMode(CORNER);      
      
      pg.noFill();
      pg.stroke(0.0, 0.0, 0.0, 1.0);
      pg.strokeWeight(pixels2view);
      
      pg.rect(pos.x, pos.y - textDescent() * pixels2view,
              textWidth(qe.name) * pixels2view, textAscent() * pixels2view);
              */
              
      // Draw line for count             
      float minLength = 0.00;
      float maxLength = 0.1;
      
      if (selected == 4) {
        pg.stroke(0.0, 0.75, 0.0, 1.0);        
      }
      else if (selected == 3) {
        pg.stroke(0.0, 0.0, 0.75, 1.0);         
      }
      else if (selected == 2) {
        pg.stroke(0.0, 0.75, 0.0, 1.0);         
      }
      else if (selected == 1) {
        pg.stroke(0.0, 0.0, 0.75, 1.0);        
      }
      else {
        pg.stroke(0.75, 0.0, 0.0, a);
      }
      pg.strokeWeight(3.0 * pixels2view);
            
      float x1 = pos.x + maxLength;
      float x2 = x1 - minLength - maxLength * frac;
      float y = pos.y;
      pg.line(x1, y, x2, y);              
      
      
      // Draw line for number of connections      
      if (selected == 4) {
        pg.stroke(0.5, 0.75, 0.5, 1.0);        
      }
      else if (selected == 3) {
        pg.stroke(0.5, 0.5, 0.75, 1.0);         
      }
      else if (selected == 2) {
        pg.stroke(0.5, 0.75, 0.5, 1.0);         
      }
      else if (selected == 1) {
        pg.stroke(0.5, 0.5, 0.75, 1.0);        
      }
      else {
        pg.stroke(0.75, 0.5, 0.5, a);
      }
      
      float connectionsFrac = (float)qe.connections / maxConnections; 
      x2 = x1 - minLength - maxLength * connectionsFrac;
      y = pos.y + textDescent() * pixels2view;
      pg.line(x1, y, x2, y); 
      
      
      // Draw label
      pg.pushMatrix();
      pg.scale(pixels2view);
      if (selected == 4) {
        pg.fill(0.0, 0.75, 0.0, 1.0);        
      }
      else if (selected == 3) {
        pg.fill(0.0, 0.0, 0.75, 1.0);         
      }
      else {
        pg.fill(0.0, 0.0, 0.0, a);
      }
      pg.text(qe.name, (x1 + 0.01) * view2pixels, pos.y * view2pixels);      
      pg.popMatrix();
    }
  }
}
