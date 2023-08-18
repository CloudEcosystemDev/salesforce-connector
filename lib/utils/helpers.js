/* eslint no-await-in-loop: "off" */
/* eslint consistent-return: "off" */

const request = require('request-promise').defaults({
  simple: false,
  resolveWithFullResponse: true,
});

const jsforce = require('jsforce');

const secretServiceApiEndpoint = process.env.SECRET_SERVICE_ENDPOINT || 'https://secret-service.openintegrationhub.com';

// async function lookupContact(msg, cfg) {
//   try {
//     return false;
//   } catch (e) {
//     console.error(e);
//   }
// }

async function deleteObject(msg, cfg, type) {
  try {
    const conn = new jsforce.Connection({
      instanceUrl: cfg.instanceUrl,
      accessToken: cfg.accessToken,
    });

    if (!msg.metadata || !msg.metadata.recordUid) {
      console.error('Tried to delete, but was not passed a recordUid!');
      return false;
    }

    const result = await conn.sobject(type).delete(msg.metadata.recordUid);

    let status = 'failed';
    if (result.success) status = 'confirmed';

    return {
      status,
      timestamp: Date.now(),
    };
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function upsertContact(msg, cfg) {
  try {
    const conn = new jsforce.Connection({
      instanceUrl: cfg.instanceUrl,
      accessToken: cfg.accessToken,
    });

    if (cfg.devMode) console.log(conn);

    let id = false;
    if (msg.metadata && msg.metadata.recordUid) {
      // id = await lookupContact(msg, cfg);
      id = msg.metadata.recordUid;
    }

    if (cfg.devMode) console.log(id);

    // extIdField - External ID field name
    // SObject.prototype.upsert = function(records, extIdField, options, callback)
    let result = false;
    if (id) {
      const newData = msg.data;
      newData.Id = id;
      result = await conn.sobject('Contact').update(msg.data);

      if (result === false) {
        delete newData.Id;
        result = await conn.sobject('Contact').insert(newData);
      }
    } else {
      result = await conn.sobject('Contact').insert(msg.data);
    }

    if (cfg.devMode) {
      console.log(typeof result);
      if (Array.isArray(result)) {
        console.log(result.length);
        console.log(result[0]);
      } else {
        console.log(JSON.stringify(result));
      }
    }

    if (result !== false) {
      const newMeta = msg.metadata;
      newMeta.recordUid = String(result.id ? result.id : result.Id);
      if (msg.metadata.oihUid) newMeta.oihUid = msg.metadata.oihUid;
      return { metadata: newMeta };
    }

    return false;
  } catch (e) {
    console.error(e);
    return {};
  }
}

async function getContacts(cfg, snapshot) {
  // , snapshot
  try {
    const conn = new jsforce.Connection({
      instanceUrl: cfg.instanceUrl,
      accessToken: cfg.accessToken,
    });

    if (cfg.devMode) console.log(conn);

    // const lastUpdated = new Date(snapshot.lastUpdated).toISOString();

    console.log('snapshot', snapshot);
    const salesforceDate = jsforce.SfDate.toDateTimeLiteral(new Date(snapshot.lastUpdated));
    if (cfg.devMode) console.log('salesforceDate', salesforceDate);

    const result = await conn
      .sobject('Contact')
      .find({
        LastModifiedDate: { $gte: salesforceDate },
      })
      .sort({ CreatedDate: -1 })
      .limit(10000)
      .execute();

    if (cfg.devMode) {
      console.log(typeof result);
      if (Array.isArray(result)) {
        console.log(result.length);
        console.log(result[0]);
      } else {
        console.log(JSON.stringify(result));
      }
    }

    if (result) return result;

    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function upsertOrganization(msg, cfg) {
  try {
    const conn = new jsforce.Connection({
      instanceUrl: cfg.instanceUrl,
      accessToken: cfg.accessToken,
    });

    if (cfg.devMode) console.log(conn);

    let id = false;
    if (msg.metadata && msg.metadata.recordUid) {
      // id = await lookupContact(msg, cfg);
      id = msg.metadata.recordUid;
    }

    if (cfg.devMode) console.log(id);

    // extIdField - External ID field name
    // SObject.prototype.upsert = function(records, extIdField, options, callback)
    let result = false;
    if (id) {
      const newData = msg.data;
      newData.Id = id;
      result = await conn.sobject('Account').update(msg.data);

      if (result === false) {
        delete newData.Id;
        result = await conn.sobject('Account').insert(newData);
      }
    } else {
      result = await conn.sobject('Account').insert(msg.data);
    }

    if (cfg.devMode) {
      console.log(typeof result);
      if (Array.isArray(result)) {
        console.log(result.length);
        console.log(result[0]);
      } else {
        console.log(JSON.stringify(result));
      }
    }

    if (result !== false) {
      const newMeta = msg.metadata;
      newMeta.recordUid = String(result.id ? result.id : result.Id);
      return { metadata: newMeta };
    }

    return false;
  } catch (e) {
    console.error(e);
    return {};
  }
}

async function getOrganizations(cfg, snapshot) {
  // , snapshot
  try {
    const conn = new jsforce.Connection({
      instanceUrl: cfg.instanceUrl,
      accessToken: cfg.accessToken,
    });

    if (cfg.devMode) console.log(conn);

    // const lastUpdated = new Date(snapshot.lastUpdated).toISOString();

    console.log('snapshot', snapshot);
    const salesforceDate = jsforce.SfDate.toDateTimeLiteral(new Date(snapshot.lastUpdated));
    if (cfg.devMode) console.log('salesforceDate', salesforceDate);

    const result = await conn
      .sobject('Account')
      .find({
        LastModifiedDate: { $gte: salesforceDate },
      })
      .sort({ CreatedDate: -1 })
      .limit(10000)
      .execute();

    if (cfg.devMode) {
      console.log(typeof result);
      if (Array.isArray(result)) {
        console.log(result.length);
        console.log(result[0]);
      } else {
        console.log(JSON.stringify(result));
      }
    }

    if (result) return result;

    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function getAccessToken(config) {
  try {
    if (config.accessToken) {
      return config.accessToken;
    }

    const response = await request({
      method: 'GET',
      uri: `${secretServiceApiEndpoint}/secrets/${config.secret}`,
      headers: {
        'x-auth-type': 'basic',
        authorization: `Bearer ${config.iamToken}`,
      },
      json: true,
    });

    const { value } = response.body;
    return value.accessToken;
  } catch (e) {
    console.log(e);
    return e;
  }
}

module.exports = {
  upsertContact,
  getContacts,
  upsertOrganization,
  getOrganizations,
  getAccessToken,
  secretServiceApiEndpoint,
  deleteObject,
};
