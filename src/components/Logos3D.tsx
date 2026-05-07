import React from "react";
import { motion } from "framer-motion";

import clapperboard from "@/assets/logos/clapperboard.png";
import filmreel from "@/assets/logos/filmreel.png";
import soccer from "@/assets/logos/soccer.png";
import tv from "@/assets/logos/tv.png";
import popcorn from "@/assets/logos/popcorn.png";
import play from "@/assets/logos/play.png";
import star from "@/assets/logos/star.png";
import cartoon from "@/assets/logos/cartoon.png";
import trophy from "@/assets/logos/trophy.png";
import headphones from "@/assets/logos/headphones.png";
import controller from "@/assets/logos/controller.png";
import mic from "@/assets/logos/mic.png";
import glasses3d from "@/assets/logos/glasses3d.png";
import whistle from "@/assets/logos/whistle.png";
import remote from "@/assets/logos/remote.png";
import satellite from "@/assets/logos/satellite.png";
import megaphone from "@/assets/logos/megaphone.png";
import heart from "@/assets/logos/heart.png";
import basketball from "@/assets/logos/basketball.png";
import diamond from "@/assets/logos/diamond.png";
import bolt from "@/assets/logos/bolt.png";
import crown from "@/assets/logos/crown.png";

const LOGOS = [
  clapperboard, filmreel, soccer, tv, popcorn, play, star, cartoon,
  trophy, headphones, controller, mic, glasses3d, whistle, remote,
  satellite, megaphone, heart, basketball, diamond, bolt, crown,
];

interface Props {
  density?: number; // 0..1 opacity multiplier
  count?: number;
}

const Logos3D: React.FC<Props> = ({ density = 0.35, count = 22 }) => {
  const items = React.useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const src = LOGOS[i % LOGOS.length];
      const top = Math.random() * 90;
      const left = Math.random() * 92;
      const size = 40 + Math.random() * 70;
      const dur = 8 + Math.random() * 10;
      const delay = Math.random() * 4;
      const rot = (Math.random() - 0.5) * 40;
      const drift = 20 + Math.random() * 40;
      return { src, top, left, size, dur, delay, rot, drift, key: i };
    });
  }, [count]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: "1200px", opacity: density }}
      aria-hidden
    >
      {items.map((it) => (
        <motion.img
          key={it.key}
          src={it.src}
          loading="lazy"
          alt=""
          style={{
            position: "absolute",
            top: `${it.top}%`,
            left: `${it.left}%`,
            width: it.size,
            height: it.size,
            filter: "drop-shadow(0 0 18px hsla(135,100%,50%,0.45))",
            willChange: "transform",
          }}
          initial={{ opacity: 0, rotateY: it.rot }}
          animate={{
            y: [0, -it.drift, 0],
            x: [0, it.drift / 2, -it.drift / 2, 0],
            rotateY: [it.rot - 25, it.rot + 25, it.rot - 25],
            rotateX: [0, 12, -8, 0],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: it.dur,
            delay: it.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default Logos3D;
