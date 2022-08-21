//TODO: pretty sure it exists in an easier way
macro_rules! provide {
    ($utility_fn: ident) => {
        mod $utility_fn;
        pub use $utility_fn::$utility_fn; 
    }
}

provide!(find_tree_blob_occurrences);
provide!(try_find_tree_leaf);
provide!(generate_blob_diff);
provide!(build_tree_diff);
pub use build_tree_diff::build_tree_diff_from_commits;
