import React, { useEffect, useRef, useState } from 'react';
import { diceSensory } from '../utils/diceHaptics';

interface Die3DState {
  id: number;
  finalValue: number;
  isExploded: boolean;
  isSuccess: boolean;
  isTen: boolean;
  isOne: boolean;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  vz: number;
  rotZ: number;
  vRotZ: number;
  radius: number;
  settled: boolean;
  bounceCount: number;
}

interface Dice3DStageProps {
  diceValues: number[];
  explodedCount?: number;
  isChanceDie?: boolean;
  onComplete: () => void;
}

export const Dice3DStage: React.FC<Dice3DStageProps> = ({
  diceValues,
  explodedCount = 0,
  isChanceDie = false,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const totalSuccesses = diceValues.filter((v) => (isChanceDie ? v === 10 : v >= 8)).length;
    const anyTen = diceValues.some((v) => v === 10);
    const botch = isChanceDie && diceValues[0] === 1;

    diceSensory.playCupShakeSound();
    diceSensory.triggerHaptic('shake');

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || window.innerWidth;
    const height = Math.min(window.innerHeight * 0.45, 320);
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const count = diceValues.length;
    // Raggio dadi molto più generoso per massima leggibilità
    const baseRadius = width < 480 ? (count > 6 ? 28 : 34) : count > 8 ? 34 : 42;

    // Calcolo griglia ordinata per la posizione di arresto finale al centro del vassoio
    const cols = Math.min(count, width < 480 ? 4 : 6);
    const rows = Math.ceil(count / cols);
    const spacingX = Math.min(baseRadius * 2.35, (width - 40) / cols);
    const spacingY = baseRadius * 2.3;
    const startX = width / 2 - ((cols - 1) * spacingX) / 2;
    const startY = height / 2 - ((rows - 1) * spacingY) / 2;

    const dice: Die3DState[] = diceValues.map((val, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const targetX = startX + col * spacingX;
      const targetY = startY + row * spacingY;

      const isExploded = idx >= count - explodedCount;
      const isSuccess = isChanceDie ? val === 10 : val >= 8;
      const isTen = val === 10;
      const isOne = val === 1;

      return {
        id: idx,
        finalValue: val,
        isExploded,
        isSuccess,
        isTen,
        isOne,
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: 20 + Math.random() * 25,
        z: 90 + Math.random() * 50,
        targetX,
        targetY,
        vx: (Math.random() - 0.5) * 12,
        vy: 6 + Math.random() * 6,
        vz: -2.5 - Math.random() * 2,
        rotZ: (Math.random() - 0.5) * Math.PI,
        vRotZ: (Math.random() - 0.5) * 0.4,
        radius: baseRadius,
        settled: false,
        bounceCount: 0,
      };
    });

    let animationId: number;
    let startTime = performance.now();
    let allSettledAnnounced = false;

    // Disegno di un D10 tridimensionale ad altissima visibilità e contrasto
    const drawD10 = (d: Die3DState) => {
      ctx.save();
      ctx.translate(d.x, d.y);

      // Ombra marcata sul panno
      ctx.beginPath();
      ctx.ellipse(0, d.radius * 0.95, d.radius * 0.85, d.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.filter = 'blur(6px)';
      ctx.fill();
      ctx.filter = 'none';

      // Rotazione durante il lancio
      ctx.rotate(d.rotZ);

      const r = d.radius;

      // Colori vibranti e ricchi ad alto contrasto
      let baseGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.2);
      let strokeColor = 'rgba(255, 255, 255, 0.4)';
      let numColor = '#ffffff';

      if (d.settled && d.isTen) {
        // ORO SCINTILLANTE 10-AGAIN
        baseGrad.addColorStop(0, '#fef9c3'); // Giallo crema chiaro
        baseGrad.addColorStop(0.3, '#facc15'); // Oro brillante
        baseGrad.addColorStop(0.7, '#d97706'); // Ambra caldo
        baseGrad.addColorStop(1, '#78350f'); // Bronzo scuro
        strokeColor = '#ffffff';
        numColor = '#1e1b4b'; // Scuro brillante su oro
      } else if (d.settled && d.isSuccess) {
        // VERDE SMERALDO SUCCESSO (8 o 9)
        baseGrad.addColorStop(0, '#a7f3d0'); // Smeraldo chiaro
        baseGrad.addColorStop(0.3, '#10b981'); // Verde smeraldo vivo
        baseGrad.addColorStop(0.8, '#047857'); // Verde scuro
        baseGrad.addColorStop(1, '#064e3b');
        strokeColor = '#ecfdf5';
        numColor = '#ffffff';
      } else if (isChanceDie && d.isOne) {
        // ROSSO SANGUE BOTCH (1 su Tiro di Fortuna)
        baseGrad.addColorStop(0, '#fecaca');
        baseGrad.addColorStop(0.4, '#ef4444');
        baseGrad.addColorStop(0.8, '#b91c1c');
        baseGrad.addColorStop(1, '#450a0a');
        strokeColor = '#fee2e2';
        numColor = '#ffffff';
      } else {
        // DADO STANDARD: Blu Zaffiro Cobalto profondo (NON nero invisibile!)
        baseGrad.addColorStop(0, '#60a5fa'); // Riflesso blu brillante
        baseGrad.addColorStop(0.3, '#2563eb'); // Blu reale cobalto
        baseGrad.addColorStop(0.7, '#1e3a8a'); // Blu notte
        baseGrad.addColorStop(1, '#0f172a'); // Bordo scuro
        strokeColor = 'rgba(191, 219, 254, 0.5)';
        numColor = '#ffffff';
      }

      // Alone luminoso per i successi (8, 9, 10)
      if (d.settled && d.isSuccess) {
        ctx.shadowColor = d.isTen ? '#fbbf24' : '#34d399';
        ctx.shadowBlur = d.isTen ? 22 : 14;
      }

      // Sagoma pentagonale a diamante del d10
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.15); // Cima
      ctx.lineTo(r * 0.95, -r * 0.25); // Alto dx
      ctx.lineTo(r * 0.8, r * 0.75); // Basso dx
      ctx.lineTo(0, r * 1.12); // Fondo
      ctx.lineTo(-r * 0.8, r * 0.75); // Basso sx
      ctx.lineTo(-r * 0.95, -r * 0.25); // Alto sx
      ctx.closePath();

      ctx.fillStyle = baseGrad;
      ctx.fill();

      // Bordo e sfaccettature visibili
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Linee interne delle facce poliedriche
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -r * 1.15);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.95, -r * 0.25);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.8, r * 0.75);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, r * 1.12);
      ctx.moveTo(0, 0);
      ctx.lineTo(-r * 0.8, r * 0.75);
      ctx.moveTo(0, 0);
      ctx.lineTo(-r * 0.95, -r * 0.25);
      ctx.stroke();

      // Numero in rilievo grande, grassetto e nitidissimo
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(r * 0.9)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;

      const displayVal = d.settled || d.bounceCount >= 2 ? d.finalValue : Math.floor(Math.random() * 10) + 1;

      // Piccolo contorno per il numero per staccarlo con nitidezza assoluta
      if (d.settled && d.isTen) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeText(displayVal.toString(), 0, 1);
      } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(displayVal.toString(), 0, 1);
      }

      ctx.fillStyle = numColor;
      ctx.fillText(displayVal.toString(), 0, 1);

      // Distintivo 10-Again (stellina dorata sull'angolo)
      if (d.isExploded) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'black 12px sans-serif';
        ctx.fillText('★', r * 0.7, -r * 0.7);
      }

      ctx.restore();
    };

    // Loop Fisico e Interpolazione verso la griglia
    const updatePhysics = (time: number) => {
      const elapsed = time - startTime;
      ctx.clearRect(0, 0, width, height);

      // Panno vellutato scuro con cornice elegante
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.6);
      bgGrad.addColorStop(0, '#0f172a'); // Slate blu profondo
      bgGrad.addColorStop(1, '#020617'); // Bordo quasi nero
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      let allSettled = true;

      dice.forEach((d) => {
        if (!d.settled) {
          d.vy += 0.48;
          d.vx *= 0.97;
          d.vy *= 0.97;

          d.x += d.vx;
          d.y += d.vy;
          d.rotZ += d.vRotZ;
          d.vRotZ *= 0.95;

          const floorY = height - d.radius - 25;
          if (d.y >= floorY) {
            d.y = floorY;
            d.vy = -d.vy * 0.55;
            d.bounceCount++;

            if (Math.abs(d.vy) > 1.2) {
              diceSensory.playDiceBounceSound(Math.min(1.0, Math.abs(d.vy) / 6));
              diceSensory.triggerHaptic('bounce');
            } else if (elapsed > 550) {
              d.settled = true;
              diceSensory.triggerHaptic('settle');
              if (d.isTen) diceSensory.playSuccessChime(true);
              else if (d.isSuccess) diceSensory.playSuccessChime(false);
            }
          }

          if (d.x <= d.radius + 15) {
            d.x = d.radius + 15;
            d.vx = Math.abs(d.vx) * 0.7;
            diceSensory.playDiceBounceSound(0.5);
          } else if (d.x >= width - d.radius - 15) {
            d.x = width - d.radius - 15;
            d.vx = -Math.abs(d.vx) * 0.7;
            diceSensory.playDiceBounceSound(0.5);
          }

          allSettled = false;
        } else {
          // Si orienta in posizione perfetta e si sposta con eleganza verso la sua casella ordinata
          d.rotZ = d.rotZ * 0.75;
          d.x += (d.targetX - d.x) * 0.12;
          d.y += (d.targetY - d.y) * 0.12;
        }

        drawD10(d);
      });

      if (allSettled || elapsed > 1800) {
        if (!allSettledAnnounced) {
          allSettledAnnounced = true;
          dice.forEach((d) => {
            d.settled = true;
            d.rotZ = 0;
          });

          if (botch) {
            diceSensory.triggerHaptic('botch');
          } else if (anyTen) {
            diceSensory.triggerHaptic('ten_again');
          } else if (totalSuccesses > 0) {
            diceSensory.triggerHaptic('success');
          }

          setIsFinished(true);
        }
      }

      animationId = requestAnimationFrame(updatePhysics);
    };

    animationId = requestAnimationFrame(updatePhysics);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [diceValues, explodedCount, isChanceDie]);

  const handleInstantComplete = () => {
    setIsFinished(true);
    onComplete();
  };

  return (
    <div
      onClick={handleInstantComplete}
      className="relative w-full rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-slate-950 shadow-2xl shadow-indigo-950/60 cursor-pointer select-none group"
      title="Tocca per continuare la narrazione"
    >
      <canvas ref={canvasRef} className="w-full h-56 sm:h-64 block" />

      {/* Pill veloce "Salta" in basso a destra solo durante il rotolamento */}
      {!isFinished && (
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-full border border-slate-700/80 pointer-events-none shadow-md">
          Tocca per saltare ⏩
        </div>
      )}
    </div>
  );
};
