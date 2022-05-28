const path = require('path');
import { Scene } from 'three';

import { mediaPath } from './constants';
import { roundTo } from './helper';
import { stone, RockState, RockHandling} from '../types/types'
import { defaultLabel } from './constants';

export const headsUpStartText = 'Skip a stone';
const imgPath = path.join(mediaPath, 'SeekPng.com_png-circle_99552.png');

//TODO add spin, velocity, incident velocity, weight, height
export function setText(rockState : RockState, stoneObject : stone, 
  rockHandling : RockHandling, 
  objectName='headsUp', 
  fontSize=15, x=100, y=100, documentObj=document,
  ) : string {
 let text = headsUpStartText;
 if (rockState.valueOf() == RockState.selected ){
   text = 'Set rock tilt angle by dragging it with the mouse.';
 }
 else if (rockHandling.rockState.valueOf() == RockState.configuring){
   text = `Drag the mouse to change the stone's tilt angle: ${roundTo((rockHandling.stoneSimulation.theta * 180 / Math.PI), 2)} degree.`;
 }
 else if(rockState.valueOf() == RockState.simulation){
   text = `${stoneObject.out_bounces} bounce`
   if (stoneObject.out_bounces != 1)
     text += `s`;
   if (stoneObject.out_meters)
     text += ` and distance: ${roundTo(stoneObject.out_meters, 2)}  m`;
 }
 else if(rockState.valueOf() == RockState.start && objectName==defaultLabel){
   text = 'Grab the stone to play';
 }
 addHeadsup(documentObj, text, x, y, objectName, fontSize);
 return text;
}


export function addButton(documentObj : Document,
   resetRock: any, scene : Scene, rockHandling : RockHandling, 
   objectName='button', x_pos=120, y_pos=170){
   let div = document.getElementById(objectName);
   if (!div){
      div = document.createElement('div')
      div.id = objectName;
    }
    div.style.position = 'absolute';
    div.style.left = x_pos+'px';
    div.style.top = y_pos +'px';
    const button = documentObj.createElement('button'); 
    button.style.background = 'transparent';
    button.style.border = 'none';
    div.appendChild(button);
    
    button.innerHTML = '<img src=\'' + imgPath + '\' width=\'44\'/>';
    button.onclick = function() {
      resetRock(scene, rockHandling);
    };
    document.body.appendChild(div);
    return div;
}

export function addHeadsup(document : Document, text='test', x_pos=150, y_pos=150, 
    objectName='headsUp', fontSize=18){
  let div = document.getElementById(objectName);
  if (!div){
      div = document.createElement('div')
      div.id = objectName;
      div.style.color = 'white';
      div.setAttribute('class', 'myclass'); 
      div.style.fontFamily = 'Impact,Charcoal,sans-serif'; 
  }
  div.innerHTML = text;
  div.style.fontSize = fontSize +'px';
  div.style.position = 'absolute';
  div.style.left = x_pos+'px';
  div.style.top = y_pos +'px';
  document.body.appendChild(div);
  return div;
}