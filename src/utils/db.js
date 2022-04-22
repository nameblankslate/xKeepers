// helper function to store and retrieve data to and from a MongoDB
const { MongoClient } = require("mongodb");

const DB_USERNAME = process.env.DB_USERNAME || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';

let uri;

if (process.env.DEVELOPMENT_FLAG === 'true') {
  uri = `mongodb://${DB_USERNAME}:${DB_PASSWORD}@localhost:7070/`
} else {
  uri = `mongodb://${DB_USERNAME}:${DB_PASSWORD}@mongodb:27017/`
}

const client = new MongoClient(uri);

// replace the currently existing open-vault addresses in the DB with new ones
module.exports.storeOpenVaultAddresses = async function (openVaultAddresses) {
  try {
    await client.connect();

    const database = client.db('xbacked_data');
    const coll = database.collection('addresses');
    const success = await coll.replaceOne({},
      {
        'openVaultAddresses': openVaultAddresses
      },
      {
        upsert: true
      }
    );

    if (success) {
      console.log('Replaced open-vault addresses in the DB');
    } else {
      console.log('FAILED to replaced open-vault addresses in the DB');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}
module.exports.readOpenVaultAddresses = async function () {

  try {
    await client.connect();

    const database = client.db('xbacked_data');
    const coll = database.collection('addresses');
    const addresses = await coll.findOne({});

    return addresses["openVaultAddresses"];
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

// store multiple open-vault data
module.exports.storeOpenVaultDataBatch = async function (vaultData) {

  for (vd of vaultData) {
    await module.exports.storeOpenVaultData(vd["address"], vd);
  }
}

// store open-vault for a specific address
module.exports.storeOpenVaultData = async function (vaultAddress, vaultData) {
  try {
    await client.connect();

    const database = client.db('xbacked_data');
    const coll = database.collection('vaults');
    const success = await coll.replaceOne({
      "address": vaultAddress
    }, vaultData, { upsert: true });

    if (!success) {
      console.log('FAILED to replaced vault data in the DB');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

// read multiple open-vault data
module.exports.readOpenVaultDataBatch = async function (openVaultAddresses) {

  allOpenVaultData = [];
  for (ova of openVaultAddresses) {
    allOpenVaultData.push(await module.exports.readOpenVaultData(ova));
  }

  return allOpenVaultData;
}

// read open-vault data for a specific address
module.exports.readOpenVaultData = async function (vaultAddress) {
  try {
    await client.connect();

    const database = client.db('xbacked_data');
    const coll = database.collection('vaults');
    const vaultData = await coll.findOne({ "address": vaultAddress });

    return vaultData
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

// store blockchain state
module.exports.storeState = async function (state) {
  try {
    await client.connect();

    const database = client.db('xbacked_data');
    const coll = database.collection('state');
    const success = await coll.replaceOne({},
      {
        'state': state
      },
      {
        upsert: true
      }
    );

    if (success) {
      console.log('Replaced current state in the DB');
    } else {
      console.log('FAILED to replaced current state in the DB');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

// read stored blockchain state
module.exports.readState = async function () {
  try {
    await client.connect();

    const database = client.db('xbacked_data');
    const coll = database.collection('state');
    const state = await coll.findOne({});

    return state['state']
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}
