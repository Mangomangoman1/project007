import type { ReactNode } from 'react';
import type { Zone } from '@/lib/types';
import { ZONE_LABEL } from '@/lib/labels';
import { aggregate, batt, hatch, pts, rectPoly, stipple, type Pt } from './geometry';
import s from './HouseCutaway.module.css';

export type HouseCutawayProps = {
  /** Zones to highlight ("look here"). */
  zones?: Zone[];
  /** Optional count per zone, drawn as a numbered dot (used on the report overview). */
  counts?: Partial<Record<Zone, number>>;
  /** 'sm' = inline thumbnail (~160px wide), 'md' = beside text (~360px), 'lg' = full width. */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible description; defaults to a sentence listing the highlighted zones. */
  label?: string;
  className?: string;
};

/* ==========================================================================
   The drawing: a section through a two-storey house, cut perpendicular to the
   ridge. viewBox 0 0 840 528. Grade at y=392. All strokes are non-scaling
   (set in CSS), so line weights stay true at every size.
   ========================================================================== */

const W = 840;
const H = 528;
const GL = 392; // grade
const K = 118 / 186; // roof pitch (rise / run), about 7.6 in 12
/** Top of roof surface at x (main house). */
const yT = (x: number) => (x <= 404 ? 184 - (x - 218) * K : 184 - (590 - x) * K);
const r = (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h });

const hRect = (x: number, y: number, w: number, h: number, gap = 4, angle = 45) => hatch(rectPoly(x, y, w, h), gap, angle);

type ZoneArt = {
  /** Shapes washed blue when highlighted. */
  wash: ReactNode;
  /** The linework. */
  art: ReactNode;
  /** Line-only zones (pipes, wiring, outline) get a soft highlighter halo when on. */
  halo?: boolean;
};

/* ---------- reusable pieces ---------- */

const roofPoly: Pt[] = [
  [218, 184],
  [404, 66],
  [590, 184],
  [590, 194],
  [404, 76],
  [218, 194],
];
const atticPoly: Pt[] = [
  [247, 176],
  [404, 76],
  [561, 176],
];
const garageRoof: Pt[] = [
  [48, 290.4],
  [244, 250.4],
  [244, 257.4],
  [48, 297.4],
];
const chimneyPath =
  'M392 42V274H388V362H392V480H384V494H426V480H418V362H412V334L432 324V274H418V42Z';
const outlinePoly: Pt[] = [
  [60, 392],
  [60, 294.9],
  [48, 297.4],
  [48, 290.4],
  [244, 250.4],
  [244, 194],
  [218, 194],
  [218, 184],
  [392, yT(392)],
  [392, 42],
  [388, 42],
  [388, 36],
  [422, 36],
  [422, 42],
  [418, 42],
  [418, yT(418)],
  [590, 184],
  [590, 194],
  [564, 194],
  [564, 362],
  [568, 362],
  [568, GL],
];

/** Earth: a band of section hatching under grade and around the foundation. */
const earth = [
  hRect(0, GL, 58, 18, 6),
  hRect(76, 396, 164, 14, 6),
  hRect(228, 410, 12, 70, 6),
  hRect(568, GL, 272, 18, 6),
  hRect(568, 410, 16, 70, 6),
  hRect(214, 494, 380, 10, 6),
  hRect(266, 474, 118, 6, 6),
  hRect(426, 474, 116, 6, 6),
].join('');

const concrete = (x: number, y: number, w: number, h: number, seed: number) => (
  <>
    <path className={s.dots} d={stipple(x, y, w, h, 0.045, seed)} />
    <path className={s.agg} d={aggregate(x, y, w, h, Math.max(1, Math.round((w * h) / 260)), seed + 11)} />
  </>
);

/* ---------- zones ---------- */

function drawing(): Record<Zone, ZoneArt> {
  return {
    /* Rooms and their finishes: floors, ceilings, partitions, the hall door. */
    'interior-surfaces': {
      wash: (
        <>
          <rect {...r(418, 182, 138, 84)} />
          <rect {...r(358, 182, 34, 84)} />
          <rect {...r(432, 274, 124, 88)} />
        </>
      ),
      art: (
        <>
          {/* ceiling, second floor and first floor assemblies (cut) */}
          <rect className={`${s.m} ${s.paper}`} {...r(252, 176, 304, 6)} />
          <rect className={`${s.m} ${s.paper}`} {...r(252, 266, 304, 8)} />
          <rect className={`${s.m} ${s.paper}`} {...r(254, 362, 300, 8)} />
          <path
            className={`${s.t} ${s.fine}`}
            d={[...Array(19)].map((_, i) => `M${262 + i * 16} 266v8M${262 + i * 16} 362v8`).join('')}
          />
          {/* wet-wall partition between bath and hall */}
          <rect className={s.m} {...r(340, 182, 18, 84)} />
          {/* hall door, seen on the back wall */}
          <path className={s.m} d="M364 266V214H388V266" />
          <path className={`${s.t} ${s.fine}`} d="M367 266V217H385V266M367 240H385" />
          <circle className={`${s.t} ${s.fine}`} cx={383} cy={242} r={1.2} />
          {/* skirting lines */}
          <path className={`${s.t} ${s.fine}`} d="M418 262H556M432 358H556M358 262H392" />
          {/* bed */}
          <path className={s.m} d="M434 266V230H440V248H520V266M434 248H440" />
          <path className={`${s.t} ${s.fine}`} d="M440 248V242Q440 240 442 240H458Q461 240 461 243V248M440 254H520M518 266V254" />
          {/* sofa */}
          <path
            className={s.m}
            d="M470 362V336Q470 332 474 332H480V344H532V332H538Q542 332 542 336V362"
          />
          <path className={`${s.t} ${s.fine}`} d="M480 344V350H532V344M474 362V358M538 362V358" />
        </>
      ),
    },

    attic: {
      wash: <polygon points={pts(atticPoly)} />,
      art: (
        <>
          <path className={`${s.t} ${s.fine}`} d={batt(272, 384, 163, 175, 7)} />
          <path className={`${s.t} ${s.fine}`} d={batt(426, 538, 163, 175, 7)} />
          <path className={`${s.t} ${s.sm}`} d="M272 169H384M426 169H538" />
          {/* gable vent, seen on the far gable */}
          <rect className={s.m} {...r(440, 116, 22, 20)} />
          <path className={`${s.t} ${s.fine}`} d="M443 121H459M443 126H459M443 131H459" />
          {/* attic access hatch in the ceiling */}
          <path className={s.dash} d="M364 176V182M388 176V182" />
          <path className={`${s.m}`} d="M364 182H388" strokeDasharray="3 2" />
          {/* the space itself: faint outline under the rafters */}
          <polygon className={`${s.t} ${s.fine} ${s.faint}`} points={pts(atticPoly)} />
        </>
      ),
    },

    kitchen: {
      wash: <rect {...r(252, 274, 136, 88)} />,
      art: (
        <>
          {/* base cabinets + counter */}
          <rect className={s.m} {...r(252, 326, 88, 4)} />
          <path className={s.m} d="M256 330V356H338V330M260 356V362" />
          <path
            className={`${s.t} ${s.fine}`}
            d="M259 333H282V353H259ZM286 333H309V353H286ZM313 333H335V353H313Z"
          />
          {/* sink basin (hidden) + faucet */}
          <path className={s.dash} d="M290 330V339Q290 343 294 343H310Q314 343 314 339V330" />
          <path className={s.m} d="M307 326V316Q307 311 302 311H298V315" />
          {/* upper cabinets */}
          <rect className={s.m} {...r(256, 280, 28, 26)} />
          <rect className={s.m} {...r(320, 280, 18, 26)} />
          <path className={`${s.t} ${s.fine}`} d="M259 283H281V303H259ZM323 283H335V303H323Z" />
          {/* range + hood */}
          <rect className={s.m} {...r(358, 330, 28, 32)} />
          <rect className={s.m} {...r(356, 326, 32, 4)} />
          <rect className={s.m} {...r(358, 318, 28, 8)} />
          <path className={`${s.t} ${s.fine}`} d="M361 336H383V357H361ZM364 340H380V348H364ZM363 338.5H381" />
          <path className={`${s.t} ${s.fine}`} d="M363 322h2M370 322h2M377 322h2" />
          <path className={s.m} d="M358 298L363 288H381L386 298Z" />
          <path className={`${s.t} ${s.fine}`} d="M368 288V274M376 288V274" />
        </>
      ),
    },

    bathroom: {
      wash: <rect {...r(252, 182, 88, 84)} />,
      art: (
        <>
          {/* tub */}
          <path className={s.m} d="M253 244H306V249H303V262Q303 266 299 266H256" />
          <path className={`${s.t} ${s.fine}`} d="M258 249V256Q258 262 264 262H296Q302 262 302 256V249" />
          <path className={s.m} d="M253 234H261V237" />
          <path className={`${s.t} ${s.fine}`} d="M253 196H258L263 201M261.5 202.5l-2 2" />
          {/* toilet */}
          <rect className={s.m} {...r(326, 216, 12, 22)} />
          <path className={`${s.t} ${s.fine}`} d="M325 219H339" />
          <path className={s.m} d="M308 238H338V242H330Q330 252 324 256L326 266H316L317 256Q310 251 310 242H308Z" />
          {/* towel rail and mirror on the back wall */}
          <rect className={`${s.t} ${s.fine}`} {...r(276, 200, 22, 28)} />
          <path className={`${s.t} ${s.fine}`} d="M270 236H304" />
        </>
      ),
    },

    'basement-foundation': {
      wash: (
        <>
          <rect {...r(240, 362, 14, 118)} />
          <rect {...r(554, 362, 14, 118)} />
          <rect {...r(228, 480, 38, 14)} />
          <rect {...r(542, 480, 38, 14)} />
          <rect {...r(254, 466, 300, 8)} />
        </>
      ),
      art: (
        <>
          <path
            className={`${s.o} ${s.paper}`}
            d="M240 362H254V466H554V362H568V480H580V494H542V480H554V474H254V480H266V494H228V480H240Z"
          />
          <path className={s.t} d="M254 474H554M240 480H254M554 480H568" />
          <g className={s.fine}>
            {concrete(240, 362, 14, 118, 3)}
            {concrete(554, 362, 14, 118, 5)}
            {concrete(228, 480, 38, 14, 9)}
            {concrete(542, 480, 38, 14, 13)}
            {concrete(254, 466, 300, 8, 17)}
          </g>
          {/* footing drains */}
          <circle className={`${s.t} ${s.fine}`} cx={221} cy={488} r={4} />
          <circle className={`${s.t} ${s.fine}`} cx={587} cy={488} r={4} />
        </>
      ),
    },

    'exterior-walls': {
      wash: (
        <>
          <rect {...r(244, 176, 8, 16)} />
          <rect {...r(244, 224, 8, 138)} />
          <rect {...r(556, 176, 8, 20)} />
          <rect {...r(556, 244, 8, 40)} />
        </>
      ),
      art: (
        <>
          <path
            className={`${s.h} ${s.fine}`}
            d={[hRect(244, 176, 8, 16, 3.5), hRect(244, 224, 8, 138, 3.5), hRect(556, 176, 8, 20, 3.5), hRect(556, 244, 8, 40, 3.5)].join('')}
          />
          <path className={s.o} d="M244 192V176H252V192M244 224H252V362M244 224V362M556 196V176H564V196M556 244H564V284H556Z" />
          <path className={s.o} d="M244 362H252" />
        </>
      ),
    },

    windows: {
      wash: (
        <>
          <rect {...r(238, 192, 14, 35)} />
          <rect {...r(556, 196, 14, 51)} />
          <rect {...r(286, 284, 32, 37)} />
          <rect {...r(464, 288, 54, 49)} />
          <rect {...r(556, 284, 8, 78)} />
        </>
      ),
      art: (
        <>
          {/* bath window, cut */}
          <path className={s.m} d="M244 192H252M244 224H252M244 192V224M252 192V224" />
          <path className={s.t} d="M247.3 194V222M248.7 194V222" />
          <path className={s.m} d="M238 224H244V227H238Z" />
          {/* bedroom window, cut */}
          <path className={s.m} d="M556 196H564M556 244H564M556 196V244M564 196V244" />
          <path className={s.t} d="M559.3 198V242M560.7 198V242" />
          <path className={s.m} d="M564 244H570V247H564" />
          {/* kitchen window, seen on the back wall */}
          <rect className={s.m} {...r(288, 284, 28, 34)} />
          <path className={s.t} d="M288 301H316M291 287H313V298H291ZM291 304H313V315H291Z" />
          <rect className={s.m} {...r(286, 318, 32, 3)} />
          {/* living room window, seen */}
          <rect className={s.m} {...r(466, 290, 50, 44)} />
          <path className={s.t} d="M491 290V334M469 293H488V331H469ZM494 293H513V331H494Z" />
          <path className={`${s.t} ${s.fine}`} d="M469 312H488M494 312H513" />
          <rect className={s.m} {...r(464, 334, 54, 3)} />
          {/* glazed door to the deck, cut */}
          <path className={s.m} d="M556 284H564M556 284V362M564 284V362M556 362H568" />
          <path className={s.t} d="M559.3 288V358M560.7 288V358" />
        </>
      ),
    },

    roof: {
      wash: (
        <>
          <polygon points={pts(roofPoly)} />
          <path d="M210 184h8v12h-8zM590 184h8v12h-8z" />
        </>
      ),
      art: (
        <>
          <path className={`${s.h} ${s.fine}`} d={[hatch(roofPoly.slice(0, 2).concat([[404, 76], [218, 194]]), 5, -45), hatch([[404, 66], [590, 184], [590, 194], [404, 76]], 5, 45)].join('')} />
          <polygon className={`${s.o} ${s.paper2}`} points={pts(roofPoly)} />
          <path className={`${s.t} ${s.fine}`} d={`M221 ${184 - 3 * K + 3.4}L404 69.5L587 ${184 - 3 * K + 3.4}`} />
          {/* soffits */}
          <path className={s.m} d="M218 194H244M564 194H590" />
          {/* gutters */}
          <path className={s.m} d="M211 185V192Q211 196 214.5 196Q218 196 218 192M597 185V192Q597 196 593.5 196Q590 196 590 192" />
          {/* garage roof covering is drawn with the garage */}
        </>
      ),
    },

    chimney: {
      wash: <path d={chimneyPath} />,
      art: (
        <>
          <path className={`${s.o} ${s.paper}`} d={chimneyPath} />
          <path
            className={`${s.h} ${s.fine}`}
            d={[
              hRect(392, 42, 26, 232, 4, -45),
              hRect(388, 274, 44, 50, 4, -45),
              hatch(
                [
                  [388, 324],
                  [432, 324],
                  [412, 334],
                  [412, 362],
                  [388, 362],
                ],
                4,
                -45,
              ),
              hRect(392, 362, 26, 118, 4, -45),
            ].join('')}
          />
          <g className={s.fine}>{concrete(384, 480, 42, 14, 21)}</g>
          <path className={`${s.m} ${s.paper}`} d="M388 36H422V42H388Z" />
          {/* flue liner */}
          <path className={`${s.t} ${s.paper}`} d="M398 42V318M412 42V318" />
          {/* mantel + hearth */}
          <path className={s.m} d="M432 318H446V322H432M432 358H454V362" />
          {/* firebox */}
          <path className={`${s.t} ${s.fine}`} d="M416 362V340L432 332" />
          {/* ash cleanout */}
          <rect className={s.t} {...r(398, 440, 14, 10)} />
        </>
      ),
    },

    garage: {
      wash: (
        <polygon
          points={pts([
            [48, 290.4],
            [244, 250.4],
            [244, 396],
            [60, 396],
            [60, 297.4],
            [48, 297.4],
          ])}
        />
      ),
      art: (
        <>
          <path className={`${s.h} ${s.fine}`} d={hatch(garageRoof, 5, -45) + hRect(60, 297, 8, 91, 3.5)} />
          <polygon className={`${s.o} ${s.paper2}`} points={pts(garageRoof)} />
          <path className={s.m} d="M41 291V297Q41 300.5 44.5 300.5Q48 300.5 48 297" />
          <path className={s.o} d="M60 296.8V388H68V295.2" />
          {/* slab + frost wall */}
          <path className={`${s.o} ${s.paper}`} d="M58 388H240V396H70V424H76V434H52V424H58Z" />
          <g className={s.fine}>
            {concrete(70, 388, 170, 8, 31)}
            {concrete(58, 396, 12, 28, 33)}
            {concrete(52, 424, 24, 10, 35)}
          </g>
          {/* overhead door, seen on the far wall */}
          <rect className={s.m} {...r(92, 304, 120, 84)} />
          <path className={s.t} d="M92 325H212M92 346H212M92 367H212" />
          <path
            className={`${s.t} ${s.fine}`}
            d="M99 310H121V319H99ZM127 310H149V319H127ZM155 310H177V319H155ZM183 310H205V319H183ZM146 380H158"
          />
          <path className={s.t} d="M88 388V300H216V388" />
          {/* opener rail and motor */}
          <path className={`${s.t} ${s.fine}`} d="M118 293H212M150 293V282M196 293V279" />
          <rect className={`${s.m} ${s.fine}`} {...r(212, 287, 20, 10)} />
        </>
      ),
    },

    'deck-yard': {
      wash: (
        <>
          <rect {...r(568, 318, 140, 74)} />
          <rect {...r(708, 380, 132, 12)} />
          <circle cx={800} cy={304} r={30} />
        </>
      ),
      art: (
        <>
          {/* ledger, boards, joist */}
          <rect className={s.m} {...r(568, 356, 4, 16)} />
          <rect className={`${s.o} ${s.paper}`} {...r(568, 356, 116, 5)} />
          <path className={`${s.t} ${s.fine}`} d={[...Array(19)].map((_, i) => `M${574 + i * 6} 356v5`).join('')} />
          <rect className={s.m} {...r(572, 361, 108, 11)} />
          <rect className={s.m} {...r(656, 372, 24, 6)} />
          {/* post on a pier */}
          <rect className={`${s.m} ${s.paper}`} {...r(664, 378, 7, 14)} />
          <rect className={`${s.m} ${s.paper}`} {...r(659, 392, 17, 16)} />
          <g className={s.fine}>{concrete(659, 392, 17, 16, 41)}</g>
          {/* railing, seen beyond */}
          <rect className={s.m} {...r(570, 320, 114, 4)} />
          <rect className={s.m} {...r(678, 324, 6, 32)} />
          <path className={s.t} d={[...Array(12)].map((_, i) => `M${579 + i * 8.5} 324V356`).join('')} />
          {/* steps */}
          <path className={s.m} d="M684 356V368H696V380H708V392" />
          <path className={`${s.t} ${s.fine}`} d="M684 372L700 392" />
          {/* tree */}
          <path className={s.m} d="M797.5 392V333M802.5 392V333" />
          <path
            className={s.m}
            d="M800 274C784 274 772 286 772 300C772 309 776 316 783 320C788 330 812 330 817 320C824 316 828 309 828 300C828 286 816 274 800 274Z"
          />
          <path className={`${s.t} ${s.fine}`} d="M800 333V300M800 318L787 305M800 310L812 297M787 305L784 296M812 297L816 291" />
          {/* grass */}
          <path
            className={`${s.t} ${s.fine}`}
            d={[592, 606, 622, 640, 652, 716, 764, 778, 790, 812, 826]
              .map((x) => `M${x - 3} ${GL}l2 -5M${x} ${GL}v-6M${x + 3} ${GL}l-2 -5`)
              .join('')}
          />
        </>
      ),
    },

    'heating-cooling': {
      wash: (
        <>
          <rect {...r(432, 380, 36, 86)} />
          <rect {...r(436, 371, 112, 10)} />
          <rect {...r(418, 400, 14, 6)} />
          <rect {...r(716, 362, 44, 32)} />
        </>
      ),
      art: (
        <>
          {/* furnace */}
          <rect className={`${s.m} ${s.paper}`} {...r(432, 392, 36, 74)} />
          <rect className={s.m} {...r(438, 381, 24, 11)} />
          <path className={`${s.t} ${s.fine}`} d="M436 398H464V428H436ZM440 404H460M440 410H460M440 416H460M440 422H460" />
          <rect className={s.t} {...r(444, 436, 12, 8)} />
          {/* supply trunk + register */}
          <rect className={`${s.m} ${s.paper}`} {...r(436, 371, 112, 10)} />
          <path className={s.m} d="M538 371V362M548 371V362" />
          <path className={s.t} d="M537 360H549M539 358V362M543 358V362M547 358V362" />
          {/* flue to chimney */}
          <rect className={`${s.m} ${s.paper}`} {...r(418, 400, 14, 6)} />
          {/* outdoor condenser + line set */}
          <path className={s.t} d="M716 384H568M716 387H568" />
          <rect className={`${s.m} ${s.paper}`} {...r(720, 364, 36, 26)} />
          <rect className={s.m} {...r(716, 390, 44, 4)} />
          <path
            className={`${s.t} ${s.fine}`}
            d={[...Array(10)].map((_, i) => `M${724 + i * 3.2} 369V386`).join('') + 'M726 364Q738 358 750 364'}
          />
        </>
      ),
    },

    'water-heater': {
      wash: <path d="M362 466V407Q362 402 374 400Q386 402 386 407V466Z" />,
      art: (
        <>
          <path className={`${s.m} ${s.paper}`} d="M362 466V407Q362 402 374 400Q386 402 386 407V466Z" />
          <path className={`${s.t} ${s.fine}`} d="M362 412H386M362 458H386M368 444H380V452H368Z" />
          {/* relief valve + discharge */}
          <path className={`${s.t} ${s.fine}`} d="M386 420H389V460" />
        </>
      ),
    },

    'electrical-panel': {
      wash: <rect {...r(252, 382, 26, 48)} />,
      art: (
        <>
          <rect className={`${s.m} ${s.paper}`} {...r(256, 386, 16, 40)} />
          <rect className={s.t} {...r(259, 389, 10, 5)} />
          <path
            className={`${s.t} ${s.fine}`}
            d={[...Array(6)].map((_, i) => `M259 ${398 + i * 4}h4M265 ${398 + i * 4}h4`).join('')}
          />
          {/* service conduit leaving through the foundation */}
          <path className={s.m} d="M264 426V432" />
        </>
      ),
    },

    'plumbing-supply': {
      halo: true,
      wash: null,
      art: (
        <>
          {/* water main from the street, meter, shut-off */}
          <path className={s.pipe} d="M0 444H343V226M343 232H338" />
          <rect className={`${s.m} ${s.paper}`} {...r(290, 439, 12, 10)} />
          <path className={`${s.t} ${s.paper}`} d="M270 440L278 448V440L270 448Z" />
          {/* hot riser from the heater */}
          <path className={s.pipe} d="M346 232V386H347.5M356.5 386H380V400" />
          {/* cold feed to the heater */}
          <path className={s.pipe} d="M343 392H347.5M356.5 392H368V401" />
          {/* hidden branches: kitchen sink, tub */}
          <path className={s.dash} d="M343 344H310M346 340H306M343 236H262" />
        </>
      ),
    },

    'drains-sewer': {
      halo: true,
      wash: null,
      art: (
        <>
          <polygon
            className={s.paper}
            points={pts([
              [349, 88],
              [355, 88],
              [355, 456],
              [240, 456],
              [0, 480],
              [0, 474],
              [240, 450],
              [349, 450],
            ])}
          />
          <path className={s.pipe2} d="M349 88V450H240L0 474M355 88V456H240L0 480M348 88H356" />
          <path className={`${s.t}`} d="M347.5 97H356.5" />
          {/* hidden branch drains and traps */}
          <path className={s.dash} d="M326 266V271H349M262 266V271H326M302 343V349Q302 353 306 353H349" />
          {/* cleanout at the base */}
          <rect className={`${s.t} ${s.paper}`} {...r(356, 446, 5, 7)} />
        </>
      ),
    },

    'wiring-outlets': {
      halo: true,
      wash: null,
      art: (
        <>
          <path
            className={s.wire}
            d="M264 386V366H531V264M531 348V366M531 270H494M531 264V180H481M262 366V316"
          />
          {/* outlets */}
          <rect className={`${s.m} ${s.paper}`} {...r(528, 348, 6, 8)} />
          <rect className={`${s.m} ${s.paper}`} {...r(528, 252, 6, 8)} />
          <rect className={`${s.m} ${s.paper}`} {...r(259, 310, 6, 8)} />
          <path className={`${s.t} ${s.fine}`} d="M530 350.5v3M532 350.5v3M530 254.5v3M532 254.5v3M261 312.5v3M263 312.5v3" />
          {/* light fittings */}
          <path className={s.m} d="M494 274V285M486 293L490 285H498L502 293Z" />
          <path className={s.m} d="M472 182H490Q488 188 481 188Q474 188 472 182Z" />
          <path className={s.m} d="M300 274V280M293 280H307L305 284H295Z" />
        </>
      ),
    },

    'whole-house': {
      halo: true,
      wash: <polygon points={pts(outlinePoly)} />,
      art: <polyline className={`${s.o} ${s.outline}`} points={pts(outlinePoly)} />,
    },
  };
}

/** Draw order, back to front. */
const ORDER: Zone[] = [
  'interior-surfaces',
  'attic',
  'kitchen',
  'bathroom',
  'whole-house',
  'basement-foundation',
  'exterior-walls',
  'windows',
  'roof',
  'garage',
  'deck-yard',
  'heating-cooling',
  'chimney',
  'water-heater',
  'electrical-panel',
  'plumbing-supply',
  'drains-sewer',
  'wiring-outlets',
];

/* ---------- callouts ---------- */

type Callout = { at: Pt; tag: Pt; side: 'l' | 'r' };
/**
 * `at` is the point on the drawing (count dots sit here); `tag` is where the numbered keynote sits,
 * in clear space. Tags never overlap one another, so any combination of zones can be shown.
 */
const CALLOUT: Record<Zone, Callout> = {
  roof: { at: [300, 137], tag: [204, 56], side: 'l' },
  bathroom: { at: [280, 255], tag: [204, 100], side: 'l' },
  'exterior-walls': { at: [248, 240], tag: [204, 144], side: 'l' },
  kitchen: { at: [300, 342], tag: [204, 188], side: 'l' },
  garage: { at: [152, 350], tag: [36, 240], side: 'r' },
  chimney: { at: [405, 56], tag: [624, 44], side: 'r' },
  attic: { at: [478, 169], tag: [624, 92], side: 'r' },
  'whole-house': { at: [590, 189], tag: [624, 140], side: 'r' },
  'interior-surfaces': { at: [486, 214], tag: [624, 184], side: 'r' },
  windows: { at: [560, 222], tag: [624, 224], side: 'r' },
  'wiring-outlets': { at: [531, 256], tag: [624, 264], side: 'r' },
  'deck-yard': { at: [630, 358], tag: [624, 300], side: 'r' },
  'basement-foundation': { at: [561, 440], tag: [624, 440], side: 'r' },
  'heating-cooling': { at: [450, 432], tag: [624, 478], side: 'r' },
  'drains-sewer': { at: [150, 462], tag: [24, 512], side: 'r' },
  'electrical-panel': { at: [264, 408], tag: [170, 512], side: 'r' },
  'plumbing-supply': { at: [296, 444], tag: [312, 512], side: 'r' },
  'water-heater': { at: [374, 436], tag: [432, 512], side: 'r' },
};

const ALL: Zone[] = ORDER;

function listWords(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * A line-drawn cross-section of a two-storey American house: pitched roof, attic, chimney,
 * basement, attached garage, deck and yard. Every Zone is an addressable group. Highlighted
 * zones get a blueprint-blue wash, heavier line and a numbered keynote; the rest recede.
 * With `counts`, a numbered dot marks each zone that has one. Server-safe: no hooks.
 */
export function HouseCutaway({ zones = [], counts, size = 'md', label, className }: HouseCutawayProps) {
  const on = new Set(zones.filter((z) => z in CALLOUT));
  const tagged = [...on];
  const countList = counts
    ? ALL.filter((z) => (counts[z] ?? 0) > 0).map((z) => ({ z, n: counts[z] as number }))
    : [];
  const art = drawing();
  const hi = on.size > 0;
  const showTags = hi && countList.length === 0;

  const aria =
    label ??
    (hi
      ? `House cross-section highlighting ${listWords(tagged.map((z) => ZONE_LABEL[z].toLowerCase()))}.`
      : countList.length
        ? `House cross-section with the number of issues by part of the house: ${countList
            .map(({ z, n }) => `${ZONE_LABEL[z].toLowerCase()} ${n}`)
            .join(', ')}.`
        : 'Cross-section of a two-storey house with attic, chimney, basement, attached garage and deck.');

  return (
    <figure
      className={[s.root, className].filter(Boolean).join(' ')}
      data-size={size}
      data-highlight={hi ? '' : undefined}
    >
      <svg
        className={`${s.svg} ${hi ? s.hi : ''}`}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={aria}
        fill="none"
        focusable="false"
      >
        {/* earth and grade */}
        <g className={s.ctx} aria-hidden="true">
          <path className={`${s.h} ${s.earth}`} d={earth} />
          <path className={s.o} d={`M0 ${GL}H58M568 ${GL}H840`} />
        </g>

        {/* washes for highlighted zones */}
        <g className={s.washes} aria-hidden="true">
          {ORDER.filter((z) => on.has(z)).map((z) => (
            <g key={z} data-zone={z}>
              {art[z].wash}
            </g>
          ))}
        </g>

        {/* the drawing */}
        {ORDER.map((z) => {
          const a = art[z];
          const isOn = on.has(z);
          return (
            <g key={z} className={`${s.z} ${isOn ? s.on : ''}`} data-zone={z} aria-hidden="true">
              {isOn && a.halo && <g className={s.halo}>{a.art}</g>}
              {a.art}
            </g>
          );
        })}

        {/* keynotes */}
        {showTags && (
          <g className={s.callouts} aria-hidden="true">
            {tagged.map((z, i) => {
              const { at, tag, side } = CALLOUT[z];
              return (
                <g key={z} data-zone={z}>
                  <path className={s.leader} d={`M${tag[0]} ${tag[1]}L${at[0]} ${at[1]}`} />
                  <g transform={`translate(${at[0]} ${at[1]})`}>
                    <circle className={`${s.k} ${s.anchor}`} r={2.6} />
                  </g>
                  <g transform={`translate(${tag[0]} ${tag[1]})`}>
                    <g className={s.k}>
                      <circle className={s.tag} r={9} />
                      <text className={s.tagN} textAnchor="middle" dominantBaseline="central">
                        {i + 1}
                      </text>
                    </g>
                    <text
                      className={s.lbl}
                      x={side === 'r' ? 14 : -14}
                      textAnchor={side === 'r' ? 'start' : 'end'}
                      dominantBaseline="central"
                    >
                      {ZONE_LABEL[z].toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        )}

        {/* locator rings: thumbnails only, where keynotes would be too small */}
        {hi && (
          <g className={s.rings} aria-hidden="true">
            {tagged
              .filter((z) => z !== 'whole-house')
              .map((z) => (
                <g key={z} transform={`translate(${CALLOUT[z].at[0]} ${CALLOUT[z].at[1]})`}>
                  <circle className={`${s.k} ${s.ring}`} r={9} />
                </g>
              ))}
          </g>
        )}

        {/* count dots */}
        {countList.length > 0 && (
          <g className={s.counts} aria-hidden="true">
            {countList.map(({ z, n }) => (
              <g key={z} transform={`translate(${CALLOUT[z].at[0]} ${CALLOUT[z].at[1]})`} data-zone={z}>
                <g className={s.k}>
                  <circle className={s.count} r={8.5} />
                  <text className={s.countN} textAnchor="middle" dominantBaseline="central">
                    {n}
                  </text>
                </g>
              </g>
            ))}
          </g>
        )}
      </svg>

      {showTags && (
        <ol className={s.key} aria-hidden="true">
          {tagged.map((z, i) => (
            <li key={z}>
              <span className={s.keyN}>{i + 1}</span>
              {ZONE_LABEL[z]}
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}

export default HouseCutaway;
