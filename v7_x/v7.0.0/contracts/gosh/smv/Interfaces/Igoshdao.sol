pragma ton-solidity >=0.66.0;

interface IGoshDao {

function requestBurn(address recipient, address pubaddr, uint128 burn_amount, uint128 index) external;
function requestMint(address recipient, address pubaddr, uint128 mint_amount, uint128 index) external;
function asktotalSupply() external;
function calculateTagSupply(string[] tag) external;

}