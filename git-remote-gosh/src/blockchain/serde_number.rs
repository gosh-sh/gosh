#![allow(unused_variables)]

use serde::de::Error as SerdeError;
use serde::de::Visitor;
use serde::{Deserialize, Deserializer, Serialize};

use std::fmt;

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(transparent)]
pub struct Number(u8);

impl<'de> Deserialize<'de> for Number {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct MyVisitor;

        impl<'de> Visitor<'de> for MyVisitor {
            type Value = Number;

            fn expecting(&self, fmt: &mut fmt::Formatter<'_>) -> fmt::Result {
                fmt.write_str("integer or string")
            }

            fn visit_u64<E>(self, val: u64) -> Result<Self::Value, E>
            where
                E: SerdeError,
            {
                match u8::try_from(val) {
                    Ok(val) => Ok(Number(val)),
                    Err(_) => Err(E::custom("invalid integer value")),
                }
            }

            fn visit_str<E>(self, val: &str) -> Result<Self::Value, E>
            where
                E: SerdeError,
            {
                match val.parse::<u64>() {
                    Ok(val) => self.visit_u64(val),
                    Err(_) => Err(E::custom("failed to parse integer")),
                }
            }
        }

        deserializer.deserialize_any(MyVisitor)
    }
}
