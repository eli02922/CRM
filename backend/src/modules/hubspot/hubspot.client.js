const axios = require('axios');
const env = require('../../config/env');

const BASE = 'https://api.hubapi.com';

const client = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${env.hubspotToken}` },
  timeout: 15000,
});

async function getContacts(after) {
  const params = { limit: 100, properties: 'firstname,lastname,email,phone,company,hs_object_id' };
  if (after) params.after = after;
  const { data } = await client.get('/crm/v3/objects/contacts', { params });
  return data;
}

async function getDeals(after) {
  const params = { limit: 100, properties: 'dealname,amount,dealstage,closedate,hs_object_id' };
  if (after) params.after = after;
  const { data } = await client.get('/crm/v3/objects/deals', { params });
  return data;
}

async function createContact(properties) {
  const { data } = await client.post('/crm/v3/objects/contacts', { properties });
  return data;
}

async function updateContact(hsId, properties) {
  const { data } = await client.patch(`/crm/v3/objects/contacts/${hsId}`, { properties });
  return data;
}

async function searchContactsByEmail(email) {
  const { data } = await client.post('/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
    properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'hs_object_id'],
  });
  return data;
}

module.exports = { getContacts, getDeals, createContact, updateContact, searchContactsByEmail };
