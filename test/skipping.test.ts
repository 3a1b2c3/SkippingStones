import * as THREE from 'three'; 
import { stone, upper_fluid, lower_fluid,
  simulateOneStep, Air_Drag, Linear_Collision, 
  Collision, StoneDefault, init, simulate } from '../src/client/lib/skipping';


  test('simulateOneStep', () => {
    jest.spyOn(console, 'debug');
    init(StoneDefault);
    setTimeout(() => {
      const res = simulateOneStep(StoneDefault);
      expect(StoneDefault.velocity.x).toBeGreaterThan(0);
      expect(StoneDefault.position.x).toBeGreaterThan(0);
      }, 10000);
  
  });

  /*
    test('Air_Drag', () => {
      jest.spyOn(console, 'debug');
      init(StoneDefault);
      setTimeout(() => {
        const res = Air_Drag(StoneDefault, upper_fluid);
        expect(res.x).toBe(-1.6625405305050877e-28);
        }, 10000);
    
    });

  test('Linear_Collision', () => {
    jest.spyOn(console, 'debug');
    init(StoneDefault);
    setTimeout(() => {
      const res = Linear_Collision(StoneDefault, lower_fluid);
      expect(res).toBe(true);
      expect(StoneDefault.bounces).toBeGreaterThan(1);
      }, 10000);
  
  });

test('Collision', () => {
  jest.spyOn(console, 'debug');
  StoneDefault.position.y= -.01;
  init(StoneDefault);
  setTimeout(() => {
    const res = Collision(StoneDefault, lower_fluid);
    expect(res).toBe(true);
    expect(StoneDefault.bounces).toBeGreaterThan(0);
    }, 10000);
});

/*
test('simulate', () => {
    jest.spyOn(console, 'debug');
    init(StoneDefault);
    setTimeout(() => {
        simulate(StoneDefault, false, -1, true);
            console.error("StoneDefault" + JSON.stringify(StoneDefault));
    expect(StoneDefault.bounces).toBeGreaterThan(1);
      }, 60000);

});
*/