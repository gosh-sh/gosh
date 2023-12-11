// Note:
// Even though tree objects downloaded from the blockchain
// and objects required to deploy a tree are almost the same
// it is better to keep them separate.
// On one hand it does duplicate the code, on the other hand
// it is much easier to follow and apply changes
// in the blockchain contracts.

pub mod load;
mod save;

use std::{
    fmt,
    path::{Path, PathBuf},
};

pub use load::Tree;
pub use save::DeployTree;
use serde::{
    de::{self, Deserialize, Deserializer, Visitor},
    ser::{Serialize, Serializer},
};

fn escape_slashes(s: &str) -> String {
    s.replace('/', "\\/")
}

fn unescape_slashes(s: &str) -> String {
    s.replace("\\/", "/")
}

#[derive(Debug)]
pub struct GoshPath {
    inner: Vec<String>,
}

#[derive(Debug, Clone)]
pub enum GoshPathError {
    InvalideComponent,
}

impl fmt::Display for GoshPathError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            GoshPathError::InvalideComponent => write!(f, "Invalid component"),
        }
    }
}

impl GoshPath {
    pub fn to_path_buf(&self) -> PathBuf {
        let mut path_buf = PathBuf::new();
        for x in self.inner.iter() {
            path_buf.push(x);
        }
        path_buf
    }

    pub fn is_valid_component<T>(value: T) -> bool
    where
        T: AsRef<str>,
    {
        !matches!(value.as_ref(), "." | "..")
    }

    pub fn try_join<T>(&mut self, value: T) -> Result<(), GoshPathError>
    where
        T: Into<String>,
    {
        let v = value.into();
        if GoshPath::is_valid_component(&v) {
            self.inner.push(v);
            Ok(())
        } else {
            Err(GoshPathError::InvalideComponent)
        }
    }
}

impl Serialize for GoshPath {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut buf = String::new();
        for component in &self.inner {
            buf.push_str(&escape_slashes(component));
            buf.push('/');
        }
        if buf.ends_with("/") {
            buf.pop();
        }
        serializer.serialize_str(&buf)
    }
}

struct GoshPathVisitor;

impl<'de> Visitor<'de> for GoshPathVisitor {
    type Value = GoshPath;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str("expected valid gosh path string")
    }

    fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
    where
        E: de::Error,
    {
        let mut gosh_path = GoshPath { inner: vec![] };
        let mut cur = String::new();
        for ch in v.chars() {
            cur.push(ch);
            // split by / but not \/
            if cur.ends_with("/") && !cur.ends_with("\\/") {
                cur.pop();
                gosh_path
                    .try_join(unescape_slashes(&cur))
                    .map_err(E::custom)?;
                cur = String::new();
            }
        }
        gosh_path
            .try_join(unescape_slashes(&cur))
            .map_err(E::custom)?;
        Ok(gosh_path)
    }

    fn visit_string<E>(self, v: String) -> Result<Self::Value, E>
    where
        E: de::Error,
    {
        self.visit_str(&v)
    }
}

impl<'de> Deserialize<'de> for GoshPath {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_struct("GoshPath", ["inner"].as_slice(), GoshPathVisitor)
    }
}

pub fn into_tree_contract_complient_path<P: AsRef<Path> + ?Sized>(path: &P) -> String {
    let path = path.as_ref();
    if path.as_os_str().is_empty() {
        panic!("Expected non-empty path")
    }
    if path.has_root() {
        panic!("Expected path without root")
    }

    if path.ends_with("/") || path.ends_with("\\") {
        panic!("Path can't ends with '/'")
    }

    if cfg!(not(target = "windows")) {
        String::from(path.to_string_lossy())
    } else {
        let mut buf = path
            .components()
            .map(|c| match c {
                std::path::Component::RootDir => unreachable!(),
                std::path::Component::CurDir | std::path::Component::ParentDir => {
                    panic!("Expected path without '.' and '..'")
                }
                std::path::Component::Prefix(prefix) => {
                    panic!("Expected path without windows prefix");
                }
                std::path::Component::Normal(s) => match s.to_str() {
                    Some(s) => s,
                    None => panic!("Expected path componint to be unix string"),
                },
            })
            .fold(String::new(), |a, b| a + b + "/");
        buf.pop(); // pop last /
        buf
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escape_slashes() {
        assert_eq!(escape_slashes("//"), "\\/\\/");
        assert_eq!(escape_slashes(""), "");
    }

    #[test]
    fn test_unescape_slashes() {
        assert_eq!("//", unescape_slashes("\\/\\/"));
        assert_eq!("////", unescape_slashes("\\/\\///"));
        assert_eq!("", unescape_slashes(""));
    }

    #[test]
    fn test_both_ways_escape_slashes() {
        ["//", "\\\\", "", "a/asd/f/f/as/df/f/sadf"]
            .iter()
            .for_each(|&x| {
                assert_eq!(x, unescape_slashes(&escape_slashes(&x)));
            })
    }

    #[test]
    #[should_panic]
    fn test_path_with_root() {
        into_tree_contract_complient_path("/var/test");
    }

    #[test]
    #[ignore]
    fn test_paths() {
        [
            [r#"win\path\test"#, "win/path/test"],
            ["linux/path/test", "linux/path/test"],
        ]
        .into_iter()
        .for_each(|[inp, res]| {
            assert_eq!(into_tree_contract_complient_path(Path::new(inp)), res);
        });
    }
}
