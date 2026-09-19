import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import ReadingGuide from '@/components/accessibility/ReadingGuide';
import useReadingPreferences from '@/components/accessibility/useReadingPreferences';

export default function ReadingModeControls({ userId }) {
  const { preferences, setPreferences, saveError } = useReadingPreferences(userId);
  const [position, setPosition] = useState(50);
  const update = (key, value) => setPreferences(current => ({ ...current, [key]: value }));
  return <>
    <div className="reading-mode-controls">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label={`Reading preferences: dyslexia-friendly mode ${preferences.enabled ? 'on' : 'off'}`} title="Reading preferences" className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold focus-visible:ring-2 focus-visible:ring-ring ${preferences.enabled ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span className="hidden 2xl:inline">Reading</span>
            {preferences.enabled && <span className="text-xs">On</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" aria-label="Reading preferences" className="reading-mode-controls w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto space-y-4">
          <h2 className="text-base font-bold">Reading preferences</h2>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <label htmlFor="reading-mode-switch" className="cursor-pointer text-sm font-semibold">Dyslexia-friendly mode</label>
            <Switch id="reading-mode-switch" checked={preferences.enabled} onCheckedChange={value => update('enabled', value)} aria-describedby="reading-mode-description" />
          </div>
          <p id="reading-mode-description" className="text-sm text-muted-foreground">Clear sans-serif text, larger small print, extra spacing, and shorter paragraphs. Keeps your current color theme.</p>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <label htmlFor="reading-guide-switch" className="cursor-pointer text-sm font-semibold">Reading guide</label>
            <Switch id="reading-guide-switch" checked={preferences.guide} disabled={!preferences.enabled} onCheckedChange={value => update('guide', value)} aria-describedby="reading-guide-description" />
          </div>
          <p id="reading-guide-description" className="text-sm text-muted-foreground">The guide follows your pointer or keyboard focus in the page. On touch screens, position it below and scroll the text through it.</p>
          <div>
            <label htmlFor="reading-guide-position" className="block text-sm font-semibold">Guide position</label>
            <input id="reading-guide-position" type="range" min="0" max="100" value={position} disabled={!preferences.enabled || !preferences.guide} onChange={event => setPosition(Number(event.target.value))} aria-valuetext={`${position}% down the reading area`} className="min-h-11 w-full accent-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Saved for your account in this browser. Turn off the mode to restore the standard layout.</p>
          {saveError && <p role="status" className="text-sm text-destructive">{saveError}</p>}
        </PopoverContent>
      </Popover>
    </div>
    {preferences.enabled && preferences.guide && <ReadingGuide position={position} />}
  </>;
}