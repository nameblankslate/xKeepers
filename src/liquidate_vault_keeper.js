const xbacked = require('@xbacked-dao/xbacked-sdk');

const { getAlgoPrice, getVaultState, computeVaultHealth, runKeeper } = require('./utils/utils');
const { readOpenVaultAddresses, readOpenVaultDataBatch } = require('./utils/db');
const { connectWallet, getVault } = require('./utils/setup');

const keeperAccount = connectWallet()
const vault = getVault()

// define the maximum debt to pay (paying the debt pays xUSD to liquidate
// the "unhealthy" account)
const MAX_DEBT_TO_LIQUIDATE_PAYMENT = parseInt(process.env.MAX_DEBT_TO_LIQUIDATE_PAYMENT) || 10;

// find the maximum amount of collateral that can be liquidated
async function findMaxLiquidation(keeperAccount, vault, address, algoPrice, vaultState) {

  // get the current data of the address-vault
  const addressVault = await vault.getUserInfo({ account: keeperAccount, address: address });

  console.log(addressVault);

  // calculate the current collateral ratio based on the price of ALGO
  let colRatio = xbacked.calcCollateralRatio(addressVault.collateral, xbacked.convertToMicroUnits(algoPrice), addressVault.vaultDebt);
  const colRatioToMicro = xbacked.convertToMicroUnits(colRatio);
  console.log(`Storred collateral ratio: ${xbacked.convertFromMicroUnits(addressVault.collateralRatio)} (${addressVault.collateralRatio}) - liquidating: ${addressVault.liquidating}`);

  // double-check that the vault can be liquidated
  if (colRatioToMicro < vaultState.liquidationCollateralRatio || addressVault.liquidating) {
    console.log(`\x1b[31mCurrent collateral ratio: ${colRatio} (${colRatioToMicro}) -- LIQUIDATE\x1b[0m`);

    let maxDebtPayout = xbacked.calcMaxDebtPayout(addressVault.collateral, xbacked.convertToMicroUnits(algoPrice), addressVault.vaultDebt);
    console.log(`maxDebtPayout: ${maxDebtPayout} (${xbacked.convertFromMicroUnits(maxDebtPayout)} xUSD)`);
    let ratioAfterLiquidation = xbacked.calcCollateralRatioAfterLiquidation(addressVault.collateral, xbacked.convertToMicroUnits(algoPrice), maxDebtPayout, addressVault.vaultDebt)
    console.log('ratioAfterLiquidation', ratioAfterLiquidation);
    return xbacked.convertFromMicroUnits(maxDebtPayout);

  } else {
    console.log(`Current collateral ratio: ${colRatio} (${colRatioToMicro})`);
    return 0;
  }
}

// The amount of profit from the liquidation will depend on whether the keeper
// supplies the own xUSD to liquidate the vault or whether the keeper uses
// stacked xUSD to liquidate the vault.
// Read more on the LightPaper - https://docs.xbacked.io/
async function liquidateVault(keeperAccount, vault, address, debt) {

  console.log(`Liquidating ${debt} xUSD from address ${address} for vault ${vault}`);

  try {
    const success = await keeperAccount.liquidateVault({
      address: address,
      debtAmount: debt,
      dripInterest: false,
      vault: vault,
    });
    if (success) {
      console.log(`Successful liquidation of ${debt} xUSD from address ${address}`);
    } else {
      console.log(`Liquidating ${debt} xUSD from address ${address} FAILED`);
    }
  } catch (err) {
    console.error(`ERROR; liquidating ${debt} xUSD from address ${address}`);
    console.error(err);
  }
}

async function liquidationKeeper(keeperAccount, vault) {

  const algoPrice = await getAlgoPrice();
  const vaultState = await getVaultState(keeperAccount, vault);

  // read stored data
  const openVaultAddresses = await readOpenVaultAddresses();
  const allOpenVaultData = await readOpenVaultDataBatch(openVaultAddresses);
  const vaultHealth = computeVaultHealth(allOpenVaultData, algoPrice);

  // Choose an address that is in the range [1.0, 1.2) to liquidate;
  // accounts that have less than 1.0 have less collateral than the
  // amount xUSD they have borrowed so `maxDebtPayout` does not give
  // a correct number and the whole debt shouldn't be payed as you might
  // end up being at a loss

  // Keep only accounts in the range [1.0, 1.2)
  vaultHealth.forEach((value, key, map) => {
    if (key < 1.0 || key >= 1.2) {
      map.delete(key);
    }
  });

  // get the first value which is the address closer to 1.0
  const [address] = vaultHealth.values();
  const maxPossibleLiquidation = await findMaxLiquidation(keeperAccount, vault, address, algoPrice, vaultState);

  // choose the max debt to liquidate
  const debtToLiquidate = Math.min(maxPossibleLiquidation, MAX_DEBT_TO_LIQUIDATE_PAYMENT);

  await liquidateVault(keeperAccount, vault, address, debtToLiquidate);
}

async function runLiquidationKeeper(keeperAccount, vault) {
  await runKeeper(liquidationKeeper, keeperAccount, vault);
}

runLiquidationKeeper(keeperAccount, vault)
  .then(() => { console.log('Keeper Finished Running') })
  .catch(err => {
    console.log(`Keeper encountered error: ${err}`)
    process.exit(1);
  });
