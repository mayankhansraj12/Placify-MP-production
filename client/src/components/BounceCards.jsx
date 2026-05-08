import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function BounceCards({
  className = '',
  images = [],
  renderCard = null,
  cardCount = 0,
  containerWidth = 400,
  containerHeight = 400,
  animationDelay = 0.5,
  animationStagger = 0.06,
  easeType = 'elastic.out(1, 0.8)',
  transformStyles = [
    'rotate(10deg) translate(-170px)',
    'rotate(5deg) translate(-85px)',
    'rotate(-3deg)',
    'rotate(-10deg) translate(85px)',
    'rotate(2deg) translate(170px)'
  ],
  enableHover = false,
  hoverPush = 160,
}) {
  const containerRef = useRef(null);
  const items = renderCard ? Array.from({ length: cardCount || images.length }) : images;

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.card',
        { scale: 0 },
        { scale: 1, stagger: animationStagger, ease: easeType, delay: animationDelay }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [animationStagger, easeType, animationDelay]);

  const getNoRotationTransform = transformStr => {
    if (/rotate\([\s\S]*?\)/.test(transformStr)) {
      return transformStr.replace(/rotate\([\s\S]*?\)/, 'rotate(0deg)');
    }
    return transformStr === 'none' ? 'rotate(0deg)' : `${transformStr} rotate(0deg)`;
  };

  const getPushedTransform = (baseTransform, offsetX) => {
    const translateRegex = /translate\(([-0-9.]+)px\)/;
    const match = baseTransform.match(translateRegex);
    if (match) {
      const newX = parseFloat(match[1]) + offsetX;
      return baseTransform.replace(translateRegex, `translate(${newX}px)`);
    }
    return baseTransform === 'none' ? `translate(${offsetX}px)` : `${baseTransform} translate(${offsetX}px)`;
  };

  const pushSiblings = hoveredIdx => {
    if (!enableHover || !containerRef.current) return;
    const q = gsap.utils.selector(containerRef);
    items.forEach((_, i) => {
      const sel = q(`.card-${i}`);
      gsap.killTweensOf(sel);
      const base = transformStyles[i] || 'none';
      if (i === hoveredIdx) {
        gsap.to(sel, { transform: getNoRotationTransform(base), duration: 0.4, ease: 'back.out(1.4)', overwrite: 'auto' });
      } else {
        const offsetX = i < hoveredIdx ? -hoverPush : hoverPush;
        gsap.to(sel, {
          transform: getPushedTransform(base, offsetX),
          duration: 0.4,
          ease: 'back.out(1.4)',
          delay: Math.abs(hoveredIdx - i) * 0.05,
          overwrite: 'auto'
        });
      }
    });
  };

  const resetSiblings = () => {
    if (!enableHover || !containerRef.current) return;
    const q = gsap.utils.selector(containerRef);
    items.forEach((_, i) => {
      const sel = q(`.card-${i}`);
      gsap.killTweensOf(sel);
      gsap.to(sel, { transform: transformStyles[i] || 'none', duration: 0.4, ease: 'back.out(1.4)', overwrite: 'auto' });
    });
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: containerWidth, height: containerHeight }}
    >
      {items.map((src, idx) => (
        <div
          key={idx}
          className={`card card-${idx} absolute border-[6px] border-white rounded-[28px] overflow-hidden`}
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18)', transform: transformStyles[idx] || 'none' }}
          onMouseEnter={() => pushSiblings(idx)}
          onMouseLeave={resetSiblings}
        >
          {renderCard
            ? renderCard(idx)
            : <img className="w-full h-full object-cover" src={src} alt={`card-${idx}`} />
          }
        </div>
      ))}
    </div>
  );
}
