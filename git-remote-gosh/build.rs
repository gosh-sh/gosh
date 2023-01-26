use std::fs::File;
use std::io;
use std::io::BufRead;

fn get_version_from_solidity_source() -> Vec<String> {
    let contracts_path = std::env::var("CONTRACTS_DIR").expect("Failed to get GOSH contracts directory. Specify it with CONTRACTS_DIR env variable.")  + "/systemcontract.sol";
    let version_source = File::open(&contracts_path).expect(&format!("Failed to open file: {}", &contracts_path));

    for line in io::BufReader::new(version_source).lines() {
        if let Ok(line) = line {
            if line.contains("string constant version = ") {
                return vec![line.trim_start_matches(|c| c != '"').trim_end_matches(|c| c != '"').replace(['\"'], "").to_string()];
            }
        }
    }

    panic!("Failed to load contract version from the sol file!");
}

fn main() {
    println!("cargo:rerun-if-env-changed=CONTRACTS_DIR");
    println!("cargo:rerun-if-changed=.cargo/config.toml");
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
