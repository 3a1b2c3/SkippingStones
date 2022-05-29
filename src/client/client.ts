import * as THREE from 'three'; 
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { models } from "./lib/meshes";
import { makeFloor, WaterMesh, rippleCallbacks, rain } from "./lib/water";
import { makeLights, makeSky, makeCamera, removeEntity, makeReticle, makeBox } from "./lib/scene";
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
const maxRipples = 8;

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
  session : any;
  reticle: THREE.Mesh | null = null;
  box : THREE.Mesh | null = null;
  rockHandling : RockHandling | any;
  constructor() {
    this.rockHandling = {
      rockState: RockState.start,
      rockMeshes: Array<THREE.Mesh>(),
      intersections : null,
      stoneSimulation : Object.create(StoneDefault)
    };
  };

  initSimulation(){
    if (this.Scene){
      resetRock(this.Scene, this.rockHandling);
    }
    this.rockHandling.rockState = RockState.start;
    this.rockHandling.rockMeshes = Array<THREE.Mesh>(),
    this.rockHandling.intersections = null;
    this.rockHandling.stoneSimulation = Object.create(StoneDefault);
  }
  
  renderXR(_ : any, frame : any) {
    if (frame) {
      if (this.Sky)
        this.Sky.visible = false;
      if (this.hitTestSourceRequested === false) {
        this.requestHitTestSource();
      }
      if (this.hitTestSource) {
        this.getHitTestResults(frame);
      }
    }
    this.Renderer.render(this.Scene, this.Camera);
  }

  async requestHitTestSource() {
    this.session = this.Renderer.xr.getSession();
    this.session.addEventListener('end', () => {
      this.hitTestSourceRequested = false;
      this.hitTestSource = null;
    });
    const referenceSpace = await this.session.requestReferenceSpace('viewer');
    this.hitTestSource = await this.session.requestHitTestSource({ space: referenceSpace, entityTypes: ['plane'] });
    this.hitTestSourceRequested = true;
  }

  getHitTestResults(frame : any) {
    const hitTestResults = frame.getHitTestResults(this.hitTestSource);
    if (hitTestResults.length) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(this.Renderer.xr.getReferenceSpace());
      if (this.reticle){
      this.reticle.visible = true;
      this.reticle.matrix.fromArray(pose.transform.matrix);
      }
    } else if (this.reticle){
      this.reticle.visible = false;
    }
  }

  onSelect() {
    if (this?.reticle?.visible && this.box) {
      this.box.position.setFromMatrixPosition(this.reticle.matrix);
      //this.box.position.y += this.box.geometry.parameters.height / 2;
      this.box.visible = true;
    } 
  }
  initXR(documentObj : Document) {
    this.Renderer.xr.enabled = true;
    this.hitTestSourceRequested = false;
    this.hitTestSource = null;
    this.controller = this.Renderer.xr.getController(0);
    this.controller.addEventListener('select', this.onSelect.bind(this));
    documentObj.body.appendChild(ARButton.createButton(this.Renderer));
  }

  initUI(documentObj : Document) {
    if (this.Scene){
      addButton(documentObj, resetRock, this.Scene, this.rockHandling);
    }
    addHeadsup(documentObj, headsUpStartText, 100, 50, 'header', 22);
  }
  
  setupRenderer(documentObj : Document){
    const { Camera, CameraGroup } = makeCamera();
    this.Camera = Camera;
    this.CameraGroup = CameraGroup;
    this.Renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
     });
    this.Renderer.setPixelRatio(window.devicePixelRatio);
    this.Renderer.setSize(window.innerWidth, window.innerHeight);
    this.Renderer.shadowMap.enabled = true;
    this.Renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    //this.Renderer.outputEncoding = THREE.sRGBEncoding;
    this.Renderer.setSize(window.innerWidth, window.innerHeight);
  
    //orbit
    this.CameraControls = new OrbitControls(Camera, this.Renderer.domElement);
    this.CameraControls.maxPolarAngle = Math.PI * 0.5;
    this.CameraControls.maxDistance = 10;
    Camera.position.set(0, 1.6, -5);
    this.CameraControls.target = new THREE.Vector3(0, 1, 0);
    this.CameraControls.update();
  
    documentObj.body.appendChild(this.Renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);
   
    function onWindowResize(this : any) {
          app.Camera.aspect = window.innerWidth / window.innerHeight;
          app.Camera.updateProjectionMatrix();
          app.Renderer.setSize(window.innerWidth, window.innerHeight);
      }
      this.Renderer.setAnimationLoop(render);
    }

  setupScene(){
    this.Scene = new THREE.Scene();
    this.Clock = new THREE.Clock();
    this.Raycaster = new THREE.Raycaster();
    const modelsPromise = (async function () {
        const {
            rock,
            rock2,
        } = await models;
        app.rockHandling.rockMeshes.push(rock);
        app.Scene.add(rock);
        app.Scene.add(rock2);
    })();

    this.Sky = makeSky();
    const { Light, Bounce } = makeLights();
    this.box = makeBox();
    this.reticle = makeReticle();
    const helper = new THREE.DirectionalLightHelper(Light);
    const cameraHelper = new THREE.CameraHelper(Light.shadow.camera);
    if (this.Camera)
      this.Scene.add(this.Camera);
    if (this.CameraGroup)
      this.Scene.add(this.CameraGroup);
    this.Scene.add(cameraHelper);
    if (debug)
      this.Scene.add(helper)
    this.Scene.add(this.Sky);
    this.Scene.add(Bounce);
    this.Scene.add(Light);
    this. Scene.add(makeFloor());
    this.Scene.add(WaterMesh);
    this.Scene.add(this.reticle);
    this.Scene.add(this.box);

    return this.Scene;
  }

  setup(documentObj : Document){
    this.setupRenderer(documentObj);
    const scene = this.setupScene();
    this.initSimulation();
    this.initUI(documentObj);
    this.initXR(documentObj);
    if (this.Raycaster && this.CameraControls && this.Camera){
      addObjectClickListener(scene, this.rockHandling, this.Raycaster, this.Camera, this.CameraControls);
    }
  }
};

function render() {
      requestAnimationFrame(render);
      if (app.session && app.Sky.visible){
        app.Sky.visible = false;
      }
      else if (!app.Sky.visible){
        app.Sky.visible = true;
      }
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
            rain(.25, maxRipples, 0.005, app.rockHandling.rockMeshes[0].position.x,
                app.rockHandling.rockMeshes[0].position.z, .3, .3, 100);
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
            setText(app.rockHandling, defaultLabel, defaultLabelFont);
        }
        // simulation finished
        if(app.rockHandling.rockMeshes[0].position.y <= minFloorHeight ||
             app.rockHandling.rockMeshes[0].position.z > 90){
            if (debug){
              console.debug("done");
            }
            app.rockHandling.rockState = RockState.simulationDone;
            setTimeout(() => {
                if (app.Scene){
                  resetRock(app.Scene, app.rockHandling);
                }
            }, resetTime);
          }
      }
      app.Renderer.setAnimationLoop(function (time : number) {
        rippleCallbacks.forEach(cb => cb(time));
        app.Renderer.render(app.Scene, app.Camera);
      });
      app.Renderer.render(app.Scene, app.Camera)
}


// callbacks
const addObjectClickListener = (
  Scene : THREE.Scene,
  rockHandling : RockHandling,
  Raycaster : THREE.Raycaster,
  Camera : THREE.Camera,
  CameraControls : OrbitControls
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
      if (isEscape && Scene){
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
            rockHandling.rockState = RockState.simulation;
            //update label
            removeEntity(defaultLabel, Scene);
            setText(rockHandling, defaultLabel, defaultLabelFont);
            if (CameraControls){
              CameraControls.enableRotate = true;
            }
        }
    })
   
    document.addEventListener('mousedown', function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockMeshes[0] && rockHandling.intersections &&
        rockHandling.rockState.valueOf() == RockState.start){
        rockHandling.rockState = RockState.configuring;
        startX = event.pageX;
        startY = event.pageY;
        if (debug){
          console.debug(startY + 'mousedown' + rockHandling.rockState);
        }
        removeEntity(defaultLabel, Scene);
        setText(rockHandling, defaultLabel, defaultLabelFont);
      }
      else{
        startX = 0;
        startY = 0;
      }
    });

    document.addEventListener('mousemove', function (event) {
      if (Raycaster){
        Raycaster.setFromCamera(g_Pointer, Camera);
          const intersects = Raycaster.intersectObjects(Scene.children, true);
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
      if (rockHandling.rockMeshes && 
        rockHandling.rockState.valueOf() == RockState.configuring) {
        //const diffX = Math.abs(event.pageX - startX);//weight
        const diffY = Math.abs(event.pageY - startY);
        const delta = 5;
        if (CameraControls){
          CameraControls.enableRotate = false;
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
          if (CameraControls)
          CameraControls.enableRotate = true;
      }
    });
  }

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
  app.setup(document, resetRock);
});


