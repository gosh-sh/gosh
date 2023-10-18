use crate::ini::constants::{INI_ENV_VAR, INI_LOCATION, SHIPPING_INI_PATH};
use std::fs::File;
use std::io::BufRead;
use std::path::Path;

mod constants;

pub fn get_ini_path() -> anyhow::Result<String> {
    let path_str = std::env::var(INI_ENV_VAR).unwrap_or_else(|_| {
        if Path::new(&shellexpand::tilde(INI_LOCATION).to_string()).exists() {
            INI_LOCATION
        } else {
            SHIPPING_INI_PATH
        }
        .to_string()
    });
    let path_str = shellexpand::tilde(&path_str).into_owned();
    let path = Path::new(&path_str);

    let final_path = if path.is_absolute() {
        path_str
    } else {
        let mut abs_path = std::env::current_exe()?;
        abs_path.pop();
        abs_path.push(path);
        abs_path
            .to_str()
            .expect("Failed to build dispatcher path")
            .to_owned()
    };
    tracing::trace!("Dispatcher ini file path: {}", final_path);
    Ok(final_path)
}

pub fn load_remote_versions_from_ini() -> anyhow::Result<Vec<String>> {
    let path_str = get_ini_path()?;
    let path = Path::new(&path_str).to_owned();
    let file = File::open(path).map_err(|e| {
        anyhow::format_err!("Failed to read dispatcher ini file {}: {}", path_str, e)
    })?;
    let buf = std::io::BufReader::new(file);
    let res = buf
        .lines()
        .map(|l| l.expect("Failed to parse ini string."))
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .collect();
    tracing::trace!("git-remote-gosh versions from ini: {res:?}");
    Ok(res)
}
