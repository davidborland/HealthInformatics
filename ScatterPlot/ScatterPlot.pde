import java.util.*;

DataFrame dataFrame;

ScatterPlotView scatterPlot;

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
  dataFrame = new DataFrame("mtcarsMatrix.csv");
//  dataFrame = new DataFrame("statesMatrix.csv");
//  dataFrame = new DataFrame("diabetesMatrix.csv");
//  dataFrame = new DataFrame("diabetes2Matrix.csv");
//  dataFrame = new DataFrame("queryMatrix.csv");
//  dataFrame = new DataFrame("queryTop2Matrix.csv");
  
  // Create the view
  scatterPlot = new ScatterPlotView();
  scatterPlot.SetDataFrame(dataFrame);   
//  scatterPlot.LoadPositions("mtcarsPCA.csv");
}
  
void draw() {
  scatterPlot.Update();
  scatterPlot.Draw();
}

void keyPressed() {
  switch (key) {
   
    case '0':
      scatterPlot.SetXWeight(0, 1.0);
      break;
      
    case '1':    
      scatterPlot.SetXWeight(1, 1.0);
      break;
      
    case '2':    
      scatterPlot.SetXWeight(2, 1.0);
      break;
      
    case '3':    
      scatterPlot.SetXWeight(3, 1.0);
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
