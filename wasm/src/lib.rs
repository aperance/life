extern crate wasm_bindgen;

mod utils;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub struct GameEngine {
    size: usize,
    data: Vec<u8>,
}

#[wasm_bindgen]
pub struct Result {
    born: Vec<usize>,
    died: Vec<usize>,
    alive: Vec<usize>,
}

#[wasm_bindgen]
impl GameEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(startingData: Vec<u8>) -> GameEngine {
        GameEngine {
            size: (startingData.len() as f64).sqrt() as usize,
            data: startingData,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn size(&self) -> usize {
        self.size
    }

    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<u8> {
        self.data.clone()
    }

    pub fn next(&mut self) -> Result {
        let prev_data = self.data.clone();
        let mut born = Vec::new();
        let mut died = Vec::new();
        let mut alive = Vec::new();

        for row in 0..self.size {
            let row_prev = if row == 0 { self.size - 1 } else { row - 1 };
            let row_next = if row == self.size - 1 { 0 } else { row + 1 };
            for col in 0..self.size {
                let col_prev = if col == 0 { self.size - 1 } else { col - 1 };
                let col_next = if col == self.size - 1 { 0 } else { col + 1 };

                let index = self.size * row + col;

                let alive_neighbors = prev_data[self.size * row_prev + col_prev]
                    + prev_data[self.size * row_prev + col]
                    + prev_data[self.size * row_prev + col_next]
                    + prev_data[self.size * row + col_prev]
                    + prev_data[self.size * row + col_next]
                    + prev_data[self.size * row_next + col_prev]
                    + prev_data[self.size * row_next + col]
                    + prev_data[self.size * row_next + col_next];

                match alive_neighbors {
                    2 => self.data[index] = prev_data[index],
                    3 => {
                        self.data[index] = 1;
                        if prev_data[index] == 0 {
                            born.push(index)
                        }
                    }
                    _ => {
                        self.data[index] = 0;
                        if prev_data[index] == 1 {
                            died.push(index)
                        }
                    }
                }

                if self.data[index] == 1 {
                    alive.push(index)
                };
            }
        }
        Result {
            born: born,
            died: died,
            alive: alive,
        }
    }
}

#[wasm_bindgen]
impl Result {
    #[wasm_bindgen(getter)]
    pub fn born(&self) -> Vec<usize> {
        self.born.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn died(&self) -> Vec<usize> {
        self.died.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn alive(&self) -> Vec<usize> {
        self.alive.clone()
    }
}
