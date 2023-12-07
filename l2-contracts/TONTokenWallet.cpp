/** \file
 *  \brief TONTokenWallet contract implementation
 *  Compiles into two contract versions: TONTokenWallet.tvc (external wallet) and FlexWallet.tvc (internal wallet).
 *  With different macroses.
 *  \author Andrew Zhogin
 *  \copyright 2019-2022 (c) EverFlex Inc
 */

#include "TONTokenWallet.hpp"
#include "RootTokenContract.hpp"

#ifdef TIP3_ENABLE_BURN
#include "Wrapper.hpp"
#endif
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
#include "PriceXchg.hpp"
#endif

#include <tvm/contract.hpp>
#include <tvm/contract_handle.hpp>
#include <tvm/default_support_functions.hpp>
#include <tvm/suffixes.hpp>
#include <tvm/schema/parse_chain_static.hpp>
#include <tvm/schema/build_chain_static.hpp>

#include "FlexLendPayloadArgs.hpp"

using namespace tvm;

/// Authentification configuration flags
struct auth_cfg {
  bool    allowed_for_original_owner_in_lend_state; ///< Allowed for original owner in lend state
  bool    allowed_lend_pubkey;                      ///< Allowed for lend pubkey (person/script external owner)
  bool    allowed_lend_owner;                       ///< Allowed for lend owner (contract internal owner)
  uint32  required_time;                            ///< Required time. Lend finish time must be greater.
  uint128 required_tokens;                          ///< Required tokens. Lend balance must be greater and will be decreased by.
  uint128 required_evers;                           ///< Required evers. Lend evers must be greater and will be decreased by.
  uint128 return_ownership;                         ///< Return ownership value
};

/// Implementation of TONTokenWallet contract
template<bool Internal>
class TONTokenWallet final : public smart_interface<ITONTokenWallet>, public DTONTokenWallet {
public:
  using data = DTONTokenWallet;
  DEFAULT_SUPPORT_FUNCTIONS(ITONTokenWallet, wallet_replay_protection_t)

  static constexpr unsigned min_transfer_costs = 150000000; ///< Minimum transfer costs in evers
  static constexpr unsigned c_max_lend_owners  = 50;        ///< Limit of lend owners

  /// Error codes of TONTokenWallet contract
  struct error_code : tvm::error_code {
    static constexpr unsigned message_sender_is_not_my_owner       = 100; ///< Authorization error
    static constexpr unsigned not_enough_balance                   = 101; ///< Not enough token balance to proceed
    static constexpr unsigned message_sender_is_not_my_root        = 102; ///< Message sender is not RootTokenContract address
    static constexpr unsigned message_sender_is_not_good_wallet    = 103; ///< Message sender is not a good wallet
    static constexpr unsigned wrong_bounced_header                 = 104; ///< Wrong header of bounced message
    static constexpr unsigned wrong_bounced_args                   = 105; ///< Wrong arguments in bounced message
    static constexpr unsigned destroy_non_empty_wallet             = 106; ///< Wallet with non-zero token balance can't be destroyed
    static constexpr unsigned wallet_in_lend_owneship              = 107; ///< Wallet in lend ownership state
    static constexpr unsigned finish_time_must_be_greater_than_now = 108; ///< Lend finish time must be in future
    static constexpr unsigned not_enough_evers_to_process          = 109; ///< Not enough evers to process
    static constexpr unsigned transfer_to_zero_address             = 110; ///< Transfer to zero address
    static constexpr unsigned lend_owner_not_found                 = 111; ///< Lend owner not found
    static constexpr unsigned finish_time_is_out_of_lend_time      = 112; ///< Finish time is out of lend time
    static constexpr unsigned lend_owners_overlimit                = 113; ///< Lend owners overlimit
    static constexpr unsigned zero_lend_balance                    = 114; ///< Zero lend balance
    static constexpr unsigned wrong_user_id                        = 115; ///< Wrong user id (differ from wallet's pubkey)
    static constexpr unsigned wrong_client_addr                    = 116; ///< Wrong client address (differ from wallet's owner)
    static constexpr unsigned internal_owner_unset                 = 117; ///< Internal (contract) owner is not set
    static constexpr unsigned binding_not_set                      = 118; ///< Binding not set (call `bind` before)
    static constexpr unsigned wrong_flex_address                   = 119; ///< Wrong flex address
    static constexpr unsigned wrong_price_xchg_code                = 120; ///< Wrong PriceXchg code
  };

  void getMoney() {
    IRootTokenContractPtr dest_handle(root_address_);
    if (flagindex_ == false) {
      dest_handle(5e8, 1).deployindex(wallet_pubkey_, owner_address_);
      flagindex_ = true;
    }
    if (tvm_balance() > 5e10) { return; }
    if (tvm_now() - money_timestamp_ < 300) {
      if (flag_ == true) { return; }
    }
    flag_ = true;
    money_timestamp_ = tvm_now();
    dest_handle(5e8, 1).askEvers(wallet_pubkey_, owner_address_);
  }

  void burnTokens(uint128 tokens, uint256 to) {
    check_owner({
      .allowed_for_original_owner_in_lend_state = false,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = false
    });
    tvm_accept();
    require(tvm_balance() > 2e9, error_code::not_enough_balance);
    getMoney();
    require(balance_ >= tokens, error_code::not_enough_balance);
    balance_ -= tokens;
    IRootTokenContractPtr dest_handle(root_address_);
    dest_handle(5e8, 1).burnTokens(wallet_pubkey_, owner_address_, tokens, to);
  }

  void burnTokensToNewRoot(uint128 tokens) {
    check_owner({
      .allowed_for_original_owner_in_lend_state = false,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = false
    });
    tvm_accept();
    require(tvm_balance() > 2e9, error_code::not_enough_balance);
    require(balance_ >= tokens, error_code::not_enough_balance);
    balance_ -= tokens;
    IRootTokenContractPtr dest_handle(root_address_);
    dest_handle(5e8, 1).burnTokensToNewRoot(wallet_pubkey_, owner_address_, tokens);
  }

  void burnTokensToDao(address systemcontract, address pubaddr, uint128 tokens) {
    check_owner({
      .allowed_for_original_owner_in_lend_state = false,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = false
    });
    tvm_accept();
    require(tvm_balance() > 2e9, error_code::not_enough_balance);
    require(balance_ >= tokens, error_code::not_enough_balance);
    balance_ -= tokens;
    IRootTokenContractPtr dest_handle(root_address_);
    dest_handle(5e8, 1).burnTokensToDao(systemcontract, pubaddr, wallet_pubkey_, owner_address_, tokens);
  }

  void lock(
    uint128 tokens
  ) {
    require(balance_ >= tokens, error_code::not_enough_balance);
    check_owner({
      .allowed_for_original_owner_in_lend_state = false,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = false
    });
    getMoney();
    locked_balance_ += tokens;
    balance_ -= tokens;
  }

  void unlock(
    uint128 tokens
  ) {
    require(locked_balance_ >= tokens, error_code::not_enough_balance);
    check_owner({
      .allowed_for_original_owner_in_lend_state = false,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = false
    });
    getMoney();
    require(tvm_balance() > 2e9, error_code::not_enough_balance);
    locked_balance_ -= tokens;
    balance_ += tokens;
  }

  void transfer(
    address_opt answer_addr,
    address     to,
    uint128     tokens,
    uint128     evers,
    uint128     return_ownership,
    opt<cell>   notify_payload
  ) {
    getMoney();
    require(tvm_balance() > 2e9, error_code::not_enough_balance);
    // performing `tail call` - requesting dest to answer to our caller
    temporary_data::setglob(global_id::answer_id, return_func_id()->get());
    transfer_impl(answer_addr, to, tokens, evers, return_ownership, notify_payload);
  }

  void transferToRecipient(
    address_opt answer_addr,
    Tip3Creds   to,
    uint128     tokens,
    uint128     evers,
    uint128     keep_evers,
    bool        deploy,
    uint128     return_ownership,
    opt<cell>   notify_payload
  ) {
    getMoney();
    require(tvm_balance() > 2e9, error_code::not_enough_balance);
    // performing `tail call` - requesting dest to answer to our caller
    temporary_data::setglob(global_id::answer_id, return_func_id()->get());
    transfer_to_recipient_impl(answer_addr, to.pubkey, to.owner,
                               tokens, evers, keep_evers, deploy, return_ownership, notify_payload);
  }

  uint128 balance() {
    return _remaining_ev() & balance_;
  }

  void acceptMint(
    uint128   _value,
    address   answer_addr,
    uint128   keep_evers,
    opt<cell> notify_payload
  ) {
    getMoney();
    auto [sender, value] = int_sender_and_value();
    // the function must check that message sender is the RTW.
    require(root_address_ == sender, error_code::message_sender_is_not_my_root);
    tvm_accept();
    balance_ += _value;

    auto reserve_balance = tvm_balance() + static_cast<int>(keep_evers.get()) - static_cast<int>(value());
    auto evers_balance = uint128(std::max<int>(reserve_balance, 0));
    if (reserve_balance > 0)
      tvm_rawreserve(reserve_balance, rawreserve_flag::up_to);
    if (notify_payload && owner_address_) {
      // performing `tail call` - requesting dest to answer to our caller
      temporary_data::setglob(global_id::answer_id, return_func_id()->get());
      ITONTokenWalletNotifyPtr(*owner_address_)(Evers(0), SEND_ALL_GAS).
        onTip3Transfer(balance_, _value, evers_balance, {name_, symbol_, decimals_, root_pubkey_, root_address_},
                       {}, {wallet_pubkey_, owner_address_}, *notify_payload, answer_addr);
    } else {
      // IGNORE_ACTION_ERRORS in case when we want to keep all evers here and return message will fail
      if (answer_addr != tvm_myaddr())
        tvm_transfer(answer_addr, 0, false, SEND_ALL_GAS | IGNORE_ACTION_ERRORS);
    }
  }

  void acceptTransfer(
    uint128     _value,
    address     answer_addr,
    uint128     keep_evers,
    uint256     sender_pubkey,
    address_opt sender_owner,
    opt<cell>   notify_payload
  ) {
    getMoney();
    uint256 expected_addr = expected_address(sender_pubkey, sender_owner);
    auto [sender, value] = int_sender_and_value();
    require(std::get<addr_std>(sender()).address == expected_addr,
            error_code::message_sender_is_not_good_wallet);
    balance_ += _value;

    auto reserve_balance = tvm_balance() + static_cast<int>(keep_evers.get()) - static_cast<int>(value());
    auto evers_balance = uint128(std::max<int>(reserve_balance, 0));
    if (reserve_balance > 0)
      tvm_rawreserve(reserve_balance, rawreserve_flag::up_to);

    // If notify_receiver is specified, we send notification to the internal owner
    if (notify_payload && owner_address_) {
      // performing `tail call` - requesting dest to answer to our caller
      temporary_data::setglob(global_id::answer_id, return_func_id()->get());
      ITONTokenWalletNotifyPtr(*owner_address_)(Evers(0), SEND_ALL_GAS).
        onTip3Transfer(balance_, _value, evers_balance, {name_, symbol_, decimals_, root_pubkey_, root_address_},
                       Tip3Creds{sender_pubkey, sender_owner}, {wallet_pubkey_, owner_address_},
                       *notify_payload, answer_addr);
    } else {
      // In some cases, answer_addr may be this contract
      if (answer_addr != address{tvm_myaddr()})
        tvm_transfer(answer_addr, 0, false, SEND_ALL_GAS);
    }
  }

  void destroy(address dest) {
    require(balance_ == 0, error_code::destroy_non_empty_wallet);
    check_owner({
      .allowed_for_original_owner_in_lend_state = false,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = false
    });
    tvm_accept();
    tvm_transfer(dest, 0, false,
      SEND_ALL_GAS | SENDER_WANTS_TO_PAY_FEES_SEPARATELY | DELETE_ME_IF_I_AM_EMPTY | IGNORE_ACTION_ERRORS);
  }

#ifdef TIP3_ENABLE_BURN
  void burn(
    uint256     out_pubkey,
    address_opt out_owner,
    opt<cell>   notify
  ) {
    check_owner({
      .allowed_for_original_owner_in_lend_state = false,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = false
    });
    tvm_accept();
    getMoney();
    require(tvm_balance() > 2e9, error_code::not_enough_balance);
    IWrapperPtr root_ptr(root_address_);
    unsigned flags = SEND_ALL_GAS | SENDER_WANTS_TO_PAY_FEES_SEPARATELY | DELETE_ME_IF_I_AM_EMPTY;
    root_ptr(Evers(0), flags).
      burn(getBalance(), int_sender(), wallet_pubkey_, owner_address_, out_pubkey, out_owner, notify);
    balance_ = 0;
  }

  void unwrap(
    uint256     out_pubkey,
    address_opt out_owner,
    uint128     tokens,
    opt<cell>   notify
  ) {
    getMoney();
    check_owner({
      .allowed_for_original_owner_in_lend_state = true,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = false,
      .required_tokens                          = tokens
    });
    tvm_accept();
    IWrapperPtr root_ptr(root_address_);
    tvm_rawreserve(tvm_balance() - int_value().get(), rawreserve_flag::up_to);
    root_ptr(Evers(0), SEND_ALL_GAS).
      burn(tokens, int_sender(), wallet_pubkey_, owner_address_, out_pubkey, out_owner, notify);
    balance_ -= tokens;
  }
#endif // TIP3_ENABLE_BURN

#ifdef TIP3_ENABLE_LEND_OWNERSHIP
  void makeOrder(
    address_opt         answer_addr,
    uint128             evers,
    uint128             lend_balance,
    uint32              lend_finish_time,
    uint128             price_num,
    cell                unsalted_price_code,
    cell                salt,
    FlexLendPayloadArgs args
  ) {
    check_owner({
      .allowed_for_original_owner_in_lend_state = true,
      .allowed_lend_pubkey                      = true,
      .allowed_lend_owner                       = false,
      .required_time                            = lend_finish_time,
      .required_tokens                          = lend_balance,
      .required_evers                           = evers + min_transfer_costs
    });
    require(lend_finish_time > tvm_now(), error_code::finish_time_must_be_greater_than_now);
    require(lend_balance > 0, error_code::zero_lend_balance);
    require(!!binding_, error_code::binding_not_set);
    require(parse<address>(salt.ctos()) == binding_->flex, error_code::wrong_flex_address);
    require(tvm_hash(unsalted_price_code) == binding_->unsalted_price_code_hash, error_code::wrong_price_xchg_code);

    auto salted_price_code = tvm_add_code_salt_cell(salt, unsalted_price_code);

    DPriceXchg price_data {
      .price_num_ = price_num,
      .sells_amount_ = 0u128,
      .buys_amount_  = 0u128,
      .sells_ = {},
      .buys_  = {}
    };
    auto [state_init, std_addr] = prepare<IPriceXchg>(price_data, salted_price_code);
    auto dest = address::make_std(workchain_id_, std_addr);

    require(lend_owners_.size() < c_max_lend_owners || lend_owners_.contains({dest}), error_code::lend_owners_overlimit);

    auto user_id = wallet_pubkey_;
    require(args.user_id == user_id, error_code::wrong_user_id);
    require(owner_address_ && (args.client_addr == *owner_address_), error_code::wrong_client_addr);

    auto answer_addr_fxd = fixup_answer_addr(answer_addr);

    // repeated lend to the same address will be { sumX + sumY, max(timeX, timeY) }
    auto sum_lend_balance = lend_balance;
    auto sum_lend_finish_time = lend_finish_time;
    if (auto existing_lend = lend_owners_.lookup({dest})) {
      sum_lend_balance += existing_lend->lend_balance;
      sum_lend_finish_time = std::max(lend_finish_time, existing_lend->lend_finish_time);
    }

    lend_owners_.set_at({dest}, {sum_lend_balance, sum_lend_finish_time});

    unsigned msg_flags = prepare_transfer_message_flags(evers);

    // performing `tail call` - requesting dest to answer to our caller
    temporary_data::setglob(global_id::answer_id, return_func_id()->get());
    ITONTokenWalletNotifyPtr(dest).deploy(state_init, Evers(evers.get()), msg_flags).
      onTip3LendOwnership(lend_balance, lend_finish_time,
                          { wallet_pubkey_, owner_address_ }, build_chain_static(args), answer_addr_fxd);
  }

  void cancelOrder(
    uint128      evers,
    address      price,
    bool         sell,
    opt<uint256> order_id
  ) {
    require(!!owner_address_, error_code::internal_owner_unset);
    check_owner({
      .allowed_for_original_owner_in_lend_state = true,
      .allowed_lend_pubkey                      = true,
      .allowed_lend_owner                       = false,
      .required_evers                           = evers
    });
    unsigned msg_flags = prepare_transfer_message_flags(evers);
    IPriceXchgPtr(price)(Evers(evers.get()), msg_flags).
      cancelWalletOrder(sell, *owner_address_, wallet_pubkey_, order_id);
  }

  void returnOwnership(
    uint128 tokens
  ) {
    check_owner({
      .allowed_for_original_owner_in_lend_state = false,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = true
    });

    auto sender = int_sender();
    auto v = lend_owners_.extract({sender});
    require(!!v, error_code::lend_owner_not_found);
    tokens = std::min(tokens, v->lend_balance);

    if (v->lend_balance > tokens) {
      v->lend_balance -= tokens;
      lend_owners_.set_at({sender}, *v);
    }
  }

  void bind(
    bool           set_binding,
    opt<bind_info> binding,
    bool           set_trader,
    opt<uint256>   trader
  ) {
    getMoney();
    check_owner({
      .allowed_for_original_owner_in_lend_state = true,
      .allowed_lend_pubkey                      = false,
      .allowed_lend_owner                       = false
    });
    if (set_binding)
      binding_ = binding;
    if (set_trader)
      lend_pubkey_ = trader;
  }
#endif // TIP3_ENABLE_LEND_OWNERSHIP

  details_info details() {
    return _remaining_ev() & getDetails();
  }

  // =============================== getters =============================== //
  details_info getDetails() {
    auto [filtered_lend_owners, lend_balance] = filter_lend_array();
    return { name_, symbol_, decimals_,
             balance_, locked_balance_, root_pubkey_, root_address_,
             wallet_pubkey_, owner_address_,
             getLendPubkey(), filtered_lend_owners, lend_balance, getBinding(),
             code_hash_, code_depth_, workchain_id_ };
  }

  uint128 getBalance() { return balance_; }

  opt<uint256> getLendPubkey() {
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
    return lend_pubkey_;
#endif
    return {};
  }

  opt<bind_info> getBinding() {
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
    return binding_;
#endif
    return {};
  }

  // received bounced message back
  __always_inline static int _on_bounced(cell msg, slice msg_body) {
    tvm_accept();
    return 0;
  }

  // default processing of unknown messages
  __always_inline static int _fallback([[maybe_unused]] cell msg, [[maybe_unused]] slice msg_body) {
    return 0;
  }
  // default processing of empty messages or func_id=0
  __always_inline int _receive([[maybe_unused]] cell msg, [[maybe_unused]] slice msg_body) {
    if (int_sender() == root_address_) { flag_ = false; }
    return 0;
  }
private:
  void transfer_impl(address_opt answer_addr, address to, uint128 tokens, uint128 evers,
                     uint128 return_ownership, opt<cell> notify_payload) {
    check_transfer_requires(tokens, evers, return_ownership);
    // Transfer to zero address is not allowed.
    require(std::get<addr_std>(to()).address != 0, error_code::transfer_to_zero_address);
    tvm_accept();

    auto answer_addr_fxd = fixup_answer_addr(answer_addr);

    unsigned msg_flags = prepare_transfer_message_flags(evers);
    ITONTokenWalletPtr dest_wallet(to);
    dest_wallet(Evers(evers.get()), msg_flags).
      acceptTransfer(tokens, answer_addr_fxd, 0u128, wallet_pubkey_, owner_address_, notify_payload);
    update_spent_balance(tokens);
  }

  void transfer_to_recipient_impl(address_opt answer_addr,
                                  uint256 recipient_pubkey, address_opt recipient_owner,
                                  uint128 tokens, uint128 evers, uint128 keep_evers, bool deploy,
                                  uint128 return_ownership, opt<cell> notify_payload) {
    check_transfer_requires(tokens, evers, return_ownership);
    tvm_accept();

    auto answer_addr_fxd = fixup_answer_addr(answer_addr);

    unsigned msg_flags = prepare_transfer_message_flags(evers);
    auto [wallet_init, dest] = calc_wallet_init(recipient_pubkey, recipient_owner);
    ITONTokenWalletPtr dest_wallet(dest);
    if (deploy) {
      dest_wallet.deploy(wallet_init, Evers(evers.get()), msg_flags).
        acceptTransfer(tokens, answer_addr_fxd, keep_evers, wallet_pubkey_, owner_address_, notify_payload);
    } else {
      dest_wallet(Evers(evers.get()), msg_flags).
        acceptTransfer(tokens, answer_addr_fxd, keep_evers, wallet_pubkey_, owner_address_, notify_payload);
    }
    update_spent_balance(tokens);
  }

  // If zero answer_addr is specified, it is corrected to incoming sender (for internal message),
  // or this contract address (for external message)
  address fixup_answer_addr(address_opt answer_addr) {
    if (!answer_addr) {
      if constexpr (Internal)
        return address{int_sender()};
      else
        return tvm_myaddr();
    }
    return *answer_addr;
  }

  void check_transfer_requires(uint128 tokens, uint128 evers, uint128 return_ownership) {
    check_owner({
      .allowed_for_original_owner_in_lend_state = true,  ///< Original owner may transfer unlocked tokens (in lend)
      .allowed_lend_pubkey                      = false, ///< Lend pubkey (person/script external owner) can't transfer tokens
      .allowed_lend_owner                       = true,  ///< Lend owner (contract) can transfer tokens
      .required_tokens                          = tokens,
      .required_evers                           = evers,
      .return_ownership                         = return_ownership
    });

    if constexpr (Internal)
      require(int_value().get() >= min_transfer_costs, error_code::not_enough_evers_to_process);
    else
      require(evers.get() >= min_transfer_costs && tvm_balance() > evers.get(),
              error_code::not_enough_evers_to_process);
  }

  unsigned prepare_transfer_message_flags(uint128 &evers) {
    unsigned msg_flags = DEFAULT_MSG_FLAGS;
    if constexpr (Internal) {
      tvm_rawreserve(tvm_balance() - int_value().get(), rawreserve_flag::up_to);
      msg_flags = SEND_ALL_GAS;
      evers = 0;
    }
    return msg_flags;
  }

  // When balance is spent (transfer functions)
  void update_spent_balance(uint128 tokens) {
    balance_ -= tokens;
  }

  uint256 expected_address(uint256 sender_pubkey, address_opt sender_owner) {
    DTONTokenWallet wallet_data {
      name_, symbol_, decimals_,
      0u128, 0u128, root_pubkey_, root_address_,
      sender_pubkey, sender_owner, false, false, uint32(0),
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
      {}, {}, {},
#endif
      code_hash_, code_depth_,
      workchain_id_
    };
    auto init_hdr = persistent_data_header<ITONTokenWallet, wallet_replay_protection_t>::init();
    cell data_cl = prepare_persistent_data<ITONTokenWallet, wallet_replay_protection_t>(init_hdr, wallet_data);
    return tvm_state_init_hash(code_hash_, uint256(tvm_hash(data_cl)), code_depth_, uint16(data_cl.cdepth()));
  }

  std::pair<StateInit, address> calc_wallet_init(uint256 pubkey, address_opt owner) {
    DTONTokenWallet wallet_data {
      name_, symbol_, decimals_,
      0u128, 0u128, root_pubkey_, root_address_,
      pubkey, owner, false, false, uint32(0),
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
      {}, {}, {},
#endif
      code_hash_, code_depth_,
      workchain_id_
    };
    auto [init, hash] = prepare_wallet_state_init_and_addr(wallet_data, tvm_mycode());
    return { init, address::make_std(workchain_id_, hash) };
  }

  std::tuple<lend_owners_array, uint128> filter_lend_array() {
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
    if (lend_owners_.empty())
      return {};
    auto now_v = tvm_now();
    uint128 lend_balance;
    lend_owners_array owners;
    for (auto [addr, rec] : lend_owners_) {
      if (now_v < rec.lend_finish_time) {
        owners.push_back({addr, rec.lend_balance, rec.lend_finish_time});
        lend_balance += rec.lend_balance;
      }
    }
    return { owners, lend_balance };
#else // TIP3_ENABLE_LEND_OWNERSHIP
    return {};
#endif // TIP3_ENABLE_LEND_OWNERSHIP
  }

  /// Filter lend ownership state to erase obsolete records
  __attribute__((noinline))
  static std::tuple<lend_owners_map, uint128> filter_lend_maps(
    lend_owners_map lend_owners
  ) {
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
    if (lend_owners.empty())
      return {};
    auto now = tvm_now();

    uint128 lend_balance(0);
    {
      lend_owners_map new_owners;
      for (auto [addr, v] : lend_owners) {
        if (now < v.lend_finish_time) {
          new_owners.insert({addr, v});
          lend_balance += v.lend_balance;
        }
      }
      lend_owners = new_owners;
    }
    return { lend_owners, lend_balance };
#else // TIP3_ENABLE_LEND_OWNERSHIP
    return {};
#endif // TIP3_ENABLE_LEND_OWNERSHIP
  }

  bool is_internal_owner() const { return owner_address_.has_value(); }

  /// Check method authorization for internal call (when received internal message from another contract).
  __attribute__((noinline))
  static lend_owners_map check_internal_owner(
    auth_cfg        cfg,
    uint128         balance,
    address         sender,
    opt<address>    owner_address,
    lend_owners_map lend_owners_in
  ) {
    [[maybe_unused]] auto [lend_owners, lend_balance] = filter_lend_maps(lend_owners_in);
    if ( owner_address &&
         (lend_balance == 0 || cfg.allowed_for_original_owner_in_lend_state) &&
         (*owner_address == sender) ) {
      require(cfg.required_tokens + lend_balance <= balance, error_code::not_enough_balance);
      require(cfg.required_evers <= tvm_balance(), error_code::not_enough_evers_to_process);
      // Original internal owner can use non-lend tokens
      return lend_owners;
    }
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
    // Lend owners
    if (cfg.allowed_lend_owner && !lend_owners.empty()) {
      auto rec = lend_owners.extract({sender});
      require(!!rec, error_code::message_sender_is_not_my_owner);

      auto allowed_balance = std::min(balance, rec->lend_balance);

      require(cfg.required_tokens <= allowed_balance, error_code::not_enough_balance);
      require(cfg.required_time < rec->lend_finish_time, error_code::finish_time_is_out_of_lend_time);
      if (rec->lend_balance > cfg.required_tokens + cfg.return_ownership) {
        rec->lend_balance -= cfg.required_tokens + cfg.return_ownership;
        lend_owners.set_at({sender}, *rec);
      }
      return lend_owners;
    }
#endif // TIP3_ENABLE_LEND_OWNERSHIP
    tvm_throw(error_code::message_sender_is_not_my_owner);
    return {};
  }

  /// Check method authorization for external call.
  /// May be original owner pubkey or lend pubkey.
  lend_owners_map check_external_owner(
    auth_cfg        cfg,
    uint128         balance,
    bool            owner_pubkey,
    uint256         msg_pubkey,
    opt<uint256>    lend_pubkey,
    lend_owners_map lend_owners_in
  ) {
    if (owner_pubkey) {
      auto [lend_owners, lend_balance] = filter_lend_maps(lend_owners_in);
      require(cfg.allowed_for_original_owner_in_lend_state ||
              (!lend_pubkey && lend_owners.empty()),
              error_code::wallet_in_lend_owneship);
      require(cfg.required_tokens + lend_balance <= balance, error_code::not_enough_balance);
      require(cfg.required_evers <= tvm_balance(), error_code::not_enough_evers_to_process);
      tvm_accept();
      tvm_commit();
      return lend_owners;
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
    } else if (lend_pubkey && *lend_pubkey == msg_pubkey) {
      require(cfg.required_evers <= tvm_balance(), error_code::not_enough_evers_to_process);
      tvm_accept();
      tvm_commit();

      auto [lend_owners, lend_balance] = filter_lend_maps(lend_owners_in);
      require(cfg.required_tokens + lend_balance <= balance, error_code::not_enough_balance);

      return lend_owners;
#endif // TIP3_ENABLE_LEND_OWNERSHIP
    }
    tvm_throw(error_code::message_sender_is_not_my_owner);
    return {};
  }

  /// Check method authorization
  void check_owner(auth_cfg cfg) {
    if constexpr (Internal) {
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
      auto lend_owners =
        check_internal_owner(cfg, balance_, int_sender(), owner_address_, lend_owners_);
      lend_owners_ = lend_owners;
#else
      [[maybe_unused]] auto lend_owners =
        check_internal_owner(cfg, balance_, int_sender(), owner_address_, {});
#endif // TIP3_ENABLE_LEND_OWNERSHIP
      return;
    } else {
      bool owner_pubkey = (msg_pubkey() == wallet_pubkey_) && !is_internal_owner();
#ifdef TIP3_ENABLE_LEND_OWNERSHIP
      auto lend_owners =
        check_external_owner(cfg, balance_, owner_pubkey, uint256{msg_pubkey()}, lend_pubkey_, lend_owners_);
      lend_owners_ = lend_owners;
#else
      [[maybe_unused]] auto lend_owners =
        check_external_owner(cfg, balance_, owner_pubkey, uint256{msg_pubkey()}, {}, {});
#endif // TIP3_ENABLE_LEND_OWNERSHIP
    }
  }
};

DEFINE_JSON_ABI(ITONTokenWallet, DTONTokenWallet, ETONTokenWallet, wallet_replay_protection_t);

// ----------------------------- Main entry functions ---------------------- //
#ifdef TIP3_ENABLE_EXTERNAL
DEFAULT_MAIN_ENTRY_FUNCTIONS_TMPL(TONTokenWallet, ITONTokenWallet, DTONTokenWallet, TOKEN_WALLET_TIMESTAMP_DELAY)
#else
MAIN_ENTRY_FUNCTIONS_NO_REPLAY_TMPL(TONTokenWallet, ITONTokenWallet, DTONTokenWallet)
#endif

