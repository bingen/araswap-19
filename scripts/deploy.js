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

const errorOut = (msg) => {
  console.error(msg)
  throw new Error(msg)
}

async function deploy() {
  const owner = process.env.OWNER
  const user = '0x3e22CD876Aa4f350598688Ee3430ce63D60eF5c0'
  console.log(`Deploying Araswap, Owner ${owner}, User ${user}`)

  if (process.argv.length < 5) {
    errorOut('Usage: truffle exec --network <network> scripts/deploy.js')
  }
  // get network
  const network = process.argv[4]

  let APP_MANAGER_ROLE, POOL_ROLE, BUY_ROLE, SELL_ROLE
  let daoFact, appBase, app

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

  const daoReceipt = await daoFact.newDAO(owner)
  const dao = Kernel.at(
    daoReceipt.logs.filter(l => l.event === 'DeployDAO')[0].args.dao
  )
  const acl = ACL.at(await dao.acl())

  await acl.createPermission(
    owner,
    dao.address,
    APP_MANAGER_ROLE,
    owner,
    {
      from: owner,
    }
  )

  const receipt = await dao.newAppInstance(
    '0x1234',
    appBase.address,
    '0x',
    false,
    { from: owner }
  )

  app = Araswap.at(
    receipt.logs.filter(l => l.event === 'NewAppProxy')[0].args.proxy
  )

  await acl.createPermission(
    ANY_ADDRESS,
    app.address,
    POOL_ROLE,
    owner,
    {
      from: owner,
    }
  )
  await acl.createPermission(
    ANY_ADDRESS,
    app.address,
    BUY_ROLE,
    owner,
    {
      from: owner,
    }
  )
  await acl.createPermission(
    ANY_ADDRESS,
    app.address,
    SELL_ROLE,
    owner,
    {
      from: owner,
    }
  )

  // app init
  const ethAmount = web3.toWei(1)
  const tokenAmount = web3.toWei(1000)
  const hugeTokenAmount = web3.toWei(10**9)
  const token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime
  await app.initialize(token.address)
  await token.generateTokens(owner, tokenAmount)
  await token.approve(app.address, tokenAmount, { from: owner })
  await app.setInitialPool(tokenAmount, { from: owner, value: ethAmount })

  // user
  /*
  console.log({ to: user, from: owner, value: 5 })
  web3.eth.getAccounts(function(error, accounts) {
    if (error) {
      console.log(error);
    }
    console.log(accounts);
  })
  */
  await web3.eth.sendTransaction({ to: user, from: owner, value: 5e9, gasPrice: 20e9 })
  await token.generateTokens(user, hugeTokenAmount)
  //await token.approve(app.address, hugeTokenAmount, { from: user })

  console.log(`App deployed at ${app.address}`);
}

module.exports = callback => {
  deploy().then(() => callback()).catch(err => callback(err))
}
