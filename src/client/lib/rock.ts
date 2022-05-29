import { Scene, Mesh } from 'three';

import { StoneDefault, reset } from './skipping';
import { RockState, RockHandling} from '../types/types'
import { defaultPositionY, defaultRoationX } from './meshes';
import { removeEntity } from './Scene';
import { setText } from './headsUp';
import { defaultLabel, defaultLabelFont } from './constants';


export const rockHandling : RockHandling = {
  rockState: RockState.start,
  rockMeshes: Array<Mesh>(),
  intersections : null,
  stoneSimulation : Object.create(StoneDefault)
};


export function resetRock(scene : Scene, rockHandling : RockHandling){
  reset(rockHandling.stoneSimulation);
  rockHandling.rockState = RockState.start;
  if (scene){
    removeEntity(defaultLabel, scene);
    setText(rockHandling,
      defaultLabel, defaultLabelFont);
  }
  if (rockHandling.rockMeshes && rockHandling.rockMeshes[0]){
    rockHandling.rockMeshes[0].position.set(0, defaultPositionY, 0);
    rockHandling.rockMeshes[0].rotateX(defaultRoationX);
  }
}
