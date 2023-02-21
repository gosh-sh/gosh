use diffy::create_patch_bytes;
use git_hash::ObjectId;
use git_odb::FindExt;
use git_repository::OdbHandle;

pub struct GenerateBlobDiffResult {
    pub original: Vec<u8>,
    pub patch: Vec<u8>,
    pub after_patch: Vec<u8>,
}

#[instrument(level = "debug", skip(odb))]
pub async fn generate_blob_diff(
    odb: &OdbHandle,
    blob_id_from: Option<&ObjectId>,
    blob_id_to: Option<&ObjectId>,
) -> anyhow::Result<GenerateBlobDiffResult> {
    tracing::trace!("generate_blob_diff: blob_id_from={blob_id_from:?}, blob_id_to={blob_id_to:?}");
    let mut blob_from_buffer: Vec<u8> = Vec::new();
    let mut blob_to_buffer: Vec<u8> = Vec::new();
    let prev_content = match blob_id_from {
        None => &blob_from_buffer,
        Some(blob_id_from) => odb.find_blob(blob_id_from, &mut blob_from_buffer)?.data,
    };
    let next_content: &[u8] = match blob_id_to {
        None => &blob_to_buffer,
        Some(blob_id_to) => odb.find_blob(blob_id_to, &mut blob_to_buffer)?.data,
    };
    let diff: Vec<u8> = create_patch_bytes(prev_content, next_content).to_bytes();

    Ok(GenerateBlobDiffResult {
        original: prev_content.to_vec(),
        patch: diff,
        after_patch: next_content.to_vec(),
    })
}
