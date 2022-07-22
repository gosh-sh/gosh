use std::{convert::From, error::Error, fmt};

#[derive(Debug, Clone)]
pub struct RunLocalError {
    msg: String,
}

impl RunLocalError {
    pub fn new(msg: String) -> Self {
        Self { msg }
    }
}

impl fmt::Display for RunLocalError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Run local error: {}", self.msg)
    }
}

impl Error for RunLocalError {
    fn description(&self) -> &str {
        &self.msg
    }
    fn cause(&self) -> Option<&dyn Error> {
        None
    }
}

impl From<&str> for RunLocalError {
    fn from(msg: &str) -> Self {
        RunLocalError::new(msg.to_string())
    }
}

impl From<String> for RunLocalError {
    fn from(msg: String) -> Self {
        RunLocalError::new(msg)
    }
}

impl<T> From<&T> for RunLocalError
where
    T: Error,
{
    fn from(e: &T) -> Self {
        RunLocalError::new(format!("Inner error: {}", e))
    }
}
