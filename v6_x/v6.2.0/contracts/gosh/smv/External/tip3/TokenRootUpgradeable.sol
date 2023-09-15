pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./abstract/TokenRootTransferableOwnershipBase.sol";
import "./abstract/TokenRootBurnPausableBase.sol";
import "./abstract/TokenRootBurnableByRootBase.sol";
import "./abstract/TokenRootDisableableMintBase.sol";

import "./interfaces/ITokenRootUpgradeable.sol";
import "./interfaces/ITokenWalletUpgradeable.sol";
import "./interfaces/IVersioned.sol";
import "./libraries/TokenErrors.sol";
import "./libraries/TokenMsgFlag.sol";
import "./libraries/TokenGas.sol";
import "./TokenWalletPlatform.sol";


/*
    @title Fungible token root contract upgradable
*/
contract TokenRootUpgradeable is
    TokenRootTransferableOwnershipBase,
    TokenRootBurnPausableBase,
    TokenRootBurnableByRootBase,
    TokenRootDisableableMintBase,
    ITokenRootUpgradeable
{

    uint256 static randomNonce_;
    address static deployer_;

    TvmCell static platformCode_;
    uint32 walletVersion_;

    constructor(
        address initialSupplyTo,
        uint128 initialSupply,
        uint128 deployWalletValue,
        bool mintDisabled,
        bool burnByRootDisabled,
        bool burnPaused,
        address remainingGasTo
    )
        public
    {
        if (msg.pubkey() != 0) {
            require(msg.pubkey() == tvm.pubkey() && deployer_.value == 0, TokenErrors.WRONG_ROOT_OWNER);
            tvm.accept();
        } else {
            require(deployer_.value != 0 && msg.sender == deployer_ ||
                    deployer_.value == 0 && msg.sender == rootOwner_, TokenErrors.WRONG_ROOT_OWNER);
        }

        totalSupply_ = 0;
        mintDisabled_ = mintDisabled;
        burnByRootDisabled_ = burnByRootDisabled;
        burnPaused_ = burnPaused;
        walletVersion_ = 1;

        tvm.rawReserve(_targetBalance(), 0);

        if (initialSupplyTo.value != 0 && initialSupply != 0) {
            TvmCell empty;
            _mint(initialSupply, initialSupplyTo, deployWalletValue, remainingGasTo, false, empty);
        } else if (remainingGasTo.value != 0) {
            remainingGasTo.transfer({
                value: 0,
                flag: TokenMsgFlag.ALL_NOT_RESERVED + TokenMsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function supportsInterface(bytes4 interfaceID) override external view responsible returns (bool) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } (
            interfaceID == bytes4(0x3204ec29) ||    // SID
            interfaceID == bytes4(0x4371d8ed) ||    // TIP3TokenRoot
            interfaceID == bytes4(0x0b1fd263) ||    // ITokenRoot
            interfaceID == bytes4(0x18f7cce4) ||    // IBurnableByRootTokenRoot
            interfaceID == bytes4(0x0095b2fa) ||    // IDisableableMintTokenRoot
            interfaceID == bytes4(0x45c92654) ||    // IBurnPausableTokenRoot
            interfaceID == bytes4(0x376ddffc) ||    // IBurnPausableTokenRoot
            interfaceID == bytes4(0x1df385c6)       // ITransferableOwnership
        );
    }

    function walletVersion() override external view responsible returns (uint32) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } walletVersion_;
    }

    function platformCode() override external view responsible returns (TvmCell) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } platformCode_;
    }

    function requestUpgradeWallet(
        uint32 currentVersion,
        address walletOwner,
        address remainingGasTo
    )
        override
        external
    {
        require(msg.sender == _getExpectedWalletAddress(walletOwner), TokenErrors.SENDER_IS_NOT_VALID_WALLET);

        tvm.rawReserve(_reserve(), 0);

        if (currentVersion == walletVersion_) {
            remainingGasTo.transfer({ value: 0, flag: TokenMsgFlag.ALL_NOT_RESERVED });
        } else {
            ITokenWalletUpgradeable(msg.sender).acceptUpgrade{
                value: 0,
                flag: TokenMsgFlag.ALL_NOT_RESERVED,
                bounce: false
            }(
                walletCode_,
                walletVersion_,
                remainingGasTo
            );
        }
    }

    function setWalletCode(TvmCell code) override external onlyRootOwner {
        tvm.rawReserve(_targetBalance(), 0);
        walletCode_ = code;
        walletVersion_++;
    }


    function upgrade(TvmCell code) override external onlyRootOwner {
        TvmBuilder builder;

        builder.store(rootOwner_);
        builder.store(totalSupply_);
        builder.store(decimals_);

        TvmBuilder codes;
        codes.store(walletVersion_);
        codes.store(platformCode_);
        codes.store(walletCode_);

        TvmBuilder naming;
        codes.store(name_);
        codes.store(symbol_);

        TvmBuilder params;
        params.store(mintDisabled_);
        params.store(burnByRootDisabled_);
        params.store(burnPaused_);

        builder.storeRef(naming);
        builder.storeRef(codes);
        builder.storeRef(params);

        tvm.setcode(code);
        tvm.setCurrentCode(code);
        onCodeUpgrade(builder.toCell());
    }

    /*
        data:

        [ address rootOwner_, uint128 totalSupply_, uint8 decimals_,
            ref_1: [ uint32 walletVersion_,
                ref_1_1: platformCode_,
                ref_1_2: walletCode_
            ],
            ref_2: [
                ref_2_1: name_,
                ref_2_2: symbol_
            ],
            ref_3: [ bool mintDisabled_, bool burnByRootDisabled_, bool burnPaused_]
        ]
    */
    function onCodeUpgrade(TvmCell data) private { }

    function _targetBalance() override internal pure returns (uint128) {
        return TokenGas.TARGET_ROOT_BALANCE;
    }

    function _buildWalletInitData(address walletOwner) override internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: TokenWalletPlatform,
            varInit: {
                root: address(this),
                owner: walletOwner
            },
            pubkey: 0,
            code: platformCode_
        });
    }

    function _deployWallet(TvmCell initData, uint128 deployWalletValue, address remainingGasTo)
        override
        internal
        view
        returns (address)
    {
       address tokenWallet = new TokenWalletPlatform {
            stateInit: initData,
            value: deployWalletValue,
            wid: address(this).wid,
            flag: TokenMsgFlag.SENDER_PAYS_FEES
       }(walletCode_, walletVersion_, address(0), remainingGasTo);

       return tokenWallet;
    }

}
