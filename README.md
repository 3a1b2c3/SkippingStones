# WebXR Skipping Stones

An app that lets you play the game of skip stones on a cartoony water surface in your living room.

The objective of "skipping" is to see how many times a stone can bounce before it sinks into the water.

Here is a nice 2d version of the simulation:
https://www.glowscript.org/#/user/B06902117/folder/Public/program/FinalProject

Esc Key to interrupt current run. Mouse down drag to configure the stone angle for a run.
Then let go off the mouse to sent the rock off.

WIP:
![](Animation2.gif)

## TODOs:
### Things still missing or bad: 
* Fix the physic/simulation code currently using a dummy

* 3d ui is difficult to use, maybe add a slider

* 2d ui needs some design

* Add sound effects and feedback when stone touches water, needs shadow to makemovement more clear

* Code cleanup and tests

### Later
* I want to use the phone’s gyro sensor movement to determine start angle and maybe velocity

* An AR version were you can use a real water surface

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

* Take a look at all the scripts in [`package.json`](https://github.com/metachris/typescript-boilerplate/blob/master/package.json)
* For publishing to npm, use `yarn publish` (or `npm publish`)

## esbuild

[esbuild](https://esbuild.github.io/) is an extremely fast bundler that supports a [large part of the TypeScript syntax](https://esbuild.github.io/content-types/#typescript). This project uses it to bundle for browsers (and Node.js if you want).

```bash
# Build for browsers
yarn esbuild-browser:dev
yarn esbuild-browser:watch

# Build the cli for node
yarn esbuild-node:dev
yarn esbuild-node:watch
```


## Tests with Jest

Run the tests with `yarn test`, no separate compile step is necessary.


