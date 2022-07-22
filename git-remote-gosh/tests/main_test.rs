use std::{env, error::Error};

use tokio::process::Command;

/// !!! WORK IN PROGRESS
#[tokio::test]
async fn integration_test() -> Result<(), Box<dyn Error>> {
    let path = env::current_dir().unwrap().join("bin").join("vscode-debug");
    // println!("{:?}", path);

    let old_path = env::var("PATH")?;
    let path = format!("{}:{}", path.display(), old_path);
    // println!("{}", path);

    let old_dst_dir = env::current_dir().unwrap().join("test");
    if old_dst_dir.exists() {
        std::fs::remove_dir_all(old_dst_dir)?;
    }

    let mut cmd = Command::new("git");
    cmd.args(&["clone", "gosh://test"]);
    cmd.env("VSCODE_BIN", "code-insiders");
    cmd.env("PATH", path);
    let res = cmd
        .spawn()
        .expect("cmd failed to start")
        .wait()
        .await
        .expect("cmd failed to run");

    println!("{res}");
    Ok(())
}
