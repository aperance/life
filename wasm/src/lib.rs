extern crate wasm_bindgen;

mod utils;

use serde::Serialize;
use std::collections::HashSet;
use std::mem;
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
    to_check: HashSet<usize>,
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
            to_check: HashSet::new(),
        };
        game_engine.data.resize(size * size, 0);

        for cell_index in startingData {
            let neighbors = get_neighbors(size, cell_index);
            for neighbor_index in &neighbors {
                game_engine.to_check.insert(*neighbor_index);
            }
            game_engine.to_check.insert(cell_index);
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
        //let mut to_check_next = HashSet::new();
        let mut prev_set = mem::replace(&mut self.to_check, HashSet::new());
        let mut born: Vec<usize> = Vec::new();
        let mut died: Vec<usize> = Vec::new();
        let mut alive: Vec<usize> = Vec::new();

        for index in prev_set.drain() {
            let prev_state = self.data[index];
            let mut is_alive = false;
            let mut is_changed = false;
            let neighbors = get_neighbors(self.size, index);
            let mut alive_neighbor_count = 0;

            for neighbor_index in &neighbors {
                alive_neighbor_count = alive_neighbor_count + self.data[*neighbor_index];
            }

            match alive_neighbor_count {
                2 => is_alive = if prev_state == 1 { true } else { false },
                3 => {
                    is_alive = true;
                    is_changed = if prev_state == 0 { true } else { false }
                }
                _ => {
                    is_alive = false;
                    is_changed = if prev_state == 1 { true } else { false }
                }
            }

            if is_alive {
                alive.push(index);
                self.to_check.insert(index);
            }

            if is_changed {
                if is_alive {
                    born.push(index)
                } else {
                    died.push(index)
                }
                self.to_check.insert(index);
                for neighbor_index in &neighbors {
                    self.to_check.insert(*neighbor_index);
                }
            }
        }

        for cell_index in &born {
            self.data[*cell_index] = 1
        }
        for cell_index in &died {
            self.data[*cell_index] = 0
        }

        // for cell_index in to_check_next.drain() {
        //     self.to_check.insert(cell_index)
        // }

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

fn get_neighbors(size: usize, index: usize) -> Vec<usize> {
    let wrap = true;
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
