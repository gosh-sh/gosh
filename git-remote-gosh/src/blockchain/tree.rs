use std::error::Error;
use std::collections::HashMap;
use crate::blockchain::{
    GoshContract, 
    Number, 
    Base64Standard, 
    TonClient
};

#[derive(Deserialize, Debug)]
pub struct TreeComponent {
    flags: Number,
    name: String,
    sha1: String,
    mode: String, 
    #[serde(rename = "treeObj")]    
    type_obj: String, 
}

#[derive(Deserialize, Debug)]
pub struct Tree {
    #[serde(rename = "value0")]
    objects: HashMap<String, TreeComponent>,
}


impl Tree {
    pub async fn load(context: &TonClient, address: &str) -> Result<Tree, Box<dyn Error>> {
        let contract = GoshContract::tree(address);
        let tree_content_as_blob = contract.run_local(context, "gettree", None).await?;
        let tree = Tree::parse_json(tree_content_as_blob)?;         
        unimplemented!();
//        contract.run_local(context, "gettree")
    }

    fn parse_json(json: serde_json::Value) -> Result<Tree, Box<dyn Error>> {
        return serde_json::from_value::<Tree>(json)
            .map_err(|e| e.into());
    }
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
