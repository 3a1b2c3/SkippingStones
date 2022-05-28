import * as THREE from 'three'; 
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { models } from "./lib/meshes";
import { makeFloor, WaterMesh, rippleCallbacks, rain } from "./lib/water";
import { makeLights, makeSky, makeCamera, removeEntity } from "./lib/Scene";
import { StoneDefault, simulateOneStep } from "./lib/skipping";
import { RockState, RockHandling} from './types/types'
import { waterHeight, floorHeight, defaultLabel, defaultLabelFont} from "./lib/constants";
import { addHeadsup, addButton, setText, headsUpStartText } from "./lib/headsUp";
import { resetRock } from "./lib/rock";
import { clamp } from "./lib/helper";

const debug = false;
const minFloorHeight = floorHeight * 1.1;
const animDelta = 0.02;
const resetTime = 5000;
const angleIncr = .03;

const Pointer = new THREE.Vector2();

function onPointerMove( event : any ) {
  Pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  Pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

let app : any = null;

class App {
  // WebGL Scene globals
  Renderer : THREE.WebGLRenderer | null | any = null;
  Scene : THREE.Scene | null = null;
  CameraControls : OrbitControls | null = null;
  Clock: THREE.Clock | null = null;
  Raycaster : THREE.Raycaster | null = null;
  hitTestSourceRequested = false;
  hitTestSource : any;
  controller : any;
  reticle : any;
  box : any;
  rockHandling : RockHandling | any;
  constructor() {
    this.rockHandling = {
        rockState: RockState.start,
        rockMeshes: Array<THREE.Mesh>(),
        intersections : null,
        stoneSimulation : Object.create(StoneDefault)
    };
  }
}

const { Camera, CameraGroup } = makeCamera();


function render() {
      requestAnimationFrame(render);
      //update simulation
      if(app.Clock && app.rockHandling.rockMeshes?.length && 
        app.rockHandling.rockState.valueOf() == RockState.simulation){
        let splash = false;
        let delta = app.Clock.getDelta(); 
        if (delta > animDelta){
            delta = animDelta;
        }
        const res : THREE.Vector3 = simulateOneStep(app.rockHandling.stoneSimulation,
            delta, true);
            app.rockHandling.rockMeshes[0].position.x = res.z;
        app.rockHandling.rockMeshes[0].position.y = res.y + waterHeight;
        if (app.rockHandling.rockMeshes[0].position.y > 0 && 
          res.y + waterHeight <=  waterHeight){
          splash = true;
        }
        app.rockHandling.rockMeshes[0].position.y = res.y + waterHeight;
        app.rockHandling.rockMeshes[0].position.z = res.x;

        if(splash){
              rain(.25, 4, 0.005, app.rockHandling.rockMeshes[0].position.x,
                app.rockHandling.rockMeshes[0].position.z, .3, .3, 40);
                splash = false;
                if(debug)
                {
                  addHeadsup(document, "Splash", 300, 300, "splashLabel", 18);
                  setTimeout(() => {
                    addHeadsup(document, "", 300, 300, "splashLabel", 18);
                  }, 1200);
                }
                //callback for splashes and ripples
                app.Renderer.setAnimationLoop(function (time : number) {
                  rippleCallbacks.forEach(cb => cb(time));
                  app.Renderer.render(app.Scene, Camera);
                });
          }
        // update distance label
        if (app.Scene){
            removeEntity(defaultLabel, app.Scene);
            setText(app.rockHandling.rockState, app.rockHandling.stoneSimulation,
            app.rockHandling, defaultLabel, defaultLabelFont);
          }
        //done
        if(app.rockHandling.rockMeshes[0].position.y <= minFloorHeight ||
            app.rockHandling.rockMeshes[0].position.z > 90){
            if (debug)
            console.debug("done");
            app.rockHandling.rockState = RockState.simulationDone;
            setTimeout(() => {
                if (app.Scene)
                resetRock(app.Scene, app.rockHandling);
            }, resetTime);
          }
      }
      app.Renderer.setAnimationLoop(function (time : number) {
        rippleCallbacks.forEach(cb => cb(time));
        app.Renderer.render(app.Scene, Camera);
      });
      app.Renderer.render(app.Scene, Camera)
}

function setupScene(documentObj : Document){
    app.Scene = new THREE.Scene();
    app.Clock = new THREE.Clock();
    app.Raycaster = new THREE.Raycaster();
    const modelsPromise = (async function () {
        const {
            rock,
            rock2,
        } = await models;
        app.rockHandling.rockMeshes.push(rock);
        app.Scene.add(rock);
        app.Scene.add(rock2);
    })();

    const { Light, Bounce } = makeLights();
    const cameraHelper = new THREE.CameraHelper(Light.shadow.camera);
    const sky = makeSky();
    app.Scene.add(cameraHelper);;
    const helper = new THREE.DirectionalLightHelper(Light);
    if (debug)
    app.Scene.add(helper)
    app.Scene.add(sky);
    app.Scene.add(Bounce);
    app.Scene.add(Light);
    app.Scene.add(Camera);
    app.Scene.add(CameraGroup);
    app. Scene.add(makeFloor());
    app.Scene.add(WaterMesh);
    return app.Scene;
}

function initSimulation(rockh : RockHandling){
  if (app.Scene)
  resetRock(app.Scene, rockh);
  rockh.rockState = RockState.start;
  rockh.rockMeshes = Array<THREE.Mesh>(),
  rockh.intersections = null;
  rockh.stoneSimulation = Object.create(StoneDefault);
}

function initUI(documentObj : Document) {
  if (app.Scene)
  addButton(documentObj, resetRock, app.Scene, app.rockHandling);
  addHeadsup(documentObj, headsUpStartText, 100, 50, 'header', 22);
}

//callbacks
const addObjectClickListener = (
  Scene : THREE.Scene
  ) => {
    let startX = 0;
    let startY = 0;
    // reset game
    document.onkeydown = function(evt) {
      evt = evt || window.event;
      let isEscape = false;
      if ("key" in evt) {
          isEscape = (evt.key === "Escape" || evt.key === "Esc");
      } else {
          isEscape = (evt.keyCode === 27);
      }
      if (isEscape && Scene) {
        resetRock(Scene, app.rockHandling);
      }
    };
    document.addEventListener("touchstart", function (event) {
      if (app.rockHandling.rockMeshes && app.rockHandling.rockMeshes[0] && app.rockHandling.intersections &&
        app.rockHandling.rockState.valueOf() == RockState.start) {
        app.rockHandling.rockState = RockState.configuring;
        const touch = event.touches[0] || event.changedTouches[0];
        startX = touch.pageX;
        startY = touch.pageY;
        removeEntity(defaultLabel, Scene);
        setText(app.rockHandling.rockState, app.rockHandling.stoneSimulation,
          app.rockHandling, app.rockHandling.defaultLabel, defaultLabelFont);
      }
      else{
        startX = 0;
        startY = 0;
      }
    })
    document.addEventListener("touchend", function (event) {
        if (app.rockHandling.rockMeshes && app.rockHandling.rockState.valueOf() == RockState.configuring) {
            if (debug)
            console.debug("mouseup:" + app.rockHandling.rockState);
            app.rockHandling.rockState = RockState.simulation;
            //update label
            removeEntity(defaultLabel, Scene);
            setText(app.rockHandling.rockState, app.rockHandling.stoneSimulation,
              app.rockHandling, app.rockHandling.defaultLabel, defaultLabelFont);
            if (app.CameraControls)
            app.CameraControls.enableRotate = true;
        }
    })
   
    document.addEventListener('mousedown', function (event) {
      if (app.rockHandling.rockMeshes && app.app.rockHandling.rockMeshes[0] && app.rockHandling.intersections &&
        app.rockHandling.rockState.valueOf() == RockState.start) {
        app.rockHandling.rockState = RockState.configuring;
        startX = event.pageX;
        startY = event.pageY;
        if (debug)
          console.debug(startY + 'mousedown' + app.rockHandling.rockState);
        removeEntity(defaultLabel, Scene);
        setText(app.rockHandling.rockState, app.rockHandling.stoneSimulation,
          app.rockHandling, app.rockHandling.defaultLabel, defaultLabelFont);
      }
      else{
        startX = 0;
        startY = 0;
      }
    });

    document.addEventListener('mousemove', function (event) {
      if (app.Raycaster){
        app.Raycaster.setFromCamera(Pointer, Camera);
          const intersects = app.Raycaster.intersectObjects(Scene.children, true);
          if (intersects.length > 0) {
            if ( intersects.length > 0 ) {
              if (app.rockHandling.intersections != intersects[0].object) {
                if (app.rockHandling.intersections && app.rockHandling.intersections?.material?.emissive) 
                  app.rockHandling.intersections.material.emissive.setHex(app.rockHandling.intersections.currentHex);
                if (intersects[0].object.name == 'boulder' && app.rockHandling.rockState.valueOf() != RockState.simulation){
                    app.rockHandling.intersections = intersects[0].object;
                }
                else{
                  app.rockHandling.intersections = null;
                }
                if (app.rockHandling.intersections && app.rockHandling.intersections?.material?.emissive){
                  app.rockHandling.intersections.currentHex = app.rockHandling.intersections.material.emissive.getHex();
                  app.rockHandling.intersections.material.emissive.setHex( 0xff0000 );
                }
              }
            } else {
              if (app.rockHandling.intersections && app.rockHandling.intersections?.material?.emissive)
                app.rockHandling.intersections.material.emissive.setHex(app.rockHandling.intersections.currentHex);
              app.rockHandling.intersections = null;
            }
          }
        }
      if (app.rockHandling.rockMeshes && 
        app.rockHandling.rockState.valueOf() == RockState.configuring) {
        //const diffX = Math.abs(event.pageX - startX);//weight
        const diffY = Math.abs(event.pageY - startY);
        const delta = 5;
        if (app.CameraControls){
          app.CameraControls.enableRotate = false;
        }
        if (diffY > delta) {
            const angleDiff = clamp(diffY *.005, -angleIncr,  angleIncr);
            app.rockHandling.rockMeshes[0].rotateX(angleDiff);
            app.rockHandling.stoneSimulation.theta = app.rockHandling.rockMeshes[0].rotation.x;
            //update label
            removeEntity(defaultLabel, Scene);
            setText(app.rockHandling.rockState, app.rockHandling.stoneSimulation,
              app.rockHandling, app.rockHandling.defaultLabel, defaultLabelFont);
          }
        }
    });

    document.addEventListener('mouseup', function (event) {
      if (app.rockHandling.rockMeshes && app.rockHandling.rockState.valueOf() == RockState.configuring) {
          if (debug)
          console.debug("mouseup:" + app.rockHandling.rockState);
          app.rockHandling.rockState = RockState.simulation;
          //update label
          removeEntity(defaultLabel, Scene);
          setText(app.rockHandling.rockState, app.rockHandling.stoneSimulation,
            app.rockHandling, app.rockHandling.defaultLabel, defaultLabelFont);
          if (app.CameraControls)
          app.CameraControls.enableRotate = true;
      }
    });
   
};
function setupAR(documentObj : Document){
  app.Renderer.xr.enabled = true;
  document.body.appendChild(ARButton.createButton(app.Renderer));
}

function setupRenderer(documentObj : Document){
  app.Renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
   });
    app.Renderer.setPixelRatio(window.devicePixelRatio);
    app.Renderer.setSize(window.innerWidth, window.innerHeight);
    app.Renderer.shadowMap.enabled = true;
    app.Renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    //app.Renderer.outputEncoding = THREE.sRGBEncoding;
    app.Renderer.setSize(window.innerWidth, window.innerHeight);
    app.Renderer.setPixelRatio(window.devicePixelRatio);

    //orbit
    app.CameraControls = new OrbitControls(Camera, app.Renderer.domElement);
    app.CameraControls.maxPolarAngle = Math.PI * 0.5;
    app.CameraControls.maxDistance = 10;
    Camera.position.set(0, 1.6, -5);
    app.CameraControls.target = new THREE.Vector3(0, 1, 0);
    app.CameraControls.update();
    document.body.appendChild(app.Renderer.domElement);
    document.body.appendChild(app.Renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);
 
    function onWindowResize() {
        Camera.aspect = window.innerWidth / window.innerHeight;
        Camera.updateProjectionMatrix();
        app.Renderer.setSize(window.innerWidth, window.innerHeight);
    }
    app.Renderer.setAnimationLoop(render);
}

function setup(documentObj : Document, resetRockFct : any){
      const renderer = setupRenderer(documentObj);
      setupAR(documentObj);
      const scene = setupScene(documentObj);
      initSimulation(app.rockHandling);
      initUI(documentObj);
      addObjectClickListener(scene);
}


window.addEventListener('DOMContentLoaded', () => {
  app = new App();
  setup(document, resetRock);
});


