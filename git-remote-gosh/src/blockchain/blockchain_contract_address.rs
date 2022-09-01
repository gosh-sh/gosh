#[derive(Clone, Debug, Serialize)]
#[serde(transparent)]
pub struct BlockchainContractAddress(String);

impl BlockchainContractAddress {
    pub fn new(address: impl Into<String>) -> Self {
        Self(address.into())
    }
}

impl std::fmt::Display for BlockchainContractAddress {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::result::Result<(), std::fmt::Error> {
        write!(f, "<{}>", self.0)
    }
}

impl std::convert::From<BlockchainContractAddress> for String {
    fn from(address: BlockchainContractAddress) -> String {
        address.0 
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    pub fn ensure_formatting(){
        let address = BlockchainContractAddress::new("0:0000000000123");   
        assert_eq!("<0:0000000000123>", format!("{}", address));
    }

    #[test]
    pub fn ensure_into_string_returns_pure_address() {
        let address = BlockchainContractAddress::new("0:0000000000123");
        assert_eq!("0:0000000000123", String::from(address));
    }
}
