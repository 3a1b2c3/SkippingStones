import { Mesh, HemisphereLight, Scene, WebGLRenderer, BoxGeometry, 
  MeshStandardMaterial, MeshBasicMaterial, RingGeometry, sRGBEncoding,
  Vector2, Clock, Raycaster } from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { OrbitControls } from 'three/examples/jsm/Controls/OrbitControls';

import { models, defaultPositionY, defaultRoationX } from "./lib/meshes";
import { makeFloor, WaterMesh, rippleCallbacks, rain } from "./lib/water";
import { makeLights, makeCamera, removeEntity } from "./lib/Scene";
import { StoneDefault, simulateOneStep, reset } from "./lib/skipping";
import { stone, RockState, RockHandling} from './types/types'
import { waterHeight, floorHeight} from "./lib/constants";
import { addHeadsup, addButton } from "./lib/headsUp";
import { roundTo, clamp } from "./lib/helper";

const Pointer = new Vector2();

function onPointerMove( event : any ) {
  Pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  Pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

class App {
    // WebGL Scene globals, make object 
  Controls : OrbitControls | null = null;
  Clock: Clock | null = null;
  Raycaster : THREE.Raycaster | null = null;
  //Pointer : Vector2;
  camera : any;
  scene : any;
  renderer : any;
  hitTestSourceRequested = false;
  hitTestSource : any;
  controller : any;
  reticle : any;
  box : any;

  constructor() {
    const { Camera, CameraGroup } = makeCamera();
    this.camera = Camera;
    this.scene = new Scene();
  
    this.renderer = new WebGLRenderer({
        antialias: true,
        alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = sRGBEncoding;
    document.body.appendChild(this.renderer.domElement);
  
    this.initXR();
    this.initScene();
  
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  initXR() {
    this.renderer.xr.enabled = true;
    document.body.appendChild(ARButton.createButton(this.renderer, {sessionInit: {requiredFeatures: ['hit-test']}}));

    this.hitTestSourceRequested = false;
    this.hitTestSource = null;

    this.controller = this.renderer.xr.getController(0);
    this.controller.addEventListener('select', this.onSelect.bind(this));
  }

  initScene() {
    let geometry = new RingGeometry(0.08, 0.10, 32).rotateX(-Math.PI / 2);
    const material = new MeshBasicMaterial();
    this.reticle = new Mesh(geometry, material);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    geometry = new BoxGeometry(0.1, 0.1, 0.1);
    const material1 = new MeshStandardMaterial({ color: 0x5853e6 });
    this.box = new Mesh(geometry, material1);
    this.box.visible = false;
    this.scene.add(this.box);

    const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    this.scene.add(light);
  }

  render(_ : any, frame : any) {
    if (frame) {
      if (this.hitTestSourceRequested === false) {
        this.requestHitTestSource();
      }
      if (this.hitTestSource) {
        this.getHitTestResults(frame);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.render(this.scene, this.camera); 
  }

  onSelect() {
    if (this.reticle.visible) {
      this.box.position.setFromMatrixPosition(this.reticle.matrix);
      this.box.position.y += this.box.geometry.parameters.height / 2;
      this.box.visible = true;
    } 
  }

  async requestHitTestSource() {
    const session = this.renderer.xr.getSession();
    session.addEventListener('end', () => {
      this.hitTestSourceRequested = false;
      this.hitTestSource = null;
    });
    const referenceSpace = await session.requestReferenceSpace('viewer');
    this.hitTestSource = await session.requestHitTestSource({ space: referenceSpace, entityTypes: ['plane'] });
    this.hitTestSourceRequested = true;
  }

  getHitTestResults(frame :any) {
    const hitTestResults = frame.getHitTestResults(this.hitTestSource);
    if (hitTestResults.length) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(this.renderer.xr.getReferenceSpace());
      this.reticle.visible = true;
      this.reticle.matrix.fromArray(pose.transform.matrix);
    } else {
      this.reticle.visible = false;
    }
  }
  /*
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
  */
};
  
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
