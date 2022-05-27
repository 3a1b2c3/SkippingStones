import * as THREE from 'three'; 
import { OrbitControls } from 'three/examples/jsm/Controls/OrbitControls';

import { models, defaultPositionY, defaultRoationX } from './meshes';
import { makeFloor, WaterMesh, rippleCallbacks, rain } from './water';
import { makeLights, makeCamera, removeEntity } from './Scene';
import { resetRock, rockHandling } from './rock';
import { StoneDefault, simulateOneStep, reset } from './skipping';
import { stone, RockState, RockHandling} from '../types/types'
import { waterHeight, floorHeight} from './constants';
import { addHeadsup } from './headsUp';
import { clamp } from './helper';
import { defaultLabel, defaultLabelFont } from './constants';
import { setText } from './headsUp';

const debug = false;

const minFloorHeight = floorHeight * 1.1;
const animDelta = 0.02;
const resetTime = 5000;
const angleIncr = .03;


const Pointer = new THREE.Vector2();
const { Camera, CameraGroup } = makeCamera();


document.onkeydown = function(evt) {
  evt = evt || window.event;
  let isEscape = false;
  if ('key' in evt) {
      isEscape = (evt.key === 'Escape' || evt.key === 'Esc');
  } else {
      isEscape = (evt.keyCode === 27);
  }
  if (isEscape) {
   // resetRock(scene);
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
    document.addEventListener('touchstart', function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockMeshes[0] && rockHandling.intersections &&
        rockHandling.rockState.valueOf() == RockState.start) {
        rockHandling.rockState = RockState.configuring;
        const touch = event.touches[0] || event.changedTouches[0];
        startX = touch.pageX;
        startY = touch.pageY;
        removeEntity(defaultLabel, Scene);
        setText(rockHandling.rockState, 
          rockHandling.stoneSimulation, rockHandling,
          defaultLabel, defaultLabelFont);
      }
      else{
        startX = 0;
        startY = 0;
      }
    })
    document.addEventListener('touchend', function (event) {
        if (rockHandling.rockMeshes && rockHandling.rockState.valueOf() == RockState.configuring) {
            if (debug)
            console.debug('mouseup:' + rockHandling.rockState);
            rockHandling.rockState = RockState.simulation;
            //update label
            removeEntity(defaultLabel, Scene);
            setText(rockHandling.rockState, rockHandling.stoneSimulation,
              rockHandling, defaultLabel, defaultLabelFont);
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
          rockHandling, defaultLabel, defaultLabelFont);
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
              rockHandling, defaultLabel, defaultLabelFont);
          }
        }
    });

    document.addEventListener('mouseup', function (event) {
      if (rockHandling.rockMeshes && rockHandling.rockState.valueOf() == RockState.configuring) {
          if (debug)
          console.debug('mouseup:' + rockHandling.rockState);
          rockHandling.rockState = RockState.simulation;
          //update label
          removeEntity(defaultLabel, Scene);
          setText(rockHandling.rockState, rockHandling.stoneSimulation,
            rockHandling, defaultLabel, defaultLabelFont);
          if (Controls)
            Controls.enableRotate = true;
      }
    });
   
  };


export function setupRenderer(documentObj : Document){
    const Renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    Renderer.setPixelRatio(window.devicePixelRatio);
    Renderer.setSize(window.innerWidth, window.innerHeight);
    Renderer.shadowMap.enabled = true;
    Renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    //Renderer.outputEncoding = THREE.sRGBEncoding;
    Renderer.setSize(window.innerWidth, window.innerHeight);
    
    Renderer.xr.enabled = true;

    //orbit
    const Controls = new OrbitControls(Camera, Renderer.domElement);
    Controls.maxPolarAngle = Math.PI * 0.5;
    Controls.maxDistance = 10;
    Camera.position.set(0, 1.6, -5);
    Controls.target = new THREE.Vector3(0, 1, 0);
    Controls.update();

    document.body.appendChild(Renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);
 
    function onWindowResize() {
        Camera.aspect = window.innerWidth / window.innerHeight;
        Camera.updateProjectionMatrix();
        Renderer.setSize(window.innerWidth, window.innerHeight);
    }
    Renderer.setAnimationLoop(render);
    return {  Renderer, Controls };
  }
  /*
  function render() {
      requestAnimationFrame(render);
      //update simulation
      if(Clock && rockHandling.rockMeshes?.length && 
        rockHandling.rockState.valueOf() == RockState.simulation){
        let splash = false;
        let delta = Clock.getDelta(); 
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
              rain(.25, 4, 0.005, rockHandling.rockMeshes[0].position.x,
                rockHandling.rockMeshes[0].position.z, .3, .3, 40);
                splash = false;
                if(debug)
                {
                    addHeadsup(document, 'Splash', 300, 300, 'splashLabel', 18);
            
                  setTimeout(() => {
                    addHeadsup(document, '', 300, 300, 'splashLabel', 18);
                  }, 800);
                }
          }
        // update distance label
        if (Scene){
            removeEntity(defaultLabel, Scene);
            setText(rockHandling.rockState, rockHandling.stoneSimulation,
              rockHandling, defaultLabel, defaultLabelFont);
          }
        //done
        if(rockHandling.rockMeshes[0].position.y <= minFloorHeight ||
             rockHandling.rockMeshes[0].position.z > 90){
            if (debug)
            console.debug('done');
            rockHandling.rockState = RockState.simulationDone;
            setTimeout(() => {
               //resetRock();
            }, resetTime);
          }
      }
      Renderer.setAnimationLoop(function (time : number) {
        rippleCallbacks.forEach(cb => cb(time));
        Renderer.render(Scene, Camera);
      });
      Renderer.render(Scene, Camera)
      return Renderer;
}
*/

export function setupScene(documentObj : Document){
    const Scene = new THREE.Scene();
    const Clock = new THREE.Clock();
    const Raycaster = new THREE.Raycaster();
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

    //resetRock();
    addHeadsup(document, 'Skip a stone', 100, 50, 'header', 22);

    const { Light, Bounce } = makeLights();
    const cameraHelper = new THREE.CameraHelper(Light.shadow.camera);
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
    return { Scene, Clock, Raycaster };
}
