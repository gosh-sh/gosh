// Note:
// Even though tree objects downloaded from the blockchain
// and objects required to deploy a tree are almost the same
// it is better to keep them separate.
// On one hand it does duplicate the code, on the other hand
// it is much easier to follow and apply changes 
// in the blockchain contracts.

mod load;
mod save;

pub use load::Tree;
pub use save::push_tree;

