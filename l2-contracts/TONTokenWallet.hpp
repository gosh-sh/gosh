/** \file
 *  \brief TONTokenWallet contract interfaces and data-structs.
 *
 *  Compiles into two contract versions: TONTokenWallet.tvc (external wallet) and FlexWallet.tvc (internal wallet).
 *  With different macroses.
 *  TIP3_ENABLE_EXTERNAL - enable external method calls (by key signature).
 *  TIP3_ENABLE_LEND_OWNERSHIP - enable lend ownership functionality.
 *  TIP3_ENABLE_BURN - enable burn functionality, to transfer tokens back through Wrapper.
 *  TIP3_ENABLE_DESTROY - enable destroy method to self-destruct empty wallet.
 *  \author Andrew Zhogin
 *  \copyright 2019-2022 (c) EverFlex Inc
 */

#pragma once

#include <tvm/schema/message.hpp>
#include <tvm/sequence.hpp>
#include <tvm/small_dict_map.hpp>

#include <tvm/replay_attack_protection/timestamp.hpp>
#include <tvm/smart_switcher.hpp>
#include <tvm/contract_handle.hpp>

#include "FlexLendPayloadArgs.hpp"
#include "Tip3Config.hpp"
#include "Tip3Creds.hpp"
#include "bind_info.hpp"
#include "immutable_ids.hpp"

namespace tvm {

// #define TIP3_ENABLE_EXTERNAL
// #define TIP3_ENABLE_LEND_OWNERSHIP
// #define TIP3_ENABLE_BURN
// #define TIP3_ENABLE_DESTROY
// #define TIP3_ONLY_FLEX_EXTERNAL

#if defined(TIP3_ENABLE_EXTERNAL) && !defined(TIP3_ONLY_FLEX_EXTERNAL)
#define TIP3_EXTERNAL [[external]]
#else
#define TIP3_EXTERNAL
#endif

#if defined(TIP3_ENABLE_EXTERNAL) || defined(TIP3_ONLY_FLEX_EXTERNAL)
#define FLEX_EXTERNAL [[external]]
#else
#define FLEX_EXTERNAL
#endif

static constexpr unsigned TOKEN_WALLET_TIMESTAMP_DELAY = 1800;
using wallet_replay_protection_t = replay_attack_protection::timestamp<TOKEN_WALLET_TIMESTAMP_DELAY>;

/// Complex key for lend owners mapping
struct lend_owner_key {
  addr_std_fixed dest;    ///< Destination contract address.
};

/// Lend ownership record (for usage in `address->lend_owner_record` map).
struct lend_owner {
  uint128 lend_balance;     ///< Lend ownership balance.
  uint32  lend_finish_time; ///< Lend ownership finish time.
  uint256 user_pubkey;      ///< Lend pubkey of the user ordered to lend ownership to the address
};
/// Lend owners (contracts) map
using lend_owners_map = small_dict_map<lend_owner_key, lend_owner>;

/// Lend ownership array record (for usage in getter).
struct lend_owner_array_record {
  lend_owner_key lend_key;         ///< Lend ownership key (destination address + user id).
  uint128        lend_balance;     ///< Lend ownership balance.
  uint32         lend_finish_time; ///< Lend ownership finish time.
};
/// Lend ownership array.
using lend_owners_array = dict_array<lend_owner_array_record>;

/// TONTokenWallet details info (for getter).
struct details_info {
  string            name;              ///< Token name.
  string            symbol;            ///< Token short symbol.
  uint8             decimals;          ///< Decimals for ui purposes. ex: balance 100 with decimals 2 will be printed as 1.00.
  uint128           balance;           ///< Token balance of the wallet.
  uint128           locked;            ///< Locked token balance of the wallet.
  uint256           root_pubkey;       ///< Public key of the related RootTokenContract.
  address           root_address;      ///< Address of the related RootTokenContract.
  uint256           wallet_pubkey;     ///< Public key of wallet owner (User id for FlexWallet).
  address_opt       owner_address;     ///< Owner contract address for internal ownership, will be 0:0..0 otherwise.
  opt<uint256>      lend_pubkey;       ///< Lend ownership pubkey.
  lend_owners_array lend_owners;       ///< All lend ownership records of the contract.
  uint128           lend_balance;      ///< Summarized lend balance to all targets.
                                       ///< Actual active balance will be `balance - lend_balance`.
  opt<bind_info>    binding;           ///< Flex binding info.
  uint256           code_hash;         ///< Tip3 wallet code hash to verify other wallets.
  uint16            code_depth;        ///< Tip3 wallet code depth to verify other wallets.
  int8              workchain_id;      ///< Workchain id.
};

/** \interface ITONTokenWalletNotify
 *  \brief TON Token wallet notification callback interface.
 *
 *  Must be implemented in contracts receiving lend ownership or transfer notifications.
 */
__interface ITONTokenWalletNotify {
  

  /// Notification that target contract has received temporary (lend) ownership
  ///  of specified tokens amount in the wallet.
  [[internal, answer_id]]
  bool onTip3LendOwnership(
    uint128     balance,          ///< Amount of tokens in temporary ownership of target contract.
                                  ///< \warning (for dev) balance must be first parameter to correctly process `on_bounced`.
    uint32      lend_finish_time, ///< Lend ownership finish time.
    Tip3Creds   creds,            ///< Wallet's credentials (pubkey + owner)
    cell        payload,          ///< Payload (arbitrary cell).
    address     answer_addr       ///< Answer address (to receive answer and the remaining processing evers).
  ) = 201;

  /// Notification from tip3 wallet to its owner contract about received tokens transfer.
  [[internal, answer_id]]
  bool onTip3Transfer(
    uint128        balance,       ///< New balance of the wallet.
    uint128        new_tokens,    ///< Amount of tokens received in transfer.
    uint128        evers_balance, ///< Evers balance of the wallet
    Tip3Config     tip3cfg,       ///< Tip3 configuration.
    opt<Tip3Creds> sender,        ///< Sender wallet's credentials (pubkey + owner). Empty if mint received from root/wrapper.
    Tip3Creds      receiver,      ///< Receiver wallet's credentials (pubkey + owner).
    cell           payload,       ///< Payload (arbitrary cell).
    address        answer_addr    ///< Answer address (to receive answer and the remaining processing evers).
  ) = 202;
};
using ITONTokenWalletNotifyPtr = handle<ITONTokenWalletNotify>;

/** \interface ITONTokenWallet
 *  \brief TON Token wallet contract interface.
 */
__interface ITONTokenWallet {

  TIP3_EXTERNAL
  [[internal, answer_id]]
  void burnTokens(
    uint128 tokens,
    uint256 to
  ) = 1003;

  TIP3_EXTERNAL
  [[internal, answer_id]]
  void burnTokensToNewRoot(
    uint128 tokens
  ) = 1004;

  TIP3_EXTERNAL
  [[internal, answer_id]]
  void burnTokensToDao(
    address systemcontract,
    address pubaddr,
    uint128 tokens
  ) = 1005;

  /// Lock tokens in tip3 wallet contract.
  TIP3_EXTERNAL
  [[internal, answer_id]]
  void lock(
    uint128     tokens           ///< Amount of tokens to lock.
  ) = 1001;

  /// Unlock tokens in tip3 wallet contract.
  TIP3_EXTERNAL
  [[internal, answer_id]]
  void unlock(
    uint128     tokens           ///< Amount of tokens to lock.
  ) = 1002;

  /// Transfer tokens to another tip3 wallet contract.
  TIP3_EXTERNAL
  [[internal, answer_id]]
  void transfer(
    address_opt answer_addr,      ///< Answer address.
    address     to,               ///< Destination tip3 wallet address.
    uint128     tokens,           ///< Amount of tokens to transfer.
    uint128     evers,            ///< Native funds to process.
                                  ///< For internal requests, this value is ignored
                                  ///<  and processing costs will be taken from attached value.
    uint128     return_ownership, ///< Return ownership - to decrease lend ownership provided for the caller contract (additionally).
    opt<cell>   notify_payload    ///< Payload (arbitrary cell) - if specified, will be transmitted into dest owner's notification.
  ) = 10;

  /// Transfer to recipient.
  /// "ToRecipient" version calculate destination wallet address.
  /// using recipient public key and recipient internal owner.
  TIP3_EXTERNAL
  [[internal, answer_id]]
  void transferToRecipient(
    address_opt answer_addr,      ///< Answer address.
    Tip3Creds   to,               ///< Recipient credentials (pubkey + owner)
    uint128     tokens,           ///< Amount of tokens to transfer.
    uint128     evers,            ///< Native funds to process.
                                  ///< For internal requests, this value is ignored
                                  ///<  and processing costs will be taken from attached value.
    uint128     keep_evers,       ///< Evers to keep in destination wallet
    bool        deploy,           ///< Contract will send acceptTransfer message with StateInit
                                  ///<  to also deploy new tip3 wallet (if it doesn't already exist) with
                                  ///<  the provided recipient_public_key and recipient_internal_owner.
    uint128     return_ownership, ///< Return ownership - to decrease lend ownership for the caller contract (additionally).
    opt<cell>   notify_payload    ///< Payload (arbitrary cell) - if specified, will be transmitted into dest owner's notification.
  ) = 11;

  /// Request wallet token balance using internal message (contract-to-contract).
  [[internal, answer_id]]
  uint128 balance() = 12;

  /// Receive tokens from root (RootTokenContract).
  [[internal]]
  void acceptMint(
    uint128 _value,          ///< Tokens received from RootTokenContract.
    address answer_addr,     ///< Answer address.
    uint128 keep_evers,      ///< Native funds that the wallet should keep before returning answer with the remaining funds.
    opt<cell> notify_payload ///< Payload (arbitrary cell) - if specified, will be transmitted into dest owner's notification.
  ) = 0x4384F298;

  /// Receive tokens from another tip3 wallet.
  [[internal]]
  void acceptTransfer(
    uint128     _value,        ///< Amount of tokens received from another tip3 token wallet.
    address     answer_addr,   ///< Answer address.
    uint128     keep_evers,    ///< Native funds that the wallet should keep before returning answer with the remaining funds.
    uint256     sender_pubkey, ///< Sender wallet pubkey.
    address_opt sender_owner,  ///< Sender wallet internal owner.
    opt<cell>   payload        ///< Payload (arbitrary cell). If specified, the wallet should send notification to its internal owner.
  ) = 0x67A0B95F;

#ifdef TIP3_ENABLE_DESTROY
  /// Send the remaining !native! funds to \p dest and destroy the wallet.
  /// Token balance must be zero. Not allowed for lend ownership.
  TIP3_EXTERNAL
  [[internal]]
  void destroy(
    address dest ///< Where to send the remaining evers.
  ) = 13;
#endif // TIP3_ENABLE_DESTROY

#ifdef TIP3_ENABLE_BURN
  /// The wallet will send self destruct message transferring all the remaining funds to the Wrapper.
  /// Wrapper will transfer the same amount of external (wrapped) tip3 tokens from his wallet to a wallet with
  ///  { out_pubkey, out_owner } ownership.
  /// Not allowed for lend ownership.
  [[internal, answer_id]]
  void burn(
    uint256     out_pubkey, ///< Pubkey of external (wrapped) tip3 wallet.
                            ///< Where to return external tip3 tokens.
    address_opt out_owner,  ///< Internal owner (contract) of external (wrapped) tip3 wallet.
                            ///< Where to return external tip3 tokens.
    opt<cell>   notify      ///< Notification payload to the destination wallet's owner
                            ///<  (or EverReTransferArgs for (old WrapperEver)->(new WrapperEver) transfer)
  ) = 14;

  /// The wallet will send message transferring `tokens` to the Wrapper.
  /// Wrapper will transfer the same amount of external (wrapped) tip3 tokens from his wallet to a wallet with
  ///  { out_pubkey, out_owner } ownership.
  /// Not allowed for lend ownership.
  [[internal, answer_id]]
  void unwrap(
    uint256     out_pubkey, ///< Pubkey of external (wrapped) tip3 wallet.
                            ///< Where to return external tip3 tokens.
    address_opt out_owner,  ///< Internal owner (contract) of external (wrapped) tip3 wallet.
                            ///< Where to return external tip3 tokens.
    uint128     tokens,     ///< Tokens amount to unwrap
    opt<cell>   notify      ///< Notification payload to the destination wallet's owner
                            ///<  (or EverReTransferArgs for (old WrapperEver)->(new WrapperEver) transfer)
  ) = 15;
#endif // TIP3_ENABLE_BURN

#ifdef TIP3_ENABLE_LEND_OWNERSHIP
  /// Lend tokens to PriceXchg (to make trade order) until 'lend_finish_time' for the specified amount of tokens.
  /// Will send ITONTokenWalletNotify::onTip3LendOwnership() notification to PriceXchg contract.
  /// Returns PriceXchg address.
  FLEX_EXTERNAL
  [[internal, answer_id]]
  void makeOrder(
    address_opt answer_addr,         ///< Answer address.
    uint128     evers,               ///< Native funds to process.
                                     ///< For internal requests, this value is ignored
                                     ///<  and processing costs will be taken from attached value.
    uint128     lend_balance,        ///< Amount of tokens to lend ownership.
    uint32      lend_finish_time,    ///< Lend ownership finish time.
    uint128     price_num,           ///< Price numerator for rational price value.
    cell        unsalted_price_code, ///< Code of PriceXchg contract (unsalted!).
    cell        salt,                ///< PriceXchg salt.
    FlexLendPayloadArgs args         ///< Order parameters.
  ) = 16;

  FLEX_EXTERNAL
  [[internal]]
  void cancelOrder(
    uint128      evers,       ///< Native funds to process.
                              ///< For internal requests, this value is ignored
                              ///<  and processing costs will be taken from attached value.
    address      price,       ///< PriceXchg address.
    bool         sell,        ///< Is it a sell order.
    opt<uint256> order_id     ///< Order Id (if not specified, all orders from this user_id in the price will be canceled).
  ) = 17;

  /// Return ownership back to the original owner (for the provided amount of tokens).
  [[internal]]
  void returnOwnership(
    uint128 tokens ///< Amount of tokens to return.
  ) = 18;

  /// set_binding - Set trade binding to allow orders only to flex root \p flex.
  /// And PriceXchg unsalted code hash must be equal to \p unsalted_price_code_hash.
  /// set_trader - Set lend ownership pubkey for external access
  [[internal]]
  void bind(
    bool             set_binding, ///< Set binding
    opt<bind_info>   binding,     ///< If `set_binding` is true, binding will be set
    bool             set_trader,  ///< Set trader
    opt<uint256>     trader       ///< If `set_trader` is true, trader (lend pubkey) will be set
  ) = 19;
#endif // TIP3_ENABLE_LEND_OWNERSHIP

  /// Request info about contract state details (from another contract).
  [[internal, answer_id]]
  details_info details() = 20;

  // =============================== getters =============================== //
  /// Get info about contract state details.
  [[getter]]
  details_info getDetails() = immutable_ids::wallet_get_details_id;

#ifdef TIP3_ENABLE_EXTERNAL
  /// Get contract token balance.
  [[getter]]
  uint128 getBalance() = 22;
#endif // TIP3_ENABLE_EXTERNAL
};
using ITONTokenWalletPtr = handle<ITONTokenWallet>;

/// TONTokenWallet persistent data struct
struct DTONTokenWallet {
  string           name_;          ///< Token name.
  string           symbol_;        ///< Token short symbol.
  uint8            decimals_;      ///< Decimals for ui purposes. ex: balance 100 with decimals 2 will be printed as 1.00.
  uint128          balance_;       ///< Token balance of the wallet.
  uint128          locked_balance_;///< Locked token balance of the wallet.
  uint256          root_pubkey_;   ///< Public key of the related RootTokenContract.
  address          root_address_;  ///< Address of the related RootTokenContract.
  uint256          wallet_pubkey_; ///< Public key of wallet owner.
  address_opt      owner_address_; ///< Owner contract address for internal ownership.
  bool             flag_;
  bool             flagindex_;
  uint32           money_timestamp_;
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
  opt<uint256>     lend_pubkey_;   ///< Lend ownership pubkey.
  lend_owners_map  lend_owners_;   ///< Lend ownership map (service owner => lend_owner).
  opt<bind_info>   binding_;       ///< Binding to allow trade orders only to specific flex root
                                   ///<  and with specific unsalted PriceXchg code hash.
#endif // TIP3_ENABLE_LEND_OWNERSHIP
  uint256 code_hash_;              ///< Tip3 wallet code hash to verify other wallets.
  uint16  code_depth_;             ///< Tip3 wallet code depth to verify other wallets.
  int8    workchain_id_;           ///< Workchain id.
};

struct DTONTokenWalletExternal {
  string      name_;              ///< Token name.
  string      symbol_;            ///< Token short symbol.
  uint8       decimals_;          ///< Decimals for ui purposes. ex: balance 100 with decimals 2 will be printed as 1.00.
  uint128     balance_;           ///< Token balance of the wallet.
  uint256     root_pubkey_;       ///< Public key of the related RootTokenContract.
  address     root_address_;      ///< Address of the related RootTokenContract.
  uint256     wallet_pubkey_;     ///< Public key of wallet owner.
  address_opt owner_address_;     ///< Owner contract address for internal ownership.
  uint256     code_hash_;         ///< Tip3 wallet code hash to verify other wallets.
  uint16      code_depth_;        ///< Tip3 wallet code depth to verify other wallets.
  int8        workchain_id_;      ///< Workchain id.
};

struct DTONTokenWalletInternal {
  string       name_;            ///< Token name.
  string       symbol_;          ///< Token short symbol.
  uint8        decimals_;        ///< Decimals for ui purposes. ex: balance 100 with decimals 2 will be printed as 1.00.
  uint128      balance_;         ///< Token balance of the wallet.
  uint256      root_pubkey_;     ///< Public key of the related RootTokenContract.
  address      root_address_;    ///< Address of the related RootTokenContract.
  uint256      wallet_pubkey_;   ///< Public key of wallet owner.
  address_opt  owner_address_;   ///< Owner contract address for internal ownership.
  opt<uint256> lend_pubkey_;     ///< Lend ownership pubkey.
  lend_owners_map lend_owners_;  ///< Lend ownership map (service owner => lend_owner).
  opt<bind_info>  binding_;      ///< Binding info to allow trade orders only to specific flex root
                                 ///<  and with specific unsalted PriceXchg code hash.
  uint256         code_hash_;    ///< Tip3 wallet code hash to verify other wallets.
  uint16          code_depth_;   ///< Tip3 wallet code depth to verify other wallets.
  int8            workchain_id_; ///< Workchain id.
};

/// \interface ETONTokenWallet
/// \brief TONTokenWallet events interface
struct ETONTokenWallet {
};

/// Prepare TONTokenWallet persistent data struct
inline
DTONTokenWallet prepare_wallet_data(
  string name, string symbol, uint8 decimals,
  uint256 root_pubkey, address root_address,
  uint256 wallet_pubkey, address_opt wallet_owner,
  uint256 code_hash, uint16 code_depth, int8 workchain_id
) {
  return {
    name, symbol, decimals,
    uint128(0), uint128(0), root_pubkey, root_address,
    wallet_pubkey, wallet_owner, false, false, uint32(0),
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
    {}, {}, {},
#endif
    code_hash, code_depth,
    workchain_id
  };
}

/// Calculate wallet original StateInit hash (to get its deploy address).
/// This version depends on macroses configuration (external / internal wallet).
__always_inline
uint256 calc_wallet_init_hash(
  string name, string symbol, uint8 decimals,
  uint256 root_pubkey, address root_address, uint256 wallet_pubkey, address_opt wallet_owner,
  uint256 code_hash, uint16 code_depth, int8 workchain_id
) {
  DTONTokenWallet wallet_data =
    prepare_wallet_data(name, symbol, decimals, root_pubkey, root_address, wallet_pubkey, wallet_owner,
                        code_hash, code_depth, workchain_id);
  auto init_hdr = persistent_data_header<ITONTokenWallet, wallet_replay_protection_t>::init();
  cell data_cl = prepare_persistent_data<ITONTokenWallet, wallet_replay_protection_t>(init_hdr, wallet_data);
  return tvm_state_init_hash(code_hash, uint256(tvm_hash(data_cl)), code_depth, uint16(data_cl.cdepth()));
}

/// Calculate wallet original StateInit hash (to get its deploy address).
/// For external wallets.
__always_inline
uint256 calc_ext_wallet_init_hash(
  string name, string symbol, uint8 decimals,
  uint256 root_pubkey, address root_address, uint256 wallet_pubkey, address_opt wallet_owner,
  uint256 code_hash, uint16 code_depth, int8 workchain_id
) {
  DTONTokenWalletExternal wallet_data {
    name, symbol, decimals,
    uint128(0), root_pubkey, root_address, wallet_pubkey, wallet_owner,
    code_hash, code_depth, workchain_id
  };
  auto init_hdr = persistent_data_header<ITONTokenWallet, wallet_replay_protection_t>::init();
  cell data_cl = prepare_persistent_data<ITONTokenWallet, wallet_replay_protection_t>(init_hdr, wallet_data);
  return tvm_state_init_hash(code_hash, uint256(tvm_hash(data_cl)), code_depth, uint16(data_cl.cdepth()));
}

/// Calculate wallet original StateInit hash (to get its deploy address).
/// For internal (flex) wallets.
__always_inline
uint256 calc_int_wallet_init_hash(
  Tip3Config tip3cfg, uint256 wallet_pubkey, address_opt wallet_owner,
  uint256 code_hash, uint16 code_depth, int8 workchain_id
) {
  DTONTokenWalletInternal wallet_data {
    tip3cfg.name, tip3cfg.symbol, tip3cfg.decimals,
    uint128(0), tip3cfg.root_pubkey, tip3cfg.root_address, wallet_pubkey, wallet_owner,
    {}, {}, {}, code_hash, code_depth, workchain_id
  };
  auto init_hdr = persistent_data_header<ITONTokenWallet, wallet_replay_protection_t>::init();
  cell data_cl = prepare_persistent_data<ITONTokenWallet, wallet_replay_protection_t>(init_hdr, wallet_data);
  return tvm_state_init_hash(code_hash, uint256(tvm_hash(data_cl)), code_depth, uint16(data_cl.cdepth()));
}

/// Prepare Token Wallet StateInit structure and expected contract address (hash from StateInit).
/// This version depends on macroses configuration (external / internal wallet).
inline
std::pair<StateInit, uint256> prepare_wallet_state_init_and_addr(DTONTokenWallet wallet_data, cell code) {
  auto init_hdr = persistent_data_header<ITONTokenWallet, wallet_replay_protection_t>::init();
  cell wallet_data_cl =
    prepare_persistent_data<ITONTokenWallet, wallet_replay_protection_t>(init_hdr, wallet_data);
  StateInit wallet_init {
    /*split_depth*/{}, /*special*/{},
    code, wallet_data_cl, /*library*/{}
  };
  cell wallet_init_cl = build(wallet_init).make_cell();
  return { wallet_init, uint256(tvm_hash(wallet_init_cl)) };
}

/// Prepare Token Wallet StateInit structure and expected contract address (hash from StateInit).
/// For external wallets.
inline
std::pair<StateInit, uint256> prepare_external_wallet_state_init_and_addr(
  string name, string symbol, uint8 decimals,
  uint256 root_pubkey, address root_address,
  uint256 wallet_pubkey, address_opt wallet_owner,
  uint256 code_hash, uint16 code_depth,
  int8 workchain_id, cell code
) {
  DTONTokenWalletExternal wallet_data {
    name, symbol, decimals,
    uint128(0), root_pubkey, root_address, wallet_pubkey, wallet_owner,
    code_hash, code_depth, workchain_id
  };
  cell wallet_data_cl =
    prepare_persistent_data<ITONTokenWallet, wallet_replay_protection_t, DTONTokenWalletExternal>(
      wallet_replay_protection_t::init(), wallet_data);
  StateInit wallet_init {
    /*split_depth*/{}, /*special*/{},
    code, wallet_data_cl, /*library*/{}
  };
  cell wallet_init_cl = build(wallet_init).make_cell();
  return { wallet_init, uint256(tvm_hash(wallet_init_cl)) };
}

/// Prepare Token Wallet StateInit structure and expected contract address (hash from StateInit).
/// For internal wallets.
inline
std::pair<StateInit, uint256> prepare_internal_wallet_state_init_and_addr(
  string name, string symbol, uint8 decimals,
  uint256 root_pubkey, address root_address,
  uint256 wallet_pubkey, address_opt wallet_owner,
  uint256 code_hash, uint16 code_depth,
  int8 workchain_id, cell code
) {
  DTONTokenWalletInternal wallet_data {
    name, symbol, decimals,
    uint128(0), root_pubkey, root_address, wallet_pubkey, wallet_owner,
    {}, {}, {}, code_hash, code_depth, workchain_id
  };
  cell wallet_data_cl =
    prepare_persistent_data<ITONTokenWallet, wallet_replay_protection_t, DTONTokenWalletInternal>(
      wallet_replay_protection_t::init(), wallet_data
      );
  StateInit wallet_init {
    /*split_depth*/{}, /*special*/{},
    code, wallet_data_cl, /*library*/{}
  };
  cell wallet_init_cl = build(wallet_init).make_cell();
  return { wallet_init, uint256(tvm_hash(wallet_init_cl)) };
}

} // namespace tvm

