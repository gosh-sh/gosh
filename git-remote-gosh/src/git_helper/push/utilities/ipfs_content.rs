pub fn is_going_to_ipfs(new_content: &[u8]) -> bool {
    let mut is_going_to_ipfs = new_content.len() > crate::config::IPFS_CONTENT_THRESHOLD;
    if !is_going_to_ipfs {
        is_going_to_ipfs = std::str::from_utf8(new_content).is_err();
    };

    is_going_to_ipfs
}
