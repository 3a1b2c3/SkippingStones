import * as THREE from 'three'; 

import { StoneDefault, reset } from './skipping';
import { RockState, RockHandling} from '../types/types'
import { defaultPositionY, defaultRoationX } from './meshes';
import { removeEntity } from './Scene';
import { setText } from './headsUp';
import { defaultLabel, defaultLabelFont } from './constants';


export const rockHandling : RockHandling = {
  rockState: RockState.start,
  rockMeshes: Array<THREE.Mesh>(),
  intersections : null,
  stoneSimulation : Object.create(StoneDefault)
};


export function resetRock(Scene : any, rockHandling :any){
  reset(rockHandling.stoneSimulation);
  rockHandling.rockState = RockState.start;
  if (Scene){
    removeEntity(defaultLabel, Scene);
    setText(rockHandling.rockState, rockHandling.stoneSimulation, 
      rockHandling,
       defaultLabel, defaultLabelFont);
  }
  if (rockHandling.rockMeshes && rockHandling.rockMeshes[0]){
    rockHandling.rockMeshes[0].position.set(0, defaultPositionY, 0);
    rockHandling.rockMeshes[0].rotateX(defaultRoationX);
  }
}
