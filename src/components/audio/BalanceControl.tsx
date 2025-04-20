import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Headphones } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useHoverControl } from '@/hooks/useHoverControl';

// Custom Headphone Balance Icon Components for display
const HeadphonesBalanced = () => (
  <div className="flex items-center gap-1">
    {/* No labels when balanced */}
  </div>
);

const HeadphonesLeftBiased = () => (
  <div className="flex items-center gap-1">
    <span className="font-bold">L</span>
    <span className="font-normal opacity-60">R</span>
  </div>
);

const HeadphonesRightBiased = () => (
  <div className="flex items-center gap-1">
    <span className="font-normal opacity-70">L</span>
    <span className="font-bold">R</span>
  </div>
);

interface BalanceControlProps {
  balance: number;
  handleBalanceChange: (newValue: number[]) => void;
  resetBalance: () => void;
}

export default function BalanceControl({
  balance,
  handleBalanceChange,
  resetBalance
}: BalanceControlProps) {
  const { isVisible, show, scheduleHide } = useHoverControl(250);
  const isBalanced = balance === 0;

  return (
    <div className="relative flex-shrink-0 balance-control"
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
    >
      <Popover open={isVisible}>
        <PopoverTrigger asChild>
          <Button 
            variant={!isBalanced ? "default" : "ghost"}
            size="icon" 
            onClick={resetBalance}
            aria-label="Adjust audio balance"
            className="audio-control-button flex-shrink-0"
            data-state={!isBalanced ? "active" : "inactive"}
          >
            <div className="audio-control-icon">
              <Headphones size={20} />
            </div>
            {!isBalanced && (
              <span className="audio-control-label">
                {balance < 0 ? 'L' : 'R'}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="center" 
          className="balance-slider w-48 p-3 flex flex-col items-center justify-center gap-1 z-50"
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
        >
          <div className="text-center mb-1 text-xs font-medium">
            Balance
          </div>
          <div className="w-full flex items-center gap-2 py-1">
            <span className="text-xs font-medium">L</span>
            <Slider
              value={[balance]}
              min={-1}
              max={1}
              step={0.01}
              onValueChange={handleBalanceChange}
              aria-label="Audio balance"
            />
            <span className="text-xs font-medium">R</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
