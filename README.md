# WebXR Skipping Stones

An app that lets you play the game of skip stones on a cartoony water surface in your living room.

The objective of "skipping" is to see how many times a stone can bounce before it sinks into the water.

Here is a nice 2d version of this simulation:
https://www.glowscript.org/#/user/B06902117/folder/Public/program/FinalProject

Simulation input parameters are:
* stone mass and radius

* Inital position

* Inital velocity or speed

* Inital spin

* Inital tilt angle

At th emoment only tilt angle can be specified.

Some slides are [here](https://docs.google.com/presentation/d/1JtKs5VajW88dYSgr5EwdCILuMcmJk0QbY2yZ9t8yddc/edit?usp=sharing)

Uses [three.js](https://threejs.org) and a simple custome physics engine althought it would be interes.


## How to play: 
Open the web site (locally from dist/client folder) in chrome, I haven tested other browers yet. 
Hosted here: 

Use Esc Key to interrupt current run. 

Mouse down drag to configure the stone angle for a run.

Then let go of the mouse to send the rock off.

The stone will bounce (or not) depending on inital angle it is thrown:

![](Animation2.gif)

## TODOs:
### Things still missing or bad: 
* 3d ui is difficult to use, maybe add a slider. Make it easier to see which way it will fly 

* Add sound effects and feedback when stone touches water, needs shadow to make movement visually more clear

* Code cleanup and tests

### Later
* I want to use the phone’s gyro sensor movement to determine start angle and maybe velocity

* An AR version where you can use a real water surface to play rather than cg water

* Add more input parameters to the simulation: velocity, spin and stone weight


## Credits:
* 3d assets from https://poly.pizza

* Texture from https://www.deviantart.com/berserkitty/art/Seamless-Cartoon-styled-Water-Texture-743787929

* Python code used as a starting point for simulation
https://www.glowscript.org/#/user/B06902117/folder/Public/program/FinalProject


## Getting Started

### Install dependencies
yarn install

###  Now you can run various yarn commands:
yarn cli

yarn lint

yarn build



## Tests with Jest

Run the tests with `yarn test` 


