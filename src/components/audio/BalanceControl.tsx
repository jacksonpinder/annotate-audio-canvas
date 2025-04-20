import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useRef, useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Headphones } from 'lucide-react';

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
  isBalanceVisible: boolean;
  showBalance: () => void;
  scheduleHideBalance: () => void;
  handleBalanceChange: (newValue: number[]) => void;
  resetBalance: () => void;
}

export default function BalanceControl({
  balance,
  isBalanceVisible,
  showBalance,
  scheduleHideBalance,
  handleBalanceChange,
  resetBalance
}: BalanceControlProps) {
  // Determine which headphones icon to use based on balance
  const getHeadphonesIcon = () => {
    if (balance === 0) {
      return <HeadphonesBalanced />;
    } else if (balance < 0) {
      return <HeadphonesLeftBiased />;
    } else {
      return <HeadphonesRightBiased />;
    }
  };
  
  const isBalanced = balance === 0;
  
  // Store the last non-center balance setting
  const lastCustomBalanceRef = useRef<number>(isBalanced ? 0.5 : balance);
  const [isSliderOpen, setIsSliderOpen] = useState<boolean>(false);
  const hideTimeoutRef = useRef<number | null>(null);
  
  // Custom balance toggle function
  const handleBalanceToggle = () => {
    if (!isBalanced) {
      // If not balanced, store current value and reset to center
      lastCustomBalanceRef.current = balance;
      resetBalance();
    } else {
      // If centered, restore to last non-center value
      handleBalanceChange([lastCustomBalanceRef.current]);
    }
  };
  
  // Sync external visibility state with local state
  useEffect(() => {
    setIsSliderOpen(isBalanceVisible);
  }, [isBalanceVisible]);
  
  // Function to show the slider
  const handleShowSlider = () => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    showBalance();
  };
  
  // Function to hide the slider
  const handleHideSlider = () => {
    scheduleHideBalance();
  };

  return (
    <div className="relative flex-shrink-0 balance-control" 
      onMouseEnter={handleShowSlider}
      onMouseLeave={handleHideSlider}
    >
      <Popover open={isSliderOpen} onOpenChange={setIsSliderOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant={!isBalanced ? "default" : "ghost"}
            size="icon" 
            onClick={handleBalanceToggle}
            aria-label="Adjust audio balance"
            className="audio-control-button flex-shrink-0"
            data-state={!isBalanced ? "active" : "inactive"}
          >
            <div className="audio-control-icon">
              <Headphones size={20} />
            </div>
            {!isBalanced && (
              <span className="audio-control-label">
                {getHeadphonesIcon()}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        
        {/* Balance Slider (shows on hover/tap) */}
        <PopoverContent 
          side="top" 
          align="center" 
          className="balance-slider w-48 p-3 flex flex-col items-center justify-center gap-1 z-50"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleShowSlider}
          onMouseLeave={handleHideSlider}
        >
          <div className="text-center mb-1 text-xs font-medium">
            Fade left or right
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
