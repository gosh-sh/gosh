#pragma once

/** \file
 *  \brief RootTokenContract contract interfaces and data-structs.
 *  Compiles into two contract versions: RootTokenContract.tvc (for external wallets) and FlexTokenRoot.tvc (for internal wallets).
 *  With different macroses.
 *  Also, Wrapper contract may be internal wallets root and perform conversion external->internal and back.
 *  \author Andrew Zhogin
 *  \copyright 2019-2022 (c) EverFlex Inc
 */

#include "TONTokenWallet.hpp"

namespace tvm {

static constexpr unsigned ROOT_TIMESTAMP_DELAY = 1800;
using root_replay_protection_t = replay_attack_protection::timestamp<ROOT_TIMESTAMP_DELAY>;

struct TransactionBatch {
  uint256 pubkey;
  uint128 tokens;
  uint256 hash;
};

struct RootData {
  string name;
  string symbol;
  uint8 decimals;
  uint256 ethroot;
};

__interface ICheckerContract {
  [[internal]]
  void askEvers(
    RootData root
  ) = 1016;

  [[internal]]
  void deployIndex(
    RootData root,
    uint256 pubkey
  ) = 1025;

  [[internal]]
  void burnTokens(
    RootData  root, 
    uint256 pubkey, 
    address_opt owner, 
    uint128 tokens, 
    uint256 to) = 1017;

  [[internal]]
  void returnTokenToDao(
    address systemcontract,
    RootData  root, 
    address pubaddr,
    uint128 tokens
    ) = 1018;
};
using ICheckerContractPtr = handle<ICheckerContract>;

// ===== Root Token Contract ===== //
/** \interface IRootTokenContract
 *  \brief Tip3 token root contract interface.
 *  RootTokenContract is a root contract for tip3 token.
 */
__interface IRootTokenContract {

  /// Constructor of RootTokenContract.
  /// Requires next additional initialization call IRootTokenContract::setWalletCode().
  [[internal, external]]
  void constructor(
    string      name,        ///< Token name.
    string      symbol,      ///< Token short symbol.
    uint8       decimals,    ///< Decimals for ui purposes. ex: balance 100 with decimals 2 will be printed as 1.00.
    uint256     root_pubkey, ///< Root public key
    address_opt root_owner,  ///< Owner contract address for internal ownership.
    uint128     total_supply, ///< Total supply. Originally allocated tokens.
    address     checker,
    uint256 eth_root,
    address_opt oldroot_,
    address_opt newroot_,
    address     receiver,
    address_opt trusted,
    cell wallet_code
  ) = 10;

  /// Set wallet code.
  /// Additional initialization method required to fit external message size limits (16k).
  /// Contract will check code hash to be TIP3_WALLET_CODE_HASH, defined at compilation.
  [[internal, external, answer_id]]
  bool setWalletCode(cell wallet_code) = 11;

  /// Deploy a new token wallet and grant some \p tokens.
  /// Maybe only called by Root owner.
  /// Should be provided \p pubkey (for external owned wallet) or \p owner (for internal owned wallet).
  [[internal, external, answer_id]]
  address deployWallet(
    uint256     pubkey, ///< New wallet's public key.
    address_opt owner,  ///< New wallet's internal owner address.
    uint128     tokens, ///< Amount of tokens to be granted to the wallet.
    uint128     evers,  ///< Evers to be sent to the deployable wallet.
    opt<cell>   notify  ///< Payload (arbitrary cell) - if specified, will be transmitted into dest owner's notification.
  ) = 12;

  /// Deploy a new empty token wallet.
  /// Anyone may request to deploy an empty wallet (using internal message with attached evers).
  [[internal, answer_id]]
  address deployEmptyWallet(
    uint256     pubkey,  ///< New wallet's public key.
    address_opt owner,   ///< New wallet's internal owner address.
    uint128     evers    ///< Evers to be sent to the deployable wallet.
                         ///< Must be less that attached (to the call) evers value.
  ) = 13;

  /// Grant tokens to \p dest token wallet.
  /// Tokens must be first allocated using IRootTokenContract::mint() call.
  /// Maybe only called by Root owner.
  [[internal, external, answer_id]]
  void grant(
    address   dest,   ///< Token wallet address
    uint128   tokens, ///< Amount of tokens to be granted.
    uint128   evers,  ///< Amount of evers to be attached to message.
                      ///< If the method called by internal message, will be ignored
                      ///<  (rest attached evers will be transmitted).
    opt<cell> notify  ///< Payload (arbitrary cell) - if specified, will be transmitted into dest owner's notification.
  ) = 14;

  [[internal, external, answer_id]]
  void grantBatch(
    dict_array<TransactionBatch> transactions, ///< Amount of tokens to be granted.
    uint128 a,
    uint128 b
  ) = 1014;

  [[internal, answer_id]]
  void grantBatchIndex(
    dict_array<TransactionBatch> transactions, ///< Amount of tokens to be granted.
    uint128 index,
    uint128 a,
    uint128 b
  ) = 1015; 

  [[internal, answer_id]]
  void grantTrusted(
    uint256 pubkey,
    uint128 value
  ) = 1024; 

  [[internal, answer_id]]
  void askEvers(
    uint256 pubkey, 
    address_opt owner
  ) = 1016;

  [[internal, answer_id]]
  void deployindex(
    uint256 pubkey, 
    address_opt owner
  ) = 1026;

  [[internal, answer_id]]
  void burnTokens(
    uint256 pubkey, 
    address_opt owner,
    uint128 tokens,
    uint256 to
  ) = 1017;

  [[internal, answer_id]]
  void burnTokensToNewRoot(
    uint256 pubkey, 
    address_opt owner,
    uint128 tokens
  ) = 1019;

  [[internal, answer_id]]
  void burnTokensToDao(
    address systemcontract,
    address pubaddr,
    uint256 pubkey, 
    address_opt owner,
    uint128 tokens
  ) = 1025;

  [[internal, answer_id]]
  void deployUpgradeWallet(
    uint256 pubkey, 
    address_opt owner,
    uint128 tokens
  ) = 1020;

  [[internal, external, answer_id]]
  void setOldRoot(
    address_opt oldroot
  ) = 1021;

  [[internal, external, answer_id]]
  void setNewRoot(
    address_opt newroot 
  ) = 1022;

  [[internal, external, answer_id]]
  void onUpgrade(
    cell  newcode
  ) = 1018;

  [[external, internal, answer_id]]
  address deployEmptyWalletFree(
    uint256     pubkey  ///< New wallet's public key.
  ) = 1023;

  /// Mint tokens. Allocates new tokens (increases total_supply_).
  [[internal, external, answer_id]]
  bool mint(uint128 tokens) = 15;

  /// Request total granted value to be called from other contracts.
  [[internal, answer_id]]
  uint128 requestTotalGranted() = 16;

  /// Get token name
  [[getter]]
  string getName() = 17;

  /// Get token symbol
  [[getter]]
  string getSymbol() = 18;

  /// Get token decimals
  [[getter]]
  uint8 getDecimals() = 19;

  /// Get public key of the Root
  [[getter]]
  uint256 getRootKey() = 20;

  /// Get owner contract address of the Root (optional)
  [[getter]]
  address_opt getRootOwner() = 21;

  /// Get total supply (allocated tokens)
  [[getter]]
  uint128 getTotalSupply() = 22;

  /// Get total granted tokens
  [[getter]]
  uint128 getTotalGranted() = 23;

  /// Is wallet code already initialized (by IRootTokenContract::setWalletCode())
  [[getter]]
  bool hasWalletCode() = 24;

  /// Get wallet code
  [[getter]]
  cell getWalletCode() = 25;

  /// Get BurnCount
  [[getter]]
  uint128 getBurnCount() = 1019;

  /// Calculate wallet address using (pubkey, owner) pair.
  [[getter]]
  address getWalletAddress(
    uint256     pubkey, ///< Public key of the wallet.
    address_opt owner   ///< Internal owner address of the wallet.
  ) = 26;

  /// Get wallet code hash.
  [[getter]]
  uint256 getWalletCodeHash() = 27;
};
using IRootTokenContractPtr = handle<IRootTokenContract>;

/// RootTokenContract persistent data struct
struct DRootTokenContract {
  string      name_;          ///< Token name.
  string      symbol_;        ///< Token short symbol.
  uint8       decimals_;      ///< Decimals for ui purposes. ex: balance 100 with decimals 2 will be printed as 1.00.
  uint256     root_pubkey_;   ///< Root public key.
  address_opt root_owner_;    ///< Root internal owner (owner contract).
  uint128     total_supply_;  ///< Total supply of allocated tokens (in the pool).
  uint128     total_granted_; ///< Total granted tokens (to the wallets).
  optcell     wallet_code_;   ///< Token wallet code.
  address     checker_;
  uint256     ethroot_;
  uint128     burncount_;
  address_opt oldroot_;
  address_opt newroot_;
  address     receiver_;
  address_opt trusted_;
  bool        flag_;
  uint32      money_timestamp_;
};

/// \interface ERootTokenContract
/// \brief RootTokenContract events interface
struct ERootTokenContract {
};

/// Prepare Root StateInit structure and expected contract address (hash from StateInit)
template<>
struct preparer<IRootTokenContract, DRootTokenContract> {
  __always_inline
  static std::pair<StateInit, uint256> execute(DRootTokenContract root_data, cell root_code) {
    cell root_data_cl =
      prepare_persistent_data<IRootTokenContract, root_replay_protection_t>(
        root_replay_protection_t::init(), root_data);
    StateInit root_init { {}, {}, root_code, root_data_cl, {} };
    cell root_init_cl = build(root_init).make_cell();
    return { root_init, uint256(tvm_hash(root_init_cl)) };
  }
};

} // namespace tvm

