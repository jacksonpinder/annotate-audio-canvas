import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useRef, useState, useEffect } from 'react';
import { Headphones } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Custom Headphone Balance Icon Components for display
const HeadphonesBalanced = () => (
  <div className="flex items-center gap-1">
    {/* Render both L and R when balanced, use font-medium (500) */}
    <span className="font-medium opacity-100">L</span>
    <span className="font-medium opacity-100">R</span>
  </div>
);

const HeadphonesLeftBiased = () => (
  <div className="flex items-center gap-1">
    {/* Use font-medium, adjust opacity */}
    <span className="font-medium opacity-100">L</span>
    <span className="font-medium opacity-50">R</span> 
  </div>
);

const HeadphonesRightBiased = () => (
  <div className="flex items-center gap-1">
    {/* Use font-medium, adjust opacity */}
    <span className="font-medium opacity-50">L</span> 
    <span className="font-medium opacity-100">R</span>
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
  const lastCustomBalanceRef = useRef<number>(0); // no custom until moved
  const [isSliderOpen, setIsSliderOpen] = useState<boolean>(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsSliderOpen(false);
    }, 250);
  };

  // Custom balance toggle function
  const handleBalanceToggle = () => {
    setIsSliderOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const popoverContent = document.querySelector('.balance-slider');
      const balanceControl = document.querySelector('.balance-control');
      const audioControlButton = document.querySelector('.audio-control-button');

      if (
        isSliderOpen &&
        !balanceControl?.contains(target) &&
        !audioControlButton?.contains(target) &&
        !popoverContent?.contains(target)
      ) {
        if (balance !== 0) {
          lastCustomBalanceRef.current = balance;
        }
        setIsSliderOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSliderOpen, balance]);

  return (
    <div className="relative flex-shrink-0 balance-control">
      <Popover open={isSliderOpen} onOpenChange={(open) => open && setIsSliderOpen(true)}>
        <div className="control-with-label">
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
            </Button>
          </PopoverTrigger>
          <div className="label-below">
            {getHeadphonesIcon()}
          </div>
        </div>
        <PopoverContent
          side="top"
          align="center"
          className="balance-slider w-48 p-3 flex flex-col items-center justify-center gap-1 z-50"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
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
