use super::TonClient;

pub trait BlockchainClient {
    fn client(&self) -> &TonClient;
}
