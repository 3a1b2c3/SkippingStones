const path = require('path');
import {
    MeshPhongMaterial
} from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { mediaPath } from './constants';

const rockPath = path.join(mediaPath, 'Boulder.glb');
const rockPath2 = path.join(mediaPath, 'stone.glb');

const loader = new GLTFLoader();
export const minTilt = -Math.PI/4;//45
export const maxTilt = Math.PI/4;//45
export const defaultPositionY = 1.3;
export const defaultRoationX = -.175;

async function loadModels(positionY=defaultPositionY, rotateX=defaultRoationX) {
    const { scene: rock2 } = await new Promise((resolve) =>
    loader.load(rockPath2, resolve)
    );
    rock2.scale.x = 4;
    rock2.scale.z = 4;
    rock2.scale.y = 3;
    rock2.castShadow = true;
    const { scene: rock } = await new Promise((resolve) =>
        loader.load(rockPath, resolve)
    );
    rock.position.y = positionY;
    rock.scale.x = .1 * 5;
    rock.scale.z = .1 * 5;
    rock.scale.y = .033 *5 ;
    rock.name = 'rock';
    rock.castShadow = true;
    rock.receiveShadow = true;

    //in rad
    rock.rotateX(rotateX);
    rock.material =
        new MeshPhongMaterial({
            shininess: .1,
            color: 0x8ab39f,
        });
    return {
        rock,
        rock2
    };
}

export const models = loadModels();