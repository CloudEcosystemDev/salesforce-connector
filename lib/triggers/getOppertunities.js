/* eslint no-param-reassign: "off" */

const { getOppertunities, getAccessToken } = require('./../utils/helpers');

/**
 * This method will be called from OIH platform providing following data
 *
 * @param {Object} msg - incoming message object that contains ``body`` with payload
 * @param {Object} cfg - configuration that is account information and configuration field values
 */
async function processAction(msg, cfg, snapshot = {}) {
  try {
    cfg.accessToken = await getAccessToken(cfg);

    if (!cfg || !cfg.accessToken) {
      throw new Error('No access token!');
    }

    if (cfg.devMode) console.log('Fetching snapshot');

    snapshot.lastUpdated = new Date(snapshot.lastUpdated).getTime() || new Date(0).getTime();

    if (cfg.devMode) console.log(snapshot);

    // First get organizations

    const accounts = await getOppertunities(cfg, snapshot);

    if (cfg.devMode) console.log('accounts', JSON.stringify(accounts));

    const { length } = accounts;
    for (let i = 0; i < length; i += 1) {
      const updatedAt = new Date(accounts[i].LastModifiedDate).getTime();
      if (updatedAt > snapshot.lastUpdated) snapshot.lastUpdated = updatedAt;

      this.emit('data', accounts[i]);
    }

    // Second get persons (including reference to organization)

    this.emit('snapshot', snapshot);
  } catch (e) {
    console.error('ERROR: ', e);
    this.emit('error', e);
  }
}

module.exports = {
  process: processAction,
};
