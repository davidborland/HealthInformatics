class ParallelCoordinatesView extends QueryView {  
  ParallelCoordinatesView(int[] _pos, PGraphics _pg) {
    super(_pos, _pg);
    
    // Set up graphics object
    pg.beginDraw();
    
    pg.smooth();
    pg.colorMode(RGB, 1.0);
    pg.textAlign(LEFT, CENTER);
    
    pg.endDraw();
    
    view2pixels = pg.height / 2.0;
    pixels2view = 2.0 / pg.height; 
  }
  
//  void Add
  
  void Update() {
  }
  
  void Draw() {
    pg.beginDraw();
    
    pg.background(0.95, 0.95, 0.9);
    
    pg.translate(0.0, pg.height / 2.0);
    pg.scale(view2pixels, view2pixels);
    
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
  }
  
}
