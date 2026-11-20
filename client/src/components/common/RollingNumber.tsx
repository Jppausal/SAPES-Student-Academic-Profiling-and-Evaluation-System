import { motion, useReducedMotion } from 'framer-motion';

interface RollingNumberProps {
  value: number;
}

const ROLL_CYCLES = 2;
const REEL_LENGTH = 40;

export const RollingNumber: React.FC<RollingNumberProps> = ({ value }) => {
  const prefersReducedMotion = useReducedMotion();
  const formattedValue = new Intl.NumberFormat().format(value);
  const characters = formattedValue.split('');

  return (
    <span className="inline-flex items-baseline">
      <span className="sr-only">{formattedValue}</span>
      <span aria-hidden="true" className="inline-flex h-[1em] overflow-hidden leading-none">
        {characters.map((character, index) => {
          if (!/\d/.test(character) || prefersReducedMotion) {
            return (
              <span key={`${character}-${index}`} className="inline-block h-[1em] leading-none">
                {character}
              </span>
            );
          }

          const targetPosition = ROLL_CYCLES * 10 + Number(character);

          return (
            <span key={`${character}-${index}`} className="inline-block h-[1em] overflow-hidden leading-none">
              <motion.span
                initial={{ y: 0 }}
                animate={{ y: `-${targetPosition}em` }}
                transition={{
                  duration: 1.8,
                  delay: (characters.length - index - 1) * 0.06,
                  ease: [0.12, 0.82, 0.18, 1],
                }}
                className="flex flex-col leading-none"
              >
                {Array.from({ length: REEL_LENGTH }, (_, reelIndex) => (
                  <span key={reelIndex} className="block h-[1em] leading-none">
                    {reelIndex % 10}
                  </span>
                ))}
              </motion.span>
            </span>
          );
        })}
      </span>
    </span>
  );
};
