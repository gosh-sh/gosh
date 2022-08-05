pragma ton-solidity >= 0.58.0;
pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

contract ContentSignature {

    string static _content;

    constructor() public {
        require(msg.pubkey() == tvm.pubkey(), 100);
        tvm.accept();
    }
}
