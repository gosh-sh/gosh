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

pub mod uint {
    use super::*;

    pub fn deserialize<'de, D>(d: D) -> Result<u128, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let string = d.deserialize_option(ton_sdk::json_helper::StringVisitor)?;

        if "null" == string {
            return Ok(0);
        }

        if !string.starts_with("0x") {
            return Err(D::Error::custom(format!(
                "Number parsing error: number must be prefixed with 0x ({})",
                string
            )));
        }

        u128::from_str_radix(&string[2..], 16)
            .map_err(|err| D::Error::custom(format!("Error parsing number: {}", err)))
    }

    pub fn serialize<S>(value: &u64, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&format!("0x{:x}", value))
    }
}
