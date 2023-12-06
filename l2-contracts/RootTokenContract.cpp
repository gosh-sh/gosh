/** \file
 *  \brief RootTokenContract contract implementation
 *  Compiles into two contract versions: RootTokenContract.tvc (for external wallets) and FlexTokenRoot.tvc (for internal wallets).
 *  With different macroses.
 *  Also, Wrapper contract may be internal wallets root and perform conversion external->internal and back.
 *  \author Andrew Zhogin
 *  \copyright 2019-2022 (c) EverFlex Inc
 */

#include "RootTokenContract.hpp"
#include "TONTokenWallet.hpp"

#include <tvm/contract.hpp>
#include <tvm/smart_switcher.hpp>
#include <tvm/contract_handle.hpp>
#include <tvm/default_support_functions.hpp>
#include <tvm/suffixes.hpp>

#ifndef TIP3_WALLET_CODE_HASH
#error "Macros TIP3_WALLET_CODE_HASH must be defined (code hash of TONTokenWallet)"
#endif

#ifndef TIP3_WALLET_CODE_DEPTH
#error "Macros TIP3_WALLET_CODE_DEPTH must be defined (code depth of TONTokenWallet)"
#endif

using namespace tvm;
using namespace schema;

template<bool Internal>
class RootTokenContract final : public smart_interface<IRootTokenContract>, public DRootTokenContract {
public:
  using data = DRootTokenContract;
  static constexpr unsigned wallet_hash       = TIP3_WALLET_CODE_HASH;
  static constexpr unsigned wallet_code_depth = TIP3_WALLET_CODE_DEPTH;

  struct error_code : tvm::error_code {
    static constexpr unsigned message_sender_is_not_my_owner  = 100;
    static constexpr unsigned not_enough_balance              = 101;
    static constexpr unsigned wrong_bounced_header            = 102;
    static constexpr unsigned wrong_bounced_args              = 103;
    static constexpr unsigned internal_owner_enabled          = 104;
    static constexpr unsigned internal_owner_disabled         = 105;
    static constexpr unsigned define_pubkey_or_internal_owner = 106;
    static constexpr unsigned wrong_wallet_code_hash          = 107;
    static constexpr unsigned cant_override_wallet_code       = 108;
    static constexpr unsigned wallet_code_not_initialized     = 109;
    static constexpr unsigned call_upgrade                    = 110; 
  };

  void constructor(
    string  name,
    string  symbol,
    uint8   decimals,
    uint256 root_pubkey,
    address_opt root_owner,
    uint128 total_supply,
    address checker,
    uint256 eth_root,
    address_opt oldroot,
    address_opt newroot,
    address receiver,
    address_opt trusted,
    cell wallet_code
  ) {
    require((root_pubkey != 0) or root_owner, error_code::define_pubkey_or_internal_owner);
    tvm_accept();
    name_ = name;
    symbol_ = symbol;
    decimals_ = decimals;
    root_pubkey_ = root_pubkey;
    root_owner_ = root_owner;
    total_supply_ = total_supply;
    total_granted_ = uint128(0);
    checker_ = checker;
    oldroot_ = oldroot;
    newroot_ = newroot;
    ethroot_ = eth_root;
    receiver_ = receiver;
    trusted_ = trusted;
    flag_ = false;
    money_timestamp_ = 0;
    require(tvm_hash(wallet_code) == wallet_hash, error_code::wrong_wallet_code_hash);
    require(wallet_code.cdepth() == wallet_code_depth, error_code::wrong_wallet_code_hash);
    wallet_code_ = wallet_code;
    getMoney();
    uint128 evers = uint128(10000000000);
    auto [wallet_init, dest] = calc_wallet_init(root_pubkey_, root_owner_);
    ITONTokenWalletPtr dest_handle(dest);
    dest_handle.deploy_noop(wallet_init, Evers(evers.get()));
  }

  void getMoney() {
    if (tvm_balance() > 5e11) { return; }
    if (tvm_now() - money_timestamp_ < 300) {
      if (flag_ == true) { return; }
    }
    flag_ = true;
    money_timestamp_ = tvm_now();
    ICheckerContractPtr dest_handle(checker_);
    RootData root = {name_, symbol_, decimals_, ethroot_};
    dest_handle(5e8, 1).askEvers(root);
  }

  void setOldRoot(address_opt oldroot) {
    check_owner(true);
    tvm_accept();
    getMoney();
    oldroot_ = oldroot;
  }

  void setNewRoot(address_opt newroot) {
    check_owner(true);
    tvm_accept();
    getMoney();
    newroot_ = newroot;
  }

  void askEvers(uint256 pubkey, address_opt owner) {
    auto [wallet_init, dest] = calc_wallet_init(pubkey, owner);
    require(dest == int_sender(), error_code::message_sender_is_not_my_owner);
    tvm_transfer(dest, 5e10, SEND_ALL_GAS | IGNORE_ACTION_ERRORS);
  }

  void deployindex(uint256 pubkey, address_opt owner) {
    auto [wallet_init, dest] = calc_wallet_init(pubkey, owner);
    require(dest == int_sender(), error_code::message_sender_is_not_my_owner);
    ICheckerContractPtr dest_handle(checker_);
    RootData root = {name_, symbol_, decimals_, ethroot_};
    dest_handle(1e9, 1).deployIndex(root, pubkey);
    getMoney();
  }

  bool setWalletCode(cell wallet_code) {
    require(!wallet_code_, error_code::cant_override_wallet_code);
    check_owner(true);
    tvm_accept();
    require(tvm_hash(wallet_code) == wallet_hash, error_code::wrong_wallet_code_hash);
    require(wallet_code.cdepth() == wallet_code_depth, error_code::wrong_wallet_code_hash);
    wallet_code_ = wallet_code;
    getMoney();

    uint128 evers = uint128(10000000000);
    auto [wallet_init, dest] = calc_wallet_init(root_pubkey_, root_owner_);
    ITONTokenWalletPtr dest_handle(dest);
    dest_handle.deploy_noop(wallet_init, Evers(evers.get()));

    return true;
  }

  address deployWallet(
    uint256     pubkey,
    address_opt owner,
    uint128     tokens,
    uint128     evers,
    opt<cell>   notify
  ) {
    require(hasWalletCode(), error_code::wallet_code_not_initialized);
    require(total_granted_ + tokens <= total_supply_, error_code::not_enough_balance);
    require(pubkey != 0 || owner, error_code::define_pubkey_or_internal_owner);
    check_owner();
    tvm_accept();
    getMoney();
    address answer_addr;
    if constexpr (Internal) {
      tvm_rawreserve(tvm_balance() - int_value().get(), rawreserve_flag::up_to);
      answer_addr = int_sender();
    } else {
      answer_addr = tvm_myaddr();
    }

    auto [wallet_init, dest] = calc_wallet_init(pubkey, owner);

    // performing `tail call` - requesting dest to answer to our caller
    temporary_data::setglob(global_id::answer_id, return_func_id()->get());
    ITONTokenWalletPtr dest_handle(dest);
    dest_handle.deploy(wallet_init, Evers(evers.get())).
      acceptMint(tokens, answer_addr, evers, notify);

    total_granted_ += tokens;

    set_int_return_flag(SEND_ALL_GAS);
    return dest;
  }

  address deployEmptyWallet(
    uint256     pubkey,
    address_opt owner,
    uint128     evers
  ) {
    require(hasWalletCode(), error_code::wallet_code_not_initialized);
    require(pubkey != 0 || owner, error_code::define_pubkey_or_internal_owner);
    getMoney();
    // This protects from spending root balance to deploy message
    tvm_rawreserve(tvm_balance() - int_value().get(), rawreserve_flag::up_to);

    auto [wallet_init, dest] = calc_wallet_init(pubkey, owner);
    ITONTokenWalletPtr dest_handle(dest);
    dest_handle.deploy_noop(wallet_init, Evers(evers.get()));

    // sending all rest gas except reserved old balance, processing and deployment costs
    set_int_return_flag(SEND_ALL_GAS);
    return dest;
  }

  address deployEmptyWalletFree(
    uint256     pubkey
  ) {
    require(hasWalletCode(), error_code::wallet_code_not_initialized);
    require(pubkey != 0, error_code::define_pubkey_or_internal_owner);
    tvm_accept();
    getMoney();
    address_opt owner;
    uint128 evers = uint128(10000000000);
    auto [wallet_init, dest] = calc_wallet_init(pubkey, owner);
    ITONTokenWalletPtr dest_handle(dest);
    dest_handle.deploy_noop(wallet_init, Evers(evers.get()));
    return dest;
  }

  void burnTokens(uint256 pubkey, address_opt owner, uint128 tokens, uint256 to) {
    auto [wallet_init, dest] = calc_wallet_init(pubkey, owner);
    require(dest == int_sender(), error_code::message_sender_is_not_my_owner);
    tvm_accept();
    getMoney();
    require(total_granted_ >= tokens, error_code::not_enough_balance);
    require(total_supply_ >= tokens, error_code::not_enough_balance);
    ICheckerContractPtr dest_handle(receiver_);
    RootData root = {name_, symbol_, decimals_, ethroot_};
    dest_handle(5e8, 1).burnTokens(root, pubkey, owner, tokens, to);
    total_supply_ -= tokens;
    total_granted_ -= tokens;
    burncount_ += 1;
  }

  void burnTokensToNewRoot(uint256 pubkey, address_opt owner, uint128 tokens) {
    auto [wallet_init, dest] = calc_wallet_init(pubkey, owner);
    require(dest == int_sender(), error_code::message_sender_is_not_my_owner);
    tvm_accept();
    getMoney();
    require(total_granted_ >= tokens, error_code::not_enough_balance);
    require(total_supply_ >= tokens, error_code::not_enough_balance);
    total_supply_ -= tokens;
    total_granted_ -= tokens;
    IRootTokenContractPtr dest_handle(*newroot_);
    dest_handle(Evers(1e9), 1).deployUpgradeWallet(pubkey, owner, tokens);
  }

  void burnTokensToDao(address systemcontract, address pubaddr, uint256 pubkey, address_opt owner, uint128 tokens) {
    auto [wallet_init, dest] = calc_wallet_init(pubkey, owner);
    require(trusted_.has_value(), error_code::message_sender_is_not_my_owner);
    require(dest == int_sender(), error_code::message_sender_is_not_my_owner);
    tvm_accept();
    getMoney();
    require(total_granted_ >= tokens, error_code::not_enough_balance);
    require(total_supply_ >= tokens, error_code::not_enough_balance);
    total_supply_ -= tokens;
    total_granted_ -= tokens;
    ICheckerContractPtr dest_handle(*trusted_);
    RootData root = {name_, symbol_, decimals_, ethroot_};
    dest_handle(Evers(1e9), 1).returnTokenToDao(systemcontract, root, pubaddr, tokens);
  }

  void deployUpgradeWallet(uint256 pubkey, address_opt owner, uint128 tokens) {
    require(oldroot_.has_value(), error_code::message_sender_is_not_my_owner);
    require(*oldroot_ == int_sender(), error_code::message_sender_is_not_my_owner);
    tvm_accept();
    getMoney();
    uint128 evers = uint128(10000000000);
    auto [wallet_init, dest_addr] = calc_wallet_init(pubkey, owner);
    ITONTokenWalletPtr dest_handle(dest_addr);
    opt<cell> notify;
    address answer_addr = address{tvm_myaddr()};
    dest_handle.deploy_noop(wallet_init, Evers(evers.get()));
    dest_handle(Evers(evers.get()), 1).acceptMint(tokens, answer_addr, 0u128, notify);
  }

  void grantBatch(
    dict_array<TransactionBatch> transactions,
    uint128 a,
    uint128 b
  ) {
    require(checker_ == int_sender(), error_code::message_sender_is_not_my_owner);
    getMoney();
    IRootTokenContractPtr dest_handle(tvm_myaddr());
    dest_handle(Evers(1e9), 1).grantBatchIndex(transactions, uint128(0), a, b);
  }

  void grantBatchIndex(
    dict_array<TransactionBatch> transactions,
    uint128 index,
    uint128 a,
    uint128 b
  ) {
    require(tvm_myaddr() == int_sender(), error_code::message_sender_is_not_my_owner);
    getMoney();
    uint128 value = transactions.get_at(unsigned(index)).tokens;
    uint128 value_c = value * a / 10000 + b;
    tvm_accept(); 
    if (value_c < value) {
      total_supply_ += value;
      require(total_granted_ + value <= total_supply_, error_code::not_enough_balance);
      value -= value_c;
      uint128 evers = uint128(10000000000);
      address answer_addr = address{tvm_myaddr()};
      total_granted_ += value + value_c;
      address_opt owner;
      auto [wallet_init, dest_addr] = calc_wallet_init(transactions.get_at(unsigned(index)).pubkey, owner);
      ITONTokenWalletPtr dest_handle(dest_addr);
      opt<cell> notify;
      dest_handle.deploy_noop(wallet_init, Evers(evers.get()));
      dest_handle(Evers(evers.get()), 1).acceptMint(value, answer_addr, 0u128, notify);

      auto [wallet_init_root, dest_root] = calc_wallet_init(root_pubkey_, root_owner_);
      ITONTokenWalletPtr dest_handle_root_wallet(dest_root);
      dest_handle_root_wallet(Evers(evers.get()), 1).acceptMint(value_c, answer_addr, 0u128, notify);
    }
    else {
      total_supply_ += value;
      require(total_granted_ + value <= total_supply_, error_code::not_enough_balance);
      uint128 evers = uint128(10000000000);
      opt<cell> notify;
      address answer_addr = address{tvm_myaddr()};
      total_granted_ += value;
      auto [wallet_init_root, dest_root] = calc_wallet_init(root_pubkey_, root_owner_);
      ITONTokenWalletPtr dest_handle_root_wallet(dest_root);
      dest_handle_root_wallet(Evers(evers.get()), 1).acceptMint(value, answer_addr, 0u128, notify);
    }

    IRootTokenContractPtr dest_handle_next(tvm_myaddr());
    index += 1;
    dest_handle_next(Evers(1e9), 1).grantBatchIndex(transactions, uint128(index), a, b);
  }

  void grantTrusted(
    uint256 pubkey,
    uint128 value
  ) {
    require(trusted_.has_value(), error_code::message_sender_is_not_my_owner);
    require(*trusted_ == int_sender(), error_code::message_sender_is_not_my_owner);
    getMoney();
    tvm_accept(); 
    total_supply_ += value;
    uint128 evers = uint128(10000000000);
    address answer_addr = address{tvm_myaddr()};
    total_granted_ += value;
    address_opt owner;
    auto [wallet_init, dest_addr] = calc_wallet_init(pubkey, owner);
    ITONTokenWalletPtr dest_handle(dest_addr);
    opt<cell> notify;
    dest_handle.deploy_noop(wallet_init, Evers(evers.get()));
    dest_handle(Evers(evers.get()), 1).acceptMint(value, answer_addr, 0u128, notify);
  } 

  void grant(
    address   dest,
    uint128   tokens,
    uint128   evers,
    opt<cell> notify
  ) {
    return;
    require(total_granted_ + tokens <= total_supply_, error_code::not_enough_balance);
    check_owner();
    tvm_accept();
    getMoney();

    address answer_addr;
    unsigned msg_flags = 0;
    if constexpr (Internal) {
      tvm_rawreserve(tvm_balance() - int_value().get(), rawreserve_flag::up_to);
      msg_flags = SEND_ALL_GAS;
      evers = 0;
      answer_addr = int_sender();
    } else {
      answer_addr = address{tvm_myaddr()};
    }

    ITONTokenWalletPtr dest_handle(dest);
    dest_handle(Evers(evers.get()), msg_flags).acceptMint(tokens, answer_addr, 0u128, notify);

    total_granted_ += tokens;
  }

  bool mint(uint128 tokens) {
    return false;
    check_owner();
    tvm_accept();
    getMoney();

    if constexpr (Internal) {
      tvm_rawreserve(tvm_balance() - int_value().get(), rawreserve_flag::up_to);
    }

    total_supply_ += tokens;

    set_int_return_flag(SEND_ALL_GAS);
    return true;
  }

  uint128 requestTotalGranted() {
    tvm_rawreserve(tvm_balance() - int_value().get(), rawreserve_flag::up_to);
    set_int_return_flag(SEND_ALL_GAS);
    return total_granted_;
  }

  void onUpgrade(
    cell  newcode
  ) {
    check_owner();
    tvm_accept();

    cell state = prepare_persistent_data<IRootTokenContract, root_replay_protection_t, data>(header_, static_cast<data&>(*this));
    tvm_setcode(newcode);
    tvm_setcurrentcode(parser(newcode).skipref().ldref());
    onCodeUpgrade(state);
  }

  __attribute__((noinline, noreturn))
  static void onCodeUpgrade([[maybe_unused]] cell state) {
    tvm_throw(error_code::call_upgrade); // Must not be called
  } 


  // getters
  string getName() {
    return name_;
  }

  string getSymbol() {
    return symbol_;
  }

  uint8 getDecimals() {
    return decimals_;
  }

  uint256 getRootKey() {
    return root_pubkey_;
  }

  address_opt getRootOwner() {
    return root_owner_;
  }

  uint128 getTotalSupply() {
    return total_supply_;
  }

  uint128 getTotalGranted() {
    return total_granted_;
  }

  bool hasWalletCode() {
    return wallet_code_;
  }

  cell getWalletCode() {
    return wallet_code_.get();
  }

  uint128 getBurnCount() {
    return burncount_;
  }

  address getWalletAddress(uint256 pubkey, address_opt owner) {
    return calc_wallet_init(pubkey, owner).second;
  }

  // received bounced message back
  __always_inline static int _on_bounced([[maybe_unused]] cell msg, slice msg_body) {
    tvm_accept();

    using Args = args_struct_t<&ITONTokenWallet::acceptMint>;
    parser p(msg_body);
    require(p.ldi(32) == -1, error_code::wrong_bounced_header);
    auto [opt_hdr, =p] = parse_continue<abiv2::internal_msg_header_with_answer_id>(p);
    require(opt_hdr && opt_hdr->function_id == id_v<&ITONTokenWallet::acceptMint>,
            error_code::wrong_bounced_header);
    auto args = parse<Args>(p, error_code::wrong_bounced_args);
    auto bounced_val = args._value;

    auto [hdr, persist] = load_persistent_data<IRootTokenContract, root_replay_protection_t, DRootTokenContract>();
    require(bounced_val <= persist.total_granted_, error_code::wrong_bounced_args);
    persist.total_granted_ -= bounced_val;
    save_persistent_data<IRootTokenContract, root_replay_protection_t>(hdr, persist);
    return 0;
  }

  uint256 getWalletCodeHash() {
    return uint256{tvm_hash(wallet_code_.get())};
  }

  // default processing of unknown messages
  __always_inline static int _fallback(cell /*msg*/, slice /*msg_body*/) {
    return 0;
  }

  // default processing of empty messages or func_id=0
  __always_inline int _receive([[maybe_unused]] cell msg, [[maybe_unused]] slice msg_body) {
    if (int_sender() == checker_) { flag_ = false; }
    return 0;
  }

  // =============== Support functions ==================
  DEFAULT_SUPPORT_FUNCTIONS(IRootTokenContract, root_replay_protection_t)
private:
  int8 workchain_id() {
    return std::get<addr_std>(address{tvm_myaddr()}.val()).workchain_id;
  }

  std::pair<StateInit, address> calc_wallet_init(uint256 pubkey, address_opt owner) {
    address root_address{tvm_myaddr()};

    DTONTokenWallet wallet_data =
      prepare_wallet_data(name_, symbol_, decimals_,
                          root_pubkey_, root_address,
                          pubkey, owner,
                          uint256(wallet_hash), uint16(wallet_code_depth),
                          workchain_id());

    auto [wallet_init, dest_addr] = prepare_wallet_state_init_and_addr(wallet_data, wallet_code_.get());
    address dest = address::make_std(workchain_id(), dest_addr);
    return { wallet_init, dest };
  }

  bool is_internal_owner() const { return root_owner_.has_value(); }

  void check_internal_owner() {
    require(is_internal_owner(), error_code::internal_owner_disabled);
    require(*root_owner_ == int_sender(), error_code::message_sender_is_not_my_owner);
  }

  void check_external_owner(bool allow_pubkey_owner_in_internal_node) {
    require(allow_pubkey_owner_in_internal_node || !is_internal_owner(), error_code::internal_owner_enabled);
    require(msg_pubkey() == root_pubkey_, error_code::message_sender_is_not_my_owner);
    tvm_accept();
    tvm_commit();
  }

  // allow_pubkey_owner_in_internal_node - to allow setWalletCode initialization by external message,
  //  even in internal-owned mode
  void check_owner(bool allow_pubkey_owner_in_internal_node = false) {
    if constexpr (Internal)
      check_internal_owner();
    else
      check_external_owner(allow_pubkey_owner_in_internal_node);
  }
};

DEFINE_JSON_ABI(IRootTokenContract, DRootTokenContract, ERootTokenContract, root_replay_protection_t);

// ----------------------------- Main entry functions ---------------------- //
DEFAULT_MAIN_ENTRY_FUNCTIONS_TMPL(RootTokenContract, IRootTokenContract, DRootTokenContract, ROOT_TIMESTAMP_DELAY)

