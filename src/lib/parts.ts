import type { IconName } from './constants';

/** One part in the catalog, with plain-language tips on what to check before buying. */
export interface CatalogPart {
  id: string;
  name: string;
  icon: IconName;
  /** What to know before you buy, in plain words. */
  tips: string[];
  /** The EngiNear service a mechanic would book to install it. */
  service: string;
  /** Extra words that make store searches more accurate. */
  search?: string;
}

export interface PartGroup { name: string; icon: IconName; parts: CatalogPart[] }

/** Common parts by job. General guidance only: always confirm fit for the exact car. */
export const PART_GROUPS: PartGroup[] = [
  {
    name: 'Brakes', icon: 'disc-outline', parts: [
      { id: 'brake-pads', name: 'Brake pads', icon: 'disc-outline', service: 'Brakes', tips: [
        'Front and rear pads are different. Check which end is squeaking or grinding.',
        'Ceramic pads are quieter and less dusty; semi-metallic grip harder and suit trucks and towing.',
        'Replace pads in pairs (both wheels on the same axle).',
      ] },
      { id: 'rotors', name: 'Brake rotors', icon: 'radio-button-off-outline', service: 'Brakes', tips: [
        'If braking shakes the steering wheel or you hear grinding, the rotors may need replacing, not just the pads.',
        'Buy rotors in pairs for the same axle.',
      ] },
      { id: 'calipers', name: 'Brake calipers', icon: 'hardware-chip-outline', service: 'Brakes', tips: [
        'A car that pulls to one side when braking can mean a sticking caliper.',
        'Remanufactured calipers are common and often come with a core charge you get back when you return the old one.',
      ] },
      { id: 'brake-fluid', name: 'Brake fluid', icon: 'water-outline', service: 'Brakes', search: 'brake fluid DOT', tips: [
        'Use the DOT type printed on the brake fluid reservoir cap (usually DOT 3 or DOT 4).',
      ] },
    ],
  },
  {
    name: 'Oil change', icon: 'water-outline', parts: [
      { id: 'motor-oil', name: 'Motor oil', icon: 'water-outline', service: 'Oil change', tips: [
        'Use the weight in your owner’s manual or on the oil cap (for example 0W-20 or 5W-30).',
        'Most newer cars need full synthetic.',
        'Check how many quarts your engine holds; most cars take 4 to 6.',
      ] },
      { id: 'oil-filter', name: 'Oil filter', icon: 'funnel-outline', service: 'Oil change', tips: [
        'Filters are specific to the engine, so include the engine size when you search.',
      ] },
    ],
  },
  {
    name: 'Battery & electrical', icon: 'battery-charging-outline', parts: [
      { id: 'battery', name: 'Car battery', icon: 'battery-charging-outline', service: 'Battery', tips: [
        'Match the group size printed on your current battery (for example 24F, 35 or H6).',
        'CCA (cold cranking amps) should meet or beat your old battery’s number, especially in cold weather.',
        'Stores usually charge a core fee that you get back when you return the old battery.',
      ] },
      { id: 'alternator', name: 'Alternator', icon: 'flash-outline', service: 'Electrical', tips: [
        'A battery light on the dash or a battery that keeps dying can point to the alternator.',
        'Check the amp rating matches your old one.',
      ] },
      { id: 'starter', name: 'Starter', icon: 'key-outline', service: 'Electrical', tips: [
        'A single click when you turn the key, with a good battery, often means the starter.',
      ] },
      { id: 'bulbs', name: 'Headlight bulbs', icon: 'bulb-outline', service: 'Electrical', search: 'headlight bulb', tips: [
        'Bulb size (like H11 or 9005) is in the owner’s manual. Replace both sides so they match.',
      ] },
    ],
  },
  {
    name: 'Tune-up & filters', icon: 'construct-outline', parts: [
      { id: 'spark-plugs', name: 'Spark plugs', icon: 'flash-outline', service: 'Tune-up', tips: [
        'Buy one for each cylinder (4, 6 or 8). Iridium plugs last the longest.',
      ] },
      { id: 'air-filter', name: 'Engine air filter', icon: 'cloud-outline', service: 'Tune-up', tips: [
        'An easy one to do yourself on most cars. Replace roughly every 15,000 to 30,000 miles.',
      ] },
      { id: 'cabin-filter', name: 'Cabin air filter', icon: 'leaf-outline', service: 'AC & heating', tips: [
        'Musty smells or weak airflow from the vents often means it’s time.',
      ] },
      { id: 'serpentine-belt', name: 'Serpentine belt', icon: 'infinite-outline', service: 'Tune-up', tips: [
        'Squealing at startup or cracks on the ribs mean it should be replaced.',
      ] },
      { id: 'wipers', name: 'Wiper blades', icon: 'rainy-outline', service: 'Tune-up', search: 'wiper blades', tips: [
        'Driver and passenger blades are often different lengths. Check both sizes.',
      ] },
    ],
  },
  {
    name: 'Cooling & AC', icon: 'snow-outline', parts: [
      { id: 'radiator', name: 'Radiator', icon: 'grid-outline', service: 'Cooling system', tips: [
        'Overheating or green, orange or pink puddles under the front of the car can mean a radiator leak.',
      ] },
      { id: 'thermostat', name: 'Thermostat', icon: 'thermometer-outline', service: 'Cooling system', tips: [
        'A temperature gauge that stays cold or climbs fast can be the thermostat.',
      ] },
      { id: 'water-pump', name: 'Water pump', icon: 'water-outline', service: 'Cooling system', tips: [
        'On many engines it’s replaced together with the timing belt to save labor.',
      ] },
      { id: 'coolant', name: 'Coolant', icon: 'color-fill-outline', service: 'Cooling system', search: 'antifreeze coolant', tips: [
        'Use the type and color your owner’s manual calls for. Don’t mix types.',
      ] },
      { id: 'ac-compressor', name: 'AC compressor', icon: 'snow-outline', service: 'AC & heating', tips: [
        'Have the system diagnosed first; a simple recharge or leak fix is often the real answer.',
      ] },
    ],
  },
  {
    name: 'Suspension & steering', icon: 'git-commit-outline', parts: [
      { id: 'struts', name: 'Shocks & struts', icon: 'git-commit-outline', service: 'Suspension & steering', tips: [
        'A bouncy ride or nose diving when braking are common signs. Replace in pairs.',
      ] },
      { id: 'control-arm', name: 'Control arms', icon: 'git-merge-outline', service: 'Suspension & steering', tips: [
        'Clunking over bumps can mean worn bushings or ball joints. Get an alignment afterwards.',
      ] },
      { id: 'tie-rod', name: 'Tie rod ends', icon: 'remove-outline', service: 'Suspension & steering', tips: [
        'Loose or wandering steering is a common sign. Needs an alignment after replacing.',
      ] },
    ],
  },
  {
    name: 'Tires & wheels', icon: 'ellipse-outline', parts: [
      { id: 'tires', name: 'Tires', icon: 'ellipse-outline', service: 'Tires & rotation', tips: [
        'Your size is on the tire sidewall and the driver’s door jamb (for example 225/65R17).',
        'Replace at least two at a time, on the same axle.',
      ] },
      { id: 'tpms', name: 'TPMS sensor', icon: 'speedometer-outline', service: 'Tires & rotation', search: 'TPMS sensor', tips: [
        'A tire pressure light that stays on with properly filled tires can be a failed sensor.',
      ] },
    ],
  },
];

export const ALL_PARTS = PART_GROUPS.flatMap((g) => g.parts);
export const findPart = (id: string) => ALL_PARTS.find((p) => p.id === id);

/** Online stores that sell parts. Each opens its own search for the exact car and part. */
export const STORES: { name: string; note: string; url: (q: string, car?: { year: number; make: string; model: string }) => string }[] = [
  { name: 'RockAuto', note: 'Huge catalog, low prices', url: (_q, car) => car
    ? `https://www.rockauto.com/en/catalog/${encodeURIComponent(car.make.toLowerCase())},${car.year},${encodeURIComponent(car.model.toLowerCase())}`
    : 'https://www.rockauto.com/' },
  { name: 'AutoZone', note: 'Pick up today', url: (q) => `https://www.autozone.com/searchresult?searchText=${encodeURIComponent(q)}` },
  { name: 'O’Reilly', note: 'Pick up today', url: (q) => `https://www.oreillyauto.com/search?q=${encodeURIComponent(q)}` },
  { name: 'Advance Auto Parts', note: 'Pick up today', url: (q) => `https://shop.advanceautoparts.com/web/SearchResults?searchTerm=${encodeURIComponent(q)}` },
  { name: 'NAPA', note: 'Pro-grade parts', url: (q) => `https://www.napaonline.com/en/search?text=${encodeURIComponent(q)}` },
  { name: 'Amazon', note: 'Fast shipping', url: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  { name: 'eBay Motors', note: 'New and used', url: (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&_sacat=6030` },
  { name: 'Car-Part.com', note: 'Used parts from salvage yards', url: () => 'https://www.car-part.com/' },
];

/** "2018 Toyota Camry brake pads" */
export const partQuery = (part: { name: string; search?: string }, car?: { year: number; make: string; model: string } | null) =>
  [car ? `${car.year} ${car.make} ${car.model}` : '', part.search ?? part.name].filter(Boolean).join(' ').trim();
