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

const g_Pointer = new THREE.Vector2();

function onPointerMove( event : any ) {
  g_Pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  g_Pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

let app : any = null;

class App {
  // WebGL Scene globals
  Renderer : THREE.WebGLRenderer | null | any = null;
  Scene : THREE.Scene | null = null;
  CameraControls : OrbitControls | null = null;
  Camera : THREE.Camera | null = null;
  CameraGroup : THREE.Group | null = null;
  Clock: THREE.Clock | null = null;
  Sky : THREE.Mesh | null = null;
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
  };

  render(_ : any, frame : any) {
    /*
    if (frame) {
      if (this.hitTestSourceRequested === false) {
        this.requestHitTestSource();
      }
      if (this.hitTestSource) {
        this.getHitTestResults(frame);
      }
    }
    this.renderer.render(this.scene, this.camera);
    */
  }

  onSelect() {
    if (this.reticle.visible) {
      this.box.position.setFromMatrixPosition(this.reticle.matrix);
      this.box.position.y += this.box.geometry.parameters.height / 2;
      this.box.visible = true;
    } 
  }
  initXR(){
    app.Renderer.xr.enabled = true;
    app.hitTestSourceRequested = false;
    app.hitTestSource = null;
    app.controller = app.Renderer.xr.getController(0);
    app.controller.addEventListener('select', app.onSelect.bind(app));
    document.body.appendChild(ARButton.createButton(app.Renderer));
  }
  initUI(documentObj : Document) {
    if (this.Scene)
    addButton(documentObj, resetRock, this.Scene, rockHandling);
    addHeadsup(documentObj, headsUpStartText, 100, 50, 'header', 22);
  }
}

const rockHandling : RockHandling = {
  rockState: RockState.start,
  rockMeshes: Array<THREE.Mesh>(),
  intersections : null,
  stoneSimulation : Object.create(StoneDefault)
};

function render() {
      requestAnimationFrame(render);
      //update simulation
      if(app.Clock && rockHandling.rockMeshes?.length && 
        rockHandling.rockState.valueOf() == RockState.simulation){
        let splash = false;
        let delta = app.Clock.getDelta(); 
        if (delta > animDelta){
            delta = animDelta;
        }
        const res : THREE.Vector3 = simulateOneStep(rockHandling.stoneSimulation,
            delta, true);
        rockHandling.rockMeshes[0].position.x = res.z;
        rockHandling.rockMeshes[0].position.y = res.y + waterHeight;
        if (rockHandling.rockMeshes[0].position.y > 0 && 
          res.y + waterHeight <=  waterHeight){
          splash = true;
        }
        rockHandling.rockMeshes[0].position.y = res.y + waterHeight;
        rockHandling.rockMeshes[0].position.z = res.x;

         if(splash){
            rain(.25, 12, 0.005, rockHandling.rockMeshes[0].position.x,
                rockHandling.rockMeshes[0].position.z, .3, .3, 100);
                splash = false;
                if(debug)
                {
                  addHeadsup(document, "Splash", 300, 300, "splashLabel", 18);
                  setTimeout(() => {
                    addHeadsup(document, "", 300, 300, "splashLabel", 18);
                  }, 1200);
            }
          }
        // update distance label
        if (app.Scene){
            removeEntity(defaultLabel, app.Scene);
            setText(rockHandling, defaultLabel, defaultLabelFont);
        }
        // simulation finished
        if(rockHandling.rockMeshes[0].position.y <= minFloorHeight ||
             rockHandling.rockMeshes[0].position.z > 90){
            if (debug)
            console.debug("done");
            rockHandling.rockState = RockState.simulationDone;
            setTimeout(() => {
                if (app.Scene)
                resetRock(app.Scene, rockHandling);
            }, resetTime);
          }
      }
      app.Renderer.setAnimationLoop(function (time : number) {
        rippleCallbacks.forEach(cb => cb(time));
        app.Renderer.render(app.Scene, app.Camera);
      });
      app.Renderer.render(app.Scene, app.Camera)
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
        rockHandling.rockMeshes.push(rock);
        app.Scene.add(rock);
        app.Scene.add(rock2);
    })();

    const { Light, Bounce } = makeLights();
    const cameraHelper = new THREE.CameraHelper(Light.shadow.camera);
    app.Sky = makeSky();
    app.Scene.add(cameraHelper);;
    const helper = new THREE.DirectionalLightHelper(Light);
    if (debug)
    app.Scene.add(helper)
    app.Scene.add(app.Sky);
    app.Scene.add(Bounce);
    app.Scene.add(Light);
    app.Scene.add(app.Camera);
    app.Scene.add(app.CameraGroup);
    app. Scene.add(makeFloor());
    app.Scene.add(WaterMesh);
   
    let geometry = new THREE.RingGeometry(0.08, 0.10, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial;
    app.reticle = new THREE.Mesh(geometry, material);
    app.reticle.matrixAutoUpdate = false;
    app.reticle.visible = false;
    app.Scene.add(app.reticle);
  
    const geometry1 = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material1 = new THREE.MeshStandardMaterial({ color: 0x5853e6 });
    app.box = new THREE.Mesh(geometry1, material1);
    app.box.visible = false;
    app.Scene.add(app.box);
 
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
        resetRock(Scene, rockHandling);
      }
    };
    document.addEventListener("touchstart", function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockMeshes[0] && rockHandling.intersections &&
        rockHandling.rockState.valueOf() == RockState.start) {
        rockHandling.rockState = RockState.configuring;
        const touch = event.touches[0] || event.changedTouches[0];
        startX = touch.pageX;
        startY = touch.pageY;
        removeEntity(defaultLabel, Scene);
        setText(rockHandling, defaultLabel, defaultLabelFont);
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
            setText(rockHandling, defaultLabel, defaultLabelFont);
            if (app.CameraControls)
            app.CameraControls.enableRotate = true;
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
        setText(rockHandling, defaultLabel, defaultLabelFont);
      }
      else{
        startX = 0;
        startY = 0;
      }
    });

    document.addEventListener('mousemove', function (event) {
      if (app.Raycaster){
        app.Raycaster.setFromCamera(g_Pointer, app.Camera);
          const intersects = app.Raycaster.intersectObjects(Scene.children, true);
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
        if (app.CameraControls){
          app.CameraControls.enableRotate = false;
        }
        if (diffY > delta) {
            const angleDiff = clamp(diffY *.005, -angleIncr,  angleIncr);
            rockHandling.rockMeshes[0].rotateX(angleDiff);
            rockHandling.stoneSimulation.theta = rockHandling.rockMeshes[0].rotation.x;
            //update label
            removeEntity(defaultLabel, Scene);
            setText(rockHandling, defaultLabel, defaultLabelFont);
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
          setText(rockHandling, defaultLabel, defaultLabelFont);
          if (app.CameraControls)
          app.CameraControls.enableRotate = true;
      }
    });
   
};

function setupRenderer(documentObj : Document){
  const { Camera, CameraGroup } = makeCamera();
  app.Camera = Camera;
  app.CameraGroup = CameraGroup;
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

  //orbit
  app.CameraControls = new OrbitControls(Camera, app.Renderer.domElement);
  app.CameraControls.maxPolarAngle = Math.PI * 0.5;
  app.CameraControls.maxDistance = 10;
  Camera.position.set(0, 1.6, -5);
  app.CameraControls.target = new THREE.Vector3(0, 1, 0);
  app.CameraControls.update();

  document.body.appendChild(app.Renderer.domElement);
  window.addEventListener('resize', onWindowResize, false);
 
  function onWindowResize() {
        app.Camera.aspect = window.innerWidth / window.innerHeight;
        app.Camera.updateProjectionMatrix();
        app.Renderer.setSize(window.innerWidth, window.innerHeight);
    }
    app.Renderer.setAnimationLoop(render);
  }

function setup(documentObj : Document, resetRockFct : any){
  const renderer = setupRenderer(documentObj);
  const scene = setupScene(documentObj);
  initSimulation(rockHandling);
  app.initUI(documentObj);
  app.initXR();
  addObjectClickListener(scene);
}


window.addEventListener('DOMContentLoaded', () => {
  app = new App();
  setup(document, resetRock);
});


