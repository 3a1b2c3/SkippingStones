import { Scene, CameraHelper,
  WebGLRenderer, PCFSoftShadowMap,
  Vector3, Clock, Raycaster, Mesh, BoxGeometry, 
  MeshStandardMaterial, MeshBasicMaterial, RingGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/Controls/OrbitControls';

import { models } from './meshes';
import { makeFloor, WaterMesh } from './water';
import { makeLights, makeCamera } from './Scene';
import { rockHandling } from './rock';

const { Camera, CameraGroup } = makeCamera();

export function setupRenderer(documentObj : Document, renderer: WebGLRenderer){
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    //Renderer.outputEncoding = sRGBEncoding;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    //orbit
    const Controls = new OrbitControls(Camera, renderer.domElement);
    Controls.maxPolarAngle = Math.PI * 0.5;
    Controls.maxDistance = 10;
    Camera.position.set(0, 1.6, -5);
    Controls.target = new Vector3(0, 1, 0);
    Controls.update();

    document.body.appendChild(renderer.domElement);
    //window.addEventListener('resize', onWindowResize, false);
 
    function onWindowResize() {
        Camera.aspect = window.innerWidth / window.innerHeight;
        Camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    //Renderer.setAnimationLoop(Renderer);//XRAnimationLoopCallback
    return { Controls, Camera };
  }


export function setupScene(documentObj : Document, scene : Scene){
    const clock = new Clock();
    const raycaster = new Raycaster();
    const modelsPromise = (async function () {
        const {
            rock,
            rock2,
        } = await models;
        rockHandling.rockMeshes.push(rock);
        scene.add(rock);
        scene.add(rock2);
    })();

    const { Light, Bounce } = makeLights();
    const cameraHelper = new CameraHelper(Light.shadow.camera);
    scene.add(cameraHelper);
    scene.add(CameraGroup);
    scene.add(Bounce);
    scene.add(Light);
    scene.add(makeFloor());
    scene.add(WaterMesh);

    let geometry = new RingGeometry(0.08, 0.10, 32).rotateX(-Math.PI / 2);
    const material = new MeshBasicMaterial();
    const reticle = new Mesh(geometry, material);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    geometry = new BoxGeometry(0.1, 0.1, 0.1);
    const material1 = new MeshStandardMaterial({ color: 0x5853e6 });
    const box = new Mesh(geometry, material1);
    box.visible = false;
    scene.add(box);

    return { clock, raycaster, reticle, box };
}

