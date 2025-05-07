import { Zap, Flame, MoreHorizontal, ArrowRight, Shield } from "lucide-react";

export default function GamePowerups() {
  // Sample power-up data with more detailed descriptions
  const powerups = [
    {
      name: "Speed Boost",
      icon: <ArrowRight className="h-4 w-4 text-[#ffcc00]" />,
      color: "#ffcc00",
      effect: "Increases movement speed by 20%",
    },
    {
      name: "Bomb Range",
      icon: <Flame className="h-4 w-4 text-[#e83b3b]" />,
      color: "#e83b3b",
      effect: "Adds +1 to bomb blast radius",
    },
    {
      name: "Extra Bomb",
      icon: <MoreHorizontal className="h-4 w-4 text-[#3b82e8]" />,
      color: "#3b82e8",
      effect: "Adds +1 to max bombs capacity",
    },
    {
      name: "Invincibility",
      icon: <Shield className="h-4 w-4 text-[#50c878]" />,
      color: "#50c878",
      effect: "5 seconds of immunity to explosions",
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl text-white font-bold mb-3 pixel-title">
        POWER-UPS
      </h2>

      <div className="flex-grow grid grid-cols-2 gap-2 content-start">
        {powerups.map((powerup, index) => (
          <div key={index} className="bg-[#2a4a7f] p-2 pixel-powerup">
            <div
              className="w-full h-8 flex items-center justify-center mb-1 rounded-sm"
              style={{
                backgroundColor: powerup.color,
                border: "2px solid #1a2e4a",
              }}
            >
              {powerup.icon}
            </div>
            <div className="text-center">
              <div className="text-white font-bold pixel-text text-xs">
                {powerup.name}
              </div>
              <div className="text-[#ffcc00] text-xs pixel-text mt-1 text-[9px]">
                {powerup.effect}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3 text-center">
        <div className="text-[#ffcc00] text-xs pixel-text font-bold">
          <Zap className="h-3 w-3 inline-block mr-1" />
          COLLECT TO POWER UP!
        </div>
      </div>
    </div>
  );
}
