mod load;
mod save;
pub use load::{
    diffs,
    Snapshot
};
pub use save::{
    push_diff,
    push_initial_snapshot
};
