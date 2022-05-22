import * as THREE from 'three'; 
import { VRButton } from 'three/examples/jsm/webxr/VRButton'
import { OrbitControls } from 'three/examples/jsm/Controls/OrbitControls';

import { models, defaultPositionY, defaultRoationX, minTilt, maxTilt } from "./lib/meshes";
import { makeFloor, WaterMesh, rafCallbacks, rain } from "./lib/water";
import { makeLights, makeCamera, removeEntity } from "./lib/Scene";
import { StoneDefault, stone, init, simulateOneStep, RockState } from "./lib/skipping";
import { waterHeight, floorHeight} from "./lib/constants";
import { makeTextSprite } from "./lib/textSprite";
import { roundTo, clamp } from "./lib/helper";

const debug = true;
const headsUpStartText = "Skip a stone";
const defaultLabel = "labelSprite";
const defaultLabelY = .6;
const defaultLabelZ = 2.2;
const defaultLabelFont = 12;

type RockHandling = {
  rockState: RockState;
  rockMeshes: Array<THREE.Mesh>;
  intersections : any | null;
  stoneSimulation : stone
};

const rockHandling : RockHandling = {
  rockState: RockState.start,
  rockMeshes: Array<THREE.Mesh>(),
  intersections : null,
  stoneSimulation : StoneDefault
};

// XR globals
const xrImmersiveRefSpace = null;
const inlineViewerHelper = null;

// WebGL Scene globals, make object 
let Renderer : any = null;
let Scene : THREE.Scene | null = null;
let Controls : OrbitControls | null = null;
let Clock: THREE.Clock | null = null;
let Raycaster : THREE.Raycaster | null = null;

const Pointer = new THREE.Vector2();
const { Camera, CameraGroup } = makeCamera();


//TODO add spin, velocity, incident velocity, weight, height
function setText(rockState : RockState, stoneDefault : stone,
  x=-2, y=defaultPositionY* 1.1, z=0, objectName="textSprite", fontsize=12){
  let text = headsUpStartText;
  if (rockState.valueOf() == RockState.selected ){
    text = "Set rock tilt angle by dragging the mouse.";
  }
  else if (rockHandling.rockState.valueOf() == RockState.configuring){
    text = "Current angle:"  + roundTo((rockHandling.stoneSimulation.theta * 180 / Math.PI), 2) + " degree";
  }
  else if(rockState.valueOf() == RockState.simulation){
    text = stoneDefault.bounces + " bounces and distance: " 
    + roundTo(stoneDefault.meters, 2) + " m";
  }
  else if(rockState.valueOf() == RockState.start && objectName==defaultLabel){
    text = "Play again";
  }
  const spritey = makeTextSprite(text, 
          { fontsize, textColor: {r:255, g:255, b:255, a:1.0}}, objectName, document);
  spritey.position.set(x,y,z);
  return spritey;
}

//callbacks
document.onkeydown = function(evt) {
  evt = evt || window.event;
  let isEscape = false;
  if ("key" in evt) {
      isEscape = (evt.key === "Escape" || evt.key === "Esc");
  } else {
      isEscape = (evt.keyCode === 27);
  }
  if (isEscape) {
    resetRock();
  }
};

function onPointerMove( event : any ) {
  Pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  Pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}


const addObjectClickListener = (
  Scene : THREE.Scene
  ) => {
    let startX = 0;
    let startY = 0;
    document.addEventListener('mousedown', function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockMeshes[0] && rockHandling.intersections &&
        rockHandling.rockState.valueOf() == RockState.start) {
        rockHandling.rockState = RockState.configuring;
        startX = event.pageX;
        startY = event.pageY;
        if (debug)
          console.debug(startY + 'mousedown' + rockHandling.rockState);
        removeEntity(defaultLabel, Scene);
        const spritey = setText(rockHandling.rockState, rockHandling.stoneSimulation, -1.3, 
          defaultPositionY * defaultLabelY, defaultLabelZ, defaultLabel, defaultLabelFont);
        Scene.add(spritey);
      }
      else{
        startX = 0;
        startY = 0;
      }
    });


    document.addEventListener('mousemove', function (event) {
      if (rockHandling.intersections && rockHandling.rockMeshes && rockHandling.rockState.valueOf() == RockState.configuring) {
        //const diffX = Math.abs(event.pageX - startX);//weight
        const diffY = Math.abs(event.pageY - startY);
        const delta = 5;
        if (Controls){
          Controls.enableRotate = false;
        }
        if (diffY > delta) {
            const angleDiff = clamp(diffY *.001, -.03, .03);
            rockHandling.rockMeshes[0].rotateX(angleDiff);
            rockHandling.stoneSimulation.theta = rockHandling.rockMeshes[0].rotation.x;
            //update label
            removeEntity(defaultLabel, Scene);
            const spritey = setText(rockHandling.rockState, rockHandling.stoneSimulation, -1.3, defaultPositionY * defaultLabelY, 
              defaultLabelZ, defaultLabel, defaultLabelFont);
            Scene.add(spritey);
          }
        }
    });

    document.addEventListener('mouseup', function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockState.valueOf() == RockState.configuring) {
          if (debug)
          console.debug("mouseup:" + rockHandling.rockState);
          rockHandling.rockState = RockState.simulation;
          //update label
          removeEntity(defaultLabel, Scene);
          const spritey = setText(rockHandling.rockState, rockHandling.stoneSimulation, -1.3, defaultPositionY * defaultLabelY, 
            defaultLabelZ, defaultLabel, defaultLabelFont);
          Scene.add(spritey);
          if (Controls)
            Controls.enableRotate = true;
      }
    });
   
  };

  function resetRock(){
    init(rockHandling.stoneSimulation);
    rockHandling.rockState = RockState.start;
    if (Scene){
      removeEntity(defaultLabel, Scene);
      const spritey = setText(rockHandling.rockState, rockHandling.stoneSimulation, -1.3, defaultPositionY * defaultLabelY,
        defaultLabelZ, defaultLabel, defaultLabelFont);
      Scene.add(spritey);
    }
    if (rockHandling.rockMeshes && rockHandling.rockMeshes[0]){
      rockHandling.rockMeshes[0].position.set(0, defaultPositionY, 0);
      rockHandling.rockMeshes[0].rotateX(defaultRoationX);
    }
  }

function setupRenderer(){
    Renderer = new THREE.WebGLRenderer({ antialias: true })
    Renderer.setPixelRatio(window.devicePixelRatio);
    Renderer.setSize(window.innerWidth, window.innerHeight);
    Renderer.xr.enabled = true;
    //orbit
    Controls = new OrbitControls(Camera, Renderer.domElement);
    Controls.maxPolarAngle = Math.PI * 0.5;
    Controls.maxDistance = 10;
    Camera.position.set(0, 1.6, -5);
    Controls.target = new THREE.Vector3(0, 1, 0);
    Controls.update();

    document.body.appendChild(Renderer.domElement)
    document.body.appendChild(VRButton.createButton(Renderer))
  }

  //https://stackoverflow.com/questions/40566045/three-js-mouse-events-with-raycasting-and-intersect-testing
  function render() {
      requestAnimationFrame(render);
      // find rock intersection
      if (Scene && Raycaster && rockHandling.rockMeshes?.length && rockHandling.rockState.valueOf() != RockState.simulation){
          Raycaster.setFromCamera(Pointer, Camera);
          const intersects = Raycaster.intersectObjects(Scene.children, true);
          if (intersects.length > 0) {
            if ( intersects.length > 0 ) {
              if (rockHandling.intersections != intersects[0].object) {
                if (rockHandling.intersections && rockHandling.intersections?.material?.emissive)// && rockHandling.rockState.valueOf() == RockState.simulation) 
                  rockHandling.intersections.material.emissive.setHex(rockHandling.intersections.currentHex);
                if (intersects[0].object.name == 'boulder'){
                    rockHandling.intersections = intersects[0].object;
                }
                else{
                  rockHandling.intersections = null;
                }
                if (rockHandling.intersections && rockHandling.intersections?.material?.emissive){
                  rockHandling.intersections.currentHex = rockHandling.intersections.material.emissive.getHex();
                  rockHandling.intersections.material.emissive.setHex( 0xff0000 );
                }
              }
            } else {
              if (rockHandling.intersections && rockHandling.intersections?.material?.emissive)
                rockHandling.intersections.material.emissive.setHex(rockHandling.intersections.currentHex);
              rockHandling.intersections = null;
            }
          }
      }
      //update simulation
      if(Clock && rockHandling.rockMeshes?.length && rockHandling.rockState.valueOf() == RockState.simulation){
        let splash = false;
        let delta = Clock.getDelta();
        if (delta > 0.01){
              delta = 0.01;
        }
        if (rockHandling.rockMeshes[0].position.y > floorHeight *defaultLabelY){
          const res : THREE.Vector3 = simulateOneStep(rockHandling.stoneSimulation, delta);
          if (debug){
            if (rockHandling.rockMeshes[0].position.y > waterHeight && 
              rockHandling.rockMeshes[0].position.y - delta < waterHeight){
              //splash = true;
            }
            rockHandling.rockMeshes[0].position.z += delta;
            rockHandling.rockMeshes[0].position.y -= delta/5;
            rockHandling.stoneSimulation.meters = rockHandling.rockMeshes[0].position.z;
            if (debug && false)
              console.debug("rockHandling.rockMeshes[0].position.y" + rockHandling.rockMeshes[0].position.y);
          }
          else{
            rockHandling.rockMeshes[0].position.x = res.z;
            rockHandling.rockMeshes[0].position.y = res.y + waterHeight;
            rockHandling.rockMeshes[0].position.z = res.x; //add random?
          }
          if(splash){
            if (Scene){
              const spritey = makeTextSprite("Splash", { fontsize : 12, textColor: {r:255, g:255, b:255, a:1.0}},
               "splashLabel", document);
              spritey.position.set(rockHandling.rockMeshes[0].position.x, rockHandling.rockMeshes[0].position.y, rockHandling.rockMeshes[0].position.z);
              Scene.add(spritey);
              splash = false;
              setTimeout(() => {
                if (Scene)
                removeEntity("splashLabel", Scene);
              }, 5000);
            }
          }
          // update distance label
          if (Scene){
            removeEntity(defaultLabel, Scene);
            const spritey = setText(rockHandling.rockState, rockHandling.stoneSimulation, -1.3, defaultPositionY * defaultLabelY, 
              defaultLabelZ, defaultLabel, defaultLabelFont);
            Scene.add(spritey);
          }
          //done
          if(rockHandling.rockMeshes[0].position.y <= floorHeight *1.2 || rockHandling.rockMeshes[0].position.z > 90){
            if (debug)
            console.debug("done");
            setTimeout(() => {
              resetRock();
            }, 8000);
          }
        }
      }
      Renderer.setAnimationLoop(function (time : number) {
        rafCallbacks.forEach(cb => cb(time));
        Renderer.render(Scene, Camera);
      });
      Renderer.render(Scene, Camera)
}

function setupScene(){
    Scene = new THREE.Scene();
    Clock = new THREE.Clock();
    Raycaster = new THREE.Raycaster();
    const modelsPromise = (async function () {
        const {
            rock,
            rock2,
        } = await models;
        rockHandling.rockMeshes.push(rock);
        addObjectClickListener(
          Scene
        );
        Scene.add(rock);
        Scene.add(rock2);
    })();
    resetRock();

    const spritey = setText(rockHandling.rockState, rockHandling.stoneSimulation, -1.3,
      defaultPositionY * 1.25, defaultLabelZ, "header", 16);
    Scene.add(spritey);

    const { Light, Light2 } = makeLights();
    Scene.add(Light2);
    Scene.add(Light);
    Scene.add(Camera);
    Scene.add(CameraGroup);
    Scene.add(makeFloor());
    Scene.add(WaterMesh);

    window.addEventListener('resize', onWindowResize, false)
 
    function onWindowResize() {
        Camera.aspect = window.innerWidth / window.innerHeight;
        Camera.updateProjectionMatrix();
        Renderer.setSize(window.innerWidth, window.innerHeight);
    }
    Renderer.setAnimationLoop(render);
}

function setup(){
    setupRenderer();
    setupScene();
}

setup();
