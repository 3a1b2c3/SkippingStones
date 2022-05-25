import {
	Vector3,
} from 'three';

import {stone} from '../types/types'

/*
Adapted from www.glowscript.org/#/user/B06902117/folder/Public/program/FinalProject
*/
export const upper_fluid = 'air';
export const lower_fluid = 'water';

const GRAVITY = 9.8;
const DOWN = new Vector3(0, -1, 0);
const HORIZONTAL = new Vector3(1.0, 0, 0);

// The constants of dragging function used for the shape factor
const MinCd = 0.05;
const g_MaxCd = 1.98;
const g_gap = g_MaxCd - MinCd;
const g_dt = 0.01;
const g_Bounces = 0;

const defaultVelocity = 5.4;
const defaultHeight = 0.5;
const massDefault = 0.1;
const radiusDefault = 0.05;
const positionDefault = new Vector3(0, defaultHeight, 0);  // Average height a human throws a stone
const velocityDefault = new Vector3(defaultVelocity, 0, 0);  // Incident velocity in x
const spinDefault = 7;      // Spin angular velocity (rev/s) 
const thetaDefault = 10 / 180 * Math.PI;    // Tilt angle (radian) 10 degree

// Create a stone
// We assume that the stone is a flat cylinder been thrown out in a small angle relative to the HORIZONTAL direction.
// Moreover, we set the spin velocity at 7 rev/s && velocity at (6,0,0) m/s in the beginning.
export const StoneDefault : stone = { 
    _skip : true,
    mass : massDefault,
    radius : radiusDefault,
    position : positionDefault.clone(),  // Average height a human throws a stone
    velocity : velocityDefault.clone(),  // Incident velocity in x
    spin : spinDefault,      // Spin angular velocity (rev/s) 
    theta : thetaDefault,    // Tilt angle (radian) 10 degree
    out_bounces : 0,
    out_meters : 0
}

export function reset(Stone : stone){
    Stone._skip = true;
    Stone.mass = massDefault;
    Stone.radius = radiusDefault,
    Stone.position = positionDefault.clone(),
    Stone.velocity = velocityDefault.clone(),  // Incident velocity in x
    Stone.spin = spinDefault,      // Spin angular velocity (rev/s) 
    Stone.theta = thetaDefault,    // Tilt angle (radian) 10 degree
    Stone.out_bounces = 0;
    Stone.out_meters = 0
}

// Specific constants of fluid
const Rho = new Map<string, number>([
    ['air', 1.29],
    ['water', 1000.0]
]);

const Viscosity = new Map<string, number>([
    ['air', 1.78E-05],
    ['water', 1.00E-03]
]);

/*
// collision
1. In the linear collision, we use the formula in the reference to calculate the loss of the stone's energy
 in the x component, && check the rest energy of the stone. 
 The formula is related to the density && the viscosity of lower fluid,etc.
2. In the circular collision, we use the formula in the reference to calculate the maximun number of out_bounces,
which stone will be stable below. If the bouncing number is larger than the maximun number of out_bounces, 
the stone will become unstable && cannot skip successfully.
3. To explain the second point, we quote from the reference.
 If after a collision, the stone is put in rotation around the y axis,that is,theta is ! equal to 0, 
its orientation would change by an appreciable amount during free flight{ the incidence angle thata 
    for the next collision has little chance to still be in a favorable situation. 
    There is therefore a need for a stabilizing angular motion. This is the role of the spin of the stone.
  A spin motion around normal vector of stone induces a stabilizing torque{ this is the well-known gyroscopic effect.
 Spin motion induces a stabilizing torque that can maintain theta around its initial value."
 If after a collision, the stone is put in rotation around the y axis
*/
export function collision(Stone : stone, media : string){
    const resLinear = linearCollision(Stone, media);
    const resCircular = circularCollision(Stone);
    return resLinear || resCircular;
}

export function linearCollision(Stone : stone, 
    media : string, 
    gravity=GRAVITY): boolean { 
    const velocity : Vector3 = Stone.velocity.clone();
    const vis = Viscosity.get(media) || 1; 
    const rho = Rho.get(media) || 1; 
    const visWater = Viscosity.get('water') || 1; 
    const rhoWater = Rho.get('water') || 1; 
    const pw : number = Rho.get(media) || 1;  // density of the substance 
    const Cl : number = rhoWater/rho;       //coefficient of lift  
    const Cf : number = vis/visWater;     // coefficient of friction 

    const Cy = Cl* Math.cos(Stone.theta)-Cf*Math.sin(Stone.theta) ;
    const Cx = Cl*Math.sin(Stone.theta)+Cf* Math.cos(Stone.theta) ;
    const u = Cx/Cy // u = Fx/Fy 
    
    if (Cy <= 0){
        Stone._skip = false;
        Stone.velocity.y = -Stone.velocity.y
        return Stone._skip;
    }
    // L is the distance along x traversed by the stone during the collision.
    const l = 2*Math.PI* Math.sqrt(2* Stone.mass*Math.sin(Stone.theta)/(2*Cy*pw*Stone.radius));

    // Calculate the waste of energy during a collision process.
    const energy_waste_x = -u*Stone.mass * gravity * l;
    const Initial_Energy_x = Stone.mass* velocity.x * velocity.x/2;
    const final_Energy_x = Initial_Energy_x + energy_waste_x;

    // Asumed that every stone will bounce back into the air
    Stone.velocity.y = -Stone.velocity.y;
    
    // Estimate whether the stone will skip or not
    if (final_Energy_x <= 0){
        Stone._skip = false;
        Stone.velocity.x = 1e-10;
    }
    else{
        Stone.velocity.x = Math.sqrt(2*final_Energy_x / Stone.mass);
    }
    return Stone._skip;
}

// Calculate the maximun number of out_bounces, which stone will be stable below.
function circularCollision(Stone : stone, gravity=GRAVITY, out_bounces=g_Bounces){ 
    if (Stone?.spin){
        const ncount = (4*Math.PI*Math.PI* Stone.radius) * Stone.spin * Stone.spin / gravity;
        if (out_bounces+1 >= ncount){
            Stone._skip = false;
        }
    }
    return Stone._skip;
}

/*
// Upper fluid resistance
// In order to the formula F = 1/2(Cd)(Rho)(A)(v^2) to compute the drag force
// applying on the stone, we need to estimate the drag coefficient first. 
//We know that the drag coefficient is related to the Reynolds number && stone's shape. 
//The Reynolds number can be computed by the density && viscosity of the fluid the stone go thrthough 
// the stone's velocity. Then, we compute the angle between the +x && the direction of the stone's velocity, //
// use it to define the shape-related function whose maximum is g_MaxCd && minimum is g_MinCd.
 By the way, when we calculate the Reynolds number && the Area, we use stone's characteristic length,
 stone's diameter. We can get the magnitude of drag force from the factor above. 
 Finally, we can get drag force in vector form when the magnitude of drag force time negative direction of stone's velocity.
*/
export function airDrag(Stone : stone, media : string, horizontal=HORIZONTAL,
            MaxCd=g_MaxCd, gap=g_gap) : Vector3{
    const velocity : Vector3 = Stone.velocity.clone();
    const vis = Viscosity.get(media) || 1; 
    const rho = Rho.get(media) || 1;
    // Compute angle
    // alpha is the angle between the +x vector && the direction vector of stone's velocity
    const cos_alpha = velocity.dot(horizontal)/(velocity.length() * horizontal.length())
    const alpha = Math.acos(cos_alpha)
    // beta is the difference between the direction of the stone flying && surface of cylinder (stone)
    let beta = Math.abs(Stone.theta + alpha);
    if (velocity.y >= 0) {
        beta = Math.abs(Stone.theta - alpha);
    }
    // Compute characteristic length
    const d = 2* Stone.radius; 
    
    // Compute Reynolds number
    const Kv = vis / rho;
    const Re = (velocity.length()*d)/Kv;
    let Cd_= 1.328 / (Re**0.5);
    // Compute Drag Coefficient
    if (Re < 5e5){
        Cd_ = 1.328 / (Re**0.5)
    }
    else if (Re > 5e5 && Re < 1e7){
        Cd_ = 0.0742/(Re**0.2) - 1740/Re;
    }
    else if (Re > 1e7 && Re < 1e9){
        Cd_ = 0.455/((Math.log10(Re))**2.58) - 1700/Re;
    }
    const Cd = Cd_ * (MaxCd - Math.abs(Math.cos(beta))* gap)
    
    // Compute reference area
    const A = Stone.radius * Stone.radius * Math.PI * Math.sin(beta);
    
    // Compute Drag Force
    const Fd = (rho *A*Cd* velocity.length() )* velocity.length()/2;  // Magnitude of drag force
    const fDir : Vector3 = velocity.divideScalar(velocity.length());  // Unit vector of drag force
    fDir.negate();
    const fDrag = fDir.multiplyScalar(Fd);
    return fDrag;
}

/*
Lower fluid resistance
The function is same as upper fluid resistance but for diffrent kind of fluid.
 In order to the formula F = 1/2(Cd)(Rho)(A)(v^2) to compute the drag force applying on the stone,
 we need to estimate the drag coefficient first. We know that the drag coefficient is related to the Reynolds number 
  stone's shape. The Reynolds number can be computed by the density && viscosity of the fluid the stone go thrthough 
  the stone's velocity. Then, we compute the angle between the +x && the direction of the stone's velocity, 
  use it to define the shape-related function whose maximum is g_MaxCd && minimum is g_MinCd. By the way, 
  when we calculate the Reynolds number && the Area, we use stone's characteristic length,stone's diameter. 
  We can get the magnitude of drag force from the factor above. Finally, we can get drag force in vector form when 
  the magnitude of drag force time negative direction of stone's velocity.
*/
export function waterDrag(Stone : stone, 
    media : string, 
    maxCd = g_MaxCd, 
    gap = g_gap,
    horizontal=HORIZONTAL.clone()) : Vector3 {
    // Compute angle
    // alpha is the angle between the +x vector && the direction vector of stone's velocity
    const velocity : Vector3 = Stone.velocity.clone();
    const vis = Viscosity.get(media) || 1; 
    const rho = Rho.get(media) || 1; 
    const cos_alpha = velocity.dot(horizontal)/(velocity.length())* (horizontal.length());
    const alpha = Math.acos(cos_alpha);
    let beta = Math.abs(Stone.theta  + alpha);
    // beta is the difference between the direction of the stone flying && surface of cylinder (stone)
    if (velocity.y >= 0) {
        beta = Math.abs(Stone.theta  - alpha);
    }
    // Compute characteristic length
    const d = 2*Stone.radius ;
    // Compute Reynolds number
    const Kv = vis / rho;
    const Re = ((velocity.length())*d)/Kv
    let Cd_ = 1.328 / (Re**0.5);
    // Compute Drag Coefficient
    if (Re < 5e5){
        Cd_ = 1.328 / (Re**0.5);
    }
    else if (Re > 5e5 && Re < 1e7){
        Cd_ = 0.0742/(Re**0.2) - 1740/Re;
    }
    else if (Re > 1e7 && Re < 1e9){
        Cd_ = 0.455/((Math.log10(Re))**2.58) - 1700/Re
    }
    const Cd = Cd_ * (maxCd - Math.abs(Math.cos(beta))*gap);
    
    // Compute reference area
    const A = Stone.radius * Stone.radius *Math.PI*Math.sin(beta);
    
    // Compute Drag Force
    const Fd = (rho * A * Cd * velocity.length() * velocity.length()/2);  // Magnitude of drag force
    const fDir : Vector3 = velocity.divideScalar(velocity.length());  // Unit vector of drag force
    fDir.negate();
    const fDrag : Vector3 = fDir.multiplyScalar(Fd);

    return fDrag;
}

export function simulateOneStep(Stone : stone, 
                            delta : number = g_dt, 
                            skipping  = true,
                            minHeight=-2,
                            upperFluid = upper_fluid,
                            lowerFluid = lower_fluid,
                            debug=false,
    ) : Vector3 {
    if (Stone.position.y <= minHeight || delta <= 0){
        return Stone.position;
    }
    const fGrav = DOWN.clone();
    fGrav.multiplyScalar(Stone.mass);
    const fDrag : Vector3 = Stone.position.y > 0 ? airDrag(Stone, upperFluid) 
        : waterDrag(Stone, lowerFluid);

    //fNet = fGrav + fDrag
    const fNet : Vector3 = fGrav.add(fDrag);
    const velocity : Vector3 = Stone.velocity.clone();
    velocity.multiplyScalar(Stone.mass);
    fNet.multiplyScalar(delta);
    velocity.add(fNet);
    velocity.divideScalar(Stone.mass);
    Stone.velocity = velocity.clone();
    velocity.multiplyScalar(delta);
    Stone.position.add(velocity);
    if(debug){
        console.error(JSON.stringify(Stone.position)
         + "Stone.position: " + JSON.stringify(Stone.velocity));
    }
    // Stone skipping
    if (Stone.position.y <= 0 && skipping){
        const res = collision(Stone, lowerFluid);
        console.error("res: " + res);
        if (!Stone._skip){
            Stone.velocity.y = - Stone.velocity.y;
        }
        else{
            Stone.out_bounces++;
        }
    }
    if (Stone.position.x)
        Stone.out_meters = Stone.position.x;
    return Stone.position;
}

