import {
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    SphereGeometry,
    Mesh,
    MeshBasicMaterial,
    Group,
    BackSide, Scene
} from 'three';
import { sceneRadius as sceneRadiusDefault } from './constants';

export function removeEntity(name: string, scene : Scene) {
    const selectedObject = scene.getObjectByName(name);
    if (selectedObject)
      scene.remove(selectedObject);
}

export function makeCamera(far=sceneRadiusDefault *2.5){
    const CameraGroup = new Group();
    const Camera = new PerspectiveCamera();
    Camera.far = far;
    CameraGroup.add(Camera);
    return {Camera, CameraGroup};
}
export function makeSky(radius=sceneRadiusDefault *2.4){
    const skyGeo = new SphereGeometry(radius, 25, 25);
    const material = new MeshBasicMaterial({
            color: 0xADD8E6
        });
    const sky = new Mesh(skyGeo, material);
    sky.material.side = BackSide;
    return sky;
}

export function makeLights(intensity=2.3, sceneRadius=sceneRadiusDefault){
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
