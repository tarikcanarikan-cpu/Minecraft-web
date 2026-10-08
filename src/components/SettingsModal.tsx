import React from 'react';
import { X, Volume2, VolumeX, Music, Eye } from 'lucide-react';
import { sound } from '../minecraft/sound';

interface SettingsModalProps {
  onClose: () => void;
  fov: number;
  onChangeFov: (fov: number) => void;
  daySpeed: number;
  onChangeDaySpeed: (speed: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  fov,
  onChangeFov,
  daySpeed,
  onChangeDaySpeed,
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());
  const [musicOn, setMusicOn] = React.useState(true);

  const toggleSound = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
  };

  const toggleMusic = () => {
    const next = sound.toggleMusic();
    setMusicOn(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="mc-panel w-full max-w-lg p-5 rounded text-[#222] flex flex-col gap-4 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#888] pb-2">
          <span className="mc-font text-base md:text-lg font-bold text-[#111]">
            Instellingen & Besturing
          </span>
          <button onClick={onClose} className="mc-button w-7 h-7 flex items-center justify-center rounded text-white">
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Sound FX */}
          <button
            onClick={toggleSound}
            className="mc-button p-2.5 flex items-center justify-between rounded"
          >
            <span className="flex items-center gap-2">
              {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} />}
              <span>Geluidseffecten:</span>
            </span>
            <span className="font-bold">{isMuted ? 'UIT' : 'AAN'}</span>
          </button>

          {/* Music */}
          <button
            onClick={toggleMusic}
            className="mc-button p-2.5 flex items-center justify-between rounded"
          >
            <span className="flex items-center gap-2">
              <Music size={16} className={musicOn ? 'text-amber-400' : 'text-neutral-400'} />
              <span>Achtergrondmuziek:</span>
            </span>
            <span className="font-bold">{musicOn ? 'AAN' : 'UIT'}</span>
          </button>

          {/* FOV Slider */}
          <div className="bg-[#a8a8a8] p-2.5 rounded border border-[#666] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-[#111]">
                <Eye size={14} /> Gezichtsveld (FOV):
              </span>
              <span className="font-mono">{fov}°</span>
            </div>
            <input
              type="range"
              min="60"
              max="100"
              value={fov}
              onChange={(e) => onChangeFov(Number(e.target.value))}
              className="accent-[#333] cursor-pointer w-full"
            />
          </div>

          {/* Day / Night speed slider */}
          <div className="bg-[#a8a8a8] p-2.5 rounded border border-[#666] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111]">Dag/Nacht Cyclus:</span>
              <span className="font-mono">{Math.round(1 / daySpeed)}s</span>
            </div>
            <input
              type="range"
              min="60"
              max="300"
              step="30"
              value={Math.round(1 / daySpeed)}
              onChange={(e) => onChangeDaySpeed(1 / Number(e.target.value))}
              className="accent-[#333] cursor-pointer w-full"
            />
          </div>
        </div>

        {/* Keybinds Reference Table */}
        <div className="bg-[#b3b3b3] p-3 rounded border border-[#777] flex flex-col gap-2">
          <div className="font-bold text-xs mc-font text-[#111]">Spelbesturing (Rondkijken & Bewegen):</div>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px] font-mono text-[#222]">
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">W A S D</span> Lopen</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">Muis / Slepen</span> Rondkijken</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">Pijltjes / IJKL</span> Rondkijken (Toetsen)</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">Swipe op scherm</span> Rondkijken (iPad)</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">Links</span> Hakken / Slaan</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">Rechts</span> Blokken / Werkbank</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">Spatie</span> Springen (2x = Vliegen)</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">Shift</span> Bukken / Dalen</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">E</span> Inventaris / Crafting</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">F</span> Auto In-/Uitstappen</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">H</span> Auto Toeter</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">R</span> Auto Tanken</div>
            <div><span className="bg-[#444] text-white px-1.5 py-0.5 rounded text-[10px]">1 - 9</span> Hotbar selectie</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mc-button py-2 text-xs font-bold rounded"
        >
          Klaar
        </button>
      </div>
    </div>
  );
};
