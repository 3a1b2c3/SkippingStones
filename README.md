# WebXR Skipping Stones

An app that lets you play the game of skip stones on a cartoony water surface in your living room.

The objective of "skipping" is to see how many times a stone can bounce before it sinks into the water.

Here is a nice 2d version of the simulation:
https://www.glowscript.org/#/user/B06902117/folder/Public/program/FinalProject

How to play: 
Use Esc Key to interrupt current run. Mouse down drag to configure the stone angle for a run.
Then let go of the mouse to send the rock off.

WIP:
![](Animation2.gif)

## TODOs:
### Things still missing or bad: 
* 3d ui is difficult to use, maybe add a slider

* Add sound effects and feedback when stone touches water, needs shadow to make movement visually more clear

* Code cleanup and tests

### Later
* I want to use the phone’s gyro sensor movement to determine start angle and maybe velocity

* An AR version where you can use a real water surface to play rather than cg water

* Add more input parameters to the simulation: velocity, spin and stone weight


## Credits:
* 3d assets from https://poly.pizza

* Python code from
https://www.glowscript.org/#/user/B06902117/folder/Public/program/FinalProject
was used as a starting point for simulation

## Getting Started


# Install dependencies
yarn install

# Now you can run various yarn commands:
yarn cli
yarn lint
yarn test
yarn build
...
```


## Tests with Jest

Run the tests with `yarn test`, no separate compile step is necessary.


