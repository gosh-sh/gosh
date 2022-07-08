use super::Result;

//TODO: pretty sure it exists in an easier way
macro_rules! provide {
    ($utility_fn: expr) => {{
        mod $utility_fn;
        pub use $utility_fn::$utility_fn; 
    }}
}
mod find_tree_blob_occurrences;
mod try_find_tree_leaf;
pub use find_tree_blob_occurrences::find_tree_blob_occurrences;
pub use try_find_tree_leaf::try_find_tree_leaf;



