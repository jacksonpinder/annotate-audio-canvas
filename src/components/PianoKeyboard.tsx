
import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { useIsMobile } from '@/hooks/use-mobile';
import { playNote as playPianoNote, initializeSynth } from '@/lib/piano-utils';

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
  const isMobile = useIsMobile();
  
  // Initialize piano keys
  useEffect(() => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const startOctave = 2; // Start from C2
    const endOctave = 7;   // End with B7
    
    const pianoKeys: PianoKey[] = [];
    
    for (let octave = startOctave; octave <= endOctave; octave++) {
      for (let noteIdx = 0; noteIdx < notes.length; noteIdx++) {
        const note = notes[noteIdx];
        const fullNote = `${note}${octave}`;
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
    if (containerRef.current) {
      // Delay scrolling to ensure the container is fully rendered
      setTimeout(() => {
        const middleCIndex = pianoKeys.findIndex(key => key.isMiddleC);
        if (middleCIndex >= 0 && containerRef.current) {
          const keyElements = containerRef.current.querySelectorAll('.piano-key');
          const middleCElement = keyElements[middleCIndex];
          
          if (middleCElement) {
            const scrollOffset = middleCElement.getBoundingClientRect().left - 
                               containerRef.current.getBoundingClientRect().left -
                               (containerRef.current.clientWidth / 2) +
                               (middleCElement as HTMLElement).offsetWidth / 2;
            
            containerRef.current.scrollLeft = scrollOffset;
          }
        }
      }, 100);
    }
  }, []);

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
    <div className="piano-keyboard-container p-2">
      <div 
        ref={containerRef}
        className="piano-keyboard max-h-72 overflow-x-auto flex relative"
        style={{ 
          touchAction: isMobile ? 'pan-y' : 'auto',
          height: '220px'
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
                  w-10 h-full flex flex-col items-center justify-end pb-2 cursor-pointer`}
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
          
          {/* Black keys as overlay */}
          <div className="absolute top-0 left-0 flex">
            {keys.map((key, index) => {
              if (!key.isBlack) return null;
              
              // Calculate position based on previous white key
              const prevWhiteKeyIndex = keys.findIndex(k => !k.isBlack && k.note.charAt(0) === key.note.charAt(0));
              const leftOffset = (prevWhiteKeyIndex * 40) + 30; // 40px = width of white key
              
              return (
                <div
                  key={key.note}
                  className={`piano-key absolute black-key 
                    ${activeKeys.has(key.note) ? 'bg-gray-600' : 'bg-black'} 
                    hover:bg-gray-800 active:bg-gray-600 transition-colors
                    w-6 h-32 cursor-pointer z-10`}
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
