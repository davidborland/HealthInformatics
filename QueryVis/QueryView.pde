// Selection:
// Maintain lists/sets of nodes for each selection and unselected?  
// Should probably move to Sets instead of ArrayLists, but keep nodes as ArrayList
// Use PGraphics as viewports to render to...

abstract class QueryView {
  // Viewport for this view
  int[] pos;
  PGraphics pg;

  PVector oldMousePos; 
    
  float view2pixels;
  float pixels2view;
 
  QueryView(int[] _pos, PGraphics _pg) {
    pos = _pos;
    pg = _pg;
    
    oldMousePos = new PVector();
  }

/*
  void SetQueryData(QueryData data) {
    queryData = data;
  }
*/  
  
  
  boolean InView(int x, int y) {
    x -= pos[0];
    y -= pos[1];
    
    return x >= 0 && x < pg.width &&
           y >= 0 && y < pg.height;
  }
  
  abstract void Update();
  abstract void Draw();
  
  abstract PVector Pixels2View(int x, int y);
  
  abstract void KeyPressed(char c);
  abstract void KeyReleased(char c);
  abstract void MousePressed(int x, int y);
  abstract void MouseDragged(int x, int y);
  abstract void MouseReleased(int x, int y);
  abstract void MouseMoved(int x, int y);
}
