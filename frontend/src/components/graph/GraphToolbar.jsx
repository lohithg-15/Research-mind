import React from 'react';
import { Crosshair, LocateFixed, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

function ToolButton({ label, onClick, active, children }) {
  return (
    <Tooltip label={label} side="right">
      <button type="button" className={`rm-graph-btn${active ? ' rm-graph-btn-active' : ''}`} onClick={onClick} aria-label={label} aria-pressed={active}>
        {children}
      </button>
    </Tooltip>
  );
}

export default function GraphToolbar({ onZoomIn, onZoomOut, onFit, onCenter, isFullscreen, onToggleFullscreen }) {
  return (
    <div className="rm-graph-toolbar" role="toolbar" aria-label="Graph controls">
      <ToolButton label="Zoom in" onClick={onZoomIn}><ZoomIn size={15} /></ToolButton>
      <ToolButton label="Zoom out" onClick={onZoomOut}><ZoomOut size={15} /></ToolButton>
      <ToolButton label="Fit all" onClick={onFit}><Crosshair size={15} /></ToolButton>
      <ToolButton label="Center" onClick={onCenter}><LocateFixed size={15} /></ToolButton>
      <ToolButton label={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'} onClick={onToggleFullscreen} active={isFullscreen}>
        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </ToolButton>
    </div>
  );
}
