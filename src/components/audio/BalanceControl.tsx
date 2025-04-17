
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// Custom Headphone Balance Icon Components
const HeadphonesBalanced = () => (
  <div className="relative">
    <span className="block size-5">🎧</span>
    <span className="absolute text-[8px] font-semibold bottom-1.5 left-1">L</span>
    <span className="absolute text-[8px] font-semibold bottom-1.5 right-1">R</span>
  </div>
);

const HeadphonesLeftBiased = () => (
  <div className="relative">
    <span className="block size-5">🎧</span>
    <span className="absolute text-[8px] font-bold bottom-1.5 left-1">L</span>
    <span className="absolute text-[8px] font-light opacity-60 bottom-1.5 right-1">R</span>
  </div>
);

const HeadphonesRightBiased = () => (
  <div className="relative">
    <span className="block size-5">🎧</span>
    <span className="absolute text-[8px] font-light opacity-60 bottom-1.5 left-1">L</span>
    <span className="absolute text-[8px] font-bold bottom-1.5 right-1">R</span>
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

  return (
    <div className="relative flex-shrink-0" 
      onMouseEnter={showBalance}
      onMouseLeave={scheduleHideBalance}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={resetBalance}
        aria-label="Adjust audio balance"
        className={cn(
          "flex-shrink-0",
          balance !== 0 && "text-primary"
        )}
      >
        {getHeadphonesIcon()}
      </Button>
      
      {/* Balance Slider (shows on hover/tap) */}
      {isBalanceVisible && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover rounded-md shadow-md p-2 w-32 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full flex items-center gap-2 py-2">
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
        </div>
      )}
    </div>
  );
}
