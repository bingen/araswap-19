pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";


contract Araswap is AragonApp {
    using SafeMath for uint256;

    string private constant ERROR_ZERO_VALUE = "ARASWAP_ZERO_VALUE";
    string private constant ERROR_ZERO_TOKENS = "ARASWAP_ZERO_TOKENS";
    string private constant ERROR_TOKEN_TRANSFER_FAILED = "ARASWAP_TOKEN_TRANSFER_FAILED";
    string private constant ERROR_NOT_ENOUGH_VALUE = "ARASWAP_NOT_ENOUGH_VALUE";
    string private constant ERROR_NOT_ENOUGH_SHARES = "ARASWAP_NOT_ENOUGH_SHARES";

    // This is the source of truth, we keep track of it to avoid anybody can
    // modify the ratio by sending eth or tokens to the contract
    // (although it'd be certainly stupid, as they would be lost funds)
    uint256 public ethPool;
    uint256 public tokenPool;
    uint256 public currentRatio;

    mapping(address => uint256) shares;
    uint256 totalShares;

    /// Events
    event AddedToPool(address sender, uint256 ethAmount, uint256 tokenAmount);
    event RemovedFromPool(address sender, uint256 ethAmount, uint256 tokenAmount);
    event SoldTokens(address sender, uint256 ethAmount, uint256 tokenAmount);
    event BoughtTokens(address sender, uint256 ethAmount, uint256 tokenAmount);

    /// State
    ERC20 public token;

    /// ACL
    bytes32 constant public POOL_ROLE = keccak256("POOL_ROLE");
    bytes32 constant public BUY_ROLE = keccak256("BUY_ROLE");
    bytes32 constant public SELL_ROLE = keccak256("SELL_ROLE");

    function initialize(ERC20 _token) public onlyInit {
        initialized();

        token = _token;
    }

    function setInitialPool(uint256 _tokenAmount) external payable auth(POOL_ROLE) {
        require(_tokenAmount > 0, ERROR_ZERO_TOKENS);

        _addToPool(msg.value, _tokenAmount, _tokenAmount);
    }

    /**
     * @notice Add `msg.value` ETH tokens to pool
     */
    function addToPool() external payable auth(POOL_ROLE) {
        uint256 tokenAmount = tokenPool * msg.value / ethPool;
        uint256 sharesMinted = totalShares * msg.value / ethPool;
        _addToPool(msg.value, tokenAmount, sharesMinted);
    }

    function _addToPool(uint256 _ethAmount, uint256 _tokenAmount, uint256 _sharesMinted) internal {
        require(_ethAmount > 0, ERROR_ZERO_VALUE);

        totalShares = totalShares.add(_sharesMinted);
        shares[msg.sender] = shares[msg.sender].add(_sharesMinted);
        ethPool = ethPool.add(_ethAmount);
        tokenPool = tokenPool.add(_tokenAmount);

        currentRatio = ethPool.mul(tokenPool);

        require(token.safeTransferFrom(msg.sender, address(this), _tokenAmount), ERROR_TOKEN_TRANSFER_FAILED);

        emit AddedToPool(msg.sender, _ethAmount, _tokenAmount);
    }

    function removeFromPool(uint256 _ethAmount) external {
        require(_ethAmount > 0, ERROR_ZERO_VALUE);
        uint256 sharesBurned = totalShares * _ethAmount / ethPool;
        require(sharesBurned <= shares[msg.sender], ERROR_NOT_ENOUGH_SHARES);

        uint256 tokenAmount = tokenPool * _ethAmount / ethPool;

        shares[msg.sender] -= sharesBurned;
        // TODO: no need for SafeMath
        totalShares = totalShares.sub(sharesBurned);
        shares[msg.sender] = shares[msg.sender].sub(sharesBurned);
        ethPool = ethPool.sub(_ethAmount);
        tokenPool = tokenPool.sub(tokenAmount);

        currentRatio = ethPool.mul(tokenPool);

        msg.sender.transfer(_ethAmount);
        require(token.safeTransfer(msg.sender, tokenAmount), ERROR_TOKEN_TRANSFER_FAILED);

        emit RemovedFromPool(msg.sender, _ethAmount, tokenAmount);
    }

    function sellTokens(uint256 _tokenAmount) external auth(SELL_ROLE) {
        require(_tokenAmount > 0, ERROR_ZERO_TOKENS);

        uint256 newTokenPool = tokenPool.add(_tokenAmount);
        uint256 newEthPool = currentRatio / newTokenPool;
        uint256 ethAmount = ethPool.sub(newEthPool);
        ethPool = newEthPool;

        // send ETH
        msg.sender.transfer(ethAmount);
        // get tokens
        require(token.safeTransferFrom(msg.sender, address(this), _tokenAmount), ERROR_TOKEN_TRANSFER_FAILED);

        emit SoldTokens(msg.sender, ethAmount, _tokenAmount);
    }

    function buyTokens(uint256 _tokenAmount) external payable auth(BUY_ROLE) {
        require(msg.value > 0, ERROR_ZERO_VALUE);
        require(_tokenAmount > 0, ERROR_ZERO_TOKENS);

        uint256 newTokenPool = tokenPool.sub(_tokenAmount);
        uint256 newEthPool = currentRatio / newTokenPool;
        uint256 ethAmount = newEthPool.sub(ethPool);
        uint256 extraEth = msg.value - ethAmount;
        require(extraEth >= 0, ERROR_NOT_ENOUGH_VALUE);
        ethPool = newEthPool;

        // send extra ETH back to sender
        if (extraEth > 0) {
            msg.sender.transfer(extraEth);
        }

        // transfer tokens
        require(token.safeTransfer(msg.sender, _tokenAmount), ERROR_TOKEN_TRANSFER_FAILED);

        emit BoughtTokens(msg.sender, msg.value, _tokenAmount);
    }

    /*
    function getCurrentRatio() internal returns (uint256) {
        uint256 ethPool = address(this).balance;
        uint256 tokenPool = token.balanceOf(address(this));

        return ethPool.mul(tokenPool);
    }
    */
}
