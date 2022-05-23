import {
    cloneUniforms,
	Vector3,
} from 'three';

export enum RockState {
    start = 0,
    selected,
    configuring,
    simulation,
    simulationDone
}

export const upper_fluid = 'air';
export const lower_fluid = 'water';
//https{//www.glowscript.org/#/user/B06902117/folder/Public/program/FinalProject
// There are some constants refer to GRAVITY, dragging && so on.
// 2. Vx_max && Spin_max are the max speed of stone in world record.
// 3. global_MaxCd && MinCd are the maximum && minimum drag coefficient for the stone in different direction.
const GRAVITY = 9.8;
const global_scale = 1;// To make stone && its motion visible
const Vx_max = 12; // Max incident velocity
//const Spin_max = 14 // Max spin velocity
const DOWN = new Vector3(0, -1, 0);
const HORIZONTAL = new Vector3(1.0, 0, 0); // Direction vector

// The constants of dragging function used for the shape factor
const global_MaxCd = 1.98;
const MinCd = 0.05;
const global_gap = global_MaxCd - MinCd;
let global_dt = 0.01;

export type stone = {
    skip : boolean;
    mass : number;
    radius : number;
    position : Vector3,  // Average height a human throws a stone
    velocity : Vector3,  // Incident velocity  
    spin : number;
    theta : number;    // Tilt angle (radian)
    bounces : number;
    meters : number;
}
/*
Stone = {}
Stone['skip'] = True                # Succeed skipping or not
Stone['mass'] = 0.1
Stone['radius'] =  0.05
Stone['position'] = vec(0, 0.5, 0)  # Average height a human throws a stone
Stone['velocity'] = vec(6.0, 0, 0)  # Incident velocity  
Stone['spin'] = 7                   # Spin angular velocity (rev/s) 
Stone['theta'] = 10 / 180 * pi      # Tilt angle (radian)
*/
// Create a stone
// We assume that the stone is a flat cylinder been thrown out in a small angle relative to the HORIZONTAL direction.
// Moreover, we set the spin velocity at 7 rev/s && velocity at (6,0,0) m/s in the beginning.
export const StoneDefault : stone = { 
    skip : true,
    mass  : 0.1,
    radius  : 0.05,
    position : new Vector3(0, 0.5, 0),  // Average height a human throws a stone
    velocity : new Vector3(6.0, 0, 0),  // Incident velocity in x
    spin : 7,      // Spin angular velocity (rev/s) 
    theta : 10 / 180 * Math.PI,    // Tilt angle (radian) 10 degree
    bounces : 0,
    meters : 0
}

let global_Fgrav = DOWN.clone();
global_Fgrav.multiplyScalar(StoneDefault.mass);
const velocity1 : Vector3 = StoneDefault.velocity.clone();
const velocity2 : Vector3 = StoneDefault.velocity.clone();
let global_P_Stone = velocity1.multiplyScalar(StoneDefault.mass);
let global_fraction_V = global_scale * ((velocity2.length() / Vx_max) ** 2);
const global_Real_Stone = {
    position : new Vector3(0, 0.5, 0)
};

export function init(Stone : stone){
    const velocity1 : Vector3 = Stone.velocity.clone();
    const velocity2 : Vector3 = Stone.velocity.clone();
    global_Fgrav = DOWN.clone();
    global_Fgrav.multiplyScalar(Stone.mass);
    global_P_Stone = velocity1.multiplyScalar(Stone.mass);
    global_Real_Stone.position = Stone.position.clone();
    global_fraction_V = global_scale * ((velocity2.length() / Vx_max) ** 2);
    global_dt = 0.01;
}

let pre_P_Stone = global_P_Stone;
let pre_Stone_y = global_Real_Stone.position.y;
let global_Bounces = 0;

// Specific constants of fluid
// In this cell, there are some constants refer to the density, Viscosity, opacity && color of different fluid.
const Rho = new Map<string, number>([
    ['air', 1.29],
    ['water', 1000.0]
]);

const Viscosity = new Map<string, number>([
    // Upper fluid's viscosity
    ['air', 1.78E-05],
    // Lower fluid's viscosity
    ['water', 1.00E-03]
]);

// Splash
// To make the simulation much closer to the reality, we add the animation of splash in to our project. 
// 1. We use ten balls to represent them as our splash.
// 2. We set the direction && speed of the small balls in random.
// 3. splash is bigger in front in the real world, so we make the speed of the ball_drawSplash in front larger.
const ball_drawSplash : Array<any> = [];
const splash_theta : Array<any>= [];
const global_splash_v : Array<any>= [];

for (let i=0; i<10;i++){
    ball_drawSplash.push( { position : new Vector3(-3,0,0) });
}
for (let i=0; i<10;i++){
    splash_theta[i] = Math.random() * Math.PI * 5 / 18 + Math.PI / 9;
    if (i < 3){
        const global_t = new Vector3(-Math.cos(splash_theta[i]),Math.sin(splash_theta[i]),0);
        global_splash_v[i] = global_t.multiplyScalar(global_fraction_V *Math.random());
    }
    else{
        const global_t = new Vector3(Math.cos(splash_theta[i])+global_fraction_V,Math.sin(splash_theta[i]),0);
        global_splash_v[i] = global_t.multiplyScalar(global_fraction_V*Math.random());
    }
}



// collision
// 1. In the linear collision, we use the formula in the reference to calculate the loss of the stone's energy in the x component, && check the rest energy of the stone. The formula is related to the density && the viscosity of lower fluid,etc.
// 2. In the circular collision, we use the formula in the reference to calculate the maximun number of bounces,
// which stone will be stable below. If the bouncing number is larger than the maximun number of bounces, the stone will become unstable && cannot skip successfully.
// 3. To explain the second point, we quote from the reference.
//  If after a collision, the stone is put in rotation around the y axis,that is,theta is ! equal to 0, its orientation would change by an appreciable amount during free flight{ the incidence angle thata for the next collision has little chance to still be in a favorable situation. There is therefore a need for a stabilizing angular motion. This is the role of the spin of the stone.
//  A spin motion around normal vector of stone induces a stabilizing torque{ this is the well-known gyroscopic effect. Spin motion induces a stabilizing torque that can maintain theta around its initial value."
// If after a collision, the stone is put in rotation around the y axi
export function collision(Stone : stone, media : string){
    const resLinear = linearCollision(Stone, media);
    const resCircular = circularCollision(Stone);
    return resLinear || resCircular
}

export function linearCollision(Stone : stone, media : string, gravity=GRAVITY){ 
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
        Stone.skip = false;
        Stone.velocity.y = -Stone.velocity.y
        return Stone.skip;
    }
    // L is the distance along x traversed by the stone during the collision.
    const l = 2*Math.PI* Math.sqrt(2* Stone.mass*Math.sin(Stone.theta)/(2*Cy*pw*Stone.radius));
    Stone.meters += l;
    // Calculate the waste of energy during a collision process.
    const energy_waste_x = -u*Stone.mass * gravity * l;
    const Initial_Energy_x = Stone.mass* velocity.x * velocity.x/2;
    const final_Energy_x = Initial_Energy_x + energy_waste_x;

    // Asumed that every stone will bounce back into the air
    Stone.velocity.y = -Stone.velocity.y;
    
    // Estimate that whether the stone will skip or !  
    if (final_Energy_x <= 0){
        Stone.skip = false;
        Stone.velocity.x = 1e-10;
     }
    else{
        Stone.velocity.x = Math.sqrt(2*final_Energy_x / Stone.mass);
    }

    return Stone.skip;
}

function circularCollision(Stone : stone, gravity=GRAVITY){ 
    // Calculate the maximun number of bounces, which stone will be stable below.
    if (Stone?.spin){
        const ncount = (4*Math.PI*Math.PI* Stone.radius) * Stone.spin * Stone.spin / gravity;
        if (global_Bounces+1 >= ncount){
            Stone.skip  = false;
        }
    }
    return Stone.skip;
}


// Upper fluid resistance

// In order to the formula F = 1/2(Cd)(Rho)(A)(v^2) to compute the drag force applying on the stone, we need to estimate the drag coefficient first. We know that the drag coefficient is related to the Reynolds number && stone's shape. The Reynolds number can be computed by the density && viscosity of the fluid the stone go thrthough && the stone's velocity. Then, we compute the angle between the +x && the direction of the stone's velocity, && use it to define the shape-related function whose maximum is global_MaxCd && minimum is MinCd. By the way, when we calculate the Reynolds number && the Area, we use stone's characteristic length,stone's diameter. We can get the magnitude of drag force from the factor above. Finally, we can get drag force in vector form when the magnitude of drag force time negative direction of stone's velocity.
export function airDrag(Stone : stone, media : string, horizontal=HORIZONTAL) : Vector3{
    let velocity : Vector3 = Stone.velocity.clone();
    const vis = Viscosity.get(media) || 1; 
    const rho = Rho.get(media) || 1;
    // Compute angle
    // alpha is the angle between the +x vector && the direction vector of stone's velocity
    const cos_alpha = velocity.dot(horizontal)/(velocity.length() * horizontal.length())
    const alpha = Math.acos(cos_alpha)
    // beta is the difference between the direction of the stone flying && surface of cylinder (stone)
    let beta = Math.abs(Stone.theta  + alpha);
    if (velocity.y >= 0) {
        beta = Math.abs(Stone.theta  - alpha);
    }
    // Compute characteristic length
    const d = 2* Stone.radius; 
    
    // Compute Reynolds number
    const Kv = vis / rho;
    const Re = (velocity.length()*d)/Kv;
    let Cd_=  1.328 / (Re**0.5);
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
    const Cd = Cd_ * (global_MaxCd - Math.abs(Math.cos(beta))*global_gap)
    
    // Compute reference area
    const A = Stone.radius * Stone.radius *Math.PI*Math.sin(beta);
    
    // Compute Drag Force
    const Fd = (rho *A*Cd* velocity.length() )* velocity.length()/2;  // Magnitude of drag force
    const Fdir : Vector3 = velocity.divideScalar(velocity.length());  // Unit vector of drag force
    Fdir.negate();
    const fDrag = Fdir.multiplyScalar(Fd);
    return fDrag;
}


// Lower fluid resistance
// The function is same as upper fluid resistance but for diffrent kind of fluid.
// In order to the formula F = 1/2(Cd)(Rho)(A)(v^2) to compute the drag force applying on the stone, we need to estimate the drag coefficient first. We know that the drag coefficient is related to the Reynolds number && stone's shape. The Reynolds number can be computed by the density && viscosity of the fluid the stone go thrthough && the stone's velocity. Then, we compute the angle between the +x && the direction of the stone's velocity, && use it to define the shape-related function whose maximum is global_MaxCd && minimum is MinCd. By the way, when we calculate the Reynolds number && the Area, we use stone's characteristic length,stone's diameter. We can get the magnitude of drag force from the factor above. Finally, we can get drag force in vector form when the magnitude of drag force time negative direction of stone's velocity.
export function waterDrag(Stone : stone, 
    media : string, 
    horizontal=HORIZONTAL.clone()) : Vector3 {
    // Compute angle
    // alpha is the angle between the +x vector && the direction vector of stone's velocity
    let velocity : Vector3 = Stone.velocity.clone();
    const vis = Viscosity.get(media) || 1; 
    const rho = Rho.get(media) || 1; 
    const cos_alpha = velocity.dot(horizontal)/(velocity.length())* (horizontal.length());
    const alpha = Math.acos(cos_alpha);
    let beta =Math.abs(Stone.theta  + alpha);
    // beta is the difference between the direction of the stone flying && surface of cylinder (stone)
    if (velocity.y >= 0) {
        beta = Math.abs(Stone.theta  - alpha);
    }
    // Compute characteristic length
    const d = 2*Stone.radius ;
    // Compute Reynolds number
    const Kv = vis / rho;
    const Re = ((velocity.length())*d)/Kv
    let Cd_ =  1.328 / (Re**0.5);
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
    const Cd = Cd_ * (global_MaxCd - Math.abs(Math.cos(beta))*global_gap);
    
    // Compute reference area
    const A = Stone.radius * Stone.radius *Math.PI*Math.sin(beta);
    
    // Compute Drag Force
    const Fd = (rho * A * Cd * velocity.length() * velocity.length()/2);  // Magnitude of drag force
    const Fdir : Vector3 = velocity.divideScalar(velocity.length());  // Unit vector of drag force
    Fdir.negate();
    const fDrag  : Vector3 = Fdir.multiplyScalar(Fd);

    return fDrag;
}

    /*
            # Resistant force exerting on the stone
        if Real_Stone.pos.y > 0:
            fDrag = Air_Drag(Stone, upper_fluid)
        else:
            fDrag = Water_Drag(Stone, lower_fluid)
        
        fNet = fGrav + fDrag

        # Update stone's position
        P_Stone = Stone['mass'] * Stone['velocity']  + fNet * delta
        Stone['velocity'] = P_Stone / Stone['mass']
        Stone['position'] = Stone['position'] + Stone['velocity'] * delta
        Real_Stone.pos = Stone['position']
    */
export function simulateOneStep(Stone : stone, 
                            delta : number = global_dt, 
                            skipping : boolean = false,
                            minHeight=-2,
                            debug=false,
                            fGrav = global_Fgrav.clone()
                            ) : Vector3 {
    if (Stone.position.y <= minHeight || delta<=0){
        return Stone.position;
    }
    console.error(JSON.stringify(Stone.velocity) +" __fGrav: 1" + JSON.stringify(Stone.position));
    let fDrag : Vector3 = waterDrag(Stone, lower_fluid);
    if (Stone.position.y > 0){
        fDrag = airDrag(Stone, upper_fluid);
    }
    //fNet = fGrav + fDrag
    const fNet : Vector3 = fGrav.add(fDrag);
    console.error(JSON.stringify(fNet)  +" fDrag : " + JSON.stringify(fDrag));
    //bundle.js:2 {"x":-0.000007862181003827387,"y":-0.1,"z":0} fDrag : {"x":-0.000007862181003827387,"y":0,"z":0}
    // Update stone's position 
    let velocity : Vector3 = Stone.velocity.clone();
    velocity.multiplyScalar(Stone.mass);
    fNet.multiplyScalar(delta);
    velocity.add(fNet);
    velocity.divideScalar(Stone.mass);
    console.error(" velocity1 : " + JSON.stringify(velocity));
    Stone.velocity = velocity.clone();
    console.error(delta + " Stone.velocity : " + JSON.stringify(Stone.velocity));
    velocity.multiplyScalar(delta);
    console.error(delta + " velocity2 : " + JSON.stringify(velocity));
    Stone.position.add(velocity);
    console.error(JSON.stringify(fNet)  +" Stone.velocity3 : " + JSON.stringify(velocity));
    console.error(JSON.stringify(fGrav)  + "fGrav: 2" + JSON.stringify(Stone.position));

    // Stone skipping
    if (Stone.position.y <= 0 && skipping){
        collision(Stone, lower_fluid)
        if (!Stone.skip){
            Stone.velocity.y = - Stone.velocity.y;
        }
        else  
            Stone.bounces++;
    }
    Stone.meters = Stone.position.x;
    return Stone.position;
}

