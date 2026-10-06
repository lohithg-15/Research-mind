import React from 'react';
import { Crosshair, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';

export default function GraphToolbar({ onZoomIn, onZoomOut, onFit, isFullscreen, onToggleFullscreen }) {
  return (
    <div className="gv2-zoom-controls" aria-label="Graph controls">
      <button type="button" className="gv2-zoom-btn" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in"><ZoomIn size={13} /></button>
      <button type="button" className="gv2-zoom-btn" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out"><ZoomOut size={13} /></button>
      <button type="button" className="gv2-zoom-btn" onClick={onFit} title="Fit all" aria-label="Fit all"><Crosshair size={13} /></button>
      <button type="button" className={`gv2-zoom-btn${isFullscreen ? ' is-active' : ''}`} onClick={onToggleFullscreen} title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      </button>
    </div>
  );
}
