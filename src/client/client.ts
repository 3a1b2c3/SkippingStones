import { Mesh, Scene, WebGLRenderer, BoxGeometry, 
  MeshStandardMaterial, MeshBasicMaterial, RingGeometry, sRGBEncoding,
  Vector2, Clock, Raycaster } from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { OrbitControls } from 'three/examples/jsm/Controls/OrbitControls';

import { resetRock } from './lib/rock';
import { setupRenderer, setupScene } from './lib/setUp';
import { removeEntity } from './lib/Scene';
import { StoneDefault, simulateOneStep, reset } from './lib/skipping';
import { RockState, RockHandling} from './types/types'
import { waterHeight, floorHeight } from './lib/constants';
import { addHeadsup, setText, addButton } from './lib/headsUp';
import { rippleCallbacks, rain } from './lib/water';
import { defaultLabel, defaultLabelFont } from './lib/constants';
import { clamp } from './lib/helper';

const debug = false;
const animDelta = 0.02;
const resetTime = 5000;
const angleIncr = .03;

const Pointer = new Vector2();

function onPointerMove( event : any ) {
  Pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  Pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

class App {
    // WebGL Scene globals, make object 
  Controls : OrbitControls | null = null;
  Clock: Clock | null = null;
  Raycaster : Raycaster | null = null;
  //Pointer : Vector2;
  camera : any;
  scene : any;
  renderer : any;
  hitTestSourceRequested = false;
  hitTestSource : any;
  controller : any;
  reticle : any;
  box : any;
  controls : any;
  rockHandling : any;

  constructor() {
    this.scene = new Scene();
    this.renderer = new WebGLRenderer({
        antialias: true,
        alpha: true
    });
    const { Camera, Controls } = setupRenderer(document, this.renderer);
    this.camera = Camera;
    this.controls = Controls;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = sRGBEncoding;

    document.body.appendChild(this.renderer.domElement);
  
    this.initXR();
    this.initScene();
    this.initUI();
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
  initSimulation(){
    this.rockHandling = {
      rockState: RockState.start,
      rockMeshes: Array<THREE.Mesh>(),
      intersections : null,
      stoneSimulation : Object.create(StoneDefault)
    };
    resetRock(this.scene, this.rockHandling);
  }
  initUI() {
    addButton(document, resetRock);
    addHeadsup(document, 'Skip a stone', 100, 50, 'header', 22);
  }
  initScene() {
    const { clock, raycaster, reticle, box } = setupScene(document, this.scene);
    this.reticle = reticle;
    this.box = box;
    this.initSimulation();
    this.Clock = clock;
    this.Raycaster = raycaster;
    this.addObjectClickListener(this.rockHandling, this.scene,
         this.controls, this.camera, this.Raycaster);
    this.renderer.setAnimationLoop(function (time : number) {
      rippleCallbacks.forEach(cb => cb(time));
        //this.renderer.render(this.scene, this.camera);
    });
  
    //move
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

  addObjectClickListener = (rockHandling : any, scene :any, 
    controls : any, camera :any, raycaster :any) => {
    let startX = 0;
    let startY = 0;

    document.addEventListener("touchstart", function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockMeshes[0] && rockHandling.intersections &&
        rockHandling.rockState.valueOf() == RockState.start) {
        rockHandling.rockState = RockState.configuring;
        const touch = event.touches[0] || event.changedTouches[0];
        startX = touch.pageX;
        startY = touch.pageY;
        removeEntity(defaultLabel, scene);
        setText(rockHandling.rockState, rockHandling.stoneSimulation,
          rockHandling, defaultLabel, defaultLabelFont);
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
            removeEntity(defaultLabel, scene);
            setText(rockHandling.rockState, rockHandling.stoneSimulation,
              rockHandling, defaultLabel, defaultLabelFont);
            if (controls)
              controls.enableRotate = true;
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
        removeEntity(defaultLabel, scene);
        setText(rockHandling.rockState, rockHandling.stoneSimulation,
          rockHandling, defaultLabel, defaultLabelFont);
      }
      else{
        startX = 0;
        startY = 0;
      }
    });

    document.addEventListener('mousemove', function (event) {
      if (raycaster){
        raycaster.setFromCamera(Pointer, camera);
          const intersects = raycaster.intersectObjects(scene.children, true);
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
        if (controls){
          controls.enableRotate = false;
        }
        if (diffY > delta) {
            const angleDiff = clamp(diffY *.005, -angleIncr,  angleIncr);
            rockHandling.rockMeshes[0].rotateX(angleDiff);
            rockHandling.stoneSimulation.theta = rockHandling.rockMeshes[0].rotation.x;
            //update label
            removeEntity(defaultLabel, scene);
            setText(rockHandling.rockState, rockHandling.stoneSimulation,
              rockHandling, defaultLabel, defaultLabelFont);
          }
        }
    });

    document.addEventListener('mouseup', function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockState.valueOf() == RockState.configuring) {
          if (debug)
          console.debug("mouseup:" + rockHandling.rockState);
          rockHandling.rockState = RockState.simulation;
          //update label
          removeEntity(defaultLabel, scene);
          setText(rockHandling.rockState, rockHandling.stoneSimulation,
            rockHandling, defaultLabel, defaultLabelFont);
          if (controls)
            controls.enableRotate = true;
      }
    });

  };

};
  
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
