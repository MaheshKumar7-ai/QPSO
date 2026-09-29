export type APRegion =
  | 'All Andhra Pradesh'
  | 'Capital & Central AP'
  | 'North Coastal (Uttarandhra)'
  | 'Godavari Delta'
  | 'South Coastal AP'
  | 'Rayalaseema';

export type IndiaRegion = APRegion; // Backward-compatibility alias

export type VertexTier = 'city' | 'town' | 'village' | 'junction' | 'metro';

export interface APLocation {
  id: string;
  name: string;
  district: string;
  region: APRegion;
  type: VertexTier;
  coords: { lat: number; lng: number };
  popular?: boolean;
  tag?: string;
}

export type IndiaLocation = APLocation; // Backward-compatibility alias

export const AP_REGIONS: APRegion[] = [
  'All Andhra Pradesh',
  'Capital & Central AP',
  'North Coastal (Uttarandhra)',
  'Godavari Delta',
  'South Coastal AP',
  'Rayalaseema',
];

export const INDIA_REGIONS = AP_REGIONS; // Backward-compatibility alias

// Comprehensive database of Andhra Pradesh cities, district headquarters, regional towns, and key villages covering all 26 districts
export const AP_LOCATIONS: APLocation[] = [
  // ==========================================
  // 1. CAPITAL & CENTRAL AP (Krishna, Guntur, NTR, Amaravati, Palnadu, Bapatla)
  // ==========================================
  // Cities
  { id: 'VIJAYAWADA', name: 'Vijayawada', district: 'NTR', region: 'Capital & Central AP', type: 'city', coords: { lat: 16.5062, lng: 80.6480 }, popular: true, tag: 'Commercial Hub' },
  { id: 'GUNTUR', name: 'Guntur', district: 'Guntur', region: 'Capital & Central AP', type: 'city', coords: { lat: 16.3067, lng: 80.4365 }, popular: true, tag: 'Chilli City' },
  { id: 'AMARAVATI', name: 'Amaravati', district: 'Guntur / Capital', region: 'Capital & Central AP', type: 'city', coords: { lat: 16.5410, lng: 80.5150 }, popular: true, tag: 'State Capital' },
  { id: 'MACHILIPATNAM', name: 'Machilipatnam', district: 'Krishna', region: 'Capital & Central AP', type: 'city', coords: { lat: 16.1875, lng: 81.1389 }, popular: true, tag: 'Port City' },
  
  // Towns
  { id: 'MANGALAGIRI', name: 'Mangalagiri', district: 'Guntur', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.4312, lng: 80.5606 }, popular: true, tag: 'AIIMS & Saree Hub' },
  { id: 'TENALI', name: 'Tenali', district: 'Guntur', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.2430, lng: 80.6400 }, popular: true, tag: 'Andhra Paris' },
  { id: 'NUZVID', name: 'Nuzvid', district: 'Eluru / Krishna', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.7850, lng: 80.8460 }, popular: true, tag: 'Mango City' },
  { id: 'GUDIVADA', name: 'Gudivada', district: 'Krishna', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.4357, lng: 80.9926 }, popular: true, tag: 'Trade Town' },
  { id: 'CHILAKALURIPET', name: 'Chilakaluripet', district: 'Palnadu', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.0892, lng: 80.1672 }, tag: 'Highway Town' },
  { id: 'NARASARAOPET', name: 'Narasaraopet', district: 'Palnadu', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.2359, lng: 80.0494 }, popular: true, tag: 'District HQ' },
  { id: 'SATTENAPALLI', name: 'Sattenapalli', district: 'Palnadu', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.3970, lng: 80.1506 }, tag: 'Palnadu Hub' },
  { id: 'BAPATLA', name: 'Bapatla', district: 'Bapatla', region: 'Capital & Central AP', type: 'town', coords: { lat: 15.9042, lng: 80.4674 }, tag: 'Coastal HQ' },
  { id: 'REPALLE', name: 'Repalle', district: 'Bapatla', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.0210, lng: 80.8490 }, tag: 'Delta Town' },
  { id: 'MACHERLA', name: 'Macherla', district: 'Palnadu', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.4806, lng: 79.2970 }, tag: 'Nagarjuna Sagar' },
  { id: 'VINUKONDA', name: 'Vinukonda', district: 'Palnadu', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.0543, lng: 79.7423 }, tag: 'Junction Town' },
  { id: 'PIDUGURALLA', name: 'Piduguralla', district: 'Palnadu', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.4820, lng: 79.8890 }, tag: 'Lime City' },
  { id: 'NANDIGAMA', name: 'Nandigama', district: 'NTR', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.7830, lng: 80.2970 }, tag: 'NH65 Corridor' },
  { id: 'JAGGAIAHPETA', name: 'Jaggaiahpeta', district: 'NTR', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.8920, lng: 80.0980 }, tag: 'Cement Industrial Hub' },
  { id: 'TIRUVURU', name: 'Tiruvuru', district: 'NTR', region: 'Capital & Central AP', type: 'town', coords: { lat: 17.1120, lng: 80.6120 }, tag: 'Border Town' },
  { id: 'MYLAVARAM', name: 'Mylavaram', district: 'NTR', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.7620, lng: 80.6380 }, tag: 'Mango Belt' },
  { id: 'KONDAPALLI', name: 'Kondapalli', district: 'NTR', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.6180, lng: 80.5360 }, tag: 'Toys & Fort' },
  { id: 'GURAZALA', name: 'Gurazala', district: 'Palnadu', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.5810, lng: 79.5710 }, tag: 'Historical Fort Town' },
  { id: 'DACHEPALLI', name: 'Dachepalli', district: 'Palnadu', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.6020, lng: 79.7350 }, tag: 'Limestone Belt' },
  { id: 'PONNUR', name: 'Ponnur', district: 'Guntur', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.0710, lng: 80.5600 }, tag: 'Temple Town' },
  { id: 'CHEBROLU', name: 'Chebrolu', district: 'Guntur', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.2020, lng: 80.5310 }, tag: 'Chaturmukha Brahma' },
  { id: 'PEDANA', name: 'Pedana', district: 'Krishna', region: 'Capital & Central AP', type: 'town', coords: { lat: 16.2620, lng: 81.1680 }, tag: 'Kalamkari Hub' },

  // Villages & Local Junctions
  { id: 'GANNAVARAM', name: 'Gannavaram', district: 'Krishna', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.5400, lng: 80.8000 }, popular: true, tag: 'Airport Hub' },
  { id: 'KAZA', name: 'Kaza (ANU)', district: 'Guntur', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.3765, lng: 80.5280 }, tag: 'Tollway Hub' },
  { id: 'GOLLAPUDI', name: 'Gollapudi', district: 'NTR', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.5450, lng: 80.5890 }, tag: 'Market Village' },
  { id: 'IBRAHIMPATNAM', name: 'Ibrahimpatnam', district: 'NTR', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.5878, lng: 80.5262 }, tag: 'Ferry & Thermal' },
  { id: 'KANKIPADU', name: 'Kankipadu', district: 'Krishna', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.4250, lng: 80.7760 }, tag: 'Delta Village' },
  { id: 'PEDAKAKANI', name: 'Pedakakani', district: 'Guntur', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.3450, lng: 80.4920 }, tag: 'Temple Village' },
  { id: 'THULLUR', name: 'Thullur', district: 'Guntur / Capital', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.5360, lng: 80.4720 }, tag: 'Capital Core' },
  { id: 'VELAGAPUDI', name: 'Velagapudi (Secretariat)', district: 'Guntur / Capital', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.5270, lng: 80.5480 }, tag: 'State Secretariat' },
  { id: 'UNDAVALLI', name: 'Undavalli', district: 'Guntur', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.4950, lng: 80.5800 }, tag: 'Cave Temples' },
  { id: 'HANUMAN_JUNCTION', name: 'Hanuman Junction', district: 'Krishna / Eluru', region: 'Capital & Central AP', type: 'junction', coords: { lat: 16.6340, lng: 80.9630 }, tag: 'Tri-Junction' },
  { id: 'VUYYURU', name: 'Vuyyuru', district: 'Krishna', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.3680, lng: 80.8450 }, tag: 'Sugar Village' },
  { id: 'PAMARRU', name: 'Pamarru', district: 'Krishna', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.3290, lng: 80.9620 }, tag: 'Delta Junction' },
  { id: 'CHALLAPALLI', name: 'Challapalli', district: 'Krishna', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.1180, lng: 80.9320 }, tag: 'Fort Village' },
  { id: 'AVANIGADDA', name: 'Avanigadda', district: 'Krishna', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.0240, lng: 80.9200 }, tag: 'Diviseema Village' },
  { id: 'BHATTIPROLU', name: 'Bhattiprolu', district: 'Bapatla', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.1020, lng: 80.7840 }, tag: 'Heritage Village' },
  { id: 'DUGGIRALA', name: 'Duggirala', district: 'Guntur', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.3260, lng: 80.6270 }, tag: 'Turmeric Yard' },
  { id: 'KOTAPPAKONDA', name: 'Kotappakonda', district: 'Palnadu', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.1450, lng: 80.0380 }, tag: 'Hill Shrine' },
  { id: 'AGIRIPALLI', name: 'Agiripalli', district: 'Eluru', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.6710, lng: 80.7930 }, tag: 'Temple Village' },
  { id: 'KANCHIKACHERLA', name: 'Kanchikacherla', district: 'NTR', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.7020, lng: 80.3950 }, tag: 'NH65 Highway Village' },
  { id: 'NAGAYALANKA', name: 'Nagayalanka', district: 'Krishna', region: 'Capital & Central AP', type: 'village', coords: { lat: 15.9450, lng: 80.9150 }, tag: 'Lighthouse & Confluence' },
  { id: 'MOVVA', name: 'Movva', district: 'Krishna', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.2350, lng: 80.9850 }, tag: 'Kshetriyya Heritage' },
  { id: 'BANTUMILLI', name: 'Bantumilli', district: 'Krishna', region: 'Capital & Central AP', type: 'village', coords: { lat: 16.3680, lng: 81.2850 }, tag: 'Coastal Village' },
  { id: 'NIZAMPATNAM', name: 'Nizampatnam', district: 'Bapatla', region: 'Capital & Central AP', type: 'village', coords: { lat: 15.9120, lng: 80.6650 }, tag: 'Fishing Harbour' },
  { id: 'KARAMCHEDU', name: 'Karamchedu', district: 'Bapatla', region: 'Capital & Central AP', type: 'village', coords: { lat: 15.8950, lng: 80.2650 }, tag: 'Delta Village' },

  // ==========================================
  // 2. NORTH COASTAL AP / UTTARANDHRA (Visakhapatnam, Vizianagaram, Srikakulam, Anakapalli, ASR, Parvathipuram)
  // ==========================================
  // Cities
  { id: 'VISAKHAPATNAM', name: 'Visakhapatnam', district: 'Visakhapatnam', region: 'North Coastal (Uttarandhra)', type: 'city', coords: { lat: 17.6868, lng: 83.2185 }, popular: true, tag: 'City of Destiny / Port' },
  { id: 'VIZIANAGARAM', name: 'Vizianagaram', district: 'Vizianagaram', region: 'North Coastal (Uttarandhra)', type: 'city', coords: { lat: 18.1133, lng: 83.3977 }, popular: true, tag: 'Fort City' },
  { id: 'SRIKAKULAM', name: 'Srikakulam', district: 'Srikakulam', region: 'North Coastal (Uttarandhra)', type: 'city', coords: { lat: 18.2949, lng: 83.8938 }, popular: true, tag: 'Nagavali River Hub' },
  { id: 'ANAKAPALLE', name: 'Anakapalle', district: 'Anakapalli', region: 'North Coastal (Uttarandhra)', type: 'city', coords: { lat: 17.6897, lng: 83.0039 }, popular: true, tag: 'Jaggery City' },

  // Towns
  { id: 'TUNI', name: 'Tuni', district: 'Kakinada', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 17.3556, lng: 82.5511 }, popular: true, tag: 'Gateway Town' },
  { id: 'PAYAKARAOPETA', name: 'Payakaraopeta', district: 'Anakapalli', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 17.3480, lng: 82.5700 }, tag: 'Border Town' },
  { id: 'PALASA', name: 'Palasa-Kasibugga', district: 'Srikakulam', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.7712, lng: 84.4172 }, popular: true, tag: 'Cashew Capital' },
  { id: 'PARVATHIPURAM', name: 'Parvathipuram', district: 'Parvathipuram Manyam', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.7758, lng: 83.4286 }, tag: 'District HQ' },
  { id: 'BOBBILI', name: 'Bobbili', district: 'Vizianagaram', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.5702, lng: 83.3644 }, tag: 'Veena & Fort' },
  { id: 'RAJAM', name: 'Rajam', district: 'Vizianagaram', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.4550, lng: 83.6550 }, tag: 'Industrial Town' },
  { id: 'TEKKALI', name: 'Tekkali', district: 'Srikakulam', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.6186, lng: 84.2372 }, tag: 'Highway Town' },
  { id: 'SOMPETA', name: 'Sompeta', district: 'Srikakulam', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.9320, lng: 84.5930 }, tag: 'Coastal Town' },
  { id: 'ICHCHAPURAM', name: 'Ichchapuram', district: 'Srikakulam', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 19.1120, lng: 84.6920 }, tag: 'Northern Border Town' },
  { id: 'AMADALAVALASA', name: 'Amadalavalasa', district: 'Srikakulam', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.4120, lng: 83.8950 }, tag: 'Railway Junction' },
  { id: 'NARASANNAPETA', name: 'Narasannapeta', district: 'Srikakulam', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.4210, lng: 84.0480 }, tag: 'NH16 Market Town' },
  { id: 'PALAKONDA', name: 'Palakonda', district: 'Parvathipuram Manyam', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.6010, lng: 83.7540 }, tag: 'Agency Foothills' },
  { id: 'ARAKU_VALLEY', name: 'Araku Valley', district: 'Alluri Sitharama Raju', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.3273, lng: 82.8775 }, popular: true, tag: 'Hill Station & Coffee' },
  { id: 'PADERU', name: 'Paderu', district: 'Alluri Sitharama Raju', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.0833, lng: 82.6667 }, tag: 'Agency District HQ' },
  { id: 'SALUR', name: 'Salur', district: 'Parvathipuram Manyam', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.5280, lng: 83.2120 }, tag: 'Ghats Gateway' },
  { id: 'YELAMANCHILI', name: 'Yelamanchili', district: 'Anakapalli', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 17.5500, lng: 82.8600 }, tag: 'Highway Town' },
  { id: 'CHODAVARAM', name: 'Chodavaram', district: 'Anakapalli', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 17.8300, lng: 82.9400 }, tag: 'Sugar & Agro Town' },
  { id: 'SRUNGAVARAPUKOTA', name: 'S.Kota (Srungavarapukota)', district: 'Vizianagaram', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 18.1150, lng: 83.1500 }, tag: 'Ghats Entrance' },
  { id: 'KOTHAVALASA', name: 'Kothavalasa', district: 'Vizianagaram', region: 'North Coastal (Uttarandhra)', type: 'town', coords: { lat: 17.9020, lng: 83.1950 }, tag: 'Railway Junction' },

  // Villages & Scenic Hubs
  { id: 'ANNAVARAM', name: 'Annavaram', district: 'Kakinada', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 17.2790, lng: 82.4040 }, popular: true, tag: 'Holy Hill Shrine' },
  { id: 'BHOGAPURAM', name: 'Bhogapuram', district: 'Vizianagaram', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 18.0260, lng: 83.4980 }, tag: 'International Airport' },
  { id: 'BHEEMUNIPATNAM', name: 'Bheemunipatnam (Bheemili)', district: 'Visakhapatnam', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 17.8910, lng: 83.4530 }, tag: 'Historic Dutch Beach' },
  { id: 'NARSIPATNAM', name: 'Narsipatnam', district: 'Anakapalli', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 17.6710, lng: 82.6120 }, tag: 'Agency Gateway' },
  { id: 'GAJUWAKA', name: 'Gajuwaka (Steel Plant)', district: 'Visakhapatnam', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 17.6950, lng: 83.1970 }, tag: 'Industrial Corridor' },
  { id: 'SIMHACHALAM', name: 'Simhachalam', district: 'Visakhapatnam', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 17.7660, lng: 83.2500 }, tag: 'Narasimha Swamy' },
  { id: 'LAMBASINGI', name: 'Lambasingi', district: 'Alluri Sitharama Raju', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 17.8250, lng: 82.5020 }, popular: true, tag: 'Kashmir of Andhra' },
  { id: 'BORRA_CAVES', name: 'Borra Caves', district: 'Alluri Sitharama Raju', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 18.2830, lng: 83.0420 }, popular: true, tag: 'Million-Year Caves' },
  { id: 'CHINTAPALLI', name: 'Chintapalli', district: 'Alluri Sitharama Raju', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 17.8720, lng: 82.3550 }, tag: 'Forest Reserve' },
  { id: 'KALINGAPATNAM', name: 'Kalingapatnam', district: 'Srikakulam', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 18.3410, lng: 84.1280 }, tag: 'Ancient Lighthouse Beach' },
  { id: 'PONDURU', name: 'Ponduru', district: 'Srikakulam', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 18.3610, lng: 83.7650 }, tag: 'Khadi Village' },
  { id: 'ACHUTAPURAM', name: 'Achutapuram (SEZ)', district: 'Anakapalli', region: 'North Coastal (Uttarandhra)', type: 'village', coords: { lat: 17.5120, lng: 82.9850 }, tag: 'Special Economic Zone' },

  // ==========================================
  // 3. GODAVARI DELTA (East Godavari, West Godavari, Kakinada, Konaseema, Eluru)
  // ==========================================
  // Cities
  { id: 'RAJAHMUNDRY', name: 'Rajahmundry', district: 'East Godavari', region: 'Godavari Delta', type: 'city', coords: { lat: 17.0005, lng: 81.8040 }, popular: true, tag: 'Cultural Capital' },
  { id: 'KAKINADA', name: 'Kakinada', district: 'Kakinada', region: 'Godavari Delta', type: 'city', coords: { lat: 16.9891, lng: 82.2475 }, popular: true, tag: 'Deepwater Port & Kaja' },
  { id: 'ELURU', name: 'Eluru', district: 'Eluru', region: 'Godavari Delta', type: 'city', coords: { lat: 16.7107, lng: 81.0952 }, popular: true, tag: 'Carpet City' },
  { id: 'BHIMAVARAM', name: 'Bhimavaram', district: 'West Godavari', region: 'Godavari Delta', type: 'city', coords: { lat: 16.5449, lng: 81.5212 }, popular: true, tag: 'Aqua Hub HQ' },

  // Towns
  { id: 'TADEPALLIGUDEM', name: 'Tadepalligudem', district: 'West Godavari', region: 'Godavari Delta', type: 'town', coords: { lat: 16.8142, lng: 81.5269 }, popular: true, tag: 'Commercial Hub' },
  { id: 'TANUKU', name: 'Tanuku', district: 'West Godavari', region: 'Godavari Delta', type: 'town', coords: { lat: 16.7587, lng: 81.6811 }, popular: true, tag: 'Industrial Town' },
  { id: 'AMALAPURAM', name: 'Amalapuram', district: 'Dr. B.R. Ambedkar Konaseema', region: 'Godavari Delta', type: 'town', coords: { lat: 16.5787, lng: 82.0061 }, popular: true, tag: 'Konaseema HQ' },
  { id: 'PALAKOLLU', name: 'Palakollu', district: 'West Godavari', region: 'Godavari Delta', type: 'town', coords: { lat: 16.5333, lng: 81.7333 }, tag: 'Ksheerarama Town' },
  { id: 'NARASAPURAM', name: 'Narasapuram', district: 'West Godavari', region: 'Godavari Delta', type: 'town', coords: { lat: 16.4410, lng: 81.7010 }, tag: 'Port & Lace Hub' },
  { id: 'RAVULAPALEM', name: 'Ravulapalem', district: 'Konaseema', region: 'Godavari Delta', type: 'town', coords: { lat: 16.7510, lng: 81.8440 }, tag: 'Banana Market' },
  { id: 'KOVVUR', name: 'Kovvur', district: 'East Godavari', region: 'Godavari Delta', type: 'town', coords: { lat: 17.0110, lng: 81.7280 }, tag: 'Gautami Ghats' },
  { id: 'JANGAREDDYGUDEM', name: 'Jangareddygudem', district: 'Eluru', region: 'Godavari Delta', type: 'town', coords: { lat: 17.1240, lng: 81.2950 }, tag: 'Tobacco & Oil Palm' },
  { id: 'MANDAPETA', name: 'Mandapeta', district: 'Konaseema', region: 'Godavari Delta', type: 'town', coords: { lat: 16.8660, lng: 81.9320 }, tag: 'Rice Mill Hub' },
  { id: 'RAMACHANDRAPURAM', name: 'Ramachandrapuram', district: 'Konaseema', region: 'Godavari Delta', type: 'town', coords: { lat: 16.8520, lng: 82.0230 }, tag: 'Sugar Town' },
  { id: 'PEDDAPURAM', name: 'Peddapuram', district: 'Kakinada', region: 'Godavari Delta', type: 'town', coords: { lat: 17.0780, lng: 82.1380 }, tag: 'Silk & Sago Town' },
  { id: 'SAMALKOTA', name: 'Samalkota', district: 'Kakinada', region: 'Godavari Delta', type: 'town', coords: { lat: 17.0490, lng: 82.1670 }, tag: 'Kumararama Temple' },
  { id: 'PITHAPURAM', name: 'Pithapuram', district: 'Kakinada', region: 'Godavari Delta', type: 'town', coords: { lat: 17.1160, lng: 82.2530 }, tag: 'Padagaya Kshetram' },
  { id: 'RAZOLE', name: 'Razole', district: 'Konaseema', region: 'Godavari Delta', type: 'town', coords: { lat: 16.4850, lng: 81.8320 }, tag: 'Coconut Capital' },
  { id: 'CHINTALAPUDI', name: 'Chintalapudi', district: 'Eluru', region: 'Godavari Delta', type: 'town', coords: { lat: 17.0620, lng: 80.9950 }, tag: 'Border Agricultural Town' },
  { id: 'POLAVARAM', name: 'Polavaram', district: 'Eluru', region: 'Godavari Delta', type: 'town', coords: { lat: 17.2510, lng: 81.6420 }, popular: true, tag: 'National Irrigation Project' },
  { id: 'RAMPACHODAVARAM', name: 'Rampachodavaram', district: 'Alluri Sitharama Raju', region: 'Godavari Delta', type: 'town', coords: { lat: 17.4420, lng: 81.7760 }, tag: 'Agency Waterfalls' },
  { id: 'MAREDUMILLI', name: 'Maredumilli', district: 'Alluri Sitharama Raju', region: 'Godavari Delta', type: 'town', coords: { lat: 17.5920, lng: 81.7120 }, popular: true, tag: 'Eco-Tourism & Dense Woods' },

  // Villages & Delta Beauties
  { id: 'UPPADA', name: 'Uppada', district: 'Kakinada', region: 'Godavari Delta', type: 'village', coords: { lat: 17.0850, lng: 82.3270 }, tag: 'Jamdani Silk Beach' },
  { id: 'DRAKSHARAMAM', name: 'Draksharamam', district: 'Konaseema', region: 'Godavari Delta', type: 'village', coords: { lat: 16.7930, lng: 82.0620 }, tag: 'Dakshina Kashi' },
  { id: 'DWARAKA_TIRUMALA', name: 'Dwaraka Tirumala', district: 'Eluru', region: 'Godavari Delta', type: 'village', coords: { lat: 16.9530, lng: 81.2580 }, popular: true, tag: 'Chinna Tirupati' },
  { id: 'ANTARVEDI', name: 'Antarvedi', district: 'Konaseema', region: 'Godavari Delta', type: 'village', coords: { lat: 16.3310, lng: 81.7340 }, tag: 'Ocean Confluence' },
  { id: 'PATTISEEMA', name: 'Pattiseema', district: 'East Godavari', region: 'Godavari Delta', type: 'village', coords: { lat: 17.3820, lng: 81.6020 }, tag: 'River Link Project' },
  { id: 'DINDI', name: 'Dindi', district: 'Konaseema', region: 'Godavari Delta', type: 'village', coords: { lat: 16.4250, lng: 81.8750 }, tag: 'Backwater Resort' },
  { id: 'RYALI', name: 'Ryali', district: 'Konaseema', region: 'Godavari Delta', type: 'village', coords: { lat: 16.7880, lng: 81.8750 }, tag: 'Jagan Mohini Shrine' },
  { id: 'KADIAM', name: 'Kadiam', district: 'East Godavari', region: 'Godavari Delta', type: 'village', coords: { lat: 16.9210, lng: 81.8350 }, tag: 'Famous Plant Nurseries' },
  { id: 'MUMMIDIVARAM', name: 'Mummidivaram', district: 'Konaseema', region: 'Godavari Delta', type: 'village', coords: { lat: 16.6450, lng: 82.1150 }, tag: 'Balayogi Shrine' },
  { id: 'ATTILI', name: 'Attili', district: 'West Godavari', region: 'Godavari Delta', type: 'village', coords: { lat: 16.6920, lng: 81.5950 }, tag: 'Delta Paddy Village' },

  // ==========================================
  // 4. SOUTH COASTAL AP (Prakasam, SPSR Nellore)
  // ==========================================
  // Cities
  { id: 'NELLORE', name: 'Nellore', district: 'SPSR Nellore', region: 'South Coastal AP', type: 'city', coords: { lat: 14.4426, lng: 79.9865 }, popular: true, tag: 'Penna River & Gold' },
  { id: 'ONGOLE', name: 'Ongole', district: 'Prakasam', region: 'South Coastal AP', type: 'city', coords: { lat: 15.5057, lng: 80.0499 }, popular: true, tag: 'Bull Breed & Granites' },

  // Towns
  { id: 'CHIRALA', name: 'Chirala', district: 'Bapatla / Prakasam', region: 'South Coastal AP', type: 'town', coords: { lat: 15.8246, lng: 80.3522 }, popular: true, tag: 'Mini Bombay / Weaving' },
  { id: 'KAVALI', name: 'Kavali', district: 'SPSR Nellore', region: 'South Coastal AP', type: 'town', coords: { lat: 14.9132, lng: 79.9927 }, popular: true, tag: 'Coastal Education Hub' },
  { id: 'GUDUR', name: 'Gudur', district: 'Tirupati / Nellore', region: 'South Coastal AP', type: 'town', coords: { lat: 14.1463, lng: 79.8504 }, tag: 'Mica & Lemon Market' },
  { id: 'SULLURPETA', name: 'Sullurpeta', district: 'Tirupati / Nellore', region: 'South Coastal AP', type: 'town', coords: { lat: 13.7020, lng: 80.0210 }, popular: true, tag: 'ISRO Spaceport Gateway' },
  { id: 'NAIDUPETA', name: 'Naidupeta', district: 'Tirupati / Nellore', region: 'South Coastal AP', type: 'town', coords: { lat: 13.9050, lng: 79.9040 }, tag: 'SEZ Industrial Hub' },
  { id: 'MARKAPUR', name: 'Markapur', district: 'Prakasam', region: 'South Coastal AP', type: 'town', coords: { lat: 15.7350, lng: 79.2730 }, tag: 'Slate Capital' },
  { id: 'GIDDALUR', name: 'Giddalur', district: 'Prakasam', region: 'South Coastal AP', type: 'town', coords: { lat: 15.3780, lng: 78.9270 }, tag: 'Nallamala Gateway' },
  { id: 'KANDUKUR', name: 'Kandukur', district: 'SPSR Nellore', region: 'South Coastal AP', type: 'town', coords: { lat: 15.2160, lng: 79.9040 }, tag: 'Tobacco Hub' },
  { id: 'PODILI', name: 'Podili', district: 'Prakasam', region: 'South Coastal AP', type: 'town', coords: { lat: 15.6040, lng: 79.6080 }, tag: 'Granite Town' },
  { id: 'DARSI', name: 'Darsi', district: 'Prakasam', region: 'South Coastal AP', type: 'town', coords: { lat: 15.7720, lng: 79.6830 }, tag: 'Canal Town' },
  { id: 'ATMAKUR_NLR', name: 'Atmakur (Nellore)', district: 'SPSR Nellore', region: 'South Coastal AP', type: 'town', coords: { lat: 14.6180, lng: 79.6230 }, tag: 'Penna Basin' },
  { id: 'VENKATAGIRI', name: 'Venkatagiri', district: 'Tirupati', region: 'South Coastal AP', type: 'town', coords: { lat: 13.9620, lng: 79.5810 }, tag: 'Royal Saree Hub' },
  { id: 'KANIGIRI', name: 'Kanigiri', district: 'Prakasam', region: 'South Coastal AP', type: 'town', coords: { lat: 15.4010, lng: 79.5120 }, tag: 'Western Prakasam Hub' },
  { id: 'CHIMAKURTHY', name: 'Chimakurthy', district: 'Prakasam', region: 'South Coastal AP', type: 'town', coords: { lat: 15.5820, lng: 79.8650 }, tag: 'Galaxy Granite Capital' },
  { id: 'ADDANKI', name: 'Addanki', district: 'Bapatla', region: 'South Coastal AP', type: 'town', coords: { lat: 15.8110, lng: 79.9730 }, tag: 'Gundlakamma River Town' },
  { id: 'MARTUR', name: 'Martur', district: 'Bapatla', region: 'South Coastal AP', type: 'town', coords: { lat: 15.9780, lng: 80.0950 }, tag: 'NH16 Granite Market' },
  { id: 'BUCHIREDDYPALEM', name: 'Buchireddypalem', district: 'SPSR Nellore', region: 'South Coastal AP', type: 'town', coords: { lat: 14.5320, lng: 79.8750 }, tag: 'Jonnavada Shrine Gateway' },

  // Villages & Ports
  { id: 'KRISHNAPATNAM', name: 'Krishnapatnam Port', district: 'SPSR Nellore', region: 'South Coastal AP', type: 'village', coords: { lat: 14.2830, lng: 80.1250 }, popular: true, tag: 'Mega Deep Sea Port' },
  { id: 'MYPADU', name: 'Mypadu Beach', district: 'SPSR Nellore', region: 'South Coastal AP', type: 'village', coords: { lat: 14.5090, lng: 80.1770 }, tag: 'Gold Sands Beach' },
  { id: 'SINGARAYAKONDA', name: 'Singarayakonda', district: 'Prakasam', region: 'South Coastal AP', type: 'village', coords: { lat: 15.2500, lng: 80.0330 }, tag: 'Varaha Shrine' },
  { id: 'TANGUTUR', name: 'Tangutur', district: 'Prakasam', region: 'South Coastal AP', type: 'village', coords: { lat: 15.3850, lng: 80.0350 }, tag: 'Highway Village' },
  { id: 'ULAVAPADU', name: 'Ulavapadu', district: 'SPSR Nellore', region: 'South Coastal AP', type: 'village', coords: { lat: 15.0830, lng: 80.0050 }, tag: 'Banganapalle Mangoes' },
  { id: 'TADA', name: 'Tada (Sri City)', district: 'Tirupati', region: 'South Coastal AP', type: 'village', coords: { lat: 13.5900, lng: 80.0300 }, tag: 'Sri City Industrial City' },
  { id: 'CUMBUM', name: 'Cumbum', district: 'Prakasam', region: 'South Coastal AP', type: 'village', coords: { lat: 15.5720, lng: 79.1120 }, tag: 'Historic Man-Made Lake' },
  { id: 'YERRAGONDAPALEM', name: 'Yerragondapalem', district: 'Prakasam', region: 'South Coastal AP', type: 'village', coords: { lat: 16.0350, lng: 79.3050 }, tag: 'Nallamala Border' },
  { id: 'PAMURU', name: 'Pamuru', district: 'Prakasam', region: 'South Coastal AP', type: 'village', coords: { lat: 15.0950, lng: 79.4120 }, tag: 'Southern Prakasam Hub' },

  // ==========================================
  // 5. RAYALASEEMA (Kurnool, Nandyal, Ananthapuramu, SSS, Kadapa, Annamayya, Tirupati, Chittoor)
  // ==========================================
  // Cities
  { id: 'TIRUPATI', name: 'Tirupati', district: 'Tirupati', region: 'Rayalaseema', type: 'city', coords: { lat: 13.6288, lng: 79.4192 }, popular: true, tag: 'Lord Venkateswara Shrine' },
  { id: 'KURNOOL', name: 'Kurnool', district: 'Kurnool', region: 'Rayalaseema', type: 'city', coords: { lat: 15.8281, lng: 78.0373 }, popular: true, tag: 'Gateway of Rayalaseema' },
  { id: 'KADAPA', name: 'Kadapa', district: 'YSR Kadapa', region: 'Rayalaseema', type: 'city', coords: { lat: 14.4673, lng: 78.8242 }, popular: true, tag: 'Heart of Rayalaseema' },
  { id: 'ANANTAPUR', name: 'Anantapur', district: 'Ananthapuramu', region: 'Rayalaseema', type: 'city', coords: { lat: 14.6819, lng: 77.6006 }, popular: true, tag: 'Groundnut & Solar Hub' },
  { id: 'NANDYAL', name: 'Nandyal', district: 'Nandyal', region: 'Rayalaseema', type: 'city', coords: { lat: 15.4886, lng: 78.4836 }, popular: true, tag: 'Nava Nandi City' },
  { id: 'CHITTOOR', name: 'Chittoor', district: 'Chittoor', region: 'Rayalaseema', type: 'city', coords: { lat: 13.2172, lng: 79.1003 }, popular: true, tag: 'Mango & Dairy Hub' },
  { id: 'PRODDATUR', name: 'Proddatur', district: 'YSR Kadapa', region: 'Rayalaseema', type: 'city', coords: { lat: 14.7527, lng: 78.5522 }, popular: true, tag: 'Gold & Cotton City' },
  { id: 'HINDUPUR', name: 'Hindupur', district: 'Sri Sathya Sai', region: 'Rayalaseema', type: 'city', coords: { lat: 13.8283, lng: 77.4914 }, popular: true, tag: 'Industrial Border City' },

  // Towns
  { id: 'ADONI', name: 'Adoni', district: 'Kurnool', region: 'Rayalaseema', type: 'town', coords: { lat: 15.6322, lng: 77.2728 }, popular: true, tag: 'Grain & Cotton Market' },
  { id: 'GUNTAKAL', name: 'Guntakal', district: 'Ananthapuramu', region: 'Rayalaseema', type: 'town', coords: { lat: 15.1670, lng: 77.3800 }, popular: true, tag: 'Major Railway Division' },
  { id: 'MADANAPALLE', name: 'Madanapalle', district: 'Annamayya', region: 'Rayalaseema', type: 'town', coords: { lat: 13.5500, lng: 78.5000 }, popular: true, tag: 'Tomato Capital / Horsley Hills' },
  { id: 'SRIKALAHASTI', name: 'Srikalahasti', district: 'Tirupati', region: 'Rayalaseema', type: 'town', coords: { lat: 13.7498, lng: 79.6984 }, popular: true, tag: 'Rahu-Ketu Temple' },
  { id: 'DHARMAVARAM', name: 'Dharmavaram', district: 'Sri Sathya Sai', region: 'Rayalaseema', type: 'town', coords: { lat: 14.4140, lng: 77.7210 }, popular: true, tag: 'Silk Saree City' },
  { id: 'KADIRI', name: 'Kadiri', district: 'Sri Sathya Sai', region: 'Rayalaseema', type: 'town', coords: { lat: 14.1130, lng: 78.1630 }, tag: 'Narasimha Temple' },
  { id: 'TADIPATRI', name: 'Tadipatri', district: 'Ananthapuramu', region: 'Rayalaseema', type: 'town', coords: { lat: 14.9100, lng: 78.0100 }, tag: 'Cement & Bugga Ramalinga' },
  { id: 'RAYACHOTI', name: 'Rayachoti', district: 'Annamayya', region: 'Rayalaseema', type: 'town', coords: { lat: 14.0580, lng: 78.7520 }, tag: 'District HQ' },
  { id: 'PUTTAPARTHI', name: 'Puttaparthi', district: 'Sri Sathya Sai', region: 'Rayalaseema', type: 'town', coords: { lat: 14.1650, lng: 77.8110 }, popular: true, tag: 'Prasanthi Nilayam' },
  { id: 'YEMMIGANUR', name: 'Yemmiganur', district: 'Kurnool', region: 'Rayalaseema', type: 'town', coords: { lat: 15.7330, lng: 77.4830 }, tag: 'Handloom Weaving' },
  { id: 'DHONE', name: 'Dhone', district: 'Nandyal', region: 'Rayalaseema', type: 'town', coords: { lat: 15.4200, lng: 77.8700 }, tag: 'Mineral Hub' },
  { id: 'ALLAGADDA', name: 'Allagadda', district: 'Nandyal', region: 'Rayalaseema', type: 'town', coords: { lat: 15.1320, lng: 78.5120 }, tag: 'Sculpture & Stone Craft' },
  { id: 'PULIVENDULA', name: 'Pulivendula', district: 'YSR Kadapa', region: 'Rayalaseema', type: 'town', coords: { lat: 14.4170, lng: 78.2330 }, tag: 'Banana & Uranium' },
  { id: 'BADVEL', name: 'Badvel', district: 'YSR Kadapa', region: 'Rayalaseema', type: 'town', coords: { lat: 14.7390, lng: 79.0580 }, tag: 'Highway Town' },
  { id: 'JAMMALAMADUGU', name: 'Jammalamadugu', district: 'YSR Kadapa', region: 'Rayalaseema', type: 'town', coords: { lat: 14.8330, lng: 78.3830 }, tag: 'Penna Gorge Town' },
  { id: 'PUNGANUR', name: 'Punganur', district: 'Chittoor', region: 'Rayalaseema', type: 'town', coords: { lat: 13.3670, lng: 78.5830 }, tag: 'Miniature Cow Hub' },
  { id: 'PALAMANER', name: 'Palamaner', district: 'Chittoor', region: 'Rayalaseema', type: 'town', coords: { lat: 13.2000, lng: 78.7500 }, tag: 'Koundinya Sanctuary' },
  { id: 'NAGARI', name: 'Nagari', district: 'Chittoor / Tirupati', region: 'Rayalaseema', type: 'town', coords: { lat: 13.3300, lng: 79.5830 }, tag: 'Powerloom City' },
  { id: 'KUPPAM', name: 'Kuppam', district: 'Chittoor', region: 'Rayalaseema', type: 'town', coords: { lat: 12.7500, lng: 78.3670 }, tag: 'Tri-State Border' },
  { id: 'SRISAILAM', name: 'Srisailam', district: 'Nandyal', region: 'Rayalaseema', type: 'town', coords: { lat: 16.0730, lng: 78.8680 }, popular: true, tag: 'Mallikarjuna Jyotirlinga' },
  { id: 'GOOTY', name: 'Gooty', district: 'Ananthapuramu', region: 'Rayalaseema', type: 'town', coords: { lat: 15.1120, lng: 77.6350 }, tag: 'Hill Fort Junction' },
  { id: 'URAVAKONDA', name: 'Uravakonda', district: 'Ananthapuramu', region: 'Rayalaseema', type: 'town', coords: { lat: 14.9450, lng: 77.2650 }, tag: 'Handloom & Agri Town' },
  { id: 'KALYANDURG', name: 'Kalyandurg', district: 'Ananthapuramu', region: 'Rayalaseema', type: 'town', coords: { lat: 14.5520, lng: 77.1080 }, tag: 'Silk & Agriculture' },
  { id: 'RAYADURG', name: 'Rayadurg', district: 'Ananthapuramu', region: 'Rayalaseema', type: 'town', coords: { lat: 14.7010, lng: 76.8620 }, tag: 'Textiles & Hill Fort' },
  { id: 'PENUKONDA', name: 'Penukonda', district: 'Sri Sathya Sai', region: 'Rayalaseema', type: 'town', coords: { lat: 14.0830, lng: 77.5950 }, popular: true, tag: 'Kia Motors Industrial Hub' },
  { id: 'RAJAMPET', name: 'Rajampet', district: 'Annamayya', region: 'Rayalaseema', type: 'town', coords: { lat: 14.1950, lng: 79.1620 }, tag: 'Cheyyeru River Town' },
  { id: 'RAILWAY_KODUR', name: 'Railway Kodur', district: 'Annamayya', region: 'Rayalaseema', type: 'town', coords: { lat: 13.9520, lng: 79.3550 }, tag: 'Banana & Papaya Hub' },
  { id: 'PILERU', name: 'Pileru', district: 'Annamayya', region: 'Rayalaseema', type: 'town', coords: { lat: 13.6520, lng: 78.9350 }, tag: 'Junction Town' },
  { id: 'MYDUKUR', name: 'Mydukur', district: 'YSR Kadapa', region: 'Rayalaseema', type: 'town', coords: { lat: 14.7120, lng: 78.7180 }, tag: 'NH40/NH67 Crossroads' },
  { id: 'YERRAGUNTLA', name: 'Yerraguntla', district: 'YSR Kadapa', region: 'Rayalaseema', type: 'town', coords: { lat: 14.6350, lng: 78.5350 }, tag: 'Cement Railway Hub' },
  { id: 'NANDIKOTKUR', name: 'Nandikotkur', district: 'Nandyal', region: 'Rayalaseema', type: 'town', coords: { lat: 15.8650, lng: 78.2650 }, tag: 'Krishna River Basin' },
  { id: 'MANTRALAYAM', name: 'Mantralayam', district: 'Kurnool', region: 'Rayalaseema', type: 'town', coords: { lat: 15.9350, lng: 77.4280 }, popular: true, tag: 'Sri Raghavendra Swamy Math' },

  // Villages & Heritage Wonders
  { id: 'LEPAKSHI', name: 'Lepakshi', district: 'Sri Sathya Sai', region: 'Rayalaseema', type: 'village', coords: { lat: 13.8040, lng: 77.6080 }, popular: true, tag: 'Monolithic Nandi' },
  { id: 'GANDIKOTA', name: 'Gandikota', district: 'YSR Kadapa', region: 'Rayalaseema', type: 'village', coords: { lat: 14.8150, lng: 78.2860 }, popular: true, tag: 'Grand Canyon of India' },
  { id: 'AHOBILAM', name: 'Ahobilam', district: 'Nandyal', region: 'Rayalaseema', type: 'village', coords: { lat: 15.1380, lng: 78.7230 }, popular: true, tag: 'Nava Narasimha Forest' },
  { id: 'MAHANANDI', name: 'Mahanandi', district: 'Nandyal', region: 'Rayalaseema', type: 'village', coords: { lat: 15.4850, lng: 78.6250 }, tag: 'Mineral Springs Temple' },
  { id: 'BANAGANAPALLE', name: 'Banaganapalle', district: 'Nandyal', region: 'Rayalaseema', type: 'village', coords: { lat: 15.3180, lng: 78.2250 }, tag: 'Royal Fort & Mangoes' },
  { id: 'ORVAKAL', name: 'Orvakal', district: 'Kurnool', region: 'Rayalaseema', type: 'village', coords: { lat: 15.6830, lng: 78.2170 }, tag: 'Rock Garden Airport' },
  { id: 'VONTIMITTA', name: 'Vontimitta', district: 'YSR Kadapa', region: 'Rayalaseema', type: 'village', coords: { lat: 14.3850, lng: 79.0300 }, tag: 'Ekashila Rama Temple' },
  { id: 'TIRUMALA', name: 'Tirumala Hills', district: 'Tirupati', region: 'Rayalaseema', type: 'village', coords: { lat: 13.6830, lng: 79.3500 }, popular: true, tag: 'Sacred Seven Hills' },
  { id: 'KANIPAKAM', name: 'Kanipakam', district: 'Chittoor', region: 'Rayalaseema', type: 'village', coords: { lat: 13.2660, lng: 79.0330 }, popular: true, tag: 'Varasiddhi Vinayaka' },
  { id: 'ALIPIRI', name: 'Alipiri Foot', district: 'Tirupati', region: 'Rayalaseema', type: 'village', coords: { lat: 13.6490, lng: 79.3980 }, tag: 'Tirumala Gateway' },
  { id: 'CHANDRAGIRI', name: 'Chandragiri', district: 'Tirupati', region: 'Rayalaseema', type: 'village', coords: { lat: 13.5820, lng: 79.3150 }, tag: 'Historic Vijayanagara Fort' },
  { id: 'PUTTUR', name: 'Puttur', district: 'Tirupati', region: 'Rayalaseema', type: 'village', coords: { lat: 13.4450, lng: 79.5520 }, tag: 'Kailasakona Gateway' },
  { id: 'HORSLEY_HILLS', name: 'Horsley Hills', district: 'Annamayya', region: 'Rayalaseema', type: 'village', coords: { lat: 13.6550, lng: 78.3980 }, popular: true, tag: 'Andhra Ooty' },
  { id: 'BELUM_CAVES', name: 'Belum Caves', district: 'Nandyal', region: 'Rayalaseema', type: 'village', coords: { lat: 15.1020, lng: 78.1120 }, popular: true, tag: 'Subterranean Wonders' },
  { id: 'BETHAMCHERLA', name: 'Bethamcherla', district: 'Nandyal', region: 'Rayalaseema', type: 'village', coords: { lat: 15.4520, lng: 78.1620 }, tag: 'Polished Slab Stone' },
];

export interface ResolvedNearbyGraphResult {
  inputQuery: string;
  matchedPlaceName: string;
  matchedDistrict?: string;
  matchedRegion?: APRegion;
  type?: VertexTier;
  coords: { lat: number; lng: number };
  nearestGraphNodeId: string;
  nearestGraphNodeName: string;
  distanceToGraphNodeKm: number;
  isDirectGraphNode: boolean;
}

// Great-circle distance using Haversine formula in Kilometers
export function calculateHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Search across all Andhra Pradesh cities, towns, and villages with optional region filter
export function searchAPLocations(
  query: string,
  regionFilter: APRegion = 'All Andhra Pradesh',
  limit = 25
): APLocation[] {
  const q = query.trim().toLowerCase();

  let pool = AP_LOCATIONS;
  if (regionFilter !== 'All Andhra Pradesh') {
    pool = pool.filter(l => l.region === regionFilter);
  }

  if (!q) {
    // If empty query, return popular cities/towns/villages first
    return pool.slice(0, limit);
  }

  const matches = pool.filter(l => {
    return (
      l.name.toLowerCase().includes(q) ||
      l.district.toLowerCase().includes(q) ||
      l.region.toLowerCase().includes(q) ||
      l.id.toLowerCase().includes(q) ||
      (l.tag && l.tag.toLowerCase().includes(q))
    );
  });

  // Sort exact/prefix matches first
  matches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q);
    const bStarts = b.name.toLowerCase().startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name);
  });

  return matches.slice(0, limit);
}

// Alias for backwards compatibility
export const searchIndiaLocations = searchAPLocations as any;
export const INDIA_LOCATIONS = AP_LOCATIONS;

// Resolve ANY location, town, village, or landmark in Andhra Pradesh to the nearest node in the graph
export function resolveLocationToNearbyGraphNode(
  query: string,
  graphVertices: Array<{ id: string; name: string; coords: { lat: number; lng: number } }>
): ResolvedNearbyGraphResult {
  const clean = query.trim();
  const lower = clean.toLowerCase();

  // 1. Direct match with existing graph vertex
  const directVertex = graphVertices.find(
    v =>
      v.id.toLowerCase() === lower ||
      v.name.toLowerCase() === lower ||
      v.name.toLowerCase().includes(lower) ||
      lower.includes(v.name.toLowerCase())
  );

  if (directVertex) {
    const matchedLoc = AP_LOCATIONS.find(l => l.id === directVertex.id);
    return {
      inputQuery: clean,
      matchedPlaceName: directVertex.name,
      matchedDistrict: matchedLoc?.district,
      matchedRegion: matchedLoc?.region,
      type: (directVertex as any).type || matchedLoc?.type,
      coords: directVertex.coords,
      nearestGraphNodeId: directVertex.id,
      nearestGraphNodeName: directVertex.name,
      distanceToGraphNodeKm: 0,
      isDirectGraphNode: true,
    };
  }

  // 2. Match in AP Locations repository
  const matchedLocation = AP_LOCATIONS.find(
    l =>
      l.id.toLowerCase() === lower ||
      l.name.toLowerCase() === lower ||
      l.name.toLowerCase().includes(lower) ||
      lower.includes(l.name.toLowerCase()) ||
      lower.includes(l.district.toLowerCase())
  );

  let targetCoords = matchedLocation
    ? matchedLocation.coords
    : { lat: 16.3067, lng: 80.4365 }; // Default center (Guntur/Vijayawada)

  const placeName = matchedLocation ? matchedLocation.name : clean;
  const district = matchedLocation?.district;
  const region = matchedLocation?.region;
  const tier = matchedLocation?.type;

  // 3. Find closest node in graphVertices using Haversine formula
  let minDistance = Infinity;
  let nearestNode = graphVertices[0];

  for (const node of graphVertices) {
    const dist = calculateHaversineKm(
      targetCoords.lat,
      targetCoords.lng,
      node.coords.lat,
      node.coords.lng
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearestNode = node;
    }
  }

  return {
    inputQuery: clean,
    matchedPlaceName: placeName,
    matchedDistrict: district,
    matchedRegion: region,
    type: tier,
    coords: targetCoords,
    nearestGraphNodeId: nearestNode.id,
    nearestGraphNodeName: nearestNode.name,
    distanceToGraphNodeKm: minDistance,
    isDirectGraphNode: minDistance < 4,
  };
}
