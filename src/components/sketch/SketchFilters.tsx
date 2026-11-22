/**
 * Shared SVG filters. `boil-0..2` are three turbulence seeds; cycling an
 * element's filter between them makes its outline jitter like a cartoon
 * (used for HTML text such as the logo, where rough.js can't help).
 */
export function SketchFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      className="absolute"
    >
      <defs>
        {[3, 17, 41].map((seed, i) => (
          <filter
            key={seed}
            id={`boil-${i}`}
            x="-5%"
            y="-10%"
            width="110%"
            height="120%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.035"
              numOctaves="2"
              seed={seed}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2.4"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
