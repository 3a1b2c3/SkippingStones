import {
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    SphereGeometry,
    Mesh,
    MeshBasicMaterial,
    Group,
} from 'three';
import { sceneRadius } from './constants';

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

export function makeLights(intensity=1.5, SceneRadius=sceneRadius){
    const Light = new DirectionalLight(0xffaa33);
    Light.position.set(-SceneRadius, SceneRadius, SceneRadius);
    Light.intensity = intensity
    Light.castShadow = true;

    // Add the sun
    Light.add(
        new Mesh(new SphereGeometry(SceneRadius/10, 32, 32), 
            new MeshBasicMaterial({
            color: 0xffaa33
        }))
    )
    const Sun = new AmbientLight(0x003973);
    Sun.intensity = intensity;

    return {Light, Sun};
}
