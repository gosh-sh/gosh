use std::iter::Iterator;

// TODO: leave only one struct Diff
#[derive(Deserialize, Debug, Clone, PartialEq)]
pub struct Diff {
    #[serde(rename = "snap")]
    snapshot_contract_address: String,
    #[serde(rename = "nameSnap")]
    pub snapshot_file_path: String,
    pub commit: String,
    patch: Option<String>,
    pub ipfs: Option<String>,
    #[serde(rename = "removeIpfs")]
    pub remove_ipfs: bool,
    #[serde(rename = "sha1")]
    pub modified_blob_sha1: Option<String>,
    pub sha256: String,
}

impl Diff {
    pub fn with_patch<F, R>(&self, f: F) -> R
    where
        F: FnOnce(Option<&diffy::Patch<[u8]>>) -> R,
    {
        let data = match self.get_patch_data() {
            None => return f(None),
            Some(d) => d,
        };
        let patch = diffy::Patch::from_bytes(&data).expect("Must be correct patch");
        f(Some(&patch))
    }

    pub fn get_patch_data(&self) -> Option<Vec<u8>> {
        let data: String = match &self.patch {
            None => return None,
            Some(s) => s.clone(),
        };
        assert!(
            data.len() % 2 == 0,
            "It is certainly not a hex string. better to fail now"
        );
        let data: Vec<u8> = (0..data.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&data[i..i + 2], 16).expect("must be hex string"))
            .collect();
        let data: Vec<u8> =
            ton_client::utils::decompress_zstd(&data).expect("Must be correct archive");
        Some(data)
    }
}
