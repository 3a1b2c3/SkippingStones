import {
	Sprite, 
    SpriteMaterial,
    Texture
} from 'three';


export function makeTextSprite( message :any, 
    parameters :any, 
    name="textSprite", 
    documentObj : Document)
{
    if ( parameters === undefined ) 
    parameters = {};
    const fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Courier New";
        const fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 14;
        const borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 0;
        const borderColor = parameters.hasOwnProperty("borderColor") ?parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
        const backgroundColor = parameters.hasOwnProperty("backgroundColor") ?parameters["backgroundColor"] : { r:0, g:0, b:255, a:1.0 };
        const textColor = parameters.hasOwnProperty("textColor") ?parameters["textColor"] : { r:0, g:0, b:0, a:1.0 };

    const canvas = documentObj.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context){
          context.font = "Bold " + fontsize + "px " + fontface;
          const metrics = context.measureText( message );
          context.fillStyle  = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
          context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
          context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
          context.fillText( message, borderThickness, fontsize + borderThickness);
        }
        const texture = new Texture(canvas) 
        texture.needsUpdate = true;
        const spriteMaterial = new SpriteMaterial( { map: texture, 
         } );
    const sprite = new Sprite( spriteMaterial );
    sprite.name = name;
    sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
    return sprite;
}
