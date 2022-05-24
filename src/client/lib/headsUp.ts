const path = require('path');
import { mediaPath } from './constants';

const imgPath = path.join(mediaPath, "SeekPng.com_png-circle_99552.png");

export function addButton(documentObj : Document,
   resetRock: any, objectName="button", x_pos=120, y_pos=170){
   let div = document.getElementById(objectName);
   if (!div){
      div = document.createElement('div')
      div.id = objectName;
    }
    div.style.position = "absolute";
    div.style.left = x_pos+'px';
    div.style.top = y_pos +'px';
    const button = documentObj.createElement('button'); 
    button.style.background = "transparent";
    button.style.border = "none";
    div.appendChild(button);
    
    button.innerHTML = "<img src=\"" + imgPath + "\" width=\"44\"/>";
    button.onclick = function() {
      console.error("restart");
      resetRock();
    };
    document.body.appendChild(div);
    return div;
}

export function addHeadsup(document : Document, text="test", x_pos=150, y_pos=150, 
    objectName="headsUp", fontSize=18){
  let div = document.getElementById(objectName);
  if (!div){
      div = document.createElement('div')
      div.id = objectName;
      div.style.color = 'white';
      div.setAttribute('class', 'myclass'); 
      div.style.fontFamily = "Impact,Charcoal,sans-serif"; 
  }
  div.innerHTML = text;
  div.style.fontSize = fontSize +'px';
  div.style.position = "absolute";
  div.style.left = x_pos+'px';
  div.style.top = y_pos +'px';
  document.body.appendChild(div);
  return div;
}