import React from "react";

function HostsFileToolbar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onRefresh,
  onSave,
  onToggleHostsFile,
  onOpenSettings,
  isRefreshing,
  isSaving,
  isTogglingHostsFile,
  isHostsFileDisabled,
  hasUnsavedChanges,
  hasWritePermissions,
  isTauriEnv
}) {
  return (
    <div className="d-flex align-items-center mb-3 gap-3">
      <div className="input-group" style={{ maxWidth: 300 }}>
        <span className="input-group-text">
          <i className="bi bi-search"></i>
        </span>
        <input
          type="text"
          className="form-control"
          placeholder="Search IP or domain..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          autoCorrect="off"
        />
      </div>
      <select
        className="form-select"
        style={{ maxWidth: 160 }}
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
      >
        <option value="all">All</option>
        <option value="enabled">Enabled</option>
        <option value="disabled">Disabled</option>
      </select>
      <button
        className="btn btn-outline-primary"
        onClick={onRefresh}
        disabled={isRefreshing || isHostsFileDisabled}
        title={isRefreshing ? "Loading..." : (isHostsFileDisabled ? "Hosts file is disabled" : "Refresh")}
      >
        {isRefreshing ? (
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        ) : (
          <i className="bi bi-arrow-clockwise"></i>
        )}
      </button>
      <button
        className="btn btn-success"
        onClick={onSave}
        disabled={!isTauriEnv || !hasUnsavedChanges || isSaving || isHostsFileDisabled || !hasWritePermissions}
        title={isSaving ? "Saving..." : (!hasWritePermissions ? "Insufficient permissions" : (isHostsFileDisabled ? "Hosts file is disabled - enable first" : (hasUnsavedChanges ? "Save changes to hosts file" : "No changes to save")))}
      >
        {isSaving ? (
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        ) : (
          <i className="bi bi-check-circle"></i>
        )}
        {isSaving ? " Saving..." : " Save"}
      </button>
      <button
        className={`btn ${isHostsFileDisabled ? 'btn-success' : 'btn-danger'}`}
        onClick={onToggleHostsFile}
        disabled={!isTauriEnv || isTogglingHostsFile}
        title={isTogglingHostsFile ? "Processing..." : (isHostsFileDisabled ? "Enable hosts file" : "Disable hosts file")}
      >
        {isTogglingHostsFile ? (
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        ) : (
          <i className={`bi ${isHostsFileDisabled ? 'bi-play-circle' : 'bi-stop-circle'}`}></i>
        )}
        {isTogglingHostsFile ? " Processing..." : (isHostsFileDisabled ? " Enable" : " Disable")}
      </button>
    </div>
  );
}

export default HostsFileToolbar; 