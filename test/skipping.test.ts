import * as THREE from 'three';

import { upper_fluid, lower_fluid, airDrag,
  simulateOneStep, linearCollision, //circularCollision,
  waterDrag, collision, StoneDefault, reset } from '../src/client/lib/skipping';

const testStone = Object.create(StoneDefault);

  test('waterDrag', () => {
    jest.spyOn(console, 'debug');
    reset(testStone);
    const s = Object.create(testStone);
    const res = waterDrag(testStone, lower_fluid);
    expect(res.x).toBe(-0.0025396366090390866);
    expect(Math.abs(res.y)).toBe(0);
    //no side effects
    expect(s).toMatchObject(testStone);
  });

  test('airDrag', () => {
    jest.spyOn(console, 'debug');
    reset(testStone);
    const s = Object.create(testStone);
    const res = airDrag(testStone, upper_fluid);
    expect(res.x).toBe(-0.000012169603682179576);
    expect(Math.abs(res.y)).toBe(0);
    //no side effects
    expect(s).toMatchObject(testStone);
  });

  test('simulateOneStep', () => {
    jest.spyOn(console, 'debug');
    reset(testStone);
    const s = Object.create(testStone);
    const res = simulateOneStep(testStone);
    //expect(s.position.y).toBeLessThan(testStone.position.y);
    //expect(s.velocity.x).toBeLessThan(testStone.velocity.x);
  });

  test('linearCollision', () => {
    jest.spyOn(console, 'debug');
    reset(testStone);
    const s = Object.create(testStone);
    const res = linearCollision(testStone, lower_fluid);
    expect(res).toBe(true);
    //no side effects
    expect(s).toMatchObject(testStone);
  });

  test('collision', () => {
    jest.spyOn(console, 'debug');
    testStone.position.y= -.01;
    reset(testStone);
    const s = Object.create(testStone);
    const res = collision(testStone, lower_fluid);
    expect(res).toBe(true);
    //no side effects
    expect(s).toMatchObject(testStone);
  });

