import { GraphVertex, GraphEdge, VehicleType, GeoPoint } from '../types';
import { resolveLocationToNearbyGraphNode, calculateHaversineKm, AP_LOCATIONS } from './indiaLocations';

// Multi-Tier Andhra Pradesh Road Network: Cities, Towns, Villages, and Key Junctions across all AP Regions
export const REGIONAL_NODES: GraphVertex[] = [
  // ==========================================
  // 1. CAPITAL & CENTRAL AP (Krishna, Guntur, NTR, Amaravati, Palnadu, Bapatla)
  // ==========================================
  { id: 'VIJAYAWADA', name: 'Vijayawada', type: 'city', coords: { lat: 16.5062, lng: 80.6480 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'GUNTUR', name: 'Guntur', type: 'city', coords: { lat: 16.3067, lng: 80.4365 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'AMARAVATI', name: 'Amaravati', type: 'city', coords: { lat: 16.5410, lng: 80.5150 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'MACHILIPATNAM', name: 'Machilipatnam', type: 'city', coords: { lat: 16.1875, lng: 81.1389 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'MANGALAGIRI', name: 'Mangalagiri', type: 'town', coords: { lat: 16.4312, lng: 80.5606 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'TENALI', name: 'Tenali', type: 'town', coords: { lat: 16.2430, lng: 80.6400 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'NUZVID', name: 'Nuzvid', type: 'town', coords: { lat: 16.7850, lng: 80.8460 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'GUDIVADA', name: 'Gudivada', type: 'town', coords: { lat: 16.4357, lng: 80.9926 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'CHILAKALURIPET', name: 'Chilakaluripet', type: 'town', coords: { lat: 16.0892, lng: 80.1672 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'NARASARAOPET', name: 'Narasaraopet', type: 'town', coords: { lat: 16.2359, lng: 80.0494 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'SATTENAPALLI', name: 'Sattenapalli', type: 'town', coords: { lat: 16.3970, lng: 80.1506 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'BAPATLA', name: 'Bapatla', type: 'town', coords: { lat: 15.9042, lng: 80.4674 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'REPALLE', name: 'Repalle', type: 'town', coords: { lat: 16.0210, lng: 80.8490 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'MACHERLA', name: 'Macherla', type: 'town', coords: { lat: 16.4806, lng: 79.2970 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'VINUKONDA', name: 'Vinukonda', type: 'town', coords: { lat: 16.0543, lng: 79.7423 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PIDUGURALLA', name: 'Piduguralla', type: 'town', coords: { lat: 16.4820, lng: 79.8890 }, state: 'Andhra Pradesh', tier: 'town' },
  
  // Villages & Junctions
  { id: 'GANNAVARAM', name: 'Gannavaram', type: 'village', coords: { lat: 16.5400, lng: 80.8000 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'KAZA', name: 'Kaza', type: 'village', coords: { lat: 16.3765, lng: 80.5280 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'IBRAHIMPATNAM', name: 'Ibrahimpatnam', type: 'village', coords: { lat: 16.5878, lng: 80.5262 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'KANKIPADU', name: 'Kankipadu', type: 'village', coords: { lat: 16.4250, lng: 80.7760 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'PEDAKAKANI', name: 'Pedakakani', type: 'village', coords: { lat: 16.3450, lng: 80.4920 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'THULLUR', name: 'Thullur', type: 'village', coords: { lat: 16.5360, lng: 80.4720 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'VELAGAPUDI', name: 'Velagapudi', type: 'village', coords: { lat: 16.5270, lng: 80.5480 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'UNDAVALLI', name: 'Undavalli', type: 'village', coords: { lat: 16.4950, lng: 80.5800 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'HANUMAN_JUNCTION', name: 'Hanuman Junction', type: 'junction', coords: { lat: 16.6340, lng: 80.9630 }, state: 'Andhra Pradesh', tier: 'junction' },
  { id: 'VUYYURU', name: 'Vuyyuru', type: 'village', coords: { lat: 16.3680, lng: 80.8450 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'PAMARRU', name: 'Pamarru', type: 'village', coords: { lat: 16.3290, lng: 80.9620 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'CHALLAPALLI', name: 'Challapalli', type: 'village', coords: { lat: 16.1180, lng: 80.9320 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'AVANIGADDA', name: 'Avanigadda', type: 'village', coords: { lat: 16.0240, lng: 80.9200 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'BHATTIPROLU', name: 'Bhattiprolu', type: 'village', coords: { lat: 16.1020, lng: 80.7840 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'DUGGIRALA', name: 'Duggirala', type: 'village', coords: { lat: 16.3260, lng: 80.6270 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'PONNUR', name: 'Ponnur', type: 'village', coords: { lat: 16.0710, lng: 80.5600 }, state: 'Andhra Pradesh', tier: 'village' },

  // ==========================================
  // 2. NORTH COASTAL AP / UTTARANDHRA
  // ==========================================
  { id: 'VISAKHAPATNAM', name: 'Visakhapatnam', type: 'metro', coords: { lat: 17.6868, lng: 83.2185 }, state: 'Andhra Pradesh', tier: 'metro' },
  { id: 'VIZIANAGARAM', name: 'Vizianagaram', type: 'city', coords: { lat: 18.1133, lng: 83.3977 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'SRIKAKULAM', name: 'Srikakulam', type: 'city', coords: { lat: 18.2949, lng: 83.8938 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'ANAKAPALLE', name: 'Anakapalle', type: 'city', coords: { lat: 17.6897, lng: 83.0039 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'TUNI', name: 'Tuni', type: 'town', coords: { lat: 17.3556, lng: 82.5511 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PAYAKARAOPETA', name: 'Payakaraopeta', type: 'town', coords: { lat: 17.3480, lng: 82.5700 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PALASA', name: 'Palasa', type: 'town', coords: { lat: 18.7712, lng: 84.4172 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PARVATHIPURAM', name: 'Parvathipuram', type: 'town', coords: { lat: 18.7758, lng: 83.4286 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'BOBBILI', name: 'Bobbili', type: 'town', coords: { lat: 18.5702, lng: 83.3644 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'RAJAM', name: 'Rajam', type: 'town', coords: { lat: 18.4550, lng: 83.6550 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'TEKKALI', name: 'Tekkali', type: 'town', coords: { lat: 18.6186, lng: 84.2372 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'SOMPETA', name: 'Sompeta', type: 'town', coords: { lat: 18.9320, lng: 84.5930 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'ARAKU_VALLEY', name: 'Araku Valley', type: 'town', coords: { lat: 18.3273, lng: 82.8775 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PADERU', name: 'Paderu', type: 'town', coords: { lat: 18.0833, lng: 82.6667 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'SALUR', name: 'Salur', type: 'town', coords: { lat: 18.5280, lng: 83.2120 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'YELAMANCHILI', name: 'Yelamanchili', type: 'town', coords: { lat: 17.5500, lng: 82.8600 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'ANNAVARAM', name: 'Annavaram', type: 'village', coords: { lat: 17.2790, lng: 82.4040 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'BHOGAPURAM', name: 'Bhogapuram', type: 'village', coords: { lat: 18.0260, lng: 83.4980 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'BHEEMUNIPATNAM', name: 'Bheemili', type: 'village', coords: { lat: 17.8910, lng: 83.4530 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'NARSIPATNAM', name: 'Narsipatnam', type: 'village', coords: { lat: 17.6710, lng: 82.6120 }, state: 'Andhra Pradesh', tier: 'village' },

  // ==========================================
  // 3. GODAVARI DELTA
  // ==========================================
  { id: 'RAJAHMUNDRY', name: 'Rajahmundry', type: 'city', coords: { lat: 17.0005, lng: 81.8040 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'KAKINADA', name: 'Kakinada', type: 'city', coords: { lat: 16.9891, lng: 82.2475 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'ELURU', name: 'Eluru', type: 'city', coords: { lat: 16.7107, lng: 81.0952 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'BHIMAVARAM', name: 'Bhimavaram', type: 'city', coords: { lat: 16.5449, lng: 81.5212 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'TADEPALLIGUDEM', name: 'Tadepalligudem', type: 'town', coords: { lat: 16.8142, lng: 81.5269 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'TANUKU', name: 'Tanuku', type: 'town', coords: { lat: 16.7587, lng: 81.6811 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'AMALAPURAM', name: 'Amalapuram', type: 'town', coords: { lat: 16.5787, lng: 82.0061 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PALAKOLLU', name: 'Palakollu', type: 'town', coords: { lat: 16.5333, lng: 81.7333 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'NARASAPURAM', name: 'Narasapuram', type: 'town', coords: { lat: 16.4410, lng: 81.7010 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'RAVULAPALEM', name: 'Ravulapalem', type: 'town', coords: { lat: 16.7510, lng: 81.8440 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'KOVVUR', name: 'Kovvur', type: 'town', coords: { lat: 17.0110, lng: 81.7280 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'JANGAREDDYGUDEM', name: 'Jangareddygudem', type: 'town', coords: { lat: 17.1240, lng: 81.2950 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PEDDAPURAM', name: 'Peddapuram', type: 'town', coords: { lat: 17.0780, lng: 82.1380 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'SAMALKOTA', name: 'Samalkota', type: 'town', coords: { lat: 17.0490, lng: 82.1670 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'UPPADA', name: 'Uppada', type: 'village', coords: { lat: 17.0850, lng: 82.3270 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'DRAKSHARAMAM', name: 'Draksharamam', type: 'village', coords: { lat: 16.7930, lng: 82.0620 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'DWARAKA_TIRUMALA', name: 'Dwaraka Tirumala', type: 'village', coords: { lat: 16.9530, lng: 81.2580 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'ANTARVEDI', name: 'Antarvedi', type: 'village', coords: { lat: 16.3310, lng: 81.7340 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'PATTISEEMA', name: 'Pattiseema', type: 'village', coords: { lat: 17.3820, lng: 81.6020 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'DINDI', name: 'Dindi', type: 'village', coords: { lat: 16.4250, lng: 81.8750 }, state: 'Andhra Pradesh', tier: 'village' },

  // ==========================================
  // 4. SOUTH COASTAL AP
  // ==========================================
  { id: 'NELLORE', name: 'Nellore', type: 'city', coords: { lat: 14.4426, lng: 79.9865 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'ONGOLE', name: 'Ongole', type: 'city', coords: { lat: 15.5057, lng: 80.0499 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'CHIRALA', name: 'Chirala', type: 'town', coords: { lat: 15.8246, lng: 80.3522 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'KAVALI', name: 'Kavali', type: 'town', coords: { lat: 14.9132, lng: 79.9927 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'GUDUR', name: 'Gudur', type: 'town', coords: { lat: 14.1463, lng: 79.8504 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'SULLURPETA', name: 'Sullurpeta', type: 'town', coords: { lat: 13.7020, lng: 80.0210 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'NAIDUPETA', name: 'Naidupeta', type: 'town', coords: { lat: 13.9050, lng: 79.9040 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'MARKAPUR', name: 'Markapur', type: 'town', coords: { lat: 15.7350, lng: 79.2730 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'GIDDALUR', name: 'Giddalur', type: 'town', coords: { lat: 15.3780, lng: 78.9270 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'KANDUKUR', name: 'Kandukur', type: 'town', coords: { lat: 15.2160, lng: 79.9040 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PODILI', name: 'Podili', type: 'town', coords: { lat: 15.6040, lng: 79.6080 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'DARSI', name: 'Darsi', type: 'town', coords: { lat: 15.7720, lng: 79.6830 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'KRISHNAPATNAM', name: 'Krishnapatnam Port', type: 'village', coords: { lat: 14.2830, lng: 80.1250 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'MYPADU', name: 'Mypadu', type: 'village', coords: { lat: 14.5090, lng: 80.1770 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'SINGARAYAKONDA', name: 'Singarayakonda', type: 'village', coords: { lat: 15.2500, lng: 80.0330 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'TANGUTUR', name: 'Tangutur', type: 'village', coords: { lat: 15.3850, lng: 80.0350 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'ULAVAPADU', name: 'Ulavapadu', type: 'village', coords: { lat: 15.0830, lng: 80.0050 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'TADA', name: 'Tada (Sri City)', type: 'village', coords: { lat: 13.5900, lng: 80.0300 }, state: 'Andhra Pradesh', tier: 'village' },

  // ==========================================
  // 5. RAYALASEEMA
  // ==========================================
  { id: 'TIRUPATI', name: 'Tirupati', type: 'city', coords: { lat: 13.6288, lng: 79.4192 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'KURNOOL', name: 'Kurnool', type: 'city', coords: { lat: 15.8281, lng: 78.0373 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'KADAPA', name: 'Kadapa', type: 'city', coords: { lat: 14.4673, lng: 78.8242 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'ANANTAPUR', name: 'Anantapur', type: 'city', coords: { lat: 14.6819, lng: 77.6006 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'NANDYAL', name: 'Nandyal', type: 'city', coords: { lat: 15.4886, lng: 78.4836 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'CHITTOOR', name: 'Chittoor', type: 'city', coords: { lat: 13.2172, lng: 79.1003 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'PRODDATUR', name: 'Proddatur', type: 'city', coords: { lat: 14.7527, lng: 78.5522 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'HINDUPUR', name: 'Hindupur', type: 'city', coords: { lat: 13.8283, lng: 77.4914 }, state: 'Andhra Pradesh', tier: 'city' },
  { id: 'ADONI', name: 'Adoni', type: 'town', coords: { lat: 15.6322, lng: 77.2728 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'GUNTAKAL', name: 'Guntakal', type: 'town', coords: { lat: 15.1670, lng: 77.3800 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'MADANAPALLE', name: 'Madanapalle', type: 'town', coords: { lat: 13.5500, lng: 78.5000 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'SRIKALAHASTI', name: 'Srikalahasti', type: 'town', coords: { lat: 13.7498, lng: 79.6984 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'DHARMAVARAM', name: 'Dharmavaram', type: 'town', coords: { lat: 14.4140, lng: 77.7210 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'KADIRI', name: 'Kadiri', type: 'town', coords: { lat: 14.1130, lng: 78.1630 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'TADIPATRI', name: 'Tadipatri', type: 'town', coords: { lat: 14.9100, lng: 78.0100 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'RAYACHOTI', name: 'Rayachoti', type: 'town', coords: { lat: 14.0580, lng: 78.7520 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PUTTAPARTHI', name: 'Puttaparthi', type: 'town', coords: { lat: 14.1650, lng: 77.8110 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'YEMMIGANUR', name: 'Yemmiganur', type: 'town', coords: { lat: 15.7330, lng: 77.4830 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'DHONE', name: 'Dhone', type: 'town', coords: { lat: 15.4200, lng: 77.8700 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PULIVENDULA', name: 'Pulivendula', type: 'town', coords: { lat: 14.4170, lng: 78.2330 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PUNGANUR', name: 'Punganur', type: 'town', coords: { lat: 13.3670, lng: 78.5830 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'PALAMANER', name: 'Palamaner', type: 'town', coords: { lat: 13.2000, lng: 78.7500 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'SRISAILAM', name: 'Srisailam', type: 'town', coords: { lat: 16.0730, lng: 78.8680 }, state: 'Andhra Pradesh', tier: 'town' },
  { id: 'LEPAKSHI', name: 'Lepakshi', type: 'village', coords: { lat: 13.8040, lng: 77.6080 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'GANDIKOTA', name: 'Gandikota', type: 'village', coords: { lat: 14.8150, lng: 78.2860 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'AHOBILAM', name: 'Ahobilam', type: 'village', coords: { lat: 15.1380, lng: 78.7230 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'MAHANANDI', name: 'Mahanandi', type: 'village', coords: { lat: 15.4850, lng: 78.6250 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'BANAGANAPALLE', name: 'Banaganapalle', type: 'village', coords: { lat: 15.3180, lng: 78.2250 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'ORVAKAL', name: 'Orvakal', type: 'village', coords: { lat: 15.6830, lng: 78.2170 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'TIRUMALA', name: 'Tirumala', type: 'village', coords: { lat: 13.6830, lng: 79.3500 }, state: 'Andhra Pradesh', tier: 'village' },
  { id: 'KANIPAKAM', name: 'Kanipakam', type: 'village', coords: { lat: 13.2660, lng: 79.0330 }, state: 'Andhra Pradesh', tier: 'village' },
];

const ALL_VEHICLES: VehicleType[] = ['car', 'bike', 'bus', 'truck', 'emergency'];

// Helper to generate realistic curved road geometry between two points
function generateCurvedPoints(p1: GeoPoint, p2: GeoPoint, curveCount = 3, curvature = 0.008): GeoPoint[] {
  const points: GeoPoint[] = [{ ...p1 }];
  for (let i = 1; i <= curveCount; i++) {
    const fraction = i / (curveCount + 1);
    const baseLat = p1.lat + (p2.lat - p1.lat) * fraction;
    const baseLng = p1.lng + (p2.lng - p1.lng) * fraction;
    const perpLat = -(p2.lng - p1.lng) * curvature * (i % 2 === 0 ? 1 : -0.8);
    const perpLng = (p2.lat - p1.lat) * curvature * (i % 2 === 0 ? 1 : -0.8);
    points.push({
      lat: Number((baseLat + perpLat).toFixed(5)),
      lng: Number((baseLng + perpLng).toFixed(5)),
    });
  }
  points.push({ ...p2 });
  return points;
}

interface EdgeDef {
  id: string;
  from: string;
  to: string;
  roadName: string;
  roadType: GraphEdge['roadType'];
  distanceKm: number;
  baseSpeedKmH: number;
  trafficFactor: number;
  riskScore: number;
  allowedVehicles: VehicleType[];
  historicalCongestion?: number;
  historicalRisk?: number;
  roadCondition?: 'excellent' | 'good' | 'fair' | 'poor';
  vehicleSuitability?: Partial<Record<VehicleType, number>>;
}

const RAW_EDGES: EdgeDef[] = [
  // ==========================================
  // CAPITAL & CENTRAL AP CORRIDORS (NH16, NH65, Seed Capital Expressways, Delta Roads)
  // ==========================================
  { id: 'e_vja_man', from: 'VIJAYAWADA', to: 'MANGALAGIRI', roadName: 'NH16 Krishna River Bridge & AIIMS Access', roadType: 'national_highway', distanceKm: 12.4, baseSpeedKmH: 60, trafficFactor: 1.45, riskScore: 4.5, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_vja_man_elev', from: 'VIJAYAWADA', to: 'MANGALAGIRI', roadName: 'NH16 Kanaka Durga Elevated Flyover Corridor', roadType: 'expressway', distanceKm: 13.8, baseSpeedKmH: 90, trafficFactor: 1.12, riskScore: 1.8, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_man_kaza', from: 'MANGALAGIRI', to: 'KAZA', roadName: 'NH16 Kaza Tollway (ANU Stretch)', roadType: 'expressway', distanceKm: 8.5, baseSpeedKmH: 85, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_kaza_kakani', from: 'KAZA', to: 'PEDAKAKANI', roadName: 'NH16 Pedakakani Bypass', roadType: 'expressway', distanceKm: 6.2, baseSpeedKmH: 85, trafficFactor: 1.20, riskScore: 2.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_kakani_gun', from: 'PEDAKAKANI', to: 'GUNTUR', roadName: 'Guntur North Inner Ring Road', roadType: 'national_highway', distanceKm: 7.8, baseSpeedKmH: 65, trafficFactor: 1.35, riskScore: 3.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_kaza_gun_direct', from: 'KAZA', to: 'GUNTUR', roadName: 'NH16 Guntur North Direct Tollway', roadType: 'expressway', distanceKm: 13.5, baseSpeedKmH: 90, trafficFactor: 1.12, riskScore: 1.9, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  
  // Amaravati Core Capital Linkages & High-Speed Green Corridors
  { id: 'e_vja_und', from: 'VIJAYAWADA', to: 'UNDAVALLI', roadName: 'Prakasam Barrage Approach Road', roadType: 'arterial', distanceKm: 6.5, baseSpeedKmH: 45, trafficFactor: 1.42, riskScore: 3.0, roadCondition: 'fair', allowedVehicles: ALL_VEHICLES },
  { id: 'e_und_vela', from: 'UNDAVALLI', to: 'VELAGAPUDI', roadName: 'Amaravati Riverfront Boulevard (E3 Road)', roadType: 'expressway', distanceKm: 8.2, baseSpeedKmH: 70, trafficFactor: 1.05, riskScore: 1.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_vela_ama', from: 'VELAGAPUDI', to: 'AMARAVATI', roadName: 'Seed Access Road to Amaravati Heritage', roadType: 'expressway', distanceKm: 7.5, baseSpeedKmH: 75, trafficFactor: 1.05, riskScore: 1.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ama_thul', from: 'AMARAVATI', to: 'THULLUR', roadName: 'Capital Core Circular Arterial', roadType: 'state_highway', distanceKm: 5.8, baseSpeedKmH: 65, trafficFactor: 1.05, riskScore: 1.1, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_thul_gun', from: 'THULLUR', to: 'GUNTUR', roadName: 'Amaravati-Guntur Expressway', roadType: 'expressway', distanceKm: 26.5, baseSpeedKmH: 80, trafficFactor: 1.10, riskScore: 1.4, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_und_man', from: 'UNDAVALLI', to: 'MANGALAGIRI', roadName: 'Prakasam South AIIMS Connector', roadType: 'state_highway', distanceKm: 8.5, baseSpeedKmH: 65, trafficFactor: 1.10, riskScore: 1.4, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_und_thul', from: 'UNDAVALLI', to: 'THULLUR', roadName: 'Amaravati Capital Core Expressway (E3-E5)', roadType: 'expressway', distanceKm: 18.0, baseSpeedKmH: 85, trafficFactor: 1.05, riskScore: 1.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_man_thul', from: 'MANGALAGIRI', to: 'THULLUR', roadName: 'AIIMS-Capital Radial Expressway', roadType: 'expressway', distanceKm: 19.5, baseSpeedKmH: 80, trafficFactor: 1.08, riskScore: 1.3, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_vja_ibra', from: 'VIJAYAWADA', to: 'IBRAHIMPATNAM', roadName: 'NH65 Ibrahimpatnam Bypass', roadType: 'national_highway', distanceKm: 16.5, baseSpeedKmH: 70, trafficFactor: 1.28, riskScore: 2.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ibra_ama', from: 'IBRAHIMPATNAM', to: 'AMARAVATI', roadName: 'Krishna River Bridge Connector', roadType: 'state_highway', distanceKm: 9.8, baseSpeedKmH: 60, trafficFactor: 1.10, riskScore: 1.6, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },

  // Gannavaram & Delta Corridors
  { id: 'e_vja_gan', from: 'VIJAYAWADA', to: 'GANNAVARAM', roadName: 'NH16 Airport Express Corridor', roadType: 'expressway', distanceKm: 18.0, baseSpeedKmH: 80, trafficFactor: 1.35, riskScore: 3.5, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_gan_han', from: 'GANNAVARAM', to: 'HANUMAN_JUNCTION', roadName: 'NH16 Tollway to Junction', roadType: 'expressway', distanceKm: 22.0, baseSpeedKmH: 85, trafficFactor: 1.28, riskScore: 3.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_han_elu', from: 'HANUMAN_JUNCTION', to: 'ELURU', roadName: 'NH16 Hanuman Junction-Eluru Tollway', roadType: 'expressway', distanceKm: 19.5, baseSpeedKmH: 85, trafficFactor: 1.25, riskScore: 3.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_gan_nuz', from: 'GANNAVARAM', to: 'NUZVID', roadName: 'SH42 Mango Belt Highway', roadType: 'state_highway', distanceKm: 26.0, baseSpeedKmH: 65, trafficFactor: 1.08, riskScore: 1.5, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_nuz_elu', from: 'NUZVID', to: 'ELURU', roadName: 'SH39 Nuzvid-Eluru Link Highway', roadType: 'state_highway', distanceKm: 36.0, baseSpeedKmH: 65, trafficFactor: 1.10, riskScore: 1.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_nuz_dwa', from: 'NUZVID', to: 'DWARAKA_TIRUMALA', roadName: 'SH38 Horticulture Belt Highway', roadType: 'state_highway', distanceKm: 34.0, baseSpeedKmH: 65, trafficFactor: 1.08, riskScore: 1.5, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_vja_kan', from: 'VIJAYAWADA', to: 'KANKIPADU', roadName: 'NH65 Machilipatnam Road', roadType: 'national_highway', distanceKm: 14.2, baseSpeedKmH: 60, trafficFactor: 1.30, riskScore: 2.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_kan_vuy', from: 'KANKIPADU', to: 'VUYYURU', roadName: 'NH65 Sugar Belt Corridor', roadType: 'national_highway', distanceKm: 16.8, baseSpeedKmH: 65, trafficFactor: 1.20, riskScore: 2.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_vuy_pam', from: 'VUYYURU', to: 'PAMARRU', roadName: 'NH65 Pamarru Highway', roadType: 'national_highway', distanceKm: 14.5, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_pam_gud', from: 'PAMARRU', to: 'GUDIVADA', roadName: 'SH46 Gudivada Connector', roadType: 'state_highway', distanceKm: 14.0, baseSpeedKmH: 60, trafficFactor: 1.20, riskScore: 2.1, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_pam_mac', from: 'PAMARRU', to: 'MACHILIPATNAM', roadName: 'NH65 Port Express Way', roadType: 'national_highway', distanceKm: 24.5, baseSpeedKmH: 70, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },

  // Tenali, Bapatla, Repalle Delta Linkages
  { id: 'e_gun_ten', from: 'GUNTUR', to: 'TENALI', roadName: 'SH48 Guntur-Tenali Highway', roadType: 'state_highway', distanceKm: 24.8, baseSpeedKmH: 55, trafficFactor: 1.25, riskScore: 2.5, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ten_man', from: 'TENALI', to: 'MANGALAGIRI', roadName: 'Tenali-Mangalagiri Road', roadType: 'state_highway', distanceKm: 22.0, baseSpeedKmH: 55, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ten_dug', from: 'TENALI', to: 'DUGGIRALA', roadName: 'Turmeric Basin Road', roadType: 'arterial', distanceKm: 9.5, baseSpeedKmH: 50, trafficFactor: 1.15, riskScore: 1.8, roadCondition: 'fair', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ten_pon', from: 'TENALI', to: 'PONNUR', roadName: 'SH48 Ponnur Link', roadType: 'state_highway', distanceKm: 22.0, baseSpeedKmH: 55, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_pon_bap', from: 'PONNUR', to: 'BAPATLA', roadName: 'SH48 Bapatla Coastal Access', roadType: 'state_highway', distanceKm: 21.0, baseSpeedKmH: 60, trafficFactor: 1.15, riskScore: 1.9, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ten_bha', from: 'TENALI', to: 'BHATTIPROLU', roadName: 'Heritage Stupa Road', roadType: 'state_highway', distanceKm: 21.5, baseSpeedKmH: 55, trafficFactor: 1.10, riskScore: 1.6, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_bha_rep', from: 'BHATTIPROLU', to: 'REPALLE', roadName: 'Repalle Delta Road', roadType: 'state_highway', distanceKm: 12.0, baseSpeedKmH: 55, trafficFactor: 1.10, riskScore: 1.5, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_rep_ava', from: 'REPALLE', to: 'AVANIGADDA', roadName: 'Penumudi-Puligadda Krishna Bridge', roadType: 'national_highway', distanceKm: 14.5, baseSpeedKmH: 65, trafficFactor: 1.10, riskScore: 1.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ava_cha', from: 'AVANIGADDA', to: 'CHALLAPALLI', roadName: 'Diviseema Main Road', roadType: 'state_highway', distanceKm: 11.5, baseSpeedKmH: 55, trafficFactor: 1.10, riskScore: 1.5, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_cha_pam', from: 'CHALLAPALLI', to: 'PAMARRU', roadName: 'Challapalli-Pamarru Road', roadType: 'state_highway', distanceKm: 23.5, baseSpeedKmH: 60, trafficFactor: 1.10, riskScore: 1.6, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_bap_chi', from: 'BAPATLA', to: 'CHIRALA', roadName: 'NH216 Bapatla-Chirala Highway', roadType: 'national_highway', distanceKm: 16.5, baseSpeedKmH: 70, trafficFactor: 1.20, riskScore: 2.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },

  // Palnadu Corridors
  { id: 'e_gun_chi', from: 'GUNTUR', to: 'CHILAKALURIPET', roadName: 'NH16 Guntur-Chilakaluripet Highway', roadType: 'expressway', distanceKm: 38.0, baseSpeedKmH: 85, trafficFactor: 1.35, riskScore: 4.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_gun_sat', from: 'GUNTUR', to: 'SATTENAPALLI', roadName: 'SH2 Guntur-Sattenapalli Road', roadType: 'state_highway', distanceKm: 34.0, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2.1, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_sat_pid', from: 'SATTENAPALLI', to: 'PIDUGURALLA', roadName: 'SH2 Palnadu Highway', roadType: 'state_highway', distanceKm: 28.5, baseSpeedKmH: 70, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_pid_mac', from: 'PIDUGURALLA', to: 'MACHERLA', roadName: 'SH2 Nagarjuna Sagar Access', roadType: 'state_highway', distanceKm: 62.0, baseSpeedKmH: 70, trafficFactor: 1.10, riskScore: 1.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_sat_nar', from: 'SATTENAPALLI', to: 'NARASARAOPET', roadName: 'SH46 Sattenapalli-Narasaraopet Road', roadType: 'state_highway', distanceKm: 22.0, baseSpeedKmH: 60, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_nar_vin', from: 'NARASARAOPET', to: 'VINUKONDA', roadName: 'NH544D Vinukonda Highway', roadType: 'national_highway', distanceKm: 36.5, baseSpeedKmH: 75, trafficFactor: 1.15, riskScore: 2.1, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_chi_nar', from: 'CHILAKALURIPET', to: 'NARASARAOPET', roadName: 'SH45 Cotton Highway', roadType: 'state_highway', distanceKm: 21.0, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },

  // ==========================================
  // GODAVARI DELTA NETWORK
  // ==========================================
  { id: 'e_elu_tad', from: 'ELURU', to: 'TADEPALLIGUDEM', roadName: 'NH16 Eluru-Tadepalligudem Expressway', roadType: 'expressway', distanceKm: 48.0, baseSpeedKmH: 85, trafficFactor: 1.30, riskScore: 3.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_elu_dwa', from: 'ELURU', to: 'DWARAKA_TIRUMALA', roadName: 'SH41 Chinna Tirupati Road', roadType: 'state_highway', distanceKm: 38.0, baseSpeedKmH: 65, trafficFactor: 1.08, riskScore: 1.6, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_elu_jan', from: 'ELURU', to: 'JANGAREDDYGUDEM', roadName: 'SH40 Agency Highway', roadType: 'state_highway', distanceKm: 52.0, baseSpeedKmH: 65, trafficFactor: 1.08, riskScore: 1.6, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_tad_tan', from: 'TADEPALLIGUDEM', to: 'TANUKU', roadName: 'NH16 Tadepalligudem-Tanuku Tollway', roadType: 'expressway', distanceKm: 18.0, baseSpeedKmH: 85, trafficFactor: 1.45, riskScore: 5.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_tad_kov', from: 'TADEPALLIGUDEM', to: 'KOVVUR', roadName: 'SH41 Godavari Link Bypass', roadType: 'state_highway', distanceKm: 34.0, baseSpeedKmH: 75, trafficFactor: 1.14, riskScore: 2.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_dwa_kov', from: 'DWARAKA_TIRUMALA', to: 'KOVVUR', roadName: 'SH42 Temple Express Bypass', roadType: 'state_highway', distanceKm: 42.0, baseSpeedKmH: 70, trafficFactor: 1.09, riskScore: 1.7, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_jan_kov', from: 'JANGAREDDYGUDEM', to: 'KOVVUR', roadName: 'SH43 Polavaram Canal Expressway', roadType: 'state_highway', distanceKm: 38.0, baseSpeedKmH: 70, trafficFactor: 1.08, riskScore: 1.6, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_tad_bhi', from: 'TADEPALLIGUDEM', to: 'BHIMAVARAM', roadName: 'SH43 Rice Bowl Highway', roadType: 'state_highway', distanceKm: 32.0, baseSpeedKmH: 60, trafficFactor: 1.20, riskScore: 2.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_bhi_pal', from: 'BHIMAVARAM', to: 'PALAKOLLU', roadName: 'SH44 Pancharama Road', roadType: 'state_highway', distanceKm: 22.0, baseSpeedKmH: 55, trafficFactor: 1.20, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_pal_nar', from: 'PALAKOLLU', to: 'NARASAPURAM', roadName: 'SH44 Godavari Lace Corridor', roadType: 'state_highway', distanceKm: 12.0, baseSpeedKmH: 55, trafficFactor: 1.15, riskScore: 1.9, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_nar_ant', from: 'NARASAPURAM', to: 'ANTARVEDI', roadName: 'Vasista Godavari Estuary Road', roadType: 'arterial', distanceKm: 18.0, baseSpeedKmH: 50, trafficFactor: 1.10, riskScore: 1.7, roadCondition: 'fair', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ant_ama', from: 'ANTARVEDI', to: 'AMALAPURAM', roadName: 'Konaseema Coconut Belt Road', roadType: 'state_highway', distanceKm: 38.0, baseSpeedKmH: 55, trafficFactor: 1.10, riskScore: 1.6, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ama_din', from: 'AMALAPURAM', to: 'DINDI', roadName: 'Razole-Dindi Scenic Highway', roadType: 'state_highway', distanceKm: 22.0, baseSpeedKmH: 55, trafficFactor: 1.05, riskScore: 1.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_tan_rav', from: 'TANUKU', to: 'RAVULAPALEM', roadName: 'NH16 Siddhantham Bridge Corridor', roadType: 'expressway', distanceKm: 18.0, baseSpeedKmH: 80, trafficFactor: 1.68, riskScore: 7.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_rav_raj', from: 'RAVULAPALEM', to: 'RAJAHMUNDRY', roadName: 'NH16 Godavari Tollway', roadType: 'expressway', distanceKm: 34.0, baseSpeedKmH: 85, trafficFactor: 1.62, riskScore: 7.5, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_rav_ama', from: 'RAVULAPALEM', to: 'AMALAPURAM', roadName: 'SH45 Konaseema Gateway', roadType: 'state_highway', distanceKm: 28.0, baseSpeedKmH: 60, trafficFactor: 1.20, riskScore: 2.1, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_raj_kov', from: 'RAJAHMUNDRY', to: 'KOVVUR', roadName: 'Godavari Fourth Bridge / Arch Bridge', roadType: 'national_highway', distanceKm: 8.5, baseSpeedKmH: 60, trafficFactor: 1.40, riskScore: 3.5, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_kov_pat', from: 'KOVVUR', to: 'PATTISEEMA', roadName: 'Godavari Riverbank Road', roadType: 'state_highway', distanceKm: 42.0, baseSpeedKmH: 55, trafficFactor: 1.05, riskScore: 1.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_raj_sam', from: 'RAJAHMUNDRY', to: 'SAMALKOTA', roadName: 'ADB Road Dedicated Tollway', roadType: 'national_highway', distanceKm: 48.0, baseSpeedKmH: 80, trafficFactor: 1.15, riskScore: 2.5, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_sam_kak', from: 'SAMALKOTA', to: 'KAKINADA', roadName: 'SH42 Kakinada Port Access', roadType: 'national_highway', distanceKm: 14.0, baseSpeedKmH: 70, trafficFactor: 1.18, riskScore: 2.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_sam_ped', from: 'SAMALKOTA', to: 'PEDDAPURAM', roadName: 'Silk Belt Road', roadType: 'state_highway', distanceKm: 6.5, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ama_dra', from: 'AMALAPURAM', to: 'DRAKSHARAMAM', roadName: 'SH46 Temple Highway', roadType: 'state_highway', distanceKm: 26.0, baseSpeedKmH: 55, trafficFactor: 1.10, riskScore: 1.6, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_dra_kak', from: 'DRAKSHARAMAM', to: 'KAKINADA', roadName: 'SH46 Kakinada South Access', roadType: 'state_highway', distanceKm: 24.0, baseSpeedKmH: 60, trafficFactor: 1.25, riskScore: 2.3, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_kak_upp', from: 'KAKINADA', to: 'UPPADA', roadName: 'Uppada Beach Road Corridor', roadType: 'state_highway', distanceKm: 18.0, baseSpeedKmH: 60, trafficFactor: 1.06, riskScore: 1.3, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_upp_ann', from: 'UPPADA', to: 'ANNAVARAM', roadName: 'NH216 Coastal Greenfield Highway', roadType: 'expressway', distanceKm: 28.0, baseSpeedKmH: 85, trafficFactor: 1.05, riskScore: 1.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },

  // ==========================================
  // NORTH COASTAL AP / UTTARANDHRA HIGHWAY CORRIDOR
  // ==========================================
  { id: 'e_ped_ann', from: 'PEDDAPURAM', to: 'ANNAVARAM', roadName: 'NH16 Annavaram Access Expressway', roadType: 'expressway', distanceKm: 34.0, baseSpeedKmH: 85, trafficFactor: 1.20, riskScore: 2.5, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ann_tun', from: 'ANNAVARAM', to: 'TUNI', roadName: 'NH16 Tollway Stretch', roadType: 'expressway', distanceKm: 16.0, baseSpeedKmH: 90, trafficFactor: 1.12, riskScore: 1.5, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_tun_pay', from: 'TUNI', to: 'PAYAKARAOPETA', roadName: 'Tuni-Payakaraopeta Tandava Bridge Bottleneck', roadType: 'national_highway', distanceKm: 3.5, baseSpeedKmH: 60, trafficFactor: 1.58, riskScore: 7.2, roadCondition: 'fair', allowedVehicles: ALL_VEHICLES },
  { id: 'e_pay_yel', from: 'PAYAKARAOPETA', to: 'YELAMANCHILI', roadName: 'NH16 Coastal Freight Tollway', roadType: 'expressway', distanceKm: 38.0, baseSpeedKmH: 85, trafficFactor: 1.52, riskScore: 6.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_yel_ana', from: 'YELAMANCHILI', to: 'ANAKAPALLE', roadName: 'NH16 Anakapalle Jaggery Chokepoint', roadType: 'expressway', distanceKm: 22.0, baseSpeedKmH: 80, trafficFactor: 1.55, riskScore: 7.4, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ana_viz', from: 'ANAKAPALLE', to: 'VISAKHAPATNAM', roadName: 'NH16 Gajuwaka Steel Plant Bottleneck', roadType: 'expressway', distanceKm: 28.5, baseSpeedKmH: 75, trafficFactor: 1.75, riskScore: 8.2, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_tun_nar', from: 'TUNI', to: 'NARSIPATNAM', roadName: 'SH37 Agency Foothill Bypass', roadType: 'state_highway', distanceKm: 36.0, baseSpeedKmH: 70, trafficFactor: 1.06, riskScore: 1.4, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_ana_nar', from: 'ANAKAPALLE', to: 'NARSIPATNAM', roadName: 'SH38 Agency Highway', roadType: 'state_highway', distanceKm: 46.0, baseSpeedKmH: 65, trafficFactor: 1.08, riskScore: 1.6, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_nar_pad', from: 'NARSIPATNAM', to: 'PADERU', roadName: 'Ghat Road Corridor', roadType: 'state_highway', distanceKm: 58.0, baseSpeedKmH: 45, trafficFactor: 1.05, riskScore: 4.5, roadCondition: 'fair', allowedVehicles: ALL_VEHICLES },
  { id: 'e_pad_ara', from: 'PADERU', to: 'ARAKU_VALLEY', roadName: 'Eastern Ghats Scenic Highway', roadType: 'state_highway', distanceKm: 42.0, baseSpeedKmH: 45, trafficFactor: 1.05, riskScore: 3.5, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_viz_bhe', from: 'VISAKHAPATNAM', to: 'BHEEMUNIPATNAM', roadName: 'Visakhapatnam-Bheemili Beach Road', roadType: 'expressway', distanceKm: 28.0, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 1.3, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_bhe_bho', from: 'BHEEMUNIPATNAM', to: 'BHOGAPURAM', roadName: 'International Airport Access Link', roadType: 'expressway', distanceKm: 18.0, baseSpeedKmH: 80, trafficFactor: 1.10, riskScore: 1.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_viz_vzn', from: 'VISAKHAPATNAM', to: 'VIZIANAGARAM', roadName: 'NH26 Vizag-Vizianagaram Expressway', roadType: 'expressway', distanceKm: 48.0, baseSpeedKmH: 80, trafficFactor: 1.25, riskScore: 2.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_bho_vzn', from: 'BHOGAPURAM', to: 'VIZIANAGARAM', roadName: 'SH48 Airport Connector', roadType: 'state_highway', distanceKm: 16.0, baseSpeedKmH: 70, trafficFactor: 1.05, riskScore: 1.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_vzn_bob', from: 'VIZIANAGARAM', to: 'BOBBILI', roadName: 'NH26 Historic Fort Highway', roadType: 'national_highway', distanceKm: 52.0, baseSpeedKmH: 70, trafficFactor: 1.15, riskScore: 2.1, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_bob_par', from: 'BOBBILI', to: 'PARVATHIPURAM', roadName: 'NH26 Manyam District Highway', roadType: 'national_highway', distanceKm: 24.0, baseSpeedKmH: 70, trafficFactor: 1.10, riskScore: 1.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_bob_sal', from: 'BOBBILI', to: 'SALUR', roadName: 'SH34 Salur Link Road', roadType: 'state_highway', distanceKm: 18.0, baseSpeedKmH: 60, trafficFactor: 1.10, riskScore: 1.8, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_sal_ara', from: 'SALUR', to: 'ARAKU_VALLEY', roadName: 'Sunki Ghat Mountain Road', roadType: 'state_highway', distanceKm: 48.0, baseSpeedKmH: 40, trafficFactor: 1.05, riskScore: 4.8, roadCondition: 'fair', allowedVehicles: ALL_VEHICLES },
  { id: 'e_vzn_raj', from: 'VIZIANAGARAM', to: 'RAJAM', roadName: 'SH39 GMR Industrial Road', roadType: 'state_highway', distanceKm: 42.0, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2.1, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_raj_srk', from: 'RAJAM', to: 'SRIKAKULAM', roadName: 'SH39 Srikakulam Link', roadType: 'state_highway', distanceKm: 32.0, baseSpeedKmH: 60, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'good', allowedVehicles: ALL_VEHICLES },
  { id: 'e_srk_tek', from: 'SRIKAKULAM', to: 'TEKKALI', roadName: 'NH16 Tekkali Express Stretch', roadType: 'expressway', distanceKm: 46.0, baseSpeedKmH: 85, trafficFactor: 1.15, riskScore: 2.2, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_tek_pal', from: 'TEKKALI', to: 'PALASA', roadName: 'NH16 Palasa Cashew Corridor', roadType: 'expressway', distanceKm: 26.0, baseSpeedKmH: 85, trafficFactor: 1.15, riskScore: 2.1, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },
  { id: 'e_pal_som', from: 'PALASA', to: 'SOMPETA', roadName: 'NH16 Ichchapuram Border Corridor', roadType: 'expressway', distanceKm: 28.0, baseSpeedKmH: 85, trafficFactor: 1.15, riskScore: 2.0, roadCondition: 'excellent', allowedVehicles: ALL_VEHICLES },

  // ==========================================
  // SOUTH COASTAL AP CORRIDORS (NH16, NH216, NH71)
  // ==========================================
  { id: 'e_chi_ong', from: 'CHIRALA', to: 'ONGOLE', roadName: 'NH216 Coastal Highway to Ongole', roadType: 'national_highway', distanceKm: 46.0, baseSpeedKmH: 75, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_ong_tan', from: 'ONGOLE', to: 'TANGUTUR', roadName: 'NH16 Tangutur Toll Plaza Stretch', roadType: 'expressway', distanceKm: 16.0, baseSpeedKmH: 90, trafficFactor: 1.10, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_tan_sin', from: 'TANGUTUR', to: 'SINGARAYAKONDA', roadName: 'NH16 Varaha Shrine Stretch', roadType: 'expressway', distanceKm: 14.5, baseSpeedKmH: 90, trafficFactor: 1.10, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_sin_kan', from: 'SINGARAYAKONDA', to: 'KANDUKUR', roadName: 'SH46 Kandukur Link', roadType: 'state_highway', distanceKm: 16.0, baseSpeedKmH: 60, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_sin_ula', from: 'SINGARAYAKONDA', to: 'ULAVAPADU', roadName: 'NH16 Mango Belt Corridor', roadType: 'expressway', distanceKm: 18.0, baseSpeedKmH: 90, trafficFactor: 1.10, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_ula_kav', from: 'ULAVAPADU', to: 'KAVALI', roadName: 'NH16 Kavali Tollway', roadType: 'expressway', distanceKm: 22.0, baseSpeedKmH: 90, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_kav_nel', from: 'KAVALI', to: 'NELLORE', roadName: 'NH16 Penna Delta Highway', roadType: 'expressway', distanceKm: 56.0, baseSpeedKmH: 90, trafficFactor: 1.20, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_ong_pod', from: 'ONGOLE', to: 'PODILI', roadName: 'SH39 Granite Highway', roadType: 'state_highway', distanceKm: 52.0, baseSpeedKmH: 65, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_pod_mar', from: 'PODILI', to: 'MARKAPUR', roadName: 'SH39 Slate City Highway', roadType: 'state_highway', distanceKm: 38.0, baseSpeedKmH: 65, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_pod_dar', from: 'PODILI', to: 'DARSI', roadName: 'Nagarjuna Canal Road', roadType: 'state_highway', distanceKm: 22.0, baseSpeedKmH: 60, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_dar_vin', from: 'DARSI', to: 'VINUKONDA', roadName: 'SH31 Palnadu Link Road', roadType: 'state_highway', distanceKm: 34.0, baseSpeedKmH: 60, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_mar_gid', from: 'MARKAPUR', to: 'GIDDALUR', roadName: 'SH30 Nallamala Foothill Highway', roadType: 'state_highway', distanceKm: 54.0, baseSpeedKmH: 60, trafficFactor: 1.05, riskScore: 3, allowedVehicles: ALL_VEHICLES },
  { id: 'e_mar_sri', from: 'MARKAPUR', to: 'SRISAILAM', roadName: 'Nallamala Tiger Sanctuary Ghat Road', roadType: 'state_highway', distanceKm: 82.0, baseSpeedKmH: 45, trafficFactor: 1.05, riskScore: 4, allowedVehicles: ALL_VEHICLES },

  // Nellore District & South AP Ports
  { id: 'e_nel_kri', from: 'NELLORE', to: 'KRISHNAPATNAM', roadName: 'Krishnapatnam Port Dedicated Expressway', roadType: 'expressway', distanceKm: 24.0, baseSpeedKmH: 80, trafficFactor: 1.25, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_nel_myp', from: 'NELLORE', to: 'MYPADU', roadName: 'Mypadu Beach Tourism Highway', roadType: 'state_highway', distanceKm: 22.0, baseSpeedKmH: 60, trafficFactor: 1.10, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_nel_gud', from: 'NELLORE', to: 'GUDUR', roadName: 'NH16 Nellore-Gudur Expressway', roadType: 'expressway', distanceKm: 34.0, baseSpeedKmH: 85, trafficFactor: 1.20, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_gud_nai', from: 'GUDUR', to: 'NAIDUPETA', roadName: 'NH16 Naidupeta SEZ Corridor', roadType: 'expressway', distanceKm: 28.0, baseSpeedKmH: 85, trafficFactor: 1.15, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_nai_sul', from: 'NAIDUPETA', to: 'SULLURPETA', roadName: 'NH16 ISRO Spaceport Highway', roadType: 'expressway', distanceKm: 24.0, baseSpeedKmH: 90, trafficFactor: 1.15, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_sul_tad', from: 'SULLURPETA', to: 'TADA', roadName: 'NH16 Sri City Industrial Express', roadType: 'expressway', distanceKm: 14.0, baseSpeedKmH: 90, trafficFactor: 1.25, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_nai_srk', from: 'NAIDUPETA', to: 'SRIKALAHASTI', roadName: 'NH71 Srikalahasti Highway', roadType: 'national_highway', distanceKm: 32.0, baseSpeedKmH: 75, trafficFactor: 1.20, riskScore: 2, allowedVehicles: ALL_VEHICLES },

  // ==========================================
  // RAYALASEEMA HIGHWAY NETWORK (NH44, NH40, NH716, NH69, NH544D)
  // ==========================================
  { id: 'e_kur_orv', from: 'KURNOOL', to: 'ORVAKAL', roadName: 'NH40 Rock Garden Airport Corridor', roadType: 'expressway', distanceKm: 22.0, baseSpeedKmH: 85, trafficFactor: 1.10, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_orv_nan', from: 'ORVAKAL', to: 'NANDYAL', roadName: 'NH40 Kurnool-Nandyal Expressway', roadType: 'expressway', distanceKm: 52.0, baseSpeedKmH: 85, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_kur_dho', from: 'KURNOOL', to: 'DHONE', roadName: 'NH44 North-South Corridor Stretch', roadType: 'expressway', distanceKm: 52.0, baseSpeedKmH: 90, trafficFactor: 1.10, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_dho_ana', from: 'DHONE', to: 'ANANTAPUR', roadName: 'NH44 Anantapur Tollway', roadType: 'expressway', distanceKm: 96.0, baseSpeedKmH: 95, trafficFactor: 1.10, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_kur_ado', from: 'KURNOOL', to: 'ADONI', roadName: 'SH30 Adoni Cotton Highway', roadType: 'state_highway', distanceKm: 68.0, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_ado_yem', from: 'ADONI', to: 'YEMMIGANUR', roadName: 'SH31 Weavers Highway', roadType: 'state_highway', distanceKm: 24.0, baseSpeedKmH: 60, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_ado_gun', from: 'ADONI', to: 'GUNTAKAL', roadName: 'SH33 Railway Division Highway', roadType: 'state_highway', distanceKm: 56.0, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_gun_ana', from: 'GUNTAKAL', to: 'ANANTAPUR', roadName: 'NH67 Guntakal-Anantapur Highway', roadType: 'national_highway', distanceKm: 68.0, baseSpeedKmH: 75, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_nan_mah', from: 'NANDYAL', to: 'MAHANANDI', roadName: 'Mahanandi Mineral Spring Road', roadType: 'state_highway', distanceKm: 16.0, baseSpeedKmH: 55, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_nan_ban', from: 'NANDYAL', to: 'BANAGANAPALLE', roadName: 'SH30 Mango & Fort Road', roadType: 'state_highway', distanceKm: 36.0, baseSpeedKmH: 60, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_ban_tad', from: 'BANAGANAPALLE', to: 'TADIPATRI', roadName: 'SH30 Cement Industrial Highway', roadType: 'state_highway', distanceKm: 58.0, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_nan_aho', from: 'NANDYAL', to: 'AHOBILAM', roadName: 'SH32 Allagadda-Ahobilam Forest Road', roadType: 'state_highway', distanceKm: 64.0, baseSpeedKmH: 55, trafficFactor: 1.05, riskScore: 3, allowedVehicles: ALL_VEHICLES },
  { id: 'e_nan_pro', from: 'NANDYAL', to: 'PRODDATUR', roadName: 'NH40 Nandyal-Proddatur Expressway', roadType: 'expressway', distanceKm: 88.0, baseSpeedKmH: 85, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_pro_kad', from: 'PRODDATUR', to: 'KADAPA', roadName: 'NH40 Kadapa Access Corridor', roadType: 'expressway', distanceKm: 54.0, baseSpeedKmH: 80, trafficFactor: 1.25, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_pro_gan', from: 'PRODDATUR', to: 'GANDIKOTA', roadName: 'SH34 Grand Canyon Road', roadType: 'state_highway', distanceKm: 28.0, baseSpeedKmH: 60, trafficFactor: 1.05, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_gan_pul', from: 'GANDIKOTA', to: 'PULIVENDULA', roadName: 'SH34 Pulivendula Link', roadType: 'state_highway', distanceKm: 48.0, baseSpeedKmH: 65, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_pul_kad', from: 'PULIVENDULA', to: 'KADAPA', roadName: 'SH32 Kadapa Western Highway', roadType: 'state_highway', distanceKm: 68.0, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_ana_dha', from: 'ANANTAPUR', to: 'DHARMAVARAM', roadName: 'NH44 Silk City Highway', roadType: 'expressway', distanceKm: 42.0, baseSpeedKmH: 90, trafficFactor: 1.15, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_dha_put', from: 'DHARMAVARAM', to: 'PUTTAPARTHI', roadName: 'SH48 Prasanthi Nilayam Road', roadType: 'state_highway', distanceKm: 34.0, baseSpeedKmH: 70, trafficFactor: 1.10, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_put_hin', from: 'PUTTAPARTHI', to: 'HINDUPUR', roadName: 'SH48 Industrial Gateway', roadType: 'state_highway', distanceKm: 52.0, baseSpeedKmH: 70, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_hin_lep', from: 'HINDUPUR', to: 'LEPAKSHI', roadName: 'Historic Nandi Highway', roadType: 'state_highway', distanceKm: 14.5, baseSpeedKmH: 65, trafficFactor: 1.10, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_dha_kdr', from: 'DHARMAVARAM', to: 'KADIRI', roadName: 'NH342 Kadiri Highway', roadType: 'national_highway', distanceKm: 64.0, baseSpeedKmH: 75, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_kdr_ray', from: 'KADIRI', to: 'RAYACHOTI', roadName: 'NH342 Rayachoti Corridor', roadType: 'national_highway', distanceKm: 62.0, baseSpeedKmH: 75, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_kdr_mad', from: 'KADIRI', to: 'MADANAPALLE', roadName: 'SH36 Horsley Hills Highway', roadType: 'state_highway', distanceKm: 74.0, baseSpeedKmH: 65, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_ray_kad', from: 'RAYACHOTI', to: 'KADAPA', roadName: 'NH40 Guvvalacheruvu Ghat Road', roadType: 'national_highway', distanceKm: 52.0, baseSpeedKmH: 65, trafficFactor: 1.20, riskScore: 3, allowedVehicles: ALL_VEHICLES },
  { id: 'e_ray_mad', from: 'RAYACHOTI', to: 'MADANAPALLE', roadName: 'NH340 Tomato Capital Highway', roadType: 'national_highway', distanceKm: 58.0, baseSpeedKmH: 70, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_tir_trm', from: 'TIRUPATI', to: 'TIRUMALA', roadName: 'First & Second Tirumala Ghat Roads', roadType: 'state_highway', distanceKm: 21.0, baseSpeedKmH: 40, trafficFactor: 1.45, riskScore: 4, allowedVehicles: ALL_VEHICLES },
  { id: 'e_tir_srk', from: 'TIRUPATI', to: 'SRIKALAHASTI', roadName: 'NH71 Srikalahasti Temple Express', roadType: 'national_highway', distanceKm: 38.0, baseSpeedKmH: 75, trafficFactor: 1.25, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_tir_chi', from: 'TIRUPATI', to: 'CHITTOOR', roadName: 'NH140 Chittoor Expressway', roadType: 'expressway', distanceKm: 68.0, baseSpeedKmH: 80, trafficFactor: 1.20, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_chi_kan', from: 'CHITTOOR', to: 'KANIPAKAM', roadName: 'Vinayaka Shrine Road', roadType: 'state_highway', distanceKm: 12.5, baseSpeedKmH: 60, trafficFactor: 1.20, riskScore: 1, allowedVehicles: ALL_VEHICLES },
  { id: 'e_chi_pal', from: 'CHITTOOR', to: 'PALAMANER', roadName: 'NH69 Old Madras Highway', roadType: 'national_highway', distanceKm: 42.0, baseSpeedKmH: 75, trafficFactor: 1.20, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_pal_pun', from: 'PALAMANER', to: 'PUNGANUR', roadName: 'SH48 Punganur Cattle Hub Road', roadType: 'state_highway', distanceKm: 24.0, baseSpeedKmH: 65, trafficFactor: 1.10, riskScore: 2, allowedVehicles: ALL_VEHICLES },
  { id: 'e_pun_mad', from: 'PUNGANUR', to: 'MADANAPALLE', roadName: 'SH48 Madanapalle Link', roadType: 'state_highway', distanceKm: 26.0, baseSpeedKmH: 65, trafficFactor: 1.15, riskScore: 2, allowedVehicles: ALL_VEHICLES },

  // Natural Regional Connecting Links
  { id: 'e_nan_gid', from: 'NANDYAL', to: 'GIDDALUR', roadName: 'SH30 Nallamala Pass Highway', roadType: 'state_highway', distanceKm: 64.0, baseSpeedKmH: 60, trafficFactor: 1.10, riskScore: 3, allowedVehicles: ALL_VEHICLES },
];

function getDefaultSuitability(roadType: GraphEdge['roadType']): Record<VehicleType, number> {
  switch (roadType) {
    case 'expressway':
      return { car: 1.0, emergency: 1.0, truck: 1.0, bus: 0.95, bike: 0.4 };
    case 'national_highway':
      return { car: 1.0, emergency: 1.0, truck: 0.95, bus: 1.0, bike: 0.8 };
    case 'state_highway':
      return { car: 1.0, emergency: 1.0, truck: 0.85, bus: 0.9, bike: 0.95 };
    case 'arterial':
      return { car: 1.0, emergency: 0.9, truck: 0.5, bus: 0.65, bike: 1.0 };
    case 'rural':
      return { car: 0.8, emergency: 0.7, truck: 0.2, bus: 0.3, bike: 1.0 };
    default:
      return { car: 1.0, emergency: 1.0, truck: 0.8, bus: 0.8, bike: 0.8 };
  }
}

export function buildCompleteRegionalGraph(): { vertices: GraphVertex[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphVertex>();
  REGIONAL_NODES.forEach(n => nodeMap.set(n.id, n));

  // Merge all village/town/city locations from AP_LOCATIONS into nodeMap
  AP_LOCATIONS.forEach(loc => {
    if (!nodeMap.has(loc.id)) {
      const v: GraphVertex = {
        id: loc.id,
        name: loc.name,
        type: loc.type,
        coords: loc.coords,
        state: 'Andhra Pradesh',
        tier: loc.type,
      };
      nodeMap.set(loc.id, v);
    }
  });

  const allVertices = Array.from(nodeMap.values());
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (
    edgeId: string,
    from: string,
    to: string,
    roadName: string,
    roadType: GraphEdge['roadType'],
    distanceKm: number,
    baseSpeedKmH: number,
    trafficFactor: number,
    riskScore: number,
    allowedVehicles: VehicleType[] = ALL_VEHICLES
  ) => {
    const key1 = `${from}__${to}`;
    const key2 = `${to}__${from}`;
    if (edgeSet.has(key1)) return;
    edgeSet.add(key1);
    edgeSet.add(key2);

    const fromNode = nodeMap.get(from);
    const toNode = nodeMap.get(to);
    if (!fromNode || !toNode) return;

    const geometry = generateCurvedPoints(fromNode.coords, toNode.coords);
    const revGeometry = [...geometry].reverse();
    const travelTime = Number(((distanceKm / Math.max(15, baseSpeedKmH)) * 60).toFixed(1));

    edges.push({
      id: `${edgeId}_fwd`,
      from,
      to,
      roadName,
      roadType,
      distanceKm,
      baseSpeedKmH,
      geometry,
      trafficFactor,
      riskScore,
      allowedVehicles,
      distance: distanceKm,
      travel_time: travelTime,
      historical_congestion: trafficFactor,
      historical_risk: riskScore,
      road_condition: roadType === 'expressway' ? 'excellent' : roadType === 'national_highway' ? 'good' : 'fair',
      vehicle_allowed: allowedVehicles,
      vehicle_suitability: getDefaultSuitability(roadType),
    });

    edges.push({
      id: `${edgeId}_rev`,
      from: to,
      to: from,
      roadName,
      roadType,
      distanceKm,
      baseSpeedKmH,
      geometry: revGeometry,
      trafficFactor,
      riskScore,
      allowedVehicles,
      distance: distanceKm,
      travel_time: travelTime,
      historical_congestion: trafficFactor,
      historical_risk: riskScore,
      road_condition: roadType === 'expressway' ? 'excellent' : roadType === 'national_highway' ? 'good' : 'fair',
      vehicle_allowed: allowedVehicles,
      vehicle_suitability: getDefaultSuitability(roadType),
    });
  };

  // Add all raw explicit edges
  RAW_EDGES.forEach(raw => {
    addEdge(
      raw.id,
      raw.from,
      raw.to,
      raw.roadName,
      raw.roadType,
      raw.distanceKm,
      raw.baseSpeedKmH,
      raw.historicalCongestion ?? raw.trafficFactor,
      raw.historicalRisk ?? raw.riskScore,
      raw.allowedVehicles
    );
  });

  // Ensure every village, town, and city has clean planar road connectivity (minimum 2 links)
  // with Google-accurate road winding distances (1.28x curvature factor) and standard speeds
  const degreeMap = new Map<string, number>();
  edges.forEach(e => {
    degreeMap.set(e.from, (degreeMap.get(e.from) || 0) + 1);
  });

  allVertices.forEach(v => {
    const currentDeg = degreeMap.get(v.id) || 0;
    if (currentDeg < 2) {
      const candidates: Array<{ node: GraphVertex; dist: number }> = [];
      allVertices.forEach(other => {
        if (other.id !== v.id) {
          const dHav = calculateHaversineKm(v.coords.lat, v.coords.lng, other.coords.lat, other.coords.lng);
          if (dHav <= 45) {
            candidates.push({ node: other, dist: dHav });
          }
        }
      });
      candidates.sort((a, b) => a.dist - b.dist);

      const needed = Math.max(1, 2 - currentDeg);
      const toConnect = candidates.slice(0, needed);
      toConnect.forEach((c, idx) => {
        const roadDistKm = Number(Math.max(1.5, c.dist * 1.28).toFixed(1));

        let roadType: GraphEdge['roadType'] = 'rural';
        let speedKmH = 40;
        let congestion = 1.05;
        let risk = 1.4;

        if (roadDistKm >= 60) {
          roadType = 'national_highway';
          speedKmH = 75;
          congestion = 1.12;
          risk = 2.8;
        } else if (roadDistKm >= 25) {
          roadType = 'state_highway';
          speedKmH = 62;
          congestion = 1.10;
          risk = 2.2;
        } else if (roadDistKm >= 10) {
          roadType = 'arterial';
          speedKmH = 50;
          congestion = 1.08;
          risk = 1.8;
        } else {
          roadType = 'rural';
          speedKmH = 40;
          congestion = 1.05;
          risk = 1.4;
        }

        addEdge(
          `vlink_${v.id}_${c.node.id}_${idx}`,
          v.id,
          c.node.id,
          `${v.name} - ${c.node.name} Link`,
          roadType,
          roadDistKm,
          speedKmH,
          congestion,
          risk
        );
      });
    }
  });

  return {
    vertices: allVertices,
    edges,
  };
}

// Geocoding helper that resolves ANY location, city, town, or village in AP to the nearest node in the topological graph
export function resolveLocationToNode(
  query: string,
  nodes: GraphVertex[]
): { vertex: GraphVertex; matchedQuery: string; confidence: 'exact' | 'fuzzy' | 'fallback'; distanceKm?: number } {
  const clean = query.trim();
  if (!clean) {
    return { vertex: nodes[0], matchedQuery: nodes[0].name, confidence: 'fallback', distanceKm: 0 };
  }

  const result = resolveLocationToNearbyGraphNode(clean, nodes);
  const targetNode = nodes.find(n => n.id === result.nearestGraphNodeId) || nodes[0];

  return {
    vertex: targetNode,
    matchedQuery: result.matchedPlaceName,
    confidence: result.isDirectGraphNode ? 'exact' : 'fuzzy',
    distanceKm: result.distanceToGraphNodeKm,
  };
}

// Find nearest node given lat/lng from Geolocation API using Haversine formula
export function findNearestNode(coords: GeoPoint, nodes: GraphVertex[]): GraphVertex {
  let minDistance = Infinity;
  let nearest = nodes[0];

  for (const node of nodes) {
    const dist = calculateHaversineKm(coords.lat, coords.lng, node.coords.lat, node.coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = node;
    }
  }

  return nearest;
}

// Generator for Scalability Analysis (Small, Medium, Large graph topologies in AP)
export function generateScalabilityNetwork(size: 'small' | 'medium' | 'large'): {
  vertices: GraphVertex[];
  edges: GraphEdge[];
  startId: string;
  destId: string;
} {
  const count = size === 'small' ? 12 : size === 'medium' ? 28 : 64;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const vertices: GraphVertex[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= count) break;
      const id = `AP_NODE_${idx}`;
      vertices.push({
        id,
        name: `AP Vertex ${idx + 1}`,
        type: idx === 0 || idx === count - 1 ? 'city' : (idx % 3 === 0 ? 'town' : 'village'),
        coords: {
          lat: 16.10 + r * 0.08,
          lng: 80.30 + c * 0.08,
        },
        state: 'Andhra Pradesh',
      });
    }
  }

  const edges: GraphEdge[] = [];
  let edgeId = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const curIdx = r * cols + c;
      if (curIdx >= count) continue;
      const u = vertices[curIdx];

      // Right neighbor
      if (c + 1 < cols && curIdx + 1 < count) {
        const v = vertices[curIdx + 1];
        const dist = Number((4 + ((curIdx * 7) % 12)).toFixed(1));
        const geom = generateCurvedPoints(u.coords, v.coords);
        const tf = 1.1 + ((curIdx % 4) * 0.1);
        const rs = 2 + (curIdx % 3);
        const timeMin = (dist / 60) * 60;
        edges.push({
          id: `scal_e_${edgeId++}`,
          from: u.id,
          to: v.id,
          roadName: `AP Road Link ${u.id}-${v.id}`,
          roadType: 'state_highway',
          distanceKm: dist,
          baseSpeedKmH: 60,
          geometry: geom,
          trafficFactor: tf,
          riskScore: rs,
          allowedVehicles: ALL_VEHICLES,
          distance: dist,
          travel_time: Number(timeMin.toFixed(2)),
          historical_congestion: Number(tf.toFixed(2)),
          historical_risk: rs,
          road_condition: 'fair',
          vehicle_allowed: ALL_VEHICLES,
          vehicle_suitability: { car: 1.0, bike: 1.0, bus: 0.9, truck: 0.85, emergency: 1.0 },
        });
        edges.push({
          id: `scal_e_${edgeId++}`,
          from: v.id,
          to: u.id,
          roadName: `AP Road Link ${v.id}-${u.id}`,
          roadType: 'state_highway',
          distanceKm: dist,
          baseSpeedKmH: 60,
          geometry: [...geom].reverse(),
          trafficFactor: tf,
          riskScore: rs,
          allowedVehicles: ALL_VEHICLES,
          distance: dist,
          travel_time: Number(timeMin.toFixed(2)),
          historical_congestion: Number(tf.toFixed(2)),
          historical_risk: rs,
          road_condition: 'fair',
          vehicle_allowed: ALL_VEHICLES,
          vehicle_suitability: { car: 1.0, bike: 1.0, bus: 0.9, truck: 0.85, emergency: 1.0 },
        });
      }

      // Bottom neighbor
      const downIdx = (r + 1) * cols + c;
      if (downIdx < count) {
        const v = vertices[downIdx];
        const dist = Number((5 + ((curIdx * 5) % 15)).toFixed(1));
        const geom = generateCurvedPoints(u.coords, v.coords);
        const tf = 1.05 + ((curIdx % 5) * 0.08);
        const rs = 1 + (curIdx % 4);
        const timeMin = (dist / 70) * 60;
        edges.push({
          id: `scal_e_${edgeId++}`,
          from: u.id,
          to: v.id,
          roadName: `AP Highway ${u.id}-${v.id}`,
          roadType: 'national_highway',
          distanceKm: dist,
          baseSpeedKmH: 70,
          geometry: geom,
          trafficFactor: tf,
          riskScore: rs,
          allowedVehicles: ALL_VEHICLES,
          distance: dist,
          travel_time: Number(timeMin.toFixed(2)),
          historical_congestion: Number(tf.toFixed(2)),
          historical_risk: rs,
          road_condition: 'good',
          vehicle_allowed: ALL_VEHICLES,
          vehicle_suitability: { car: 1.0, bike: 1.0, bus: 1.0, truck: 1.0, emergency: 1.0 },
        });
        edges.push({
          id: `scal_e_${edgeId++}`,
          from: v.id,
          to: u.id,
          roadName: `AP Highway ${v.id}-${u.id}`,
          roadType: 'national_highway',
          distanceKm: dist,
          baseSpeedKmH: 70,
          geometry: [...geom].reverse(),
          trafficFactor: tf,
          riskScore: rs,
          allowedVehicles: ALL_VEHICLES,
          distance: dist,
          travel_time: Number(timeMin.toFixed(2)),
          historical_congestion: Number(tf.toFixed(2)),
          historical_risk: rs,
          road_condition: 'good',
          vehicle_allowed: ALL_VEHICLES,
          vehicle_suitability: { car: 1.0, bike: 1.0, bus: 1.0, truck: 1.0, emergency: 1.0 },
        });
      }
    }
  }

  return {
    vertices,
    edges,
    startId: vertices[0].id,
    destId: vertices[vertices.length - 1].id,
  };
}
