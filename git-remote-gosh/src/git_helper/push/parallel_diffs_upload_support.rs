use std::collections::HashMap;
use crate::blockchain::snapshot::PushDiffCoordinate;


pub struct ParallelDiffsUploadSupport {
    parallels: HashMap<String, u16>,
    next_index: HashMap<String, u16>,
    next_parallel_index: u16
}

impl ParallelDiffsUploadSupport {
    pub fn new() -> Self {
        Self {
            parallels: HashMap::new(),
            next_index: HashMap::new(),
            next_parallel_index: 0
        }
    }

    pub fn next_diff(&mut self, file_path: &str) -> PushDiffCoordinate {
        if !self.parallels.contains_key(file_path) {
            self.parallels.insert(
                file_path.to_string(), 
                self.next_parallel_index
            );
            self.next_index.insert(file_path.to_string(), 0);
            self.next_parallel_index += 1;
        }

        let index_of_parallel_thread = self.parallels[file_path];  
        let order_of_diff_in_the_parallel_thread = self.next_index[file_path];
        self.next_index.insert(
            file_path.to_string(), 
            order_of_diff_in_the_parallel_thread + 1
        );
        return PushDiffCoordinate {
            index_of_parallel_thread, 
            order_of_diff_in_the_parallel_thread
        }; 
    } 
}
