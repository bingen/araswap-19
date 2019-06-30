/* global artifacts contract before beforeEach it assert */
const getBalance = require('@aragon/test-helpers/balance')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const Araswap = artifacts.require('Araswap.sol')
const DAOFactory = artifacts.require(
  '@aragon/core/contracts/factory/DAOFactory'
)
const EVMScriptRegistryFactory = artifacts.require(
  '@aragon/core/contracts/factory/EVMScriptRegistryFactory'
)
const ACL = artifacts.require('@aragon/core/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/core/contracts/kernel/Kernel')
const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/contracts/MiniMeToken')

const getContract = name => artifacts.require(name)

const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Araswap', accounts => {
  let APP_MANAGER_ROLE, POOL_ROLE, BUY_ROLE, SELL_ROLE
  let daoFact, appBase, app

  const firstAccount = accounts[0]
  const secondAccount = accounts[1]

  const ERROR_TOKEN_TRANSFER_FAILED = 'ARASWAP_TOKEN_TRANSFER_FAILED'

  before(async () => {
    const kernelBase = await getContract('Kernel').new(true) // petrify immediately
    const aclBase = await getContract('ACL').new()
    const regFact = await EVMScriptRegistryFactory.new()
    daoFact = await DAOFactory.new(
      kernelBase.address,
      aclBase.address,
      regFact.address
    )
    appBase = await Araswap.new()

    // Setup constants
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    POOL_ROLE = await appBase.POOL_ROLE()
    BUY_ROLE = await appBase.BUY_ROLE()
    SELL_ROLE = await appBase.SELL_ROLE()
  })

  beforeEach(async () => {
    const daoReceipt = await daoFact.newDAO(firstAccount)
    const dao = Kernel.at(
      daoReceipt.logs.filter(l => l.event === 'DeployDAO')[0].args.dao
    )
    const acl = ACL.at(await dao.acl())

    await acl.createPermission(
      firstAccount,
      dao.address,
      APP_MANAGER_ROLE,
      firstAccount,
      {
        from: firstAccount,
      }
    )

    const receipt = await dao.newAppInstance(
      '0x1234',
      appBase.address,
      '0x',
      false,
      { from: firstAccount }
    )

    app = Araswap.at(
      receipt.logs.filter(l => l.event === 'NewAppProxy')[0].args.proxy
    )

    await acl.createPermission(
      ANY_ADDRESS,
      app.address,
      POOL_ROLE,
      firstAccount,
      {
        from: firstAccount,
      }
    )
    await acl.createPermission(
      ANY_ADDRESS,
      app.address,
      BUY_ROLE,
      firstAccount,
      {
        from: firstAccount,
      }
    )
    await acl.createPermission(
      ANY_ADDRESS,
      app.address,
      SELL_ROLE,
      firstAccount,
      {
        from: firstAccount,
      }
    )
  })

  context('App intialized', () => {
    let token
    beforeEach(async () => {
      const ethAmount = 1
      const tokenAmount = 1000
      token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime
      await app.initialize(token.address)
      await token.generateTokens(firstAccount, tokenAmount)
      await token.approve(app.address, tokenAmount, { from: firstAccount })
      await app.setInitialPool(tokenAmount, { from: firstAccount, value: ethAmount })
    })

    const getPool = async () => {
      const ethPool = (await app.ethPool()).toNumber()
      const tokenPool = (await app.tokenPool()).toNumber()
      return {
        ethPool: ethPool,
        tokenPool: tokenPool
      }
    }
    const addToPool = async (ethAmount) => {
      const { ethPool: initialEthPool, tokenPool: initialTokenPool } = await getPool()
      const tokenAmount = initialTokenPool * ethAmount / initialEthPool
      await token.generateTokens(firstAccount, tokenAmount)
      await token.approve(app.address, tokenAmount, { from: firstAccount })
      await app.addToPool({ from: firstAccount, value: ethAmount })
      return {
        initialEthPool: initialEthPool,
        initialTokenPool: initialTokenPool,
        tokenAmount: tokenAmount
      }
    }
    const getBalances = async (account) => {
      const ethBalance = (await getBalance(account)).toNumber()
      const tokenBalance = (await token.balanceOf(account)).toNumber()
      return {
        ethBalance: ethBalance,
        tokenBalance: tokenBalance
      }
    }

    it('adds to pool', async () => {
      const ethAmount = 1

      console.log(app.address);
      const { initialEthPool, initialTokenPool, tokenAmount } = await addToPool(ethAmount)
      console.log(initialEthPool);
      console.log(initialTokenPool);
      console.log(tokenAmount);
      assert.equal((await app.ethPool()).toNumber(), initialEthPool + ethAmount)
      assert.equal((await app.tokenPool()).toNumber(), initialTokenPool + tokenAmount)
    })

    it('fails adding to pool if can not transfer tokens', async () => {
      const ethAmount = 1
      return assertRevert(async () => {
        await app.addToPool({ from: firstAccount, value: ethAmount }),
        ERROR_TOKEN_TRANSFER_FAILED
      })
    })

    it('withdraws from pool', async () => {
      const ethAmount = 1
      const { tokenAmount } = await addToPool(ethAmount)
      const { ethPool: initialEthPool, tokenPool: initialTokenPool } = await getPool()
      const { ethBalance: initialEthBalance, tokenBalance: initialTokenBalance } = await getBalances(firstAccount)
      await app.removeFromPool(ethAmount, { from: firstAccount })
      assert.equal((await app.ethPool()).toNumber(), initialEthPool - ethAmount)
      assert.equal((await app.tokenPool()).toNumber(), initialTokenPool - tokenAmount)
      const { ethBalance: finalEthBalance, tokenBalance: finalTokenBalance } = await getBalances(firstAccount)
      assert.equal(finalTokenBalance, initialTokenBalance + tokenAmount)
      // TODO: account for gas
      //assert.equal(finalEthBalance, initialEthBalance + ethAmount)
    })
  })
})
