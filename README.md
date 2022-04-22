# xKeepers

This repository contains a collection of keepers for the [xBacked](https://www.xbacked.io/) protocol.

The repository currently contains the following keepers:
- `stateKeeper`: gets and stores the current state of the open vaults and the price of ALGO in USD
- `settleInterestKeeper`: distributes the accrued interest from the vault
- `colectFeesKeeper`: distributes the accrued fees from the vault
- `liquidateKeeper`: liquidates and amount of the collateral from the account closer to 1.0 health
- `proposeRedemptionKeeper`: proposes the two lowest health accounts for redemption
- `redemptionKeeper`: redeems a specified amount of xUSD from the vault

**NOTE:** Bots currently work for the Algo vault in TestNet.

## Disclaimer

**Warning**: This repository contains experimental source code and is meant to be used with the Algorand TestNet. **Is is meant to be used for educational purposes only.** It does not provide any financial advice or be used for any financial incentive. We are not financial advisors. We do not have any liability for any result of using the code provided in this repository and all the subdirectories.

**Do NOT run it on the Algorand MainNet. You will be risking your capital.**

## Using the xKeepers

Specify an wallet mnemonic phrase for the Algorand network as an environment variable `ALGO_WALLET_SEED_PHRASE` (or in the `docker-compose.yml` - you might accidentally share it that way though)

You can either run the keepers directly with <code>node src/*keeper_name*</code> or with docker.

### Running Docker Containers

The first step is to create the Docker image with `docker-compose build`. Currently there is one image that contains all the keepers and the image is running the `stateKeeper` by default.

**You should run the `state_keeper` and `mongodb` first for a while to fill the DB with data.**

If it is the first time you are using the xKeepers then it's better to run `docker-compose up -d mongodb stateKeeper` to start the MongoDB database container (used to store the data from the blockchain) and the `stateKeeper` which is fetching and storing data from the blockchain to the DB. **Note:** The database should be initialised first. MongoDB creates a database when a [new document is inserted](https://www.digitalocean.com/community/tutorials/how-to-use-the-mongodb-shell#step-2-executing-commands).

To run all the keepers use `docker-compose up -d`. And to run only one specific keeper use <code>docker-compose up -d *keeper_name*</code> and make sure the MongoDB container is running as well. It's better to always have the `stateKeeper` running to update the state continously.

Each keeper accepts a different set of parameters as environment variables and it's better to define the values for these environemnt variables in the `docker-compose.yml` file. If you update the parameters you need to (re-)start the keeper by using <code>docker-compose up -d *keeper_name*</code>.

There are currenlty two ways of using the price of ALGO for the calculations.
 - set the `CMC_API_KEY` environment variable with an API key from CoinmarketCap
 - or set the `DEFAULT_ALGO_USD_PRICE` variable to a specific number (useful for dev and testing to avoid making too many requests)
 - to reduce the number of requests you can set the `CMC_API_KEY` for the `stateKeeper` and change the other keepers to fetch the price from the DB

## xKeeper Parameters

List of the xKeeper parameters that can be set in the `docker-compose.yml` file.

- General Parameters for all the keepers:
    - `LOOP`: if set to true then the keepers will run repeatedly in a loop (false by default)
    - `FREQUENCY`: int that specifies the amount of time the keepers will wait between two executions (default to 100 seconds) - each process will take a while to finish executing and this should be accounted in the `FREQUENCY` variable

- `collect_fees_keeper`: calls the `Account.collectFees()` that calls the contract function to collect the accrued fees.
    - `ACCRUED_FEES_COLLECTION_THRESHOLD`: Threshold in Algos after which the keeper calls the `Account.collectFees()` function.

- `liquidate_vault_keeper`: calls the `calcMaxDebtPayout()` function to find the maximum possible amount to liquidate and calls the `Account.liquidateVault()` to liquidate some amount of the vault's collateral.
    - `MAX_DEBT_TO_LIQUIDATE_PAYMENT`: Maximum amount of Algos to liquidate **for each iteration/time the keeper is called**.

- `propose_redemption_vault_keeper`: calls the `Account.proposeVaultForRedemption()` function to propose a new vault to be up for redemption.

- `redemption_keeper`: calls the `Account.redeemVault()` to redeem an amount of `amountToRedeem` xUSD to redeem from the two vaults that are up for redemption.
    - `AMOUNT_TO_REDEEM`: Number of xUSD to redeem **in each iteration** of the keeper.

- `settle_interest_keeper`: calls `Account.settleInterest()` to distribute the `accruedInterest`.
    - `ACCRUED_INTEREST_COLLECTION_THRESHOLD`: Threshold in Algos that the vault should have accrued after which the function is called (type `int`).

- `state_keeper`: fetches and update the current state of the database
    - `DISPLAY_DATA`: Show the vault data after fetching all the vault data. (`true`/`false` - default: `false`)

## Design

Each keeper is implemented in a separate file and shared functions are under the `src/utils/` directory. Each keeper runs one main funciton. The `state_keeper` is responsible for fetching data from the blockchain and storing them in a MongoDB. Each other keeper reads the relevant data from the DB. Some keepers fetch the Algo price estimate from Coinmarketcap and some keepers also use the vault state data.

## Limitations

Currently, fetching data from the blockchain depends on running REST API calls to a remote server and there is considerable delay. To massively improve the speed of fetching the data from the blockchain, the system will benefit of running an Algorand node and indexer on a dedicated server, just for fetching data to the keepers.

## Improving the Keepers

The implementation of each keeper can be improved and it's a good exercise.

Some ideas are:
- Improve the keepers with more useful decision making algorithms. Each keeper can be improved separately and there is no interference among the keepers.
- Better updates based on events emitted from the blockchain. You can use the `Account.subscribeToEvents()` to subscribe to events and update the DB only when the state changes.
- Writing in the DB the vault state one-by-one when the data is retrived. Can improve concurrency.
- When liquidity pools launch on a TestNet DEX (like Tinyman), an integration with an SDK can help to improve the decision making of the keepers.
