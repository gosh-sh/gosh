use std::fs::File;
use std::io;
use std::io::BufRead;

fn get_version_from_solidity_source() -> Vec<String> {
    if let Ok(version_source) = File::open("../contracts/gosh/systemcontract.sol") {
        for line in io::BufReader::new(version_source).lines() {
            if let Ok(line) = line {
                if line.contains("string constant version = ") {
                    return vec![line.trim_start_matches(|c| c != '"').trim_end_matches(|c| c != '"').replace(['\"'], "").to_string()];
                }
            }
        }
    }
    panic!("Failed to load contract version from the sol file!");
}

fn main() {
    println!("cargo:rerun-if-env-changed=GOSH_SUPPORTED_CONTRACT_VERSIONS");
    let mut supported_versions = get_version_from_solidity_source();

    if let Ok(from_env) = std::env::var("GOSH_SUPPORTED_CONTRACT_VERSIONS") {
        supported_versions = from_env.replace(['[', ']', '\"'], "")
            .split(',')
            .map(|s| s.to_string())
            .collect();
    }

    println!("cargo:rustc-env=BUILD_SUPPORTED_VERSIONS={:?}", supported_versions);
}
