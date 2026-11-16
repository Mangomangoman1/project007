// THROWAWAY preview for screenshots. Delete before finishing.
import { HouseCutaway } from '@/components/HouseCutaway/HouseCutaway';
import type { Zone } from '@/lib/types';

const ZONES: Zone[] = ['roof','attic','exterior-walls','windows','electrical-panel','wiring-outlets','kitchen','bathroom','plumbing-supply','drains-sewer','water-heater','heating-cooling','basement-foundation','garage','deck-yard','interior-surfaces','chimney','whole-house'];
const W = { sm: 160, md: 360, lg: 1000 } as const;

export default function Preview() {
  const sizes = ['sm', 'md', 'lg'] as const;
  return (
    <div style={{ padding: 16, display: 'grid', gap: 24 }}>
      {sizes.map((size) => (
        <div key={size} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'start' }}>
          {[['neutral', []] as const, ...ZONES.map((z) => [z, [z]] as const), ['multi', ['electrical-panel', 'basement-foundation', 'attic']] as const, ['all', ZONES] as const].map(([id, zs]) => (
            <div key={id} id={`c-${size}-${id}`} style={{ width: W[size], padding: 4 }}>
              <HouseCutaway size={size} zones={[...zs]} />
            </div>
          ))}
          <div id={`c-${size}-counts`} style={{ width: W[size], padding: 4 }}>
            <HouseCutaway size={size} counts={{ 'electrical-panel': 4, attic: 3, roof: 1, kitchen: 2, 'basement-foundation': 5, 'whole-house': 2, 'heating-cooling': 3, windows: 1, 'plumbing-supply': 1, garage: 1, 'deck-yard': 1, 'interior-surfaces': 2, 'wiring-outlets': 1, bathroom: 1, chimney: 1, 'exterior-walls': 2, 'water-heater': 1, 'drains-sewer': 1 }} />
          </div>
        </div>
      ))}
      <div id="c-phone-lg" style={{ width: 358, padding: 4 }}><HouseCutaway size="lg" zones={['roof', 'kitchen']} /></div>
      <div id="c-wide-all" style={{ width: 1300, padding: 4 }}><HouseCutaway size="lg" zones={ZONES} /></div>
    </div>
  );
}
