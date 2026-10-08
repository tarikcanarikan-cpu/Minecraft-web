import React, { useState } from 'react';
import { WorldPreset } from '../minecraft/world';
import { Play, RotateCcw, Save, FolderOpen, Settings, Check } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onNewWorld: (preset: WorldPreset, seed: number) => void;
  onSaveWorld: () => void;
  onLoadWorld: () => boolean;
  onOpenSettings: () => void;
  onTeleport?: (x: number, y: number, z: number) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onNewWorld,
  onSaveWorld,
  onLoadWorld,
  onOpenSettings,
  onTeleport,
}) => {
  const [showNewWorldForm, setShowNewWorldForm] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<WorldPreset>('standard');
  const [seedInput, setSeedInput] = useState<string>('12345');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSave = () => {
    onSaveWorld();
    showToast('Wereld succesvol opgeslagen in de browser!');
  };

  const handleLoad = () => {
    const success = onLoadWorld();
    if (success) {
      showToast('Wereld succesvol geladen!');
    } else {
      showToast('Geen opgeslagen wereld gevonden!');
    }
  };

  const handleCreateNewWorld = () => {
    const seed = parseInt(seedInput, 10) || Math.floor(Math.random() * 999999);
    onNewWorld(selectedPreset, seed);
    setShowNewWorldForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="mc-panel w-full max-w-sm p-6 rounded text-center flex flex-col gap-4 shadow-2xl animate-scale-up">
        <h2 className="mc-font text-xl md:text-2xl font-bold text-[#111] mc-text-shadow text-white tracking-wider">
          Spel Gepauzeerd
        </h2>

        {toastMessage && (
          <div className="bg-emerald-600/90 text-white text-xs mc-font p-2 rounded flex items-center justify-center gap-1.5 animate-bounce">
            <Check size={14} />
            <span>{toastMessage}</span>
          </div>
        )}

        {!showNewWorldForm ? (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={onResume}
              className="mc-button py-2.5 px-4 text-sm flex items-center justify-center gap-2 rounded"
            >
              <Play size={16} />
              <span>Terug naar het Spel</span>
            </button>

            <button
              onClick={() => setShowNewWorldForm(true)}
              className="mc-button py-2.5 px-4 text-sm flex items-center justify-center gap-2 rounded"
            >
              <RotateCcw size={16} />
              <span>Nieuwe Wereld Maken</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSave}
                className="mc-button py-2 px-3 text-xs flex items-center justify-center gap-1.5 rounded"
              >
                <Save size={14} />
                <span>Wereld Opslaan</span>
              </button>

              <button
                onClick={handleLoad}
                className="mc-button py-2 px-3 text-xs flex items-center justify-center gap-1.5 rounded"
              >
                <FolderOpen size={14} />
                <span>Wereld Laden</span>
              </button>
            </div>

            {/* Quick Teleport to Village and Villa */}
            {onTeleport && (
              <div className="flex flex-col gap-1 p-2 bg-black/20 rounded border border-white/10">
                <span className="text-[10px] mc-font text-white/70 font-bold text-left">
                  🚀 Snel Reizen:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => onTeleport(16.5, 18, 12.5)}
                    className="mc-button py-1.5 px-1 text-[10px] flex items-center justify-center gap-1 rounded bg-[#4a5f45] text-white"
                  >
                    <span>🏘️ Dorp</span>
                  </button>
                  <button
                    onClick={() => onTeleport(-20, 19, -15)}
                    className="mc-button py-1.5 px-1 text-[10px] flex items-center justify-center gap-1 rounded bg-[#5a4838] text-amber-200"
                  >
                    <span>🏰 Villa</span>
                  </button>
                  <button
                    onClick={() => onTeleport(3.5, 17, -9.0)}
                    className="mc-button py-1.5 px-1 text-[10px] flex items-center justify-center gap-1 rounded bg-[#b71c1c] text-white font-bold"
                  >
                    <span>⛽ Tankstation</span>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={onOpenSettings}
              className="mc-button py-2 px-4 text-xs flex items-center justify-center gap-2 rounded"
            >
              <Settings size={14} />
              <span>Instellingen & Besturing</span>
            </button>
          </div>
        ) : (
          /* New World Generator Options */
          <div className="flex flex-col gap-3 text-left">
            <div className="text-xs mc-font text-[#222] font-bold">Kies Wereldtype:</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'standard', label: 'Heuvels' },
                { id: 'mountains', label: 'Bergen' },
                { id: 'flat', label: 'Vlak' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPreset(p.id as WorldPreset)}
                  className={`mc-button py-2 px-1 text-xs text-center rounded ${
                    selectedPreset === p.id ? 'bg-[#3b3b3b] text-yellow-300 font-bold' : ''
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="text-xs mc-font text-[#222] font-bold mt-1">Wereld Zaadje (Seed):</div>
            <input
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="Bijv. 12345"
              className="bg-white border-2 border-[#555] rounded px-2.5 py-1.5 text-xs text-black font-mono outline-none"
            />

            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setShowNewWorldForm(false)}
                className="mc-button flex-1 py-2 text-xs rounded"
              >
                Annuleren
              </button>
              <button
                onClick={handleCreateNewWorld}
                className="mc-button flex-1 py-2 text-xs bg-emerald-700 text-white font-bold rounded"
              >
                Genereer Wereld!
              </button>
            </div>
          </div>
        )}

        <div className="text-[10px] text-[#555] pt-1 border-t border-[#999] mc-font">
          Tip: Druk op <span className="font-bold">E</span> in-game om je inventaris te openen.
        </div>
      </div>
    </div>
  );
};
