const { getAlgoPrice, computeVaultHealth, runKeeper } = require('./utils/utils');
const { readOpenVaultAddresses, readOpenVaultDataBatch } = require('./utils/db');
const { connectWallet, getVault } = require('./utils/setup');

const keeperAccount = connectWallet()
const vault = getVault()

// Propose risky vaults to the contract. The two riskiest vaults will be up
// for redemption. If the vaults are riskier than the currently risky vaults
// then the keeper is awarded 0.75% of the collateral.
// Source: LightPaper - https://docs.xbacked.io/
async function proposeVaultForRedemption(keeperAccount, vault, address) {

  console.log(`Proposing vault of address ${address} for vault to be a candidate for redemption`)

  try {
    const success = await keeperAccount.proposeVaultForRedemption({
      address: address,
      vault: vault,
    });
    if (success) {
      console.log('Proposing a new address for a redemption candidate was successful');
    } else {
      console.log('Proposing a new address for a redemption candidate FAILED');
    }
  } catch (err) {
    console.error(`ERROR; while proposing ${address} to be a candidate for redemption from vault`);
    console.error(err);
  }
}

async function proposeRedemptionKeeper(keeperAccount, vault) {

  const algoPrice = await getAlgoPrice();

  // read stored data
  const openVaultAddresses = await readOpenVaultAddresses();
  const allOpenVaultData = await readOpenVaultDataBatch(openVaultAddresses);
  const vaultHealth = computeVaultHealth(allOpenVaultData, algoPrice);
  // console.log(vaultHealth);

  // iterator over the values in the Map
  const it = vaultHealth.values();

  // propose the two vaults with the lowest vault health rate
  // to be up for redemption
  await proposeVaultForRedemption(keeperAccount, vault, it.next().value);
  await proposeVaultForRedemption(keeperAccount, vault, it.next().value);
}

async function runProposeRedemptionKeeper(keeperAccount, vault) {

  await runKeeper(proposeRedemptionKeeper, keeperAccount, vault);
}

proposeRedemptionKeeper(keeperAccount, vault)
  .then(() => { console.log('Keeper Finished Running') })
  .catch(err => {
    console.log(`Keeper encountered error: ${err}`)
    process.exit(1);
  });
