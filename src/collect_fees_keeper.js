const { getVaultState, runKeeper } = require('./utils/utils');
const { connectWallet, getVault } = require('./utils/setup');

const keeperAccount = connectWallet()
const vault = getVault()

// select a value that makes it worthwhile to collect the fees based
// on your goals
const ACCRUED_FEES_COLLECTION_THRESHOLD = parseInt(process.env.ACCRUED_FEES_COLLECTION_THRESHOLD) || 100000;

// function to call the contract's collect fees to collect the `accruedFees`
async function collectFees(keeperAccount, vault) {

  vaultState = await getVaultState(keeperAccount, vault);
  // console.debug(vaultState);

  if (vaultState.accruedFees > ACCRUED_FEES_COLLECTION_THRESHOLD) {

    console.log(`Collecting fees ${vaultState.accruedFees} for vault`)

    try {
      const success = await keeperAccount.collectFees({
        vault: vault,
      });
      if (success) {
        console.log(`Collect fees for vault was successful`);
      } else {
        console.log(`Collect fees for vault FAILED`);
      }
    } catch (err) {
      console.error(`ERROR; while collecting fees for vault`);
      console.error(err);
    }
  } else {
    console.log(`Currend accrued fees ${vaultState.accruedFees} are below the threshold ${ACCRUED_FEES_COLLECTION_THRESHOLD}`);
  }
}

async function collectFeesKeeper(keeperAccount, vault) {
  await collectFees(keeperAccount, vault);
}

async function runCollectFeesKeeper(keeperAccount, vault) {
  await runKeeper(collectFeesKeeper, keeperAccount, vault);
}

runCollectFeesKeeper(keeperAccount, vault)
  .then(() => { console.log('Keeper Finished Running') })
  .catch(err => {
    console.log(`Keeper encountered error: ${err}`)
    process.exit(1);
  });
