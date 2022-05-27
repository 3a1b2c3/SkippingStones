import * as THREE from 'three'; 
import { OrbitControls } from 'three/examples/jsm/Controls/OrbitControls';

import { models } from './meshes';
import { makeFloor, WaterMesh } from './water';
import { makeLights, makeCamera } from './Scene';
import { rockHandling } from './rock';
import { floorHeight} from './constants';
import { addHeadsup } from './headsUp';

const minFloorHeight = floorHeight * 1.1;
const animDelta = 0.02;
const resetTime = 5000;
const angleIncr = .03;

const { Camera, CameraGroup } = makeCamera();

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
    //window.addEventListener('resize', onWindowResize, false);
 
    function onWindowResize() {
        Camera.aspect = window.innerWidth / window.innerHeight;
        Camera.updateProjectionMatrix();
        Renderer.setSize(window.innerWidth, window.innerHeight);
    }
    //Renderer.setAnimationLoop(Renderer);//XRAnimationLoopCallback
    return {  Renderer, Controls };
  }


export function setupScene(documentObj : Document, addObjectClickListener : any){
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

    const { Light, Bounce } = makeLights();
    const cameraHelper = new THREE.CameraHelper(Light.shadow.camera);
    Scene.add(cameraHelper);
    Scene.add(Bounce);
    Scene.add(Light);
    Scene.add(Camera);
    Scene.add(CameraGroup);
    Scene.add(makeFloor());
    Scene.add(WaterMesh);

    return { Scene, Clock, Raycaster };
}
