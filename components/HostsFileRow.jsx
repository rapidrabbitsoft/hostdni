import React from "react";

function HostsFileRow({
  entry,
  isHostsFileDisabled,
  handleSelectEntry,
  addToAllowList
}) {
  // Define isDefaultEntry function before using it
  const isDefaultEntry = (entry) => {
    const defaultHosts = [
      'localhost', 'localhost.localdomain', 'local', 'broadcasthost',
      'ip6-localhost', 'ip6-loopback', 'ip6-localnet', 'ip6-mcastprefix',
      'ip6-allnodes', 'ip6-allrouters', 'ip6-allhosts', '0.0.0.0'
    ];
    return defaultHosts.includes(entry.hostname);
  };

  const handleRowClick = (e) => {
    if (e.target.type === 'checkbox' || isHostsFileDisabled) {
      return;
    }
    handleSelectEntry(entry.id, !entry.enabled);
  };

  return (
    <div 
      className="d-flex align-items-center border-bottom"
      onClick={handleRowClick}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <div className="d-flex align-items-center" style={{ width: '50px', paddingLeft: '1rem' }}>
        <input
          type="checkbox"
          className="form-check-input p-2"
          checked={entry.enabled}
          onChange={e => handleSelectEntry(entry.id, e.target.checked)}
          onClick={e => e.stopPropagation()}
          disabled={isHostsFileDisabled}
        />
      </div>
      <div className="d-flex" style={{ width: 'calc(100% - 50px)' }}>
        <div style={{ width: '35%', padding: '0.5rem 1rem' }}>
          <span className={`font-monospace ${!entry.enabled ? 'text-muted' : ''}`}>{entry.ip}</span>
        </div>
        <div style={{ width: '55%', padding: '0.5rem 1rem' }}>
          <span className={!entry.enabled ? 'text-muted' : ''}>{entry.hostname}</span>
        </div>
        {!entry.enabled && !isDefaultEntry(entry) && (
          <div style={{ width: '10%', padding: '0.5rem 0.5rem' }}>
            <button
              className="btn btn-sm btn-link text-success p-0"
              onClick={e => {
                e.stopPropagation();
                addToAllowList(entry);
              }}
              title="Add to allow list"
              disabled={isHostsFileDisabled}
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              data-bs-custom-class="tooltip-dark"
            >
              <i className="bi bi-plus-circle"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HostsFileRow; 