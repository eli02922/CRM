const axios = require('axios');

const BASE = 'https://api.hubapi.com';

let client;

function init(cfg) {
  client = axios.create({
    baseURL: cfg.baseUrl || BASE,
    headers: { Authorization: `Bearer ${cfg.token}` },
    timeout: 15000,
  });
  return client;
}

async function listContacts(after) {
  const params = { limit: 100, properties: 'firstname,lastname,email,phone,company,hs_object_id' };
  if (after) params.after = after;
  const { data } = await client.get('/crm/v3/objects/contacts', { params });
  return data;
}

async function listDeals(after) {
  const params = { limit: 100, properties: 'dealname,amount,dealstage,closedate,hs_object_id' };
  if (after) params.after = after;
  const { data } = await client.get('/crm/v3/objects/deals', { params });
  return data;
}

async function createContact(properties) {
  const { data } = await client.post('/crm/v3/objects/contacts', { properties });
  return data;
}

async function updateContact(id, properties) {
  const { data } = await client.patch(`/crm/v3/objects/contacts/${id}`, { properties });
  return data;
}

async function searchContactsByEmail(email) {
  const { data } = await client.post('/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
    properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'hs_object_id'],
  });
  return data;
}

async function createDeal(properties) {
  const { data } = await client.post('/crm/v3/objects/deals', { properties });
  return data;
}

async function updateDeal(id, properties) {
  const { data } = await client.patch(`/crm/v3/objects/deals/${id}`, { properties });
  return data;
}

async function searchDealsByName(name) {
  const { data } = await client.post('/crm/v3/objects/deals/search', {
    filterGroups: [{ filters: [{ propertyName: 'dealname', operator: 'EQ', value: name }] }],
    properties: ['dealname', 'amount', 'dealstage', 'closedate', 'hs_object_id'],
  });
  return data;
}

// Field mapping between the CRM's normalized shape and HubSpot's property names.
const fieldMap = {
  contact: {
    companyName: 'company',
    email: 'email',
    phone: 'phone',
    firstName: 'firstname',
    lastName: 'lastname',
  },
  deal: {
    name: 'dealname',
    amount: 'amount',
    closeDate: 'closedate',
  },
};

module.exports = {
  init,
  listContacts,
  listDeals,
  createContact,
  updateContact,
  searchContactsByEmail,
  createDeal,
  updateDeal,
  searchDealsByName,
  fieldMap,
};
