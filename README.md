# Conway's Game of Life

This is an implementation of Conway's Game of Life written in Javascript and Rust. The game universe is 5000 cells by 5000 cells, with the edges wrapping around. A live version is available at http://life.aperance.dev.

To improve performance, the game results are calculated by a WebAssembly module written in Rust and run in the background using a Web Worker.

HTML 5 Canvas is used for the game UI. The canvas is updated as data is received from the worker. Only modified areas are redrawn when possible.

The game features pan and zoom controls which updates the position and scale of the game canvas. RxJS is used to manage mouse and keyboard events by the user.

The algorithim used has a time complexity of O(n), where n is the number of cells that changed state in the previous generation.

## How to Play

Click on a cell to toggle its state between alive and dead. Once the initial pattern is set click the play icon to run the game.

![](examples/manual.gif)

Alternatively, you can select a predefined pattern from the pattern library dropdown menu. You can rotate the pattern by pressing the "R" key and flip the pattern by pressing the "F" key. Click to place one or more instances of the selected pattern. Press the escape key to exit the pattern placement mode.

![](examples/pattern.gif)

To zoom in or out use either the zoom slider on the top right of the screen, or scroll in/out using a mouse wheel or trackpad. To pan across the game board use the arrow keys or click and drag on the game area.

![](examples/pan.gif)

To test the limits of this game implementation, I recommend trying the P416 60P5H2V0 gun from the pattern library. Many computers will struggle running this at full speed due to there being over 10,000 state changes per generation.

![](examples/p416.gif)

