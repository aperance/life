extern crate wasm_bindgen;

mod utils;

use serde::Serialize;
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
#[derive(Serialize)]
pub struct Result {
    born: Vec<usize>,
    died: Vec<usize>,
    alive: Vec<usize>,
}

#[wasm_bindgen]
impl GameEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize, startingData: Vec<usize>) -> GameEngine {
        let mut game_engine = GameEngine {
            size: size,
            data: Vec::new(),
        };
        game_engine.data.resize(size * size, 0);

        for cell_index in startingData {
            game_engine.data[cell_index] = 1;
        }

        game_engine
    }

    #[wasm_bindgen(getter)]
    pub fn size(&self) -> usize {
        self.size
    }

    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<u8> {
        self.data.clone()
    }

    pub fn run_batch(&mut self, count: u8) -> String {
        let mut results = Vec::new();
        for _ in 0..count {
            results.push(self.next())
        }
        serde_json::to_string(&results).unwrap()
    }

    fn next(&mut self) -> Result {
        let prev_data = self.data.clone();
        let mut born = Vec::new();
        let mut died = Vec::new();
        let mut alive = Vec::new();

        for row in 0..self.size {
            for col in 0..self.size {
                let index = self.size * row + col;
                let neighbors = self.get_neighbors(index);
                let mut alive_neighbor_count = 0;

                for neighbor_index in neighbors {
                    alive_neighbor_count = alive_neighbor_count + prev_data[neighbor_index];
                }

                match alive_neighbor_count {
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

    fn get_neighbors(&self, index: usize) -> Vec<usize> {
        let wrap = true;
        let size = self.size;
        let max = size - 1;
        let row = index / size;
        let col = index % size;

        let row_prev = if row == 0 { max } else { row - 1 };
        let row_next = if row == max { 0 } else { row + 1 };
        let col_prev = if col == 0 { max } else { col - 1 };
        let col_next = if col == max { 0 } else { col + 1 };

        let mut arr = Vec::new();

        if wrap || (row != 0 && col != 0) {
            arr.push(size * row_prev + col_prev)
        };
        if wrap || row != 0 {
            arr.push(size * row_prev + col)
        };
        if wrap || (row != 0 && col != max) {
            arr.push(size * row_prev + col_next)
        };
        if wrap || col != 0 {
            arr.push(size * row + col_prev)
        };
        if wrap || col != max {
            arr.push(size * row + col_next)
        };
        if wrap || (row != max && col != 0) {
            arr.push(size * row_next + col_prev)
        };
        if wrap || row != max {
            arr.push(size * row_next + col)
        };
        if wrap || (row != max && col != max) {
            arr.push(size * row_next + col_next)
        };

        arr
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
