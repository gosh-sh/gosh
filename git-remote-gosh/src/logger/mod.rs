mod id_generator;
pub mod telemetry;

use std::{env, fmt, str::FromStr};

const GIT_HELPER_ENV_TRACE_VERBOSITY: &str = "GOSH_TRACE";
