extern crate wasm_bindgen;

mod utils;

use crate::utils::set_panic_hook;
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
    to_check: Vec<usize>,
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
    pub fn new(size: usize, starting_data: Vec<usize>) -> GameEngine {
        set_panic_hook();
        let mut game_engine = GameEngine {
            size: size,
            data: Vec::new(),
            to_check: Vec::new(),
        };
        game_engine.data.resize(size * size, 0);

        for cell_index in starting_data {
            let neighbors = get_neighbors(size, cell_index);
            for neighbor_index in &neighbors {
                game_engine.to_check.push(*neighbor_index);
            }
            game_engine.to_check.push(cell_index);
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
        let mut results: Vec<Result> = Vec::with_capacity(count as usize);
        for _ in 0..count {
            results.push(self.next())
        }
        serde_json::to_string(&results).unwrap()
    }

    fn next(&mut self) -> Result {
        let capacity = self.to_check.len();
        let mut prev_set = mem::replace(&mut self.to_check, Vec::with_capacity(capacity));
        let mut born: Vec<usize> = Vec::new();
        let mut died: Vec<usize> = Vec::new();
        let mut alive: Vec<usize> = Vec::new();

        for index in prev_set.drain(..) {
            let prev_state = self.data[index];
            let mut is_alive = false;
            let mut is_changed = false;
            let mut neighbors = get_neighbors(self.size, index);
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
                self.add_cells_to_check(vec![index]);
            }

            if is_changed {
                if is_alive {
                    born.push(index)
                } else {
                    died.push(index)
                }
                let mut vec = Vec::with_capacity(9);
                vec.push(index);
                vec.append(&mut neighbors);
                self.add_cells_to_check(vec);
            }
        }

        for cell_index in &born {
            self.data[*cell_index] = 1
        }
        for cell_index in &died {
            self.data[*cell_index] = 0
        }

        Result {
            born: born,
            died: died,
            alive: alive,
        }
    }

    fn add_cells_to_check(&mut self, mut cells: Vec<usize>) {
        if self.to_check.len() == 0 {
            self.to_check.append(&mut cells)
        } else {
            cells.sort();
            let mut ptr = self.to_check.len() - 1;
            for new_cell in cells.iter().rev() {
                while *new_cell < self.to_check[ptr] && ptr > 0 {
                    ptr -= 1;
                }
                if *new_cell > self.to_check[ptr] {
                    self.to_check.insert(ptr + 1, *new_cell)
                } else if ptr == 0 {
                    self.to_check.insert(ptr, *new_cell)
                }
            }
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

fn get_neighbors(size: usize, index: usize) -> Vec<usize> {
    let wrap = true;
    let max = size - 1;
    let row = index / size;
    let col = index % size;

    let row_prev = if row == 0 { max } else { row - 1 };
    let row_next = if row == max { 0 } else { row + 1 };
    let col_prev = if col == 0 { max } else { col - 1 };
    let col_next = if col == max { 0 } else { col + 1 };

    let mut arr = Vec::with_capacity(8);

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
