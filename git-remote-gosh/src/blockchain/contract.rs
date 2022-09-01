use super::{GoshContract, TonClient};

trait Contract {
    fn read_state(client: &TonClient, function_name: String, args: Vec<String>) {}
    fn mutate_state() {}
    fn static_method() {}
}

impl Contract for GoshContract {}
