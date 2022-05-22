const path = require('path');
import {
    AdditiveBlending,
    Mesh,
    MeshLambertMaterial,
    MeshBasicMaterial,
    TorusGeometry,
    LineLoop,
    PlaneGeometry,
    TextureLoader,
    RepeatWrapping,
    Vector3,
    MeshPhongMaterial
} from 'three';

import {sceneRadius, waterHeight, mediaPath } from './constants';

const defautltSceneRadius = sceneRadius;
const rafCallbacks = new Set<any>();

const floorTexturePath = path.join(mediaPath, 'dcatyft-3d286c66-03cc-448e-b8d8-a4f0a3a2fc26.png');
const WaterTexturePath = path.join(mediaPath,'WaterNormal.jpg');

function makeFloor(sceneRadius=defautltSceneRadius, repeat=2){
    const floorTexture = new TextureLoader().load(floorTexturePath);
    floorTexture.repeat.multiplyScalar(sceneRadius/repeat);
    floorTexture.wrapS = floorTexture.wrapT = RepeatWrapping;
    const floor = new Mesh(
        new PlaneGeometry(sceneRadius*2,sceneRadius*2,50,50),
        new MeshLambertMaterial({
            map: floorTexture
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.name = 'floor';
    return floor;
}


function makeWater(position=waterHeight, sceneRadius=defautltSceneRadius, opacity = 0.5, repeat=125){
    const WaterTexture = new TextureLoader().load(WaterTexturePath);
    WaterTexture.wrapS = WaterTexture.wrapT = RepeatWrapping;
    WaterTexture.repeat.multiplyScalar(sceneRadius/repeat);
    const WaterMesh = new Mesh(
        new PlaneGeometry(sceneRadius*2,sceneRadius*2,50,50),
        new MeshPhongMaterial({
            normalMap: WaterTexture,
            shininess: 1,
            color: 0x8ab39f,
            transparent: true,
            opacity
        })
    );
    WaterMesh.geometry.rotateX(-Math.PI / 2);
    WaterMesh.position.y = position;
    WaterMesh.name = 'water';
    return WaterMesh;
}

const WaterMesh = makeWater();

rafCallbacks.add(function (t : number) {
    if (WaterMesh?.material?.normalMap?.offset)
        WaterMesh.material.normalMap.offset.x += 0.01 * Math.sin(t / 10000)/sceneRadius;
    if (WaterMesh?.material?.normalMap?.offset)
        WaterMesh.material.normalMap.offset.y += 0.01 * Math.cos(t / 8000)/sceneRadius;
    WaterMesh.material.normalScale.x = 10 * (0.8 + 0.5 * Math.cos(t / 1000));
    WaterMesh.material.normalScale.y = 10 * (0.8 + 0.5 * Math.sin(t / 1200));
    WaterMesh.position.y = 0.4 + 0.1 * Math.sin(t / 2000);
});

function rain(radius=.024, maxR=8, speed=0.01, posX=null, posY=null) {
    const rainRipples :any  = [];
    const unsedRainRipples = [];
    const dripPos = new Vector3();
    const geometry = new TorusGeometry(radius, 3, 1, 20 );
    geometry.rotateX(-Math.PI / 2);

    for (let i = 0; i < maxR; i++) {
         const material = new MeshBasicMaterial({
            color: 0x999999,
            blending: AdditiveBlending,
        });
        const mesh = new LineLoop(geometry, material);
        rainRipples.push(mesh);
        unsedRainRipples.push(mesh);
    }

    (function drip() {
        if (unsedRainRipples.length > 3) {
            const ripplesToUse = unsedRainRipples.splice(0, 3);
            const x = 20 * (Math.random() - 0.5);
            const z = 20 * (Math.random() - 0.5);
            dripPos.set(x, WaterMesh.position.y, z);

            for (let ri = 1; ri <= 3; ri++) {
                const ripple = ripplesToUse[ri - 1];
                ripple.position.set(x, -0.1, z);
                setTimeout(() => {
                    ripple.scale.multiplyScalar(0);
                    ripple.material.color.setHex(0xffffff);
                    WaterMesh.add(ripple);
                    setTimeout(() => {
                        WaterMesh.remove(ripple);
                        unsedRainRipples.push(ripple)
                    }, 3000);
                }, ri * 800);
            }
        }
        setTimeout(drip, Math.random() * 1000);
    }());

    const rippleSpeed = new Vector3(1, 1, 1).multiplyScalar(speed);

    rafCallbacks.add(function () {
        for (const r of rainRipples) {
            r.scale.add(rippleSpeed);
            const col = (r.material.color.getHex() >> 16)*0.99;
            const newCol = (col << 16) + (col << 8) + col;
            r.material.color.setHex(newCol);
        }
        });

        return rainRipples;
    }

rain();

export {
    makeFloor,
    WaterMesh,
    rafCallbacks,
    rain
}