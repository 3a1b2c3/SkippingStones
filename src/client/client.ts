import * as THREE from 'three'; 
import { VRButton } from 'three/examples/jsm/webxr/VRButton'
import { OrbitControls } from 'three/examples/jsm/Controls/OrbitControls';


import { models, defaultPositionY, defaultRoationX } from "./lib/meshes";
import { makeFloor, WaterMesh, rafCallbacks, rain } from "./lib/water";
import { makeLights, makeCamera, removeEntity } from "./lib/Scene";
import { StoneDefault, simulateOneStep, reset } from "./lib/skipping";
import { stone, RockState, RockHandling} from './types/types'
import { waterHeight, floorHeight} from "./lib/constants";
import { addHeadsup } from "./lib/headsUp";
import { roundTo, clamp } from "./lib/helper";

const debug = false;
const headsUpStartText = "Skip a stone";
const defaultLabel = "labelSprite";
const defaultLabelFont = 13;
const minFloorHeight = floorHeight * 1.1;
const animDelta = 0.02;
const resetTime = 6000;
const angleIncr = .03;

const rockHandling : RockHandling = {
  rockState: RockState.start,
  rockMeshes: Array<THREE.Mesh>(),
  intersections : null,
  stoneSimulation : Object.create(StoneDefault)
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
function setText(rockState : RockState, stoneObject : stone,
   objectName="headsUp", fontSize=15, x=100, y=100) : string {
  let text = headsUpStartText;
  if (rockState.valueOf() == RockState.selected ){
    text = "Set rock tilt angle by dragging it with the mouse.";
  }
  else if (rockHandling.rockState.valueOf() == RockState.configuring){
    text = `Drag the mouse to change the stone's tilt angle: ${roundTo((rockHandling.stoneSimulation.theta * 180 / Math.PI), 2)} degree.`;
  }
  else if(rockState.valueOf() == RockState.simulation){
    text = `${stoneObject.out_bounces} bounce`
    if (stoneObject.out_bounces != 1)
      text += `s`;
    if (stoneObject.out_meters)
      text += ` and distance: ${roundTo(stoneObject.out_meters, 2)}  m`;
  }
  else if(rockState.valueOf() == RockState.start && objectName==defaultLabel){
    text = "Grab the stone to play";
  }
  addHeadsup(document, text, x, y, objectName, fontSize);
  return text;
}

//callbacks
/*
let pose = xrFrame.getPose(preferredInputSource.gripSpace, xrViewerReferenceSpace);
if (pose) {
  // Calculate how far the motion controller is from the user's head
}

document.body.addEventListener( 'click', _ => {
  // Ask the browser to lock the pointer
  document.body.requestPointerLock = document.body.requestPointerLock ||
    document.body?.mozRequestPointerLock ||
    document.body?.webkitRequestPointerLock;
    document.body.requestPointerLock();
}, false);
*/




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

const button = document.createElement('button');  
button.innerText = "Restart";
button.onclick = function() {
  console.error("restart");
  resetRock();
};  
document.body.appendChild(button);

const addObjectClickListener = (
  Scene : THREE.Scene
  ) => {
    let startX = 0;
    let startY = 0;
    document.addEventListener("touchstart", function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockMeshes[0] && rockHandling.intersections &&
        rockHandling.rockState.valueOf() == RockState.start) {
        rockHandling.rockState = RockState.configuring;
        const touch = event.touches[0] || event.changedTouches[0];
        startX = touch.pageX;
        startY = touch.pageY;
        removeEntity(defaultLabel, Scene);
        setText(rockHandling.rockState, rockHandling.stoneSimulation,
          defaultLabel, defaultLabelFont);
      }
      else{
        startX = 0;
        startY = 0;
      }
    })
    document.addEventListener("touchend", function (event) {
        if (rockHandling.rockMeshes && rockHandling.rockState.valueOf() == RockState.configuring) {
            if (debug)
            console.debug("mouseup:" + rockHandling.rockState);
            rockHandling.rockState = RockState.simulation;
            //update label
            removeEntity(defaultLabel, Scene);
            setText(rockHandling.rockState, rockHandling.stoneSimulation,
               defaultLabel, defaultLabelFont);
            if (Controls)
              Controls.enableRotate = true;
        }
    })
   
    document.addEventListener('mousedown', function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockMeshes[0] && rockHandling.intersections &&
        rockHandling.rockState.valueOf() == RockState.start) {
        rockHandling.rockState = RockState.configuring;
        startX = event.pageX;
        startY = event.pageY;
        if (debug)
          console.debug(startY + 'mousedown' + rockHandling.rockState);
        removeEntity(defaultLabel, Scene);
        setText(rockHandling.rockState, rockHandling.stoneSimulation,
          defaultLabel, defaultLabelFont);
      }
      else{
        startX = 0;
        startY = 0;
      }
    });

    document.addEventListener('mousemove', function (event) {
      if (Raycaster){
        Raycaster.setFromCamera(Pointer, Camera);
          const intersects = Raycaster.intersectObjects(Scene.children, true);
          if (intersects.length > 0) {
            if ( intersects.length > 0 ) {
              if (rockHandling.intersections != intersects[0].object) {
                if (rockHandling.intersections && rockHandling.intersections?.material?.emissive) 
                  rockHandling.intersections.material.emissive.setHex(rockHandling.intersections.currentHex);
                if (intersects[0].object.name == 'boulder' && rockHandling.rockState.valueOf() != RockState.simulation){
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
      if (rockHandling.rockMeshes && 
        rockHandling.rockState.valueOf() == RockState.configuring) {
        //const diffX = Math.abs(event.pageX - startX);//weight
        const diffY = Math.abs(event.pageY - startY);
        const delta = 5;
        if (Controls){
          Controls.enableRotate = false;
        }
        if (diffY > delta) {
            const angleDiff = clamp(diffY *.005, -angleIncr,  angleIncr);
            rockHandling.rockMeshes[0].rotateX(angleDiff);
            rockHandling.stoneSimulation.theta = rockHandling.rockMeshes[0].rotation.x;
            //update label
            removeEntity(defaultLabel, Scene);
            setText(rockHandling.rockState, rockHandling.stoneSimulation,
               defaultLabel, defaultLabelFont);
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
          setText(rockHandling.rockState, rockHandling.stoneSimulation,
             defaultLabel, defaultLabelFont);
          if (Controls)
            Controls.enableRotate = true;
      }
    });
   
  };

  function resetRock(){
    reset(rockHandling.stoneSimulation);
    rockHandling.rockState = RockState.start;
    if (Scene){
      removeEntity(defaultLabel, Scene);
      setText(rockHandling.rockState, rockHandling.stoneSimulation,
         defaultLabel, defaultLabelFont);
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
    Renderer.shadowMap.enabled = true;
    Renderer.outputEncoding = THREE.sRGBEncoding;
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

  function render() {
      requestAnimationFrame(render);
      console.error(Clock && rockHandling.rockMeshes?.length +" sim " + (rockHandling.rockState.valueOf() == RockState.simulation));
      //update simulation
      if(Clock && rockHandling.rockMeshes?.length && 
        rockHandling.rockState.valueOf() == RockState.simulation){
        let splash = false;
        let delta = Clock.getDelta(); 
        if (delta > animDelta){
            delta = animDelta;
        }
        const res : THREE.Vector3 = simulateOneStep(rockHandling.stoneSimulation,
            delta,
            true);
        rockHandling.rockMeshes[0].position.x = res.z;
        rockHandling.rockMeshes[0].position.y = res.y + waterHeight;
        rockHandling.rockMeshes[0].position.z = res.x; //add random?

         if(splash){ //placeholder
              addHeadsup(document, "Splash", 200, 200, "splashLabel", 18);
              splash = false;
              setTimeout(() => {
                addHeadsup(document, "", 200, 200, "splashLabel", 18);
              }, 4000);
          }
        // update distance label
        if (Scene){
            removeEntity(defaultLabel, Scene);
            setText(rockHandling.rockState, rockHandling.stoneSimulation,
            defaultLabel, defaultLabelFont);
          }
        //done
        if(rockHandling.rockMeshes[0].position.y <= minFloorHeight ||
             rockHandling.rockMeshes[0].position.z > 90){
            if (debug)
            console.debug("done");
            rockHandling.rockState = RockState.simulationDone;
            setTimeout(() => {
               resetRock();
            }, resetTime);
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
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    const cube = new THREE.Mesh( geometry, material );
    cube.position.y = 2;
    cube.castShadow = true;
    //Scene.add( cube );

    const geometry1 = new THREE.BoxGeometry( 3, 1, 3 );
    const material1 = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    const cube1 = new THREE.Mesh( geometry, material );

    cube1.receiveShadow = true;
    //Scene.add( cube1 );

    resetRock();
    addHeadsup(document, "Skip a stone", 100, 50, "header", 22);

    const { Light, Bounce } = makeLights();
    const cameraHelper = new THREE.CameraHelper(Light.shadow.camera);
    if (debug)
    Scene.add(cameraHelper);

    const helper = new THREE.DirectionalLightHelper(Light);
    if (debug)
    Scene.add(helper)

    Scene.add(Bounce);
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
