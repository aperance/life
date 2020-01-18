/* tslint:disable */
/**
*/
export class GameEngine {
  free(): void;
/**
* @param {number} size 
* @param {Uint32Array} starting_data 
* @returns {GameEngine} 
*/
  constructor(size: number, starting_data: Uint32Array);
/**
* @returns {Result} 
*/
  next(): Result;
}
/**
*/
export class Result {
  free(): void;
  readonly value: any;
}
