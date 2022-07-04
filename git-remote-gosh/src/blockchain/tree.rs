use std::collections::HashMap;
use crate::blockchain::{
    Number, 
};
use data_contract_macro_derive::DataContract;

#[derive(Deserialize, Debug)]
pub struct TreeComponent {
    flags: Number,
    name: String,
    sha1: String,
    mode: String, 
    #[serde(rename = "treeObj")]    
    type_obj: String, 
}

#[derive(Deserialize, Debug, DataContract)]
#[abi = "tree.abi.json"]
#[abi_data_fn = "gettree"]
pub struct Tree {
    #[serde(rename = "value0")]
    objects: HashMap<String, TreeComponent>,
}



#[cfg(test)]
mod tests {
    use super::*;
    mod tree_json_parsing {
        #[test]
        fn ensure_tree_with_a_single_file_can_be_parsed() {
            let tree_json = r#"[
                {
                    "flags": "2",
                    "mode": "100644",
                    "typeObj": "blob",
                    "name": "file0.txt",
                    "sha1": "24a90d89d4738d225cb00d8c59b3292d3b40dd79"
                }
            ]"#;
        }
    }
}
