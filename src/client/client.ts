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
const defaultLabelY = 1;
const defaultLabelZ = 1;
const defaultLabelFont = 14;

//rock handling
let g_rockState: RockState = RockState.start;
const g_rockMeshes: THREE.Mesh[] = [];
let g_intersections : null | any;//THREE.Intersection;


// XR globals
const xrImmersiveRefSpace = null;
const inlineViewerHelper = null;

// WebGL Scene globals, make object 
let Renderer : any = null;
let Scene : THREE.Scene | null = null;
let Controls : OrbitControls |null = null;

//TODO init in setup
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
  else if (g_rockState.valueOf() == RockState.configuring){
    text = "Current angle:"  + roundTo((StoneDefault.theta * 180 / Math.PI), 2) + " degree";
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
      if (g_rockMeshes && g_rockMeshes[0] && g_intersections &&
        g_rockState.valueOf() == RockState.start) {
        g_rockState = RockState.configuring;
        startX = event.pageX;
        startY = event.pageY;
        if (debug)
          console.debug(startY + 'mousedown' + g_rockState);
        removeEntity(defaultLabel, Scene);
        const spritey = setText(g_rockState, StoneDefault, -1, 
          defaultPositionY * defaultLabelY, defaultLabelZ, defaultLabel, defaultLabelFont);
        Scene.add(spritey);
      }
      else{
        startX = 0;
        startY = 0;
      }
    });


    document.addEventListener('mousemove', function (event) {
      if (g_intersections && g_rockMeshes && g_rockState.valueOf() == RockState.configuring) {
        //const diffX = Math.abs(event.pageX - startX);//weight
        const diffY = Math.abs(event.pageY - startY);
        const delta = 5;
        if (Controls){
          Controls.enableRotate = false;
        }
        if (diffY > delta) {
            const angleDiff = clamp(diffY *.001, -.03, .03);
            g_rockMeshes[0].rotateX(angleDiff);
            StoneDefault.theta = g_rockMeshes[0].rotation.x;
            //update label
            removeEntity(defaultLabel, Scene);
            const spritey = setText(g_rockState, StoneDefault, -1, defaultPositionY * defaultLabelY, 
              defaultLabelZ, defaultLabel, defaultLabelFont);
            Scene.add(spritey);
          }
        }
    });

    document.addEventListener('mouseup', function (event) {
      if (g_rockMeshes && g_rockState.valueOf() == RockState.configuring) {
          if (debug)
          console.debug("mouseup:" + g_rockState);
          g_rockState = RockState.simulation;
          //update label
          removeEntity(defaultLabel, Scene);
          const spritey = setText(g_rockState, StoneDefault, -1, defaultPositionY * defaultLabelY, 
            defaultLabelZ, defaultLabel, defaultLabelFont);
          Scene.add(spritey);
          if (Controls)
            Controls.enableRotate = true;
      }
    });
   
  };

  function resetRock(){
    init(StoneDefault);
    g_rockState = RockState.start;
    if (Scene){
      removeEntity(defaultLabel, Scene);
      const spritey = setText(g_rockState, StoneDefault, -1, defaultPositionY * defaultLabelY,
        defaultLabelZ, defaultLabel, defaultLabelFont);
      Scene.add(spritey);
    }
    if (g_rockMeshes && g_rockMeshes[0]){
      g_rockMeshes[0].position.set(0, defaultPositionY, 0);
      g_rockMeshes[0].rotateX(defaultRoationX);
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
      if (Scene && Raycaster && g_rockMeshes?.length && g_rockState.valueOf() != RockState.simulation){
          Raycaster.setFromCamera(Pointer, Camera);
          const intersects = Raycaster.intersectObjects(Scene.children, true);
          if (intersects.length > 0) {
            if ( intersects.length > 0 ) {
              if (g_intersections != intersects[0].object ) {
                if (g_intersections && g_intersections?.material?.emissive) 
                  g_intersections.material.emissive.setHex(g_intersections.currentHex );
                if (intersects[0].object.name == 'boulder'){
                    g_intersections = intersects[0].object;
                }
                else{
                  g_intersections = null;
                }
                if (g_intersections && g_intersections?.material?.emissive){
                  g_intersections.currentHex = g_intersections.material.emissive.getHex();
                  g_intersections.material.emissive.setHex( 0xff0000 );
                }
              }
            } else {
              if (g_intersections && g_intersections?.material?.emissive)
                g_intersections.material.emissive.setHex(g_intersections.currentHex );
              g_intersections = null;
            }
          }
      }
      //update simulation
      if(Clock && g_rockMeshes?.length && g_rockState.valueOf() == RockState.simulation){
        let splash = false;
        let delta = Clock.getDelta();
        if (delta > 0.01){
              delta = 0.01;
        }
        if (g_rockMeshes[0].position.y > floorHeight *defaultLabelY){
          const res : THREE.Vector3 = simulateOneStep(StoneDefault, delta);
          if (debug){
            if (g_rockMeshes[0].position.y > waterHeight && 
              g_rockMeshes[0].position.y - delta < waterHeight){
              //splash = true;
            }
            g_rockMeshes[0].position.z += delta;
            g_rockMeshes[0].position.y -= delta/5;
            StoneDefault.meters = g_rockMeshes[0].position.z;
            if (debug && false)
              console.debug("g_rockMeshes[0].position.y" + g_rockMeshes[0].position.y);
          }
          else{
            g_rockMeshes[0].position.x = res.z;
            g_rockMeshes[0].position.y = res.y + waterHeight;
            g_rockMeshes[0].position.z = res.x; //add random?
          }
          if(splash){
            if (Scene){
              const spritey = makeTextSprite("Splash", { fontsize : 12, textColor: {r:255, g:255, b:255, a:1.0}},
               "splashLabel", document);
              spritey.position.set(g_rockMeshes[0].position.x, g_rockMeshes[0].position.y, g_rockMeshes[0].position.z);
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
            const spritey = setText(g_rockState, StoneDefault, -1, defaultPositionY * defaultLabelY, 
              defaultLabelZ, defaultLabel, defaultLabelFont);
            Scene.add(spritey);
          }
          //done
          if(g_rockMeshes[0].position.y <= floorHeight *1.2 || g_rockMeshes[0].position.z > 90){
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
        g_rockMeshes.push(rock);
        addObjectClickListener(
          Scene
        );
        Scene.add(rock);
        Scene.add(rock2);
    })();
    resetRock();

    const spritey = setText(g_rockState, StoneDefault, -1,
      defaultPositionY * 1.3, defaultLabelZ, "header", 18);
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
