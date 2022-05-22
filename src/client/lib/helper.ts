
export const roundTo = function(num: number, places: number) {
    const factor = 10 ** places;
    return Math.round(num * factor) / factor;
  };

export const clamp = (num : number, min : number, max : number) => Math.min(Math.max(num, min), max);