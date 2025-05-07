export default function GameControls() {
  return (
    <div className="game-controls">
      <h3 className="text-[#ffcc00] font-bold pixel-text mb-3 text-center">
        GAME CONTROLS
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#2a4a7f] p-3 pixel-controls">
          <h4 className="text-white font-bold pixel-text mb-2 text-center">
            MOVEMENT
          </h4>

          <div className="grid grid-cols-3 gap-1 text-center mb-2">
            <div></div>
            <div className="bg-[#1a2e4a] p-1 text-white pixel-text">W</div>
            <div></div>
            <div className="bg-[#1a2e4a] p-1 text-white pixel-text">A</div>
            <div className="bg-[#1a2e4a] p-1 text-white pixel-text">S</div>
            <div className="bg-[#1a2e4a] p-1 text-white pixel-text">D</div>
          </div>

          <div className="text-center text-xs text-[#8aa8d0] pixel-text">
            or Arrow Keys
          </div>
        </div>

        <div className="bg-[#2a4a7f] p-3 pixel-controls">
          <h4 className="text-white font-bold pixel-text mb-2 text-center">
            ACTIONS
          </h4>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#ffcc00] pixel-text text-sm">
                Place Bomb:
              </span>
              <span className="bg-[#1a2e4a] px-2 py-1 text-white pixel-text text-sm min-w-[40px] text-center">
                Space
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#ffcc00] pixel-text text-sm">
                  Cheat Mode:
                </span>
                <span className="bg-[#1a2e4a] px-2 py-1 text-white pixel-text text-sm min-w-[40px] text-center">
                  C
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-center text-xs text-[#8aa8d0] pixel-text">
        Collect power-ups to increase your abilities and defeat other players!
      </div>
    </div>
  );
}
