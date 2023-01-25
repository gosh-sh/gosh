fn main() {
    println!("cargo:rerun-if-env-changed=GOSH_SUPPORTED_CONTRACT_VERSIONS");
    let mut supported_versions = vec!["1.0.0".to_string()];

    if let Ok(from_env) = std::env::var("GOSH_SUPPORTED_CONTRACT_VERSIONS") {
        supported_versions = from_env.replace(['[', ']', '\"'], "")
            .split(',')
            .map(|s| s.to_string())
            .collect();
    }

    println!("cargo:rustc-env=BUILD_SUPPORTED_VERSIONS={:?}", supported_versions);
}
