pragma ton-solidity >=0.71.0;

struct BindInfo {
  address flex;
  uint256 unsalted_price_code_hash;
}

struct addr_std_fixed {
    int8 workchain_id;
    uint256 addr;
}

struct lend_owner_key {
  addr_std_fixed dest;    ///< Destination contract address.
}

struct lend_owner_array_record {
  lend_owner_key lend_key;         ///< Lend ownership key (destination address + user id).
  uint128        lend_balance;     ///< Lend ownership balance.
  uint32         lend_finish_time; ///< Lend ownership finish time.
}

struct FlexLendPayloadArgs {
  bool      sell;               ///< Sell order if true, buy order if false.
  bool      immediate_client;   ///< Should this order try to be executed as a client order first
                                ///<  (find existing corresponding orders).
  bool      post_order;         ///< Should this order be enqueued if it doesn't already have corresponding orders.
  uint128   amount;             ///< Amount of major tokens to buy or sell.
  address   client_addr;        ///< Client contract address. PriceXchg will execute cancels from this address,
                                ///<  send notifications and return the remaining native funds (evers) to this address.
  uint256   user_id;            ///< User id. It is trader wallet's pubkey. Receiving wallet credentials will be { pubkey: user_id, owner: client_addr }.
  uint256   order_id;           ///< Order id for client purposes.
}

struct Tip3Creds {
  uint256 pubkey;
  optional(address) owner;
}

abstract contract AFlexWallet {  
    function transferToRecipient(
      uint32 _answer_is,
      optional(address) answer_addr,
      Tip3Creds to,
      uint128 tokens,
      uint128 evers,
      uint128 keep_evers,
      bool deploy,
      uint128 return_ownership,
      optional(TvmCell) notify_payload) public functionID(0xb) {}

    function getDetails() public functionID(0x100)
        returns (
            string name, string symbol, uint8 decimals, uint128 balance,
            uint256 root_public_key, address root_address, uint256 wallet_pubkey,
            optional(address) owner_address,
            optional(uint256) lend_pubkey,
            lend_owner_array_record[] lend_owners,
            uint128 lend_balance,
            optional(BindInfo) binding,
            uint256 code_hash,
            uint16 code_depth,
            int8 workchain_id) {}
            
    function details(uint32 _answer_id) public functionID(0x14)
        returns (
            string name, string symbol, uint8 decimals, uint128 balance,
            uint256 root_public_key, address root_address, uint256 wallet_pubkey,
            optional(address) owner_address,
            optional(uint256) lend_pubkey,
            lend_owner_array_record[] lend_owners,
            uint128 lend_balance,
            optional(BindInfo) binding,
            uint256 code_hash,
            uint16 code_depth,
            int8 workchain_id) {}

    function cancelOrder(
        uint128 evers,
        address price,
        bool sell,
        optional(uint256) order_id
    ) public functionID(0x11) {}

    function makeOrder(
        uint32 _answer_id,
        optional(address) answer_addr,
        uint128 evers,
        uint128 lend_balance,
        uint32 lend_finish_time,
        uint128 price_num,
        TvmCell unsalted_price_code,
        TvmCell salt,
        FlexLendPayloadArgs args
    ) public functionID(0x10) {}
    
    function bind(
    	bool set_binding,
    	optional(BindInfo) binding,
    	bool set_trader,
    	optional(uint256) trader
    ) public functionID(0x13) {}
}
