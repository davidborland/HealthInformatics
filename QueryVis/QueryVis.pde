import java.util.*;

QueryData queryData;

List<QueryView> views;

List<Integer> selected;
int mousedOver = -1;  

// XXX: Selection objects should be external to views...
  Set<ForceDirectedLayoutView.Node> outside;
  Set<ForceDirectedLayoutView.Node> union;
  Set<ForceDirectedLayoutView.Node> difference;
  Set<ForceDirectedLayoutView.Node> intersection;
 
// XXX: This should be internal to FDLView...
List<ForceDirectedLayoutView.Node> nodes;  
  
//  int oldSelected = 0;
boolean selecting = false;
boolean drawAllLabels = false;
boolean drawShortLabels = true;

PFont font;
int fontSize = 12;

void setup() {    
  // Processing setup
  size(1200, 768);
//  size(1920, 1200);
//  size(1024, 768);
//    size(800, 600);
//  size(displayWidth, displayHeight);
  
  colorMode(RGB, 1.0);
  
  font = createFont("Arial", fontSize, true);
  textFont(font);
  
  randomSeed(1);
  
  // Load the query data
/*  QueryData */ queryData = new QueryData();
  queryData.ReadData("deduceQueryFilters.csv");

  // Create the views
  views = new ArrayList<QueryView>();
  
  float aspect = (float)width / height;
  
//  int[] fdlPos = { width - height, 0 };
int[] fdlPos = { 0, 0 };
  PGraphics fdlViewport = createGraphics((int)(width / aspect), height);
  ForceDirectedLayoutView fdlView = new ForceDirectedLayoutView(fdlPos, fdlViewport);
//  fdlView.SetNodeData(queryData.columnNameData);
//  fdlView.SetNodeMatrix(queryData.columnNameMatrix);
fdlView.SetNodeData(queryData.combinedData);
fdlView.SetNodeMatrix(queryData.combinedMatrix);
  views.add(fdlView);
  
//  int [] labelPos = { 0, 0 };
int [] labelPos = { width - (width - height), 0 };
  PGraphics labelViewport = createGraphics((width - height), height);
  LabelView labelView = new LabelView(labelPos, labelViewport);
  labelView.SetLabelData(queryData.columnNameData);
  views.add(labelView);
/*  
int [] pcPos = { width - (width - height) / 2, 0 };
  PGraphics pcViewport = createGraphics((width - height) / 2, height);
  ParallelCoordinatesView pcView = new ParallelCoordinatesView(pcPos, pcViewport);
//  pcView.SetLabelData(queryData.columnNameData);
  views.add(labelView);
  */
}

void draw() {
  for (int i = 0; i < views.size(); i++) {
    views.get(i).Update();
    views.get(i).Draw();
  }
}

int GetCurrentView() {
  for (int i = 0; i < views.size(); i++) {
    if (views.get(i).InView(mouseX, mouseY)) {
      return i; 
    } 
  }
  
  return -1;
}

void keyPressed() {
  if (key == 't') {
    drawAllLabels = !drawAllLabels;
    return; 
  }
  else if (key == 'g') {
    drawShortLabels = !drawShortLabels;
    return; 
  }
  
  int i = GetCurrentView();
  if (i > -1) {
    views.get(i).KeyPressed(key);
  }
}

void keyReleased() {  
  int i = GetCurrentView();
  if (i > -1) {
    views.get(i).KeyReleased(key);
  } 
}


void mousePressed() {
  int i = GetCurrentView();
  if (i > -1) {
    views.get(i).MousePressed(mouseX, mouseY);
  } 
}

void mouseDragged() {
  int i = GetCurrentView();
  if (i > -1) {
    views.get(i).MouseDragged(mouseX, mouseY);
  } 
}

void mouseReleased() {
  int i = GetCurrentView();
  if (i > -1) {
    views.get(i).MouseReleased(mouseX, mouseY);
  } 
}

void mouseMoved() {
  int i = GetCurrentView();
  if (i > -1) {
    views.get(i).MouseMoved(mouseX, mouseY);
  } 
}
