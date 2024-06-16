pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../interfaces/ITokenFactory.sol";
import "../libraries/TokenErrors.sol";
import "../libraries/TokenMsgFlag.sol";
import "../TokenRoot.sol";
import "../TokenRootUpgradeable.sol";


contract TokenFactory is ITokenFactory {

    uint256 static _randomNonce;

    address public _owner;
    address public _pendingOwner;
    uint256 public _tokenNonce;
    uint128 public _deployValue;

    TvmCell public _rootCode;
    TvmCell public _walletCode;

    TvmCell public _rootUpgradeableCode;
    TvmCell public _walletUpgradeableCode;
    TvmCell public _platformCode;


    modifier onlyOwner {
        require(msg.sender == _owner && _owner.value != 0, TokenErrors.NOT_OWNER);
        _;
    }

    modifier cashBack {
        _;
        msg.sender.transfer({value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false});
    }


    constructor(
        address owner,
        uint128 deployValue,
        TvmCell rootCode,
        TvmCell walletCode,
        TvmCell rootUpgradeableCode,
        TvmCell walletUpgradeableCode,
        TvmCell platformCode
    ) public {
        tvm.accept();
        _owner = owner;
        _deployValue = deployValue;
        _rootCode = rootCode;
        _walletCode = walletCode;
        _rootUpgradeableCode = rootUpgradeableCode;
        _walletUpgradeableCode = walletUpgradeableCode;
        _platformCode = platformCode;
    }


    function deployRoot(
        string name,
        string symbol,
        uint8 decimals,
        address owner,
        address initialSupplyTo,
        uint128 initialSupply,
        uint128 deployWalletValue,
        bool mintDisabled,
        bool burnByRootDisabled,
        bool burnPaused,
        address remainingGasTo,
        bool upgradeable
    ) external responsible override returns (address) {
        tvm.rawReserve(address(this).balance - msg.value, 0);
        function (uint256, string, string, uint8, address) returns (TvmCell) buildStateInit =
            upgradeable ? _buildUpgradeableStateInit : _buildCommonStateInit;
        TvmCell stateInit = buildStateInit(_tokenNonce++, name, symbol, decimals, owner);
        // constructors of `TokenRoot` and `TokenRootUpgradeable` have the same signatures and the same functionID
        // so use `new TokenRoot` for both roots
        address root = new TokenRoot {
            value: _deployValue,
            flag: TokenMsgFlag.SENDER_PAYS_FEES,
            bounce: false,
            stateInit: stateInit
        }(
            initialSupplyTo,
            initialSupply,
            deployWalletValue,
            mintDisabled,
            burnByRootDisabled,
            burnPaused,
            remainingGasTo
        );
        return {value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false} root;
    }

    function _buildCommonStateInit(
        uint256 nonce,
        string name,
        string symbol,
        uint8 decimals,
        address owner
    ) internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: TokenRoot,
            varInit: {
                randomNonce_: nonce,
                deployer_: address(this),
                name_: name,
                symbol_: symbol,
                decimals_: decimals,
                rootOwner_: owner,
                walletCode_: _walletCode
            },
            code: _rootCode,
            pubkey: 0
        });
    }

    function _buildUpgradeableStateInit(
        uint256 nonce,
        string name,
        string symbol,
        uint8 decimals,
        address owner
    ) internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: TokenRootUpgradeable,
            varInit: {
                randomNonce_: nonce,
                deployer_: address(this),
                name_: name,
                symbol_: symbol,
                decimals_: decimals,
                rootOwner_: owner,
                walletCode_: _walletUpgradeableCode,
                platformCode_: _platformCode
            },
            code: _rootUpgradeableCode,
            pubkey: 0
        });
    }

    function changeDeployValue(uint128 deployValue) public onlyOwner cashBack {
        _deployValue = deployValue;
    }

    function changeRootCode(TvmCell rootCode) public onlyOwner cashBack {
        _rootCode = rootCode;
    }

    function changeWalletCode(TvmCell walletCode) public onlyOwner cashBack {
        _walletCode = walletCode;
    }

    function changeRootUpgradeableCode(TvmCell rootUpgradeableCode) public onlyOwner cashBack {
        _rootUpgradeableCode = rootUpgradeableCode;
    }

    function changeWalletUpgradeableCode(TvmCell walletUpgradeableCode) public onlyOwner cashBack {
        _walletUpgradeableCode = walletUpgradeableCode;
    }

    function changePlatformCode(TvmCell platformCode) public onlyOwner cashBack {
        _platformCode = platformCode;
    }

    function transferOwner(address owner) public onlyOwner cashBack {
        _pendingOwner = owner;
    }

    function acceptOwner() public cashBack {
        require(msg.sender == _pendingOwner && _pendingOwner.value != 0, TokenErrors.NOT_OWNER);
        _owner = _pendingOwner;
        _pendingOwner = address(0);
    }

    function upgrade(TvmCell code) public onlyOwner {
        TvmBuilder common;
        common.store(_rootCode);
        common.store(_walletCode);

        TvmBuilder upgradeable;
        upgradeable.store(_rootUpgradeableCode);
        upgradeable.store(_walletUpgradeableCode);
        upgradeable.store(_platformCode);

        TvmBuilder builder;
        builder.store(_owner);
        builder.store(_pendingOwner);
        builder.store(_tokenNonce);
        builder.store(_deployValue);
        builder.storeRef(common);
        builder.storeRef(upgradeable);

        tvm.setcode(code);
        tvm.setCurrentCode(code);
        onCodeUpgrade(builder.toCell());
    }

    function onCodeUpgrade(TvmCell data) private {
        tvm.resetStorage();
        TvmSlice slice = data.toSlice();
        (_owner, _pendingOwner, _tokenNonce, _deployValue) = slice.decode(address, address, uint256, uint128);

        TvmSlice common = slice.loadRefAsSlice();
        _rootCode = common.loadRef();
        _walletCode = common.loadRef();

        TvmSlice upgradeable = slice.loadRefAsSlice();
        _rootUpgradeableCode = upgradeable.loadRef();
        _walletUpgradeableCode = upgradeable.loadRef();
        _platformCode = upgradeable.loadRef();
    }

}
