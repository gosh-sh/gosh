pragma ever-solidity ^0.66.0;
pragma ignoreIntOverflow;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

interface IAccept {
    function acceptTransfer(bytes payload) external;
}

/// @title Multisignature wallet based on Gnosis miltisig wallet
/// (https://github.com/gnosis/MultiSigWallet/blob/master/contracts/MultiSigWallet.sol).
/// Extended with limits and can be used as a single owner wallet.
/// @author Tonlabs (https://tonlabs.io)
contract MultisigWallet is IAccept {

    /*
     *  Storage
     */

    struct Transaction {
        // Transaction Id
        uint64 id;
        // transaction confirmations from custodians
        uint32 confirmationsMask;
        // Custodian confirmations required for executing transaction
        uint8 signsRequired;
        uint8 signsReceived;
        // public key of custodian queued transaction
        uint256 creator;
        // index of custodian
        uint8 index;
        // destination address of gram transfer
        address dest;
        // amount of nanograms to transfer
        uint128 value;
        // flags for sending internal message (see SENDRAWMSG cmd in TVM spec)
        uint16 sendFlags;
        // payload used as body of outbound internal message
        TvmCell payload;
        // bounce flag for header of outbound internal message
        bool bounce;
    }

    // Limit structure
    struct Limit {
        uint64 id;
        // Limit value in nanograms
        uint128 value;
        // Limit period in days
        uint32 period;
        // Required number of custodian confirmations if total transferred
        // value in limit period less then limit value
        uint8 required;
        // Sum of spent nanograms in limit period
        uint256 spent;
        // Unixtime when limit is started
        uint32 start;
        // Set of custodians votes for deleting limit
        uint8 votes;
        // Mask defining which custodians already voted for deletion
        uint32 deletionMask;
    }

    // Submitted limit but not confirmed by required number of custodians
    struct PendingLimit {
        // public key of custodian created limit
        uint256 creator;
        // index of custodian
        uint8 index;
        // confirmation mask
        uint32 confirmationsMask;
        // number of confirmations from custodians
        uint8 signs;
        // Id of limit from which pending limit is created.
        // (as result of changeLimit). Id is zero if it's new limit.
        uint64 parentId;
        // limit structure itself
        Limit limit;
    }

    /// Request for code update
    struct UpdateRequest {
        // request id
        uint64 id;
        // index of custodian submitted request
        uint8 index;
        // number of confirmations from custodians
        uint8 signs;
        // confirmation binary mask
        uint32 confirmationsMask;
        // public key of custodian submitted request
        uint256 creator;
        // hash from code's tree of cells
        uint256 codeHash;
        // array with new wallet custodians
        uint256[] custodians;
        // Default number of confirmations required to execute transaction
        uint8 reqConfirms;
    }

    /*
     *  Constants
     */
    uint128 constant MAX_LIMIT_COUNT = 5;
    uint32  constant SECONDS_IN_DAY = 86400;
    uint32  constant MAX_LIMIT_PERIOD = 365;
    uint8   constant MAX_QUEUED_REQUESTS = 5;
    uint8   constant MAX_QUEUED_LIMITS_BY_CUSTODIAN = 3;
    uint64  constant EXPIRATION_TIME = 3600; //lifetime is 1 hour
    uint8   constant MAX_CUSTODIAN_COUNT = 32;
    uint128 constant MIN_VALUE = 1e6;
    uint    constant MAX_CLEANUP_TXNS = 40;

    // Send flags:
    // forward fees for message will be paid from contract balance
    uint8 constant FLAG_PAY_FWD_FEE_FROM_BALANCE = 1;
    // tells node to ignore errors in action phase while outbound messages are sent.
    uint8 constant FLAG_IGNORE_ERRORS = 2;
    // tells node to send all remaining balance.
    uint8 constant FLAG_SEND_ALL_REMAINING = 128;

    /*
     * Variables
     */
    // Public key of custodian who deployed a contract.
    uint256 m_ownerKey;
    // Binary mask with custodian requests (max 32 custodians).
    // TODO: MAX_REQUESTS==5 fitting into 3 bits, so 32*3 = 96 bits...
    uint256 m_requestsMask;
    // Dictionary of queued transactions waiting confirmations.
    mapping(uint64 => Transaction) m_transactions;
    // Set of custodians, initiated in constructor, but values can be changed later in code.
    mapping(uint256 => uint8) m_custodians; // pub_key -> custodian_index
    // Read-only custodian count, initiated in constructor.
    uint8 m_custodianCount;
    // Set of limits.
    mapping(uint64 => Limit) m_limits; // id -> value

    mapping(uint64 => PendingLimit) m_pendingLimits;
    // Mask with pending limit confirmations
    uint256 m_limitRequestsMask;

    // Set of update requests.
    mapping (uint64 => UpdateRequest) m_updateRequests;
    // Binary mask for storing update request counts from custodians.
    // Every custodian can submit only one request.
    uint32 m_updateRequestsMask;
    // Number of custodian confirmations for
    // changing limit or creating new limit and updating code
    uint8 m_requiredVotes;
    // Default number of confirmations needed to execute transaction.
    // Less or equal to number of custodians.
    uint8 m_defaultRequiredConfirmations;

    /*
    TODO: define named constants for error codes

    Exception codes:
    100 - message sender is not a custodian
    101 - limit does not exist
    102 - transaction does not exist
    103 - operation is already confirmed by this custodian
    104 - invalid limit parameters
    105 - limit is already pended
    106 - limit is not pended
    107 - input value is too low.
    108 - wallet should have only one custodian
    109 - limit overrun
    110 - Too many custodians
    113 - Too many requests for one custodian
    115 - update request does not exist
    116 - update request already confirmed by this custodian
    117 - invalid number of custodians
    119 - stored code hash and calculated code hash are not equal
    120 - update request is not confirmed
    121 - payload size is too big
    122 - object is expired
    */

    /*
     *  Events
     */
    event TransferAccepted(bytes payload);

    event LimitOverrun(uint64 limitId, uint128 value);

    /*
     * Runtime functions
     */
    function tvm_ctos(TvmCell cell) private pure returns (uint /* slice */) {}

    function tvm_tree_cell_size(uint slice) private pure returns (uint, uint) {}

    /*
     * Constructor
     */

    /// @dev Internal function called from constructor to initialize custodians
    function _initialize(uint256[] owners, uint8 reqConfirms) inline private {
        uint8 ownerCount = 0;
        m_ownerKey = owners[0];

        uint256 len = owners.length;
        for (uint256 i = 0; (i < len && ownerCount < MAX_CUSTODIAN_COUNT); i++) {
            uint256 key = owners[i];
            if (!m_custodians.exists(key)) {
                m_custodians[key] = ownerCount++;
            }
        }
        m_defaultRequiredConfirmations = ownerCount <= reqConfirms ? ownerCount : reqConfirms;
        m_requiredVotes = (ownerCount <= 2) ? ownerCount : ((ownerCount * 2 + 1) / 3);
        m_custodianCount = ownerCount;
    }

    /// @dev Contract constructor.
    /// @param owners Array of custodian keys.
    /// @param reqConfirms Default number of confirmations required for executing transaction.
    constructor(uint256[] owners, uint8 reqConfirms) public {
        require(msg.pubkey() == tvm.pubkey(), 100);
        require(owners.length > 0 && owners.length <= MAX_CUSTODIAN_COUNT, 117);
        tvm.accept();
        _initialize(owners, reqConfirms);
    }

    /*
     * Inline helper macros
     */

    /// @dev Returns queued transaction count by custodian with defined index
    function _getMaskValue(uint256 mask, uint8 index) inline private pure returns (uint8) {
        return uint8((mask >> (8 * uint256(index))) & 0xFF);
    }

    /// @dev Increment queued transaction count by custodian with defined index
    function _incMaskValue(uint256 mask, uint8 index) inline private pure returns (uint256) {
        return mask + (1 << (8 * uint256(index)));
    }

    /// @dev Decrement queued transaction count by custodian with defined index
    function _decMaskValue(uint256 mask, uint8 index) inline private pure returns (uint256) {
        return mask - (1 << (8 * uint256(index)));
    }

    function _checkBit(uint32 mask, uint8 index) inline private pure returns (bool) {
        return (mask & (uint32(1) << index)) != 0;
    }

    function _isConfirmed(uint32 mask, uint8 custodianIndex) inline private pure returns (bool) {
        return _checkBit(mask, custodianIndex);
    }

    function _isSubmitted(uint32 mask, uint8 custodianIndex) inline private pure returns (bool) {
        return _checkBit(mask, custodianIndex);
    }

    function _setConfirmed(uint32 mask, uint8 custodianIndex) inline private pure returns (uint32) {
        mask |= (uint32(1) << custodianIndex);
        return mask;
    }

    function _setSubmitted(uint32 mask, uint8 custodianIndex) inline private pure returns (uint32) {
        return _setConfirmed(mask, custodianIndex);
    }

    /// @dev Checks that custodian with supplied public key exists in custodian set.
    function _findCustodian(uint256 senderKey) inline private view returns (uint8) {
        require(m_custodians.exists(senderKey), 100);
        uint8 index = m_custodians[senderKey];
        return index;
    }

    function _generateId() inline private pure returns (uint64) {
        return (uint64(now) << 32) | (tx.timestamp & 0xFFFFFFFF);
    }

    function _getExpirationBound() inline private pure returns (uint64) {
        return (uint64(now) - EXPIRATION_TIME) << 32;
    }

    function _getSendFlags(uint128 value, bool allBalance) inline private pure returns (uint8, uint128) {        
        uint8 flags = FLAG_IGNORE_ERRORS | FLAG_PAY_FWD_FEE_FROM_BALANCE;
        if (allBalance) {
            flags = FLAG_IGNORE_ERRORS | FLAG_SEND_ALL_REMAINING;
            value = uint128(address(this).balance);
        }
        return (flags, value);
    }

    /*
     * Public transfer functions
     */

    /// @dev A payable method for accepting incoming grams. It generates
    /// an event with incoming payload.
    /// @param payload Some payload from message body.
    function acceptTransfer(bytes payload) external override {
        emit TransferAccepted(payload);
    }

    /// @dev Allows custodian if she is the only owner of multisig to transfer grams with minimal fees.
    /// @param dest Transfer target address.
    /// @param value Nanograms value to transfer.
    /// @param bounce Bounce flag. Set true if need to transfer grams to existing account; set false to create new account.
    /// @param flags Flags for transferring grams.
    /// @param payload Tree of cells used as body of outbound internal message.
    function sendTransaction(
        address dest,
        uint128 value,
        bool bounce,
        uint8 flags,
        TvmCell payload) public
    {
        require(m_custodianCount == 1, 108);
        require(msg.pubkey() == m_ownerKey, 100);
        tvm.accept();
        _checkLimitsEx(value);
        dest.transfer(value, bounce, flags, payload);
    }

    /// @dev Allows custodian to submit and confirm new transaction.
    /// @param dest Transfer target address.
    /// @param value Nanograms value to transfer.
    /// @param bounce Bounce flag. Set true if need to transfer grams to existing account; set false to create new account.
    /// @param allBalance Set true if need to transfer all remaining balance.
    /// @param payload Tree of cells used as body of outbound internal message.
    /// @return transId transId Returns transaction ID.
    function submitTransaction(
        address dest,
        uint128 value,
        bool bounce,
        bool allBalance,
        TvmCell payload)
    public returns (uint64 transId)
    {
        uint256 senderKey = msg.pubkey();
        uint8 index = _findCustodian(senderKey);
        require(value >= MIN_VALUE, 107);
        (uint bits, uint cells) = tvm_tree_cell_size(tvm_ctos(payload));
        require(bits < 8192 && cells < 8, 121);
        //TODO: uncomment when CDATASIZE command will be supported by tonlabs node.
        //(/*uint cells*/, uint bits, /*uint refs*/) = tvm.cdatasize(payload, 8);
        //require(bits < 8192, 121);
        _removeExpiredTransactions();
        require(_getMaskValue(m_requestsMask, index) < MAX_QUEUED_REQUESTS, 113);
        tvm.accept();

        (uint8 flags, uint128 realValue) = _getSendFlags(value, allBalance);        
        uint8 requiredSigns = _checkLimitsEx(realValue);

        if (requiredSigns == 1) {
            dest.transfer(realValue, bounce, flags, payload);
            return 0;
        } else {
            m_requestsMask = _incMaskValue(m_requestsMask, index);
            uint64 trId = _generateId();
            Transaction txn = Transaction(trId, 0/*mask*/, requiredSigns, 0/*signsReceived*/,
                senderKey, index, dest, realValue, flags, payload, bounce);

            _confirmTransaction(trId, txn, index);
            return trId;
        }
    }

    /// @dev Allows custodian to confirm a transaction.
    /// @param transactionId Transaction ID.
    function confirmTransaction(uint64 transactionId) public {
        uint8 index = _findCustodian(msg.pubkey());
        _removeExpiredTransactions();
        require(m_transactions.exists(transactionId), 102);
        Transaction  txn = m_transactions[transactionId]; 
        require(!_isConfirmed(txn.confirmationsMask, index), 103);
        tvm.accept();

        _confirmTransaction(transactionId, txn, index);
    }

    /*
     * Internal functions
     */

    function _confirmTransaction(uint64 transactionId, Transaction txn, uint8 custodianIndex) inline private {
        if ((txn.signsReceived + 1) >= txn.signsRequired) {
            txn.dest.transfer(txn.value, txn.bounce, txn.sendFlags, txn.payload);
            m_requestsMask = _decMaskValue(m_requestsMask, txn.index);
            delete m_transactions[transactionId];
        } else {
            txn.confirmationsMask = _setConfirmed(txn.confirmationsMask, custodianIndex);
            txn.signsReceived++;
            m_transactions[transactionId] = txn;
        }
    }

    function _removeExpiredTransactions() inline private {
        uint64 marker = _getExpirationBound();
        optional(uint64, Transaction) res1 = m_transactions.min();
        bool success = res1.hasValue();
        if (!success) { return; }
        (uint64 trId, Transaction txn) = res1.get();
        bool needCleanup = success && (trId <= marker);
        if (!needCleanup) { return; }
        tvm.accept();
        uint i = 0;
        while (needCleanup && i < MAX_CLEANUP_TXNS) {
            // transaction is expired, remove it
            i++;
            m_requestsMask = _decMaskValue(m_requestsMask, txn.index);
            delete m_transactions[trId];

            // revert limits
            optional(uint64, Limit) res2 = m_limits.min();
            bool ok = res2.hasValue();
            while (ok) {
                (uint64 limId, Limit limit) = res2.get();
                uint32 txnCreatedAt = uint32(trId >> 32);
                if (limit.spent != 0 && txnCreatedAt >= limit.start) {
                    m_limits[limId].spent -= txn.value;
                }
                res2 = m_limits.next(limId);
                ok = res2.hasValue();
            }
            res1 = m_transactions.next(trId);
            success = res1.hasValue();
            if (!success) { return; }
            (trId, txn) = res1.get();
            needCleanup = success && (trId <= marker);
        }        
        tvm.commit();
    }

    /*
     * Get methods
     */
    
    /// @dev Helper get-method for checking is custodian with certain index 
    /// confirmed transaction/limit/updateRequest. 
    function isConfirmed(uint32 mask, uint8 index) public pure returns (bool confirmed) {
        confirmed = _isConfirmed(mask, index);
    }

    /// @dev Returns all multisig configuration parameters.
    function getParameters() public view
        returns (uint8 maxQueuedTransactions,
                uint8 maxQueuedLimits,
                uint8 maxCustodianCount,
                uint32 maxLimitPeriod,
                uint64 expirationTime,
                uint128 minValue,
                uint8 requiredTxnConfirms, 
                uint8 requiredLimConfirms,
                uint8 requiredUpdConfirms) {

        maxQueuedTransactions = MAX_QUEUED_REQUESTS;
        maxQueuedLimits = MAX_QUEUED_LIMITS_BY_CUSTODIAN;
        maxCustodianCount = MAX_CUSTODIAN_COUNT;
        maxLimitPeriod = SECONDS_IN_DAY;
        expirationTime = EXPIRATION_TIME;
        minValue = MIN_VALUE;
        requiredTxnConfirms = m_defaultRequiredConfirmations;
        requiredLimConfirms = m_requiredVotes;
        requiredUpdConfirms = m_requiredVotes;
    }

    /// @dev Returns transaction info by id.
    /// @return trans Transaction structure.
    /// Throws exception if transaction does not exist.
    function getTransaction(uint64 transactionId) public view
        returns (Transaction trans) {
        require(m_transactions.exists(transactionId), 102);
        Transaction txn = m_transactions[transactionId];
        trans = txn;
    }

    /// @dev Returns array of pending transactions.
    /// @return transactions Array of queued transactions.
    function getTransactions() public view returns (Transaction[] transactions) {
        uint64 bound = _getExpirationBound();
        optional(uint64, Transaction) res1 = m_transactions.min();
        bool success = res1.hasValue();
        while (success) {
            (uint64 id, Transaction txn) = res1.get();
            // returns only not expired transactions
            if (id > bound) {
                transactions.push(txn);
            }
            res1 = m_transactions.next(id);
            success = res1.hasValue();
        }
    }

    /// @dev Returns queued transaction ids.
    /// @return ids Array of transaction ids.
    function getTransactionIds() public view returns (uint64[] ids) {
        optional(uint64, Transaction) res1 = m_transactions.min();
        bool success = res1.hasValue();
        while (success) {
            (uint64 trId, ) = res1.get();
            ids.push(trId);
            res1 = m_transactions.next(trId);
            success = res1.hasValue();
        }
    }

    /// @dev Helper structure to return information about custodian.
    /// Used in getCustodians().
    struct CustodianInfo {
        uint8 index;
        uint256 pubkey;
    }

    /// @dev Returns info about wallet custodians.
    /// @return custodians Array of custodians.
    function getCustodians() public view returns (CustodianInfo[] custodians) {
        optional(uint256, uint8) res1 = m_custodians.min();
        bool success = res1.hasValue();
        while (success) {
            (uint256 key, uint8 index) = res1.get();
            custodians.push(CustodianInfo(index, key));
            res1 = m_custodians.next(key);
            success = res1.hasValue();
        }
    }    

    /*
     * Limit check
     */

    /// @dev Top level function for checking limits.
    /// Emits event if one of strict limits is exceeded.
    /// @param value Amount of transfer nanograms in transaction.
    /// @return reqSigns Number of required custodian signatures to execute transaction.
    function _checkLimitsEx(uint128 value) inline private returns (uint8) {
        if (!m_limits.empty()) {
            return _checkLimits(value);
        }
        return m_defaultRequiredConfirmations;
    }

    /// @dev Checks that all of limits allow transferring defined value.
    /// @param value Value of nanograms in transaction.
    /// Returns number of required signatures and id of exceeded limit (if there is one).
    function _checkLimits(uint128 value) inline private returns (uint8) {
        uint8 reqConfirms = m_defaultRequiredConfirmations;
        uint8 minReq = 1;
        uint32 activePeriod = MAX_LIMIT_PERIOD;
        uint32 exceededLimitPeriod = 0;
        uint32 nowTime = uint32(now);
 
        optional(uint64, Limit) res1 = m_limits.min();
        bool success = res1.hasValue();
        while (success) {
            (uint64 limId, Limit limit) = res1.get();
            uint32 endTime = limit.start + limit.period * SECONDS_IN_DAY;
            if (nowTime > endTime) {
                // reset period
                limit.start = nowTime;
                limit.spent = 0;
            }

            // update spent amount
            limit.spent += value;
            (exceededLimitPeriod, activePeriod, reqConfirms, minReq) = _checkOneLimit(
                limit, exceededLimitPeriod, activePeriod, reqConfirms, minReq
            );
            
            // save changes in limit to local copy.
            m_limits[limId] = limit;
            res1 = m_limits.next(limId);
            success = res1.hasValue();
        }

        return reqConfirms;
    }

    /// @dev Helper function that analyzes one limit.
    function _checkOneLimit(
        Limit limit,
        uint32 exceededLimitPeriod,
        uint32 activePeriod,
        uint8 reqConfirms,
        uint8 minReq
    ) inline private view returns (uint32, uint32, uint8, uint8) {
        
        if (limit.spent <= limit.value) {
            // limit is not exceeded

            uint32 period = limit.period;
            // check:
            // if limit period overrides the exceeded limit 
            // but is lower that last checked limit 
            if (period > exceededLimitPeriod && period <= activePeriod) {
                // can not relax the requirements for the minimum number 
                // of signatures
                if (limit.required >= minReq) {
                    reqConfirms = limit.required;
                    activePeriod = limit.period;
                }
            }
        } else {
            // limit is exceeded

            // update period of exceeded limit
            if (exceededLimitPeriod < limit.period) {
                exceededLimitPeriod = limit.period;
            }
            // minimum number of signs cannot be less than in
            // exceeded limit
            if (limit.required + 1 > minReq) {
                minReq = limit.required + 1;
            }

            if (minReq > reqConfirms) {
                reqConfirms = m_defaultRequiredConfirmations;            
            }
        }
        return (exceededLimitPeriod, activePeriod, reqConfirms, minReq);
    }

    /*
      Public limit functions
    */

    /// @dev Allow to create limit for defined period.
    /// @param value Limit value in nanograms.
    /// @param period Period in days.
    /// @param required Number of required transaction signatures. Can be zero.
    /// Limit id.
    function createLimit(uint128 value, uint32 period, uint8 required) public returns (uint64 limitId) {        
        return _createLimitCommon(value, period, required, 0);
    }

    /// @dev Allow to confirm new limit or changes an existed limit.
    /// @param limitId limit id.
    function confirmLimit(uint64 limitId) public {
        uint8 index = _findCustodian(msg.pubkey());
        _removeExpiredLimits();
        require(m_pendingLimits.exists(limitId), 101);
        PendingLimit lim = m_pendingLimits[limitId];
        require(!_isConfirmed(lim.confirmationsMask, index), 103);
        tvm.accept();

        _confirmLimit(limitId, index);
    }

    /// @dev Allow to request for changes in limit parameters.
    /// @param limitId Limit id.
    /// @param value New value of limit nanograms.
    /// @param period New value of limit period in days.
    /// @param required Number of required transaction signatures. Can be zero.
    /// @return newLimitId limit id.
    function changeLimit(uint64 limitId, uint128 value, uint32 period, uint8 required) public returns (uint64 newLimitId) {
        require(m_limits.exists(limitId), 101);
        newLimitId = _createLimitCommon(value, period, required, limitId);
    }

    /// @dev Allow custodian to vote for deleting limit.
    /// @param limitId Limit id.
    /// If number of votes will be greater then required, limit will be deleted.
    function deleteLimit(uint64 limitId) public {
        uint256 sender = msg.pubkey();
        uint8 index = _findCustodian(sender);
        require(m_limits.exists(limitId), 101);
        Limit limit = m_limits[limitId];
        require(!_isConfirmed(limit.deletionMask, index), 103);
        tvm.accept();

        limit.deletionMask = _setConfirmed(limit.deletionMask, index);
        limit.votes++;

        if (limit.votes >= m_requiredVotes) {
            _deleteLimit(limitId);
        } else {
            m_limits[limitId] = limit;
        }
    }

    /*
     Get methods for limits
    */

    /// @dev Returns array of limits.
    function getLimits() public view returns (Limit[] limits) {
        optional(uint64, Limit) res1 = m_limits.min();
        bool success = res1.hasValue();
        while (success) {
            (uint64 id, Limit lim) = res1.get();
            limits.push(lim);
            res1 = m_limits.next(id);
            success = res1.hasValue();
        }
    }

    /// @dev Returns array of pending limits.
    function getPendingLimit(uint64 limitId) public view returns (PendingLimit limit) {
        require(m_pendingLimits.exists(limitId), 101);
        PendingLimit lim = m_pendingLimits[limitId];
        limit = lim;
    }

    /// @dev Helper structure for getPendingLimits().
    struct PendingLimitInfo {
        uint64 id;
        PendingLimit info;
    }    

    /// @dev Returns array of pending limits.
    function getPendingLimits() public view returns (PendingLimitInfo[] pendingLimits) {
        optional(uint64, PendingLimit) res1 = m_pendingLimits.min();
        bool success = res1.hasValue();
        while (success) {
            (uint64 id, PendingLimit limit) = res1.get();
            pendingLimits.push(PendingLimitInfo(id, limit));
            res1 = m_pendingLimits.next(id);
            success = res1.hasValue();
        }
    }

    /// @dev Allow to query limit details
    /// @param limitId Limit id
    /// Returns limit parameters: value, period, required signatures, spent nanograms and start time.
    /// Throws exception if limit does not exist.
    function getLimit(uint64 limitId) public view
        returns (Limit limit)
    {
        require(m_limits.exists(limitId), 101);
        Limit lim = m_limits[limitId];
        limit = lim;
    }

    /*
     * Internal functions for limits
     */

    /// @dev Validates limit parameters.
    function _validateLimit(uint128 value, uint32 period, uint8 required) inline private view {
        require(period > 0, 104);
        require(value > 0, 104);
        require(period <= MAX_LIMIT_PERIOD, 104);
        require(required > 0 && required <= m_custodianCount, 104);
    }

    /// @dev Creates new pending limit.
    function _newLimit(uint128 value, uint32 period, uint8 required, uint256 creator, uint8 index, uint64 parentId)
        inline private returns (uint64)
    {
        uint64 limitId = _generateId();
        Limit limit = Limit({ id: limitId, value: value, period: period, 
            required: required, spent: 0, start: 0, votes: 0, deletionMask: 0 });
        PendingLimit pending = PendingLimit({ creator: creator, index: index,
            confirmationsMask: 0, signs: 0, parentId: parentId, limit: limit});
        m_pendingLimits[limitId] = pending;
        return limitId;
    }

    /// @dev Allows custodian to confirm new limit, changing limit and deleting limit
    function _confirmLimit(uint64 limitId, uint8 custodianIndex) inline private {
        PendingLimit pendingLimit = m_pendingLimits[limitId];
        pendingLimit.signs++;

        if (pendingLimit.signs >= m_requiredVotes) {
            _insertLimit(limitId);
            m_limitRequestsMask = _decMaskValue(m_limitRequestsMask, pendingLimit.index);
        } else {
            pendingLimit.confirmationsMask = _setConfirmed(pendingLimit.confirmationsMask, custodianIndex);
            m_pendingLimits[limitId] = pendingLimit;
        }
    }

    /// @dev Removes limit from set and decrements limit counter.
    function _deleteLimit(uint64 limitId) inline private {
        if (m_limits.exists(limitId)) {
            delete m_limits[limitId];
        }
    }

    /// @dev Moves pending limit to limit set and correctly modifies limit counter.
    function _insertLimit(uint64 limitId) inline private {
        PendingLimit pending = m_pendingLimits[limitId];
        m_limits[limitId] = pending.limit;
        if (pending.parentId != 0) {
            _deleteLimit(pending.parentId);
        }
        delete m_pendingLimits[limitId];
    }

    /// @dev Removes expired pending limits.
    function _removeExpiredLimits() inline private {
        uint64 marker = _getExpirationBound();
        optional(uint64, PendingLimit) res1 = m_pendingLimits.min();
        bool success = res1.hasValue();
        if (!success) { return; }
        (uint64 limId, PendingLimit lim) = res1.get();
        bool needCleanup = success && (limId <= marker);
        if (!needCleanup) { return; }
        
        tvm.accept();
        while (needCleanup) {
            //transaction is expired, remove it
            m_limitRequestsMask = _decMaskValue(m_limitRequestsMask, lim.index);
            delete m_pendingLimits[limId];
            res1 = m_pendingLimits.next(limId);
            success = res1.hasValue();
            if (!success) { needCleanup = success; continue; }
            (limId, lim) = res1.get();
            needCleanup = (limId <= marker);
        }
        tvm.commit();
    }

    /// @dev Common function that made input checks and creates limits.
    function _createLimitCommon(uint128 value, uint32 period, uint8 required, uint64 parentId) inline private returns (uint64) {
        uint256 sender = msg.pubkey();
        uint8 index = _findCustodian(sender);
        _validateLimit(value, period, required);
        _removeExpiredLimits();
        require(_getMaskValue(m_limitRequestsMask, index) < MAX_QUEUED_LIMITS_BY_CUSTODIAN, 113);
        tvm.accept();

        uint64 limitId = _newLimit(value, period, required, sender, index, parentId);
        m_limitRequestsMask = _incMaskValue(m_limitRequestsMask, index);
        _confirmLimit(limitId, index);
        return limitId;
    }

    /*
        SETCODE public functions
     */
    
    /// @dev Allows to submit update request. New custodians can be supplied.
    /// @param codeHash Representation hash of code's tree of cells.
    /// @param owners Array with new custodians.
    /// @param reqConfirms Default number of confirmations required for executing transaction.
    /// @return updateId Id of submitted update request.
    function submitUpdate(uint256 codeHash, uint256[] owners, uint8 reqConfirms) public 
        returns (uint64 updateId) 
    {
        uint256 sender = msg.pubkey();
        uint8 index = _findCustodian(sender);
        require(owners.length > 0 && owners.length <= MAX_CUSTODIAN_COUNT, 117);
        _removeExpiredUpdateRequests();
        require(!_isSubmitted(m_updateRequestsMask, index), 113);
        tvm.accept();

        m_updateRequestsMask = _setSubmitted(m_updateRequestsMask, index);
        updateId = _generateId();
        m_updateRequests[updateId] = UpdateRequest(updateId, index, 0/*signs*/, 0/*mask*/, 
            sender, codeHash, owners, reqConfirms);
        _confirmUpdate(updateId, index);
    }

    /// @dev Allow to confirm submitted update request. Call executeUpdate to do `setcode`
    /// after necessary confirmation count.
    /// @param updateId Id of submitted update request.
    function confirmUpdate(uint64 updateId) public {
        uint8 index = _findCustodian(msg.pubkey());
        _removeExpiredUpdateRequests();
        require(m_updateRequests.exists(updateId), 115);
        UpdateRequest request = m_updateRequests[updateId];
        require(!_isConfirmed(request.confirmationsMask, index), 116);
        tvm.accept();

        _confirmUpdate(updateId, index);
    }

    /// @dev Allows to execute confirmed update request.
    /// @param updateId Id of update request.
    /// @param code Root cell of tree of cells with contract code.
    function executeUpdate(uint64 updateId, TvmCell code) public {
        require(m_custodians.exists(msg.pubkey()), 100);
        _removeExpiredUpdateRequests();
        require(m_updateRequests.exists(updateId), 115);
        UpdateRequest request = m_updateRequests[updateId];
        require(tvm.hash(code) == request.codeHash, 119);
        require(request.signs >= m_requiredVotes, 120);
        tvm.accept();

        _deleteUpdateRequest(updateId, request.index);

        tvm.setcode(code);
        tvm.setCurrentCode(code);
        onCodeUpgrade(request.custodians, request.reqConfirms);
    }

    /// @dev Get-method to query all pending update requests.
    function getUpdateRequests() public view returns (UpdateRequest[] updates) {
        uint64 bound = _getExpirationBound();
        optional(uint64, UpdateRequest) res1 = m_updateRequests.min();
        bool success = res1.hasValue();
        while (success) {
            (uint64 updateId, UpdateRequest req) = res1.get();
            if (updateId > bound) {
                updates.push(req);
            }
            res1 = m_updateRequests.next(updateId);
            success = res1.hasValue();
        }
    }

    /// @dev Worker function after code update.
    function onCodeUpgrade(uint256[] newOwners, uint8 reqConfirms) private {
        tvm.resetStorage();
        _initialize(newOwners, reqConfirms);
    }
    
    /*
     * Internal functions
     */

    /// @dev Internal function for update confirmation.
    function _confirmUpdate(uint64 updateId, uint8 custodianIndex) inline private {
        UpdateRequest request = m_updateRequests[updateId];
        request.signs++;
        request.confirmationsMask = _setConfirmed(request.confirmationsMask, custodianIndex);
        m_updateRequests[updateId] = request;
    }

    /// @dev Removes expired update requests.
    function _removeExpiredUpdateRequests() inline private {
        uint64 marker = _getExpirationBound();
        optional(uint64, UpdateRequest) res1 = m_updateRequests.min();
        bool success = res1.hasValue();
        if (!success) { return; }
        (uint64 updateId, UpdateRequest req) = res1.get();
        bool needCleanup = success && (updateId <= marker);
        if (!needCleanup) { return; }

        tvm.accept();
        while (needCleanup) {
            // transaction is expired, remove it
            _deleteUpdateRequest(updateId, req.index);
            res1 = m_updateRequests.next(updateId);
            success = res1.hasValue();
            if (!success) { needCleanup = success; continue; }
            (updateId, req) = res1.get();
            needCleanup = (updateId <= marker);
        }
        tvm.commit();
    }

    /// @dev Helper function to correctly delete request.
    function _deleteUpdateRequest(uint64 updateId, uint8 index) inline private {
        m_updateRequestsMask &= ~(uint32(1) << index);
        delete m_updateRequests[updateId];
    }

    function TheBigBang(address returnMoney) public  {
        require(m_custodians.exists(msg.pubkey()), 100);
        tvm.accept();
        selfdestruct(returnMoney);
    }
}
