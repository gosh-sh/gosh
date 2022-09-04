pub mod load;
pub mod save;
pub use load::{diffs, Snapshot};
pub use save::{
    diff_address, is_diff_deployed, push_diff, push_initial_snapshot, push_new_branch_snapshot,
    PushDiffCoordinate,
};
