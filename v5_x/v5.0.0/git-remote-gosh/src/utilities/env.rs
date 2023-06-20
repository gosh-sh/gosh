use std::{env, ffi::OsStr, time::Duration};

/// Parses the value of an environment variable `key` as a specified type `Q`.
///
/// # Parameters
///
/// - `key`: The name of the environment variable to parse.
///
/// # Returns
///
/// A result containing the parsed value, or an error if the value could not be
/// parsed or the environment variable was not found.
pub fn parse_env<T: FromEnv>(key: impl AsRef<OsStr>) -> anyhow::Result<T> {
    FromEnv::from_env(key)
}

/// Parses the value of an environment variable `key` as a specified type `Q`,
/// or returns a default value if the environment variable is not set.
///
/// # Parameters
///
/// - `key`: The name of the environment variable to parse.
/// - `default`: The default value to use if the environment variable is not
///   set.
///
/// # Returns
///
/// A result containing the parsed value, or the default value if the
/// environment variable is not set. Returns an error if the value is found but
/// could not be parsed.
pub fn parse_env_or<T: FromEnv>(key: impl AsRef<OsStr>, default: T) -> anyhow::Result<T> {
    FromEnv::from_env_or(key, default)
}

/// A trait for types that can be parsed from the value of an environment variable.
pub trait FromEnv: Sized {
    /// Parses the value of an environment variable as the implementing type.
    ///
    /// # Parameters
    ///
    /// - `key`: The name of the environment variable to parse.
    ///
    /// # Returns
    ///
    /// A result containing the parsed value, or an error if the value could not
    /// be parsed or the environment variable was not found.
    fn from_env(key: impl AsRef<OsStr>) -> anyhow::Result<Self>;

    /// Parses the value of an environment variable as the implementing type, or
    /// returns a default value if the environment variable is not set.
    ///
    /// # Parameters
    ///
    /// - `key`: The name of the environment variable to parse.
    /// - `default`: The default value to use if the environment variable is not
    ///   set.
    ///
    /// # Returns
    ///
    /// A result containing the parsed value, or the default value if the
    /// environment variable is not set. Returns an error if the value is found
    /// but could not be parsed.
    fn from_env_or(key: impl AsRef<OsStr>, default: Self) -> anyhow::Result<Self>;
}

/// Parses the value of an environment variable `key` as a specified type `T`.
///
/// Returns an error if value is found but can't be parsed.
///
/// Also returns an error if env value isn't found and `default` value is None.
#[inline]
fn fetch_env<T, F>(key: impl AsRef<OsStr>, default: Option<T>, parse_fn: F) -> anyhow::Result<T>
where
    F: Fn(String) -> anyhow::Result<T>,
{
    let key_lossy = key.as_ref().to_string_lossy();
    if let Ok(raw_str) = env::var(key.as_ref()) {
        parse_fn(raw_str).map_err(|err| {
            err.context(format!(
                "env {} can't be parsed as {}",
                key_lossy,
                stringify!(T)
            ))
        })
    } else {
        default.ok_or_else(|| anyhow::anyhow!("env {} not found", key_lossy))
    }
}

macro_rules! from_str_from_env_int_impl {
    ($($t:ty)*) => {$(
        impl FromEnv for $t {
            fn from_env(key: impl AsRef<OsStr>) -> anyhow::Result<Self> {
                fetch_env(key, None, |s| s.parse::<$t>().map_err(anyhow::Error::from))
            }
            fn from_env_or(key: impl AsRef<OsStr>, default: Self) -> anyhow::Result<Self> {
                fetch_env(key, Some(default), |s| s.parse::<$t>().map_err(anyhow::Error::from))
            }
        }
    )*};
}

from_str_from_env_int_impl! { isize i8 i16 i32 i64 i128 usize u8 u16 u32 u64 u128 }

fn parse_duration(raw_str: impl AsRef<str>) -> anyhow::Result<Duration> {
    raw_str
        .as_ref()
        .parse::<f64>()
        .map_err(anyhow::Error::from)
        .map(Duration::try_from_secs_f64)?
        .map_err(anyhow::Error::from)
}

impl FromEnv for Duration {
    fn from_env(key: impl AsRef<OsStr>) -> anyhow::Result<Self> {
        fetch_env(key, None, parse_duration)
    }
    fn from_env_or(key: impl AsRef<OsStr>, default: Self) -> anyhow::Result<Self> {
        fetch_env(key, Some(default), parse_duration)
    }
}
