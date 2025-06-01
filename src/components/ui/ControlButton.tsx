import React from 'react';
import { Button } from '@/components/ui/button';

export interface ControlButtonProps {
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export default function ControlButton({
  icon,
  label,
  active = false,
  onClick,
  ariaLabel
}: ControlButtonProps) {
  return (
    <Button
      variant={active ? 'default' : 'ghost'}
      size="icon"
      onClick={onClick}
      aria-label={ariaLabel}
      className="control-slot"
      data-state={active ? 'active' : 'inactive'}
    >
      <div className="icon-slot">
        {icon}
      </div>
      {label && <span className="mt-1 text-xs">{label}</span>}
    </Button>
  );
} 