extern crate js_sys;
extern crate wasm_bindgen;

mod utils;

use crate::utils::set_panic_hook;
use js_sys::Uint32Array;
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
    size: u32,
    alive: HashSet<u32>,
    to_check: Vec<u32>,
}

#[wasm_bindgen]
impl GameEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(size: u32, starting_data: Vec<u32>) -> GameEngine {
        set_panic_hook();
        let mut game_engine = GameEngine {
            size: size,
            alive: HashSet::new(),
            to_check: Vec::new(),
        };

        for cell_index in starting_data {
            let neighbors = get_neighbors(size, cell_index);
            for neighbor_index in &neighbors {
                game_engine.to_check.push(*neighbor_index);
            }
            game_engine.to_check.push(cell_index);
            game_engine.alive.insert(cell_index);
        }

        game_engine
    }

    pub fn next(&mut self) -> Result {
        let capacity = self.to_check.len();
        let mut prev_set = mem::replace(&mut self.to_check, Vec::with_capacity(capacity));
        let mut born: Vec<u32> = Vec::new();
        let mut died: Vec<u32> = Vec::new();

        for index in prev_set.drain(..) {
            let was_alive = self.alive.contains(&index);
            let mut is_alive = false;
            let mut is_changed = false;
            let mut neighbors = get_neighbors(self.size, index);
            let mut alive_neighbor_count = 0;

            for neighbor_index in &neighbors {
                if self.alive.contains(neighbor_index) {
                    alive_neighbor_count += 1
                };
            }

            match alive_neighbor_count {
                2 => is_alive = was_alive,
                3 => {
                    is_alive = true;
                    is_changed = !was_alive
                }
                _ => {
                    is_alive = false;
                    is_changed = was_alive
                }
            }

            if is_changed {
                if is_alive {
                    born.push(index as u32)
                } else {
                    died.push(index as u32)
                }
                let mut vec = Vec::with_capacity(9);
                vec.push(index as u32);
                vec.append(&mut neighbors);
                self.add_cells_to_check(vec);
            }
        }

        for cell_index in &born {
            self.alive.insert(*cell_index);
        }
        for cell_index in &died {
            self.alive.remove(cell_index);
        }

        Result {
            born: born,
            died: died,
        }
    }

    fn add_cells_to_check(&mut self, mut cells: Vec<u32>) {
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
#[derive(Serialize)]
pub struct Result {
    born: Vec<u32>,
    died: Vec<u32>,
}

#[wasm_bindgen]
impl Result {
    #[wasm_bindgen(getter)]
    pub fn born(&self) -> js_sys::Uint32Array {
        unsafe { Uint32Array::view(&self.born[..]) }
    }

    #[wasm_bindgen(getter)]
    pub fn died(&self) -> js_sys::Uint32Array {
        unsafe { Uint32Array::view(&self.died[..]) }
    }
}

fn get_neighbors(size: u32, index: u32) -> Vec<u32> {
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
