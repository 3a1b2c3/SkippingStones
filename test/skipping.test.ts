import * as THREE from 'three'; 
import { stone, upper_fluid, lower_fluid,
  simulateOneStep, airDrag, linearCollision, //circularCollision,
  waterDrag, collision, StoneDefault, init } from '../src/client/lib/skipping';

  test('waterDrag', () => {
    jest.spyOn(console, 'debug');
    init(StoneDefault);
    const s = Object.create(StoneDefault);
    const res = waterDrag(StoneDefault, lower_fluid);
    expect(res.x).toBe(-0.004450037693489743);
    expect(Math.abs(res.y)).toBe(0);
    //no side effects
    expect(s).toMatchObject(StoneDefault);
  });

  test('airDrag', () => {
    jest.spyOn(console, 'debug');
    init(StoneDefault);
    const s = Object.create(StoneDefault);
    const res = airDrag(StoneDefault, upper_fluid);
    expect(res.x).toBe(-0.000015997359486306445);
    expect(Math.abs(res.y)).toBe(0);
    //no side effects
    expect(s).toMatchObject(StoneDefault);
  });

  /*
  test('simulateOneStep', () => {
    jest.spyOn(console, 'debug');
    init(StoneDefault);
    const s = Object.create(StoneDefault);
    const res = simulateOneStep(StoneDefault);
    expect(s.position.y).toBeLessThan(StoneDefault.position.y);
    expect(s.velocity.x).toBeLessThan(StoneDefault.velocity.x);
  });



  test('linearCollision', () => {
    jest.spyOn(console, 'debug');
    init(StoneDefault);
      const s = Object.create(StoneDefault);
      const res = linearCollision(StoneDefault, lower_fluid);
      expect(res).toBe(true);
      expect(StoneDefault.bounces).toBeGreaterThan(1);  
          //no side effects
    expect(s).toMatchObject(StoneDefault);
  });

test('collision', () => {
  jest.spyOn(console, 'debug');
  StoneDefault.position.y= -.01;
  init(StoneDefault);
    const res = collision(StoneDefault, lower_fluid);
    expect(res).toBe(true);
    expect(StoneDefault.bounces).toBeGreaterThan(0);
    //no side effects
    expect(s).toMatchObject(StoneDefault);
});

