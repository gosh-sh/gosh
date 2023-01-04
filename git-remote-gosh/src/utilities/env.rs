use std::{env, ffi::OsStr, time::Duration};

fn parse_duration(raw_str: impl AsRef<str>) -> anyhow::Result<Duration> {
    raw_str
        .as_ref()
        .parse::<f64>()
        .map_err(anyhow::Error::from)
        .map(Duration::try_from_secs_f64)?
        .map_err(anyhow::Error::from)
}

/// Parses [`Duration`] from env var or returns default if env var isn't set
///
/// Respects `Err` context in case of parsing/validation error
pub fn env_var_as_duration_or(
    key: impl AsRef<OsStr>,
    default: Duration,
) -> anyhow::Result<Duration> {
    match env::var(&key) {
        Err(_) => Ok(default),
        Ok(raw_str) => parse_duration(raw_str).map_err(|err| {
            err.context(format!(
                "env {} can't be parsed as Duration (try positive float)",
                key.as_ref().to_string_lossy()
            ))
        }),
    }
}
