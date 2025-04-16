
import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { useIsMobile } from '@/hooks/use-mobile';
import { playNote as playPianoNote, initializeSynth } from '@/lib/piano-utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PianoKey {
  note: string;
  frequency: number;
  isBlack: boolean;
  label: string;
  isMiddleC: boolean;
}

export default function PianoKeyboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [keys, setKeys] = useState<PianoKey[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true); // Always show initially
  const isMobile = useIsMobile();
  
  // Initialize piano keys
  useEffect(() => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const startOctave = 2; // Start from C2
    const endOctave = 6;   // End with C6
    
    const pianoKeys: PianoKey[] = [];
    
    for (let octave = startOctave; octave <= endOctave; octave++) {
      for (let noteIdx = 0; noteIdx < notes.length; noteIdx++) {
        const note = notes[noteIdx];
        const fullNote = `${note}${octave}`;
        
        // Only add the C6 note when we reach the highest octave, skip other notes
        if (octave === endOctave && note !== 'C') continue;
        
        const isBlack = note.includes('#');
        const isMiddleC = note === 'C' && octave === 4; // C4 is middle C
        
        pianoKeys.push({
          note: fullNote,
          frequency: Tone.Frequency(fullNote).toFrequency(),
          isBlack,
          label: isMiddleC ? 'C4' : (isBlack ? '' : note),
          isMiddleC
        });
      }
    }
    
    setKeys(pianoKeys);
    
    // Initialize the synth
    initializeSynth();
    
    // Scroll to middle C on mount
    scrollToMiddleC();
    
    // Set up scroll check on a short delay to ensure initial rendering is complete
    setTimeout(checkScrollability, 300);
    
    // Add event listener for container scroll
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollability);
      }
    };
  }, []);

  // Scroll to middle C
  const scrollToMiddleC = () => {
    if (containerRef.current) {
      // Delay scrolling to ensure the container is fully rendered
      setTimeout(() => {
        const middleCIndex = keys.findIndex(key => key.isMiddleC);
        if (middleCIndex >= 0 && containerRef.current) {
          const keyElements = containerRef.current.querySelectorAll('.piano-key');
          const middleCElement = keyElements[middleCIndex];
          
          if (middleCElement) {
            const scrollOffset = middleCElement.getBoundingClientRect().left - 
                               containerRef.current.getBoundingClientRect().left -
                               (containerRef.current.clientWidth / 2) +
                               (middleCElement as HTMLElement).offsetWidth / 2;
            
            containerRef.current.scrollLeft = scrollOffset;
            checkScrollability();
          }
        }
      }, 100);
    }
  };

  // Check if we can scroll left or right
  const checkScrollability = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      setCanScrollLeft(container.scrollLeft > 10);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  // Handle scroll button clicks - now scrolls by one octave (12 notes)
  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const container = containerRef.current;
      // Calculate width of one octave (12 white keys)
      const whiteKeyWidth = 48; // Width of one white key
      const octaveWidth = whiteKeyWidth * 7; // 7 white keys in an octave
      
      if (direction === 'left') {
        container.scrollLeft -= octaveWidth;
      } else {
        container.scrollLeft += octaveWidth;
      }
      
      checkScrollability();
    }
  };

  // Play note when key is pressed
  const handlePlayNote = (key: PianoKey) => {
    playPianoNote(key.note);
    setActiveKeys(prev => new Set(prev).add(key.note));
    
    // Automatically release the key after a short period
    setTimeout(() => {
      setActiveKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key.note);
        return newSet;
      });
    }, 300);
  };

  return (
    <div className="piano-keyboard-container p-2 relative">
      {/* Always show scroll buttons */}
      <Button
        className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full bg-background/90 shadow-md h-10 w-10 flex items-center justify-center ${!canScrollLeft ? 'opacity-50' : ''}`}
        variant="outline"
        size="icon"
        onClick={() => handleScroll('left')}
        aria-label="Scroll left one octave"
        disabled={!canScrollLeft}
      >
        <ChevronLeft size={20} />
      </Button>
      
      <Button
        className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full bg-background/90 shadow-md h-10 w-10 flex items-center justify-center ${!canScrollRight ? 'opacity-50' : ''}`}
        variant="outline"
        size="icon"
        onClick={() => handleScroll('right')}
        aria-label="Scroll right one octave"
        disabled={!canScrollRight}
      >
        <ChevronRight size={20} />
      </Button>
      
      <div 
        ref={containerRef}
        className="piano-keyboard max-h-72 overflow-x-auto flex relative"
        style={{ 
          touchAction: isMobile ? 'pan-y' : 'auto',
          height: '220px',
          scrollBehavior: 'smooth'
        }}
      >
        <div className="flex relative">
          {/* White keys as base layer */}
          <div className="flex">
            {keys.filter(key => !key.isBlack).map((key, index) => (
              <div
                key={key.note}
                className={`piano-key relative select-none white-key 
                  ${activeKeys.has(key.note) ? 'bg-primary/20' : 'bg-white'} 
                  ${key.isMiddleC ? 'border-primary border-2' : 'border border-gray-300'}
                  hover:bg-primary/10 active:bg-primary/20 transition-colors
                  w-12 h-full flex flex-col items-center justify-end pb-2 cursor-pointer`}
                onClick={() => handlePlayNote(key)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handlePlayNote(key);
                }}
              >
                <span className="text-xs text-gray-500">{key.label}</span>
                {key.isMiddleC && (
                  <span className="text-[8px] text-primary font-bold absolute bottom-8">
                    Middle C
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {/* Black keys as overlay - with improved positioning and width */}
          <div className="absolute top-0 left-0 flex">
            {keys.map((key, index) => {
              if (!key.isBlack) return null;
              
              // Find the white keys before and after this black key
              const whiteKeysBefore = keys.filter((k, i) => !k.isBlack && i < index);
              const whiteKeyIndex = whiteKeysBefore.length;
              
              // Position based on white key index
              const leftOffset = (whiteKeyIndex * 48) - 12; // 48px = width of white key (w-12)
              
              return (
                <div
                  key={key.note}
                  className={`piano-key absolute black-key 
                    ${activeKeys.has(key.note) ? 'bg-gray-600' : 'bg-black'} 
                    hover:bg-gray-800 active:bg-gray-600 transition-colors
                    w-[24px] cursor-pointer z-10`}
                  style={{ left: `${leftOffset}px` }}
                  onClick={() => handlePlayNote(key)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handlePlayNote(key);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
