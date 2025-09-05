import React from "react";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

function HostsFileTable({
  filteredEntries,
  ROW_HEIGHT,
  VirtualRow,
  searchTerm,
  isLoading = false
}) {
  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '550px' }}>
        <div className="text-center text-muted">
          <div className="spinner-border mb-3" role="status" aria-hidden="true"></div>
          <p>Loading entries...</p>
        </div>
      </div>
    );
  }

  if (filteredEntries.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '550px' }}>
        <div className="text-center text-muted">
          <i className="bi bi-inbox fs-1 mb-3"></i>
          <p>{searchTerm ? 'No entries match your search' : 'No entries found'}</p>
        </div>
      </div>
    );
  }

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={filteredEntries.length}
          itemSize={ROW_HEIGHT}
          width={width}
          overscanCount={10}
          itemData={filteredEntries}
        >
          {VirtualRow}
        </List>
      )}
    </AutoSizer>
  );
}

export default HostsFileTable; 