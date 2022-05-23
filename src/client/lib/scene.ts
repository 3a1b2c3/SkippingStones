import {
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    SphereGeometry,
    Mesh,
    MeshBasicMaterial,
    Group,
} from 'three';
import { sceneRadius as sceneRadiusDefault } from './constants';

export function removeEntity(name: string, scene : THREE.Scene) {
    const selectedObject = scene.getObjectByName(name);
    if (selectedObject)
      scene.remove(selectedObject);
}

export function makeCamera(far=1000){
    const CameraGroup = new Group();
    const Camera = new PerspectiveCamera();
    Camera.far = far;
    CameraGroup.add(Camera);
    return {Camera, CameraGroup};
}

export function makeLights(intensity=.8, sceneRadius=sceneRadiusDefault){
    const Light = new DirectionalLight(0xffaa33);
    Light.position.set(-sceneRadius, sceneRadius, sceneRadius);
    Light.intensity = intensity
    Light.castShadow = true;
    Light.shadow.camera.far = sceneRadius;
    Light.shadow.mapSize.width = 1024;
    Light.shadow.mapSize.height = 1024;
    Light.add(
        new Mesh(new SphereGeometry(sceneRadius/10, 32, 32), 
            new MeshBasicMaterial({
            color: 0xffaa33
        }))
    )

    const Bounce = new AmbientLight(0x003973);
    Bounce.intensity = intensity *.5;

    return {Light, Bounce};
}
