mod load;
mod save;
pub use load::{
    diffs,
    Snapshot
};
pub use save::{
    push_diff,
    PushDiffCoordinate,
    push_initial_snapshot,
    push_new_branch_snapshot
};
