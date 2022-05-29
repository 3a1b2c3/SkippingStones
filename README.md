# Skipping Stones game / simulator

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

At the moment only tilt angle can be specified.

Some slides are [here](https://docs.google.com/presentation/d/1JtKs5VajW88dYSgr5EwdCILuMcmJk0QbY2yZ9t8yddc/edit?usp=sharing)

Uses [three.js](https://threejs.org) and a simple custome physics engine althought it would be interesting to try with an existing one.


## How to play: 
Open the web site (locally from dist/client folder) in chrome and android chrome, I have not tested other browers yet. 

Hosted version [here](https://3a1b2c3.github.io/webxr/) 

*On a computer use*: 

'Esc' Key or the circle button to *interrupt current run* and start over.

Mouse down drag to configure the stone angle for a run.

Then let go of the mouse to send the rock off.


*On a phone*:

Touch on drag the stone on the screen to rotate it, then lift your finger form the screen. 

Use the circle button to *interrupt current run* and start over.



The **stone will bounce on the water** (or not) depending on inital tilt angle it is thrown:

![](Animation2.gif)

## TODOs:
### Things still missing or bad: 
* 3d ui can be difficult to use, rayintersection in flat viewing angles is unreliable

* Camera controls in AR mode? OrbitControl does not work

* Make it easier to see which way the stone will fly 

* Needs shadow to make movement visually more clear

* Add sound effects


### Later
* I want to use the phone’s gyro sensor movement to determine start angle and maybe velocity

* An AR version where you can use a real water surface to play rather than cg water

* Add more input parameters to the simulation: see above


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


