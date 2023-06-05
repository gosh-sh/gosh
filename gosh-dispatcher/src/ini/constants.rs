#[cfg(target_family = "unix")]
pub const INI_LOCATION: &str = "~/.gosh/dispatcher.ini";

#[cfg(target_family = "windows")]
pub const INI_LOCATION: &str = "~\\.gosh\\dispatcher.ini";

pub const SHIPPING_INI_PATH: &str = "dispatcher.ini";
pub const INI_ENV_VAR: &str = "GOSH_INI_PATH";
