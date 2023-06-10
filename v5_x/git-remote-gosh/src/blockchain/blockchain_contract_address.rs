#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(transparent)]
#[allow(dead_code)]
pub struct BlockchainContractAddress(String);

impl BlockchainContractAddress {
    pub fn new<T>(address: T) -> Self
    where
        T: Into<String>,
    {
        Self(address.into())
    }

    pub fn todo_investigate_unexpected_convertion<T>(address: T) -> Self
    where
        T: Into<String>,
    {
        Self::new(address)
    }
}

pub trait FormatShort {
    fn format_short(self) -> String;
}

impl std::fmt::Display for BlockchainContractAddress {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::result::Result<(), std::fmt::Error> {
        write!(f, "<{}>", self.0)
    }
}

impl FormatShort for &[BlockchainContractAddress] {
    fn format_short(self) -> String {
        return format!(
            "[{items}{eps}](len:{size})",
            items = self
                .chunks(3)
                .next()
                .unwrap()
                .iter()
                .map(|e| format!("{}", e))
                .collect::<Vec<String>>()
                .join(", "),
            size = self.len(),
            eps = if self.len() > 3 { "..." } else { "" }
        );
    }
}

impl std::convert::Into<BlockchainContractAddress> for &BlockchainContractAddress {
    fn into(self) -> BlockchainContractAddress {
        self.clone()
    }
}

impl std::convert::From<BlockchainContractAddress> for String {
    fn from(address: BlockchainContractAddress) -> String {
        address.0
    }
}

impl std::convert::From<&BlockchainContractAddress> for String {
    fn from(address: &BlockchainContractAddress) -> String {
        address.0.to_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    pub fn ensure_formatting() {
        let address = BlockchainContractAddress::new("0:0000000000123");
        assert_eq!("<0:0000000000123>", format!("{}", address));
    }

    #[test]
    pub fn ensure_into_string_returns_pure_address() {
        let address = BlockchainContractAddress::new("0:0000000000123");
        assert_eq!("0:0000000000123", String::from(address));
    }
}
