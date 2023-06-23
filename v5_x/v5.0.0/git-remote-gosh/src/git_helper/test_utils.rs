use git_object::bstr::ByteSlice;
use git_repository::Repository;
use std::{env, fs};

pub fn setup_repo(name: &str, script_path: &str) -> anyhow::Result<Repository> {
    eprintln!("Testing push: current_dir = {:?}", env::current_dir()?);

    let dir = std::env::temp_dir().join(name);
    if dir.exists() {
        fs::remove_dir_all(&dir).unwrap();
    }
    eprintln!("Testing push: dir = {:?}", dir);

    fs::create_dir_all(&dir)?;

    let script_absolute_path = env::current_dir()?.join(script_path);
    let output = std::process::Command::new("bash")
        .arg(script_absolute_path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .current_dir(&dir)
        .output()?;

    eprintln!("stdout: \n{}", output.stdout.to_str_lossy());
    eprintln!("stderr: \n{}", output.stderr.to_str_lossy());

    let repo = git_repository::open(&dir)?;
    eprintln!("Repo: {:?}", repo);

    Ok(repo)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn run_setup_repo() {
        setup_repo("test_setup", "tests/fixtures/make_remote_repo.sh").unwrap();
    }
}
