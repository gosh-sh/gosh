use diffy::create_patch_bytes;
use git_hash::ObjectId;
use git_odb::FindExt;
use git_repository::OdbHandle;

pub struct GenerageBlobDiffResult {
    pub original: Vec<u8>,
    pub patch: Vec<u8>,
    pub after_patch: Vec<u8>,
}

pub async fn generate_blob_diff(
    odb: &OdbHandle,
    blob_id_from: Option<&ObjectId>,
    blob_id_to: &ObjectId,
) -> anyhow::Result<GenerageBlobDiffResult> {
    let mut blob_from_buffer: Vec<u8> = Vec::new();
    let mut blob_to_buffer: Vec<u8> = Vec::new();
    let prev_content = match blob_id_from {
        None => &blob_from_buffer,
        Some(blob_id_from) => odb.find_blob(blob_id_from, &mut blob_from_buffer)?.data,
    };
    let next_content: &[u8] = odb.find_blob(blob_id_to, &mut blob_to_buffer)?.data;
    let diff: Vec<u8> = create_patch_bytes(prev_content, next_content).to_bytes();

    Ok(GenerageBlobDiffResult {
        original: prev_content.to_vec(),
        patch: diff,
        after_patch: next_content.to_vec(),
    })
}
