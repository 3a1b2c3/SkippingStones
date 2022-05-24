import {
	Vector3,
} from 'three';

export type stone = {
    _skip : boolean;
    mass : number;
    radius : number;
    position : Vector3,  // Average height a human throws a stone
    velocity : Vector3,  // Incident velocity  
    spin : number;
    theta : number;    // Tilt angle (radian)
    out_bounces : number;
    out_meters : number;
}

export enum RockState {
    start = 0,
    selected,
    configuring,
    simulation,
    simulationDone
}

export type RockHandling = {
    rockState: RockState;
    rockMeshes: Array<THREE.Mesh>;
    intersections : any | null;
    stoneSimulation : stone
  };