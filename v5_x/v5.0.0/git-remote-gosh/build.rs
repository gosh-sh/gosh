use std::fs::{copy, create_dir_all, read_dir, File};
use std::io;
use std::io::BufRead;
use std::path::Path;

fn get_version_from_solidity_source() -> String {
    let contracts_path = std::env::var("CONTRACTS_DIR").expect(
        "Failed to get GOSH contracts directory. Specify it with CONTRACTS_DIR env variable.",
    ) + "/systemcontract.sol";
    let version_source =
        File::open(&contracts_path).expect(&format!("Failed to open file: {}", &contracts_path));

    for line in io::BufReader::new(version_source).lines() {
        let line = line.expect(&format!("Failed to read line from {}", &contracts_path));
        if line.contains("string constant version = ") {
            return line
                .trim_start_matches(|c| c != '"')
                .trim_end_matches(|c| c != '"')
                .replace(['\"'], "")
                .to_string();
        }
    }

    panic!("Failed to load contract version from the sol file!");
}

fn main() {
    let resources = Path::new("./resources");
    create_dir_all(resources).expect("create resources directory");

    let abi_dir = option_env!("ABI_DIR").unwrap_or("../contracts/gosh");
    for entry in read_dir(abi_dir).expect("read contracts directory") {
        if let Ok(e) = entry {
            if e.file_name().to_str().unwrap().ends_with("abi.json") {
                copy(e.path(), resources.join(e.file_name())).expect("error while copy abi");
            }
        }
    }

    println!("cargo:rerun-if-env-changed=CONTRACTS_DIR");
    println!("cargo:rerun-if-changed=.cargo/config.toml");
    println!("cargo:rerun-if-env-changed=GOSH_SUPPORTED_CONTRACT_VERSION");
    let mut supported_versions = get_version_from_solidity_source();

    if let Ok(from_env) = std::env::var("GOSH_SUPPORTED_CONTRACT_VERSION") {
        supported_versions = from_env;
    }

    println!(
        "cargo:rustc-env=BUILD_SUPPORTED_VERSION={:?}",
        supported_versions
    );
}
