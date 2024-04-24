pragma ton-solidity >=0.54.0;
pragma AbiHeader time; 
pragma AbiHeader expire; 
pragma AbiHeader pubkey;

import "Libraries/SMVErrors.sol";
/* import "Interfaces/IH2QGenerator.sol";  */

import "SMVProposal.sol";

contract SMVProposalManager /* is ISMVProposalManager */ {

optional (uint256) proposalCodeHash;
optional (uint16) proposalCodeDepth; 
bool proposalAllowed;

modifier check_owner {
  require ( msg.pubkey () != 0, SMVErrors.error_not_external_message );
  require ( tvm.pubkey () == msg.pubkey (), SMVErrors.error_not_my_pubkey );
  _ ;
}

function calcProposalAddress (uint256 id, uint32 ct) internal view returns(uint256)
{
  TvmCell dataCell = tvm.buildDataInit ( {contr:SMVProposal,
                                          varInit:{
                                             propRoot : address(this),
                                             propId : id,
                                             creationTime: ct } } );
  uint256 dataHash = tvm.hash (dataCell);
  uint16 dataDepth = dataCell.depth();
  uint256 add_std_address = tvm.stateInitHash (proposalCodeHash.get(), dataHash , proposalCodeDepth.get(), dataDepth);
  return add_std_address ;
}

modifier check_proposal (uint256 id, uint32 ct) {
  require (proposalCodeHash.hasValue());
  require (proposalCodeDepth.hasValue());
  uint256 expected = calcProposalAddress (id, ct);
  require (msg.sender.value == expected, SMVErrors.error_not_my_proposal) ;
  _ ;
}

constructor() public check_owner
{
    require(address(this).balance > SMVConstants.PROPMAN_INIT_VALUE + 
                                    SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low );
    tvm.accept();

    proposalAllowed = false;
    proposalCodeHash.reset();
    proposalCodeDepth.reset(); 
}

function setProposalCodeHash(uint256 codeHash, uint16 codeDepth) external check_owner
{
    require(address(this).balance > SMVConstants.PROPMAN_MIN_BALANCE + 
                                    SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low );
    tvm.accept();

    proposalCodeHash.set(codeHash);
    proposalCodeDepth.set(codeDepth);
}

function allowProposals (bool allowed) external check_owner
{
    require(address(this).balance > SMVConstants.PROPMAN_MIN_BALANCE + 
                                    SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low );
    if (allowed)
    {
        require (proposalCodeHash.hasValue(), SMVErrors.error_code_hash_not_set);
        require (proposalCodeDepth.hasValue(), SMVErrors.error_code_depth_not_set);
        tvm.accept();

        proposalAllowed = true;
    }
    else 
    {
        tvm.accept();
        proposalAllowed = false;
    }
}

function startProposal (TvmCell prpCode,  uint256 id, TvmCell propData, address tip3Root,
                        uint32 startTime, uint32 finishTime, address /* propOwner */, optional (address) notifyMe) external view check_owner
{
    require(address(this).balance >   SMVConstants.PROPMAN_MIN_BALANCE +
                                      SMVConstants.PROPOSAL_INIT_VALUE + 3*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    require(proposalAllowed, SMVErrors.error_proposals_not_allowed);
    require(proposalCodeHash.hasValue(), SMVErrors.error_code_hash_not_set);
    require(proposalCodeDepth.hasValue(), SMVErrors.error_code_depth_not_set);
    require(tvm.hash(prpCode) == proposalCodeHash.get(), SMVErrors.error_not_my_code_hash);
    require(prpCode.depth()   == proposalCodeDepth.get(), SMVErrors.error_not_my_code_depth);
    require(block.timestamp <= startTime, SMVErrors.error_time_too_early);
    require(startTime < finishTime, SMVErrors.error_times);
    tvm.accept();

    TvmCell _dataInitCell = tvm.buildDataInit ( {contr: SMVProposal,
                                                 varInit: { propRoot : address(this),
                                                            propId : id,
                                                            creationTime: block.timestamp ,
                                                            tokenRoot: tip3Root}} );
    TvmCell _stateInit = tvm.buildStateInit(prpCode, _dataInitCell);

    /* address proposal =  */new SMVProposal {stateInit: _stateInit,
                                        value:  SMVConstants.PROPOSAL_INIT_VALUE +
                                                2*SMVConstants.ACTION_FEE} 
                       (propData, startTime, finishTime, /* propOwner, */ notifyMe);
}

}