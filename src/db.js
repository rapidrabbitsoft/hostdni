import Dexie from 'dexie';

// Create a new database instance
export const db = new Dexie('HostDNIDatabase');

// Define the database schema
db.version(3).stores({
  // Store for source list URLs
  sourceList: '++id, url, addedAt',
  
  // Store for block domains from fetched URLs
  domainsBlock: '++id, domain, sourceUrl, addedAt',
  
  // Store for manual block list entries
  manualBlockList: '++id, domain, enabled, addedAt',
  
  // Store for manual block list states (enabled/disabled)
  manualBlockStates: 'domain, enabled',
  
  // Store for custom source lists
  customSourceLists: '++id, name, url, addedAt',
  
  // Store for master host block list
  masterHostBlockList: '++id, domain, addedAt',
  
  // Store for allow list URLs
  sourceList2: '++id, url, addedAt',
  
  // Store for allow domains
  domainsAllow: '++id, domain, sourceUrl, addedAt',
  
  // Store for manual allow list entries
  manualAllowList: '++id, domain, enabled, addedAt',
  
  // Store for manual allow list states
  manualAllowStates: 'domain, enabled',
  
  // Store for custom entries (IP-hostname pairs)
  defaultEntries: '++id, ip, domain, enabled, addedAt',
  
  // Store for custom entry states
  customEntryStates: 'entryId, enabled',
  
  // Store for default allow list states
  defaultAllowStates: 'index, enabled',
  
  // Store for source URL states
  sourceUrlStates: 'url, enabled',
  
  // Store for hosts file entries with order preservation
  hostEntries: 'id, ip, hostname, enabled, orderIndex',
  
  // Store for metadata (timestamps, etc.)
  metadata: 'key, value'
}).upgrade(tx => {
  console.log('Upgrading database to version 3...');
  // Clear any existing hostEntries that might not have orderIndex
  return tx.table('hostEntries').clear();
});

// Helper functions for common operations
export const dbHelpers = {
  // Source List operations
  async addSourceUrl(url) {
    return await db.sourceList.add({
      url,
      addedAt: new Date().toISOString()
    });
  },

  async getSourceUrls() {
    const entries = await db.sourceList.toArray();
    return entries.map(entry => entry.url);
  },

  async deleteSourceUrl(id) {
    return await db.sourceList.delete(id);
  },

  // Source URL States operations
  async getSourceUrlStates() {
    const entries = await db.sourceUrlStates.toArray();
    const states = {};
    entries.forEach(entry => {
      states[entry.url] = entry.enabled;
    });
    return states;
  },

  async updateSourceUrlState(url, enabled) {
    return await db.sourceUrlStates.put({
      url,
      enabled
    });
  },

  // Domains Block operations
  async addDomains(domains, sourceUrl) {
    const entries = domains.map(domain => ({
      domain,
      sourceUrl,
      addedAt: new Date().toISOString()
    }));
    return await db.domainsBlock.bulkAdd(entries);
  },

  async getDomains() {
    const entries = await db.domainsBlock.toArray();
    return entries.map(entry => entry.domain);
  },

  async clearDomains() {
    return await db.domainsBlock.clear();
  },

  // Manual Block List operations
  async addManualBlock(domain) {
    return await db.manualBlockList.add({
      domain,
      enabled: true,
      addedAt: new Date().toISOString()
    });
  },

  async getManualBlocks() {
    const entries = await db.manualBlockList.toArray();
    return entries.map(entry => entry.domain);
  },

  async deleteManualBlock(id) {
    return await db.manualBlockList.delete(id);
  },

  async updateManualBlockState(domain, enabled) {
    return await db.manualBlockStates.put({
      domain,
      enabled
    });
  },

  async getManualBlockStates() {
    const entries = await db.manualBlockStates.toArray();
    const states = {};
    entries.forEach(entry => {
      states[entry.domain] = entry.enabled;
    });
    return states;
  },

  // Custom Source Lists operations
  async addCustomSource(name, url) {
    return await db.customSourceLists.add({
      name,
      url,
      addedAt: new Date().toISOString()
    });
  },

  async getCustomSources() {
    return await db.customSourceLists.toArray();
  },

  async deleteCustomSource(id) {
    return await db.customSourceLists.delete(id);
  },

  // Custom Source Lists operations (for BlockLists component)
  async addCustomSourceList(source) {
    return await db.customSourceLists.add({
      name: source.name,
      url: source.url,
      addedAt: new Date().toISOString()
    });
  },

  async getCustomSourceLists() {
    return await db.customSourceLists.toArray();
  },

  async deleteCustomSourceList(source) {
    const entries = await db.customSourceLists.where('url').equals(source.url).toArray();
    if (entries.length > 0) {
      return await db.customSourceLists.delete(entries[0].id);
    }
  },

  // Master Host Block List operations
  async setMasterHostBlockList(domains) {
    await db.masterHostBlockList.clear();
    const entries = domains.map(domain => ({
      domain,
      addedAt: new Date().toISOString()
    }));
    return await db.masterHostBlockList.bulkAdd(entries);
  },

  async getMasterHostBlockList() {
    const entries = await db.masterHostBlockList.toArray();
    return entries.map(entry => entry.domain);
  },

  // Allow List operations (similar structure for allow lists)
  async addAllowUrl(url) {
    return await db.sourceList2.add({
      url,
      addedAt: new Date().toISOString()
    });
  },

  async getAllowUrls() {
    const entries = await db.sourceList2.toArray();
    return entries.map(entry => entry.url);
  },

  async deleteAllowUrl(id) {
    return await db.sourceList2.delete(id);
  },

  async addAllowDomains(domains, sourceUrl) {
    const entries = domains.map(domain => ({
      domain,
      sourceUrl,
      addedAt: new Date().toISOString()
    }));
    return await db.domainsAllow.bulkAdd(entries);
  },

  async getAllowDomains() {
    const entries = await db.domainsAllow.toArray();
    return entries.map(entry => entry.domain);
  },

  async clearAllowDomains() {
    return await db.domainsAllow.clear();
  },

  // Manual Allow List operations
  async addManualAllow(domain) {
    return await db.manualAllowList.add({
      domain,
      enabled: true,
      addedAt: new Date().toISOString()
    });
  },

  async getManualAllows() {
    const entries = await db.manualAllowList.toArray();
    return entries.map(entry => entry.domain);
  },

  async deleteManualAllow(id) {
    return await db.manualAllowList.delete(id);
  },

  async updateManualAllowState(domain, enabled) {
    return await db.manualAllowStates.put({
      domain,
      enabled
    });
  },

  async getManualAllowStates() {
    const entries = await db.manualAllowStates.toArray();
    const states = {};
    entries.forEach(entry => {
      states[entry.domain] = entry.enabled;
    });
    return states;
  },

  // Custom Entries operations
  async addCustomEntry(ip, domain) {
    return await db.defaultEntries.add({
      ip,
      domain,
      enabled: true,
      addedAt: new Date().toISOString()
    });
  },

  async getCustomEntries() {
    return await db.defaultEntries.toArray();
  },

  async deleteCustomEntry(id) {
    return await db.defaultEntries.delete(id);
  },

  async updateCustomEntryState(entryId, enabled) {
    return await db.customEntryStates.put({
      entryId,
      enabled
    });
  },

  async getCustomEntryStates() {
    const entries = await db.customEntryStates.toArray();
    const states = {};
    entries.forEach(entry => {
      states[entry.entryId] = entry.enabled;
    });
    return states;
  },

  async updateDefaultAllowState(index, enabled) {
    return await db.defaultAllowStates.put({
      index,
      enabled
    });
  },

  async getDefaultAllowStates() {
    const entries = await db.defaultAllowStates.toArray();
    const states = {};
    entries.forEach(entry => {
      states[entry.index] = entry.enabled;
    });
    return states;
  }
};

export default db; 