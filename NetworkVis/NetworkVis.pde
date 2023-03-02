import java.util.*;

DataFrame dataFrame;

NodeLinkView nodeLink;

PFont font;
int fontSize = 16;

void setup() {    
  // Processing setup
  size(768, 768, P3D);
//  size(1024, 1024, P3D);
//  size(1200, 1200, P3D);
//  size(displayWidth, displayHeight);
smooth();

  colorMode(RGB, 1.0);
  
  font = createFont("Arial", fontSize, true);
  textFont(font);
  
  randomSeed(1);
  
  // Load the data
//  dataFrame = new DataFrame("mtcarsMatrix.csv");
  dataFrame = new DataFrame("statesMatrix.csv");
//  dataFrame = new DataFrame("diabetesMatrix.csv");
//  dataFrame = new DataFrame("diabetes2Matrix.csv");
//  dataFrame = new DataFrame("queryMatrix.csv");
//  dataFrame = new DataFrame("queryTop2Matrix.csv");
  
  // Create the view
  nodeLink = new NodeLinkView();
  nodeLink.SetDataFrame(dataFrame);   
//  nodeLink.LoadPositions("mtcarsPCA.csv");
  nodeLink.LoadPositions("statesPCA.csv");
//  nodeLink.LoadPositions("queryPCA.csv");
//  nodeLink.LoadPositions("queryTop2PCA.csv");
}
  
void draw() {
  nodeLink.Update();
  nodeLink.Draw();
}

void keyPressed() {
  switch (key) {
   
    case 'f':     
      nodeLink.useFixedPositions = !nodeLink.useFixedPositions;
      break;
  }
}

void keyReleased() {  
}


void mousePressed() {
}

void mouseDragged() {
}

void mouseReleased() {
}

void mouseMoved() {
}
