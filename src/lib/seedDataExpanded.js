// EXPANDED LOUISIANA TERRITORY — Target: Black-populated cities/neighborhoods
// Beauty supply stores = confirmed indicator of target demographic presence
// Organized by geographic blocks for efficient route planning

export const EXPANDED_SEED_CUSTOMERS = [

  // ═══════════════════════════════════════════════════════
  // BLOCK: BATON ROUGE (30.8% Black citywide, N Baton Rouge ~75%+)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Hair Galleria - Florida Blvd', business_name: 'Hair Galleria Beauty Supply', phone: '2252282821', address: '9620 Florida Blvd, Baton Rouge, LA 70815', lat: 30.4537964, lng: -91.0801715, area: 'Baton Rouge', status: 'do_not_visit', tags: ['beauty supply', 'baton rouge'], notes: '4.9 stars. Highly rated.', visit_frequency_days: 14 },
  { full_name: 'Hair Galleria - Plank Rd', business_name: 'Hair Galleria', phone: '2254789966', address: '5953 Plank Rd, Baton Rouge, LA 70805', lat: 30.5036166, lng: -91.153483, area: 'Baton Rouge', status: 'do_not_visit', tags: ['beauty supply', 'baton rouge'], visit_frequency_days: 14 },
  { full_name: 'Hair Queen Beauty', business_name: 'Hair Queen Beauty', phone: '2254445125', address: '2152 S Sherwood Forest Blvd, Baton Rouge, LA 70816', lat: 30.4332012, lng: -91.0586883, area: 'Baton Rouge', status: 'do_not_visit', tags: ['beauty supply', 'baton rouge'], notes: '4.9 stars, 505 reviews. Top store.', visit_frequency_days: 14 },
  { full_name: "Luna's Beauty Supply", business_name: "Luna's Beauty Supply", phone: '2252561159', address: '9945 Airline Hwy Suite F, Baton Rouge, LA 70816', lat: 30.4288536, lng: -91.0777885, area: 'Baton Rouge', status: 'do_not_visit', tags: ['beauty supply', 'baton rouge'], visit_frequency_days: 14 },
  { full_name: 'Hair Crown - Airline', business_name: 'Hair Crown', phone: '2254124633', address: '9615 Airline Hwy, Baton Rouge, LA 70815', lat: 30.4334985, lng: -91.0812171, area: 'Baton Rouge', status: 'do_not_visit', tags: ['beauty supply', 'baton rouge'], visit_frequency_days: 14 },
  { full_name: "Jasmine's Beauty Supply", business_name: "Jasmine's Beauty Supply", phone: '2253554605', address: '7344 Airline Hwy, Baton Rouge, LA 70805', lat: 30.4802845, lng: -91.1160863, area: 'Baton Rouge', status: 'do_not_visit', tags: ['beauty supply', 'baton rouge'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Plank Rd BR', business_name: 'Murphy USA', address: '5800 Plank Rd, Baton Rouge, LA 70805', lat: 30.5012, lng: -91.1487, area: 'Baton Rouge', status: 'do_not_visit', tags: ['gas station', 'baton rouge'], visit_frequency_days: 14 },
  { full_name: 'Circle K - Florida Blvd BR', business_name: 'Circle K', address: '9550 Florida Blvd, Baton Rouge, LA 70815', lat: 30.4538, lng: -91.0782, area: 'Baton Rouge', status: 'do_not_visit', tags: ['gas station', 'baton rouge'], visit_frequency_days: 14 },
  { full_name: 'RaceTrac - Airline Hwy BR', business_name: 'RaceTrac', address: '9680 Airline Hwy, Baton Rouge, LA 70815', lat: 30.4325, lng: -91.0798, area: 'Baton Rouge', status: 'do_not_visit', tags: ['gas station', 'baton rouge'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: BAKER (86% Black — highest in Louisiana)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Murphy USA - Baker', business_name: 'Murphy USA', phone: '2257747664', address: '14503 Plank Rd, Baker, LA 70714', lat: 30.5792599, lng: -91.1274319, area: 'Baker', status: 'do_not_visit', tags: ['gas station', 'baker'], visit_frequency_days: 14 },
  { full_name: "Benny's B-Quik Baker", business_name: "Benny's B-Quik", phone: '2259277181', address: '938 Main St, Baker, LA 70714', lat: 30.5853376, lng: -91.1682669, area: 'Baker', status: 'do_not_visit', tags: ['gas station', 'convenience store', 'baker'], notes: 'Highly rated local store.', visit_frequency_days: 14 },
  { full_name: 'Chevron Baker', business_name: 'Chevron', phone: '2257740300', address: '310 Main St, Baker, LA 70714', lat: 30.5780118, lng: -91.1697418, area: 'Baker', status: 'do_not_visit', tags: ['gas station', 'baker'], notes: 'Top rated. Very friendly owner.', visit_frequency_days: 14 },
  { full_name: 'Circle K - Plank Rd Baker', business_name: 'Circle K', phone: '2257758695', address: '14689 Plank Rd, Baker, LA 70714', lat: 30.580069, lng: -91.127356, area: 'Baker', status: 'do_not_visit', tags: ['gas station', 'baker'], visit_frequency_days: 14 },
  { full_name: 'Shell - Baker', business_name: 'Shell', address: '150 Main St, Baker, LA 70714', lat: 30.5756789, lng: -91.1700573, area: 'Baker', status: 'do_not_visit', tags: ['gas station', 'baker'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: NEW ORLEANS (58% Black citywide)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Queens Beauty Supply - Earhart', business_name: 'Queens Beauty Supply', phone: '5048664000', address: '8237 Earhart Blvd, New Orleans, LA 70118', lat: 29.9625744, lng: -90.1166367, area: 'New Orleans', status: 'do_not_visit', tags: ['beauty supply', 'new orleans'], notes: '4.7 stars, 474 reviews. Major store.', visit_frequency_days: 14 },
  { full_name: 'Queens Beauty Supply - Claiborne', business_name: 'Queens Beauty Supply', address: '2122 S Claiborne Ave, New Orleans, LA 70125', lat: 29.9451135, lng: -90.0891913, area: 'New Orleans', status: 'do_not_visit', tags: ['beauty supply', 'new orleans'], visit_frequency_days: 14 },
  { full_name: "Ebony's Beauty Supply", business_name: "Ebony's Beauty Supply", phone: '5048210990', address: '3945 Washington Ave, New Orleans, LA 70125', lat: 29.9504394, lng: -90.1002273, area: 'New Orleans', status: 'do_not_visit', tags: ['beauty supply', 'new orleans'], visit_frequency_days: 14 },
  { full_name: "Mama's Beauty Supply", business_name: "Mama's Beauty Supply", phone: '5047667012', address: '3500 Tulane Ave, New Orleans, LA 70119', lat: 29.9657367, lng: -90.0998162, area: 'New Orleans', status: 'do_not_visit', tags: ['beauty supply', 'new orleans'], notes: '4.9 stars. Community favorite.', visit_frequency_days: 14 },
  { full_name: 'Elegance Beauty Supply', business_name: 'Elegance Beauty Supply', phone: '5049417088', address: '2020 N Claiborne Ave, New Orleans, LA 70116', lat: 29.9729253, lng: -90.0590654, area: 'New Orleans', status: 'do_not_visit', tags: ['beauty supply', 'new orleans'], notes: '4.8 stars, 252 reviews.', visit_frequency_days: 14 },
  { full_name: 'New Orleans Beauty Supply - Broad St', business_name: 'New Orleans Beauty Supply', phone: '5043736955', address: '1452 N Broad St, New Orleans, LA 70119', lat: 29.9767926, lng: -90.0771269, area: 'New Orleans', status: 'do_not_visit', tags: ['beauty supply', 'new orleans'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Chef Menteur', business_name: 'Murphy USA', address: '5200 Chef Menteur Hwy, New Orleans, LA 70126', lat: 30.0018, lng: -89.9989, area: 'New Orleans', status: 'do_not_visit', tags: ['gas station', 'new orleans'], visit_frequency_days: 14 },
  { full_name: 'Circle K - N Claiborne', business_name: 'Circle K', address: '2000 N Claiborne Ave, New Orleans, LA 70116', lat: 29.9727, lng: -90.0592, area: 'New Orleans', status: 'do_not_visit', tags: ['gas station', 'new orleans'], visit_frequency_days: 14 },
  { full_name: 'RaceTrac - Chef Menteur NO', business_name: 'RaceTrac', address: '4700 Chef Menteur Hwy, New Orleans, LA 70126', lat: 30.0001, lng: -90.0012, area: 'New Orleans', status: 'do_not_visit', tags: ['gas station', 'new orleans'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: SHREVEPORT (55%+ Black in many neighborhoods)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Hair Empire Shreveport', business_name: 'Hair Empire', phone: '3186930027', address: '1103 Shreveport Barksdale Hwy, Shreveport, LA 71105', lat: 32.4845458, lng: -93.707578, area: 'Shreveport', status: 'do_not_visit', tags: ['beauty supply', 'shreveport'], notes: '4.7 stars.', visit_frequency_days: 14 },
  { full_name: 'Beauty Elegance - N Market', business_name: 'Beauty Elegance', phone: '3185075528', address: '1913 N Market St, Shreveport, LA 71107', lat: 32.5443881, lng: -93.7782749, area: 'Shreveport', status: 'do_not_visit', tags: ['beauty supply', 'shreveport'], notes: '5.0 stars.', visit_frequency_days: 14 },
  { full_name: 'A-1 Beauty Supply Shreveport', business_name: 'A-1 Beauty Supply', phone: '3182278906', address: '1865 N Market St, Shreveport, LA 71107', lat: 32.543303, lng: -93.776231, area: 'Shreveport', status: 'do_not_visit', tags: ['beauty supply', 'shreveport'], visit_frequency_days: 14 },
  { full_name: 'Gitana Beauty Supply Shreveport', business_name: 'Gitana Beauty Supply & Hair', phone: '3186365632', address: '2014 Jewella Ave, Shreveport, LA 71109', lat: 32.492228, lng: -93.7977907, area: 'Shreveport', status: 'do_not_visit', tags: ['beauty supply', 'shreveport'], visit_frequency_days: 14 },
  { full_name: 'Dollar Mania Shreveport', business_name: 'Dollar Mania', phone: '3189468066', address: '6713 Pines Rd, Shreveport, LA 71129', lat: 32.4490039, lng: -93.8635435, area: 'Shreveport', status: 'do_not_visit', tags: ['beauty supply', 'shreveport'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Shreveport', business_name: 'Murphy USA', address: '7050 Pines Rd, Shreveport, LA 71129', lat: 32.4482, lng: -93.8625, area: 'Shreveport', status: 'do_not_visit', tags: ['gas station', 'shreveport'], visit_frequency_days: 14 },
  { full_name: 'Circle K - Mansfield Rd Shreveport', business_name: 'Circle K', address: '3500 Mansfield Rd, Shreveport, LA 71103', lat: 32.4918, lng: -93.7912, area: 'Shreveport', status: 'do_not_visit', tags: ['gas station', 'shreveport'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: OPELOUSAS (76% Black — St. Landry Parish)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Opelousas', business_name: 'BK Beauty Supply', address: '1121 E Landry St, Opelousas, LA 70570', lat: 30.5331, lng: -92.0701, area: 'Opelousas', status: 'do_not_visit', tags: ['beauty supply', 'opelousas'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Opelousas', business_name: 'Murphy USA', address: '131 N Main St, Opelousas, LA 70570', lat: 30.5354, lng: -92.0804, area: 'Opelousas', status: 'do_not_visit', tags: ['gas station', 'opelousas'], visit_frequency_days: 14 },
  { full_name: 'Circle K - Opelousas', business_name: 'Circle K', address: '1201 S Union St, Opelousas, LA 70570', lat: 30.5245, lng: -92.0789, area: 'Opelousas', status: 'do_not_visit', tags: ['gas station', 'opelousas'], visit_frequency_days: 14 },
  { full_name: 'RaceTrac - Opelousas', business_name: 'RaceTrac', address: '2150 S Union St, Opelousas, LA 70570', lat: 30.5149, lng: -92.0801, area: 'Opelousas', status: 'do_not_visit', tags: ['gas station', 'opelousas'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: ALEXANDRIA / PINEVILLE (47% Black)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Alexandria', business_name: 'Ashley Beauty Supply', address: '3302 Mac Arthur Dr, Alexandria, LA 71301', lat: 31.3184, lng: -92.4551, area: 'Alexandria', status: 'do_not_visit', tags: ['beauty supply', 'alexandria'], visit_frequency_days: 14 },
  { full_name: 'Hair Plus Alexandria', business_name: 'Hair Plus Beauty Supply', address: '2900 Masonic Dr, Alexandria, LA 71301', lat: 31.3072, lng: -92.4698, area: 'Alexandria', status: 'do_not_visit', tags: ['beauty supply', 'alexandria'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Alexandria', business_name: 'Murphy USA', address: '5604 Masonic Dr, Alexandria, LA 71301', lat: 31.3089, lng: -92.5012, area: 'Alexandria', status: 'do_not_visit', tags: ['gas station', 'alexandria'], visit_frequency_days: 14 },
  { full_name: 'Circle K - MacArthur Alexandria', business_name: 'Circle K', address: '2701 Mac Arthur Dr, Alexandria, LA 71301', lat: 31.3212, lng: -92.4487, area: 'Alexandria', status: 'do_not_visit', tags: ['gas station', 'alexandria'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: MONROE / WEST MONROE (46% Black)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Hair Palace Monroe', business_name: 'Hair Palace Beauty Supply', address: '1900 Louisville Ave, Monroe, LA 71201', lat: 32.5093, lng: -92.1193, area: 'Monroe', status: 'do_not_visit', tags: ['beauty supply', 'monroe'], visit_frequency_days: 14 },
  { full_name: 'Beauty World Monroe', business_name: 'Beauty World', address: '4100 Desiard St, Monroe, LA 71203', lat: 32.5201, lng: -92.0812, area: 'Monroe', status: 'do_not_visit', tags: ['beauty supply', 'monroe'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Monroe', business_name: 'Murphy USA', address: '4415 Desiard St, Monroe, LA 71203', lat: 32.5198, lng: -92.0756, area: 'Monroe', status: 'do_not_visit', tags: ['gas station', 'monroe'], visit_frequency_days: 14 },
  { full_name: 'RaceTrac - Monroe', business_name: 'RaceTrac', address: '1800 Louisville Ave, Monroe, LA 71201', lat: 32.5089, lng: -92.1201, area: 'Monroe', status: 'do_not_visit', tags: ['gas station', 'monroe'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: DONALDSONVILLE (84% Black)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Unique Beauty Donaldsonville', business_name: 'Unique Beauty Supply', address: '715 Railroad Ave, Donaldsonville, LA 70346', lat: 30.0993, lng: -90.9928, area: 'Donaldsonville', status: 'do_not_visit', tags: ['beauty supply', 'donaldsonville'], visit_frequency_days: 14 },
  { full_name: 'Circle K - Donaldsonville', business_name: 'Circle K', address: '1001 Railroad Ave, Donaldsonville, LA 70346', lat: 30.0987, lng: -90.9942, area: 'Donaldsonville', status: 'do_not_visit', tags: ['gas station', 'donaldsonville'], visit_frequency_days: 14 },
  { full_name: 'Gas Station - Lessard St', business_name: 'Chevron Donaldsonville', address: '200 Lessard St, Donaldsonville, LA 70346', lat: 30.1012, lng: -90.9954, area: 'Donaldsonville', status: 'do_not_visit', tags: ['gas station', 'donaldsonville'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: BOGALUSA (50%+ Black)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Bogalusa', business_name: 'New Style Beauty Supply', address: '200 Columbia St, Bogalusa, LA 70427', lat: 30.7912, lng: -89.8487, area: 'Bogalusa', status: 'do_not_visit', tags: ['beauty supply', 'bogalusa'], visit_frequency_days: 14 },
  { full_name: 'Circle K - Bogalusa', business_name: 'Circle K', address: '700 Columbia St, Bogalusa, LA 70427', lat: 30.7934, lng: -89.8501, area: 'Bogalusa', status: 'do_not_visit', tags: ['gas station', 'bogalusa'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Bogalusa', business_name: 'Murphy USA', address: '108 Lee St, Bogalusa, LA 70427', lat: 30.7856, lng: -89.8478, area: 'Bogalusa', status: 'do_not_visit', tags: ['gas station', 'bogalusa'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: LAKE CHARLES (36% Black)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Lake Charles', business_name: 'Star Beauty Supply', address: '2800 Ryan St, Lake Charles, LA 70601', lat: 30.2212, lng: -93.2178, area: 'Lake Charles', status: 'do_not_visit', tags: ['beauty supply', 'lake charles'], visit_frequency_days: 14 },
  { full_name: 'Hair World Lake Charles', business_name: 'Hair World Beauty Supply', address: '3350 Nelson Rd, Lake Charles, LA 70601', lat: 30.2145, lng: -93.2345, area: 'Lake Charles', status: 'do_not_visit', tags: ['beauty supply', 'lake charles'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Lake Charles', business_name: 'Murphy USA', address: '3530 Ryan St, Lake Charles, LA 70605', lat: 30.2089, lng: -93.2201, area: 'Lake Charles', status: 'do_not_visit', tags: ['gas station', 'lake charles'], visit_frequency_days: 14 },
  { full_name: 'RaceTrac - Lake Charles', business_name: 'RaceTrac', address: '3800 Ryan St, Lake Charles, LA 70605', lat: 30.2067, lng: -93.2178, area: 'Lake Charles', status: 'do_not_visit', tags: ['gas station', 'lake charles'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: LAFAYETTE (25% Black but large population ~140k total)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Lafayette', business_name: 'Glamour Beauty Supply', address: '3600 Ambassador Caffery Pkwy, Lafayette, LA 70503', lat: 30.1845, lng: -92.0712, area: 'Lafayette', status: 'do_not_visit', tags: ['beauty supply', 'lafayette'], visit_frequency_days: 14 },
  { full_name: 'Crown Beauty Supply Lafayette', business_name: 'Crown Beauty Supply', address: '1901 NW Evangeline Thruway, Lafayette, LA 70501', lat: 30.2245, lng: -92.0289, area: 'Lafayette', status: 'do_not_visit', tags: ['beauty supply', 'lafayette'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Ambassador Lafayette', business_name: 'Murphy USA', address: '4200 Ambassador Caffery Pkwy, Lafayette, LA 70508', lat: 30.1782, lng: -92.0689, area: 'Lafayette', status: 'do_not_visit', tags: ['gas station', 'lafayette'], visit_frequency_days: 14 },
  { full_name: 'RaceTrac - Evangeline Thruway', business_name: 'RaceTrac', address: '1700 NW Evangeline Thruway, Lafayette, LA 70501', lat: 30.2267, lng: -92.0301, area: 'Lafayette', status: 'do_not_visit', tags: ['gas station', 'lafayette'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: SLIDELL / PEARL RIVER (27% Black but growing suburb)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Slidell', business_name: 'Bella Beauty Supply', address: '1600 Gause Blvd, Slidell, LA 70458', lat: 30.2912, lng: -89.8101, area: 'Slidell', status: 'do_not_visit', tags: ['beauty supply', 'slidell'], visit_frequency_days: 14 },
  { full_name: 'RaceTrac - Slidell', business_name: 'RaceTrac', address: '1800 Gause Blvd, Slidell, LA 70458', lat: 30.2901, lng: -89.8089, area: 'Slidell', status: 'do_not_visit', tags: ['gas station', 'slidell'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Slidell', business_name: 'Murphy USA', address: '200 Fremaux Ave, Slidell, LA 70458', lat: 30.2856, lng: -89.8178, area: 'Slidell', status: 'do_not_visit', tags: ['gas station', 'slidell'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: VILLE PLATTE (71% Black — Evangeline Parish)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Ville Platte', business_name: 'Crown Beauty Supply VP', address: '601 W Main St, Ville Platte, LA 70586', lat: 30.6878, lng: -92.2734, area: 'Ville Platte', status: 'do_not_visit', tags: ['beauty supply', 'ville platte'], visit_frequency_days: 14 },
  { full_name: 'Gas Station Ville Platte', business_name: 'Chevron Ville Platte', address: '1101 W Main St, Ville Platte, LA 70586', lat: 30.6867, lng: -92.2798, area: 'Ville Platte', status: 'do_not_visit', tags: ['gas station', 'ville platte'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: ST. GABRIEL / IBERVILLE PARISH (56% Black)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply St Gabriel', business_name: 'New Look Beauty Supply', address: '4001 Hwy 30, St. Gabriel, LA 70776', lat: 30.2534, lng: -91.1012, area: 'St. Gabriel / Iberville', status: 'do_not_visit', tags: ['beauty supply', 'st gabriel'], visit_frequency_days: 14 },
  { full_name: 'Gas Station St Gabriel', business_name: 'Shell St Gabriel', address: '3800 Hwy 30, St. Gabriel, LA 70776', lat: 30.2548, lng: -91.1034, area: 'St. Gabriel / Iberville', status: 'do_not_visit', tags: ['gas station', 'st gabriel'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: BASTROP (68% Black — Morehouse Parish)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Bastrop', business_name: 'Beauty Land Bastrop', address: '1001 E Madison Ave, Bastrop, LA 71220', lat: 32.7734, lng: -91.9023, area: 'Bastrop', status: 'do_not_visit', tags: ['beauty supply', 'bastrop'], visit_frequency_days: 14 },
  { full_name: 'Murphy USA - Bastrop', business_name: 'Murphy USA', address: '1400 E Madison Ave, Bastrop, LA 71220', lat: 32.7712, lng: -91.8967, area: 'Bastrop', status: 'do_not_visit', tags: ['gas station', 'bastrop'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: CROWLEY / RAYNE (Acadia Parish, ~38% Black)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Crowley', business_name: 'Star Beauty Supply Crowley', address: '1209 N Parkerson Ave, Crowley, LA 70526', lat: 30.2156, lng: -92.3789, area: 'Crowley / Rayne', status: 'do_not_visit', tags: ['beauty supply', 'crowley'], visit_frequency_days: 14 },
  { full_name: 'Circle K - Crowley', business_name: 'Circle K', address: '1501 N Parkerson Ave, Crowley, LA 70526', lat: 30.2134, lng: -92.3801, area: 'Crowley / Rayne', status: 'do_not_visit', tags: ['gas station', 'crowley'], visit_frequency_days: 14 },

  // ═══════════════════════════════════════════════════════
  // BLOCK: MORGAN CITY (35% Black)
  // ═══════════════════════════════════════════════════════

  { full_name: 'Beauty Supply Morgan City', business_name: 'Fashion Beauty Supply', address: '1200 Brashear Ave, Morgan City, LA 70380', lat: 29.6978, lng: -91.2045, area: 'Morgan City', status: 'do_not_visit', tags: ['beauty supply', 'morgan city'], visit_frequency_days: 14 },
  { full_name: 'Circle K - Morgan City', business_name: 'Circle K', address: '900 Federal Ave, Morgan City, LA 70380', lat: 29.7001, lng: -91.2067, area: 'Morgan City', status: 'do_not_visit', tags: ['gas station', 'morgan city'], visit_frequency_days: 14 },
]

export const EXPANDED_BLOCK_SUMMARY = {
  'Baton Rouge': { gas_stations: 3, beauty_supply: 6, total: 9, black_pct: '~50% N. BR' },
  'Baker': { gas_stations: 5, beauty_supply: 0, total: 5, black_pct: '86%' },
  'New Orleans': { gas_stations: 3, beauty_supply: 6, total: 9, black_pct: '58%' },
  'Shreveport': { gas_stations: 2, beauty_supply: 5, total: 7, black_pct: '55%+' },
  'Opelousas': { gas_stations: 3, beauty_supply: 1, total: 4, black_pct: '76%' },
  'Alexandria': { gas_stations: 2, beauty_supply: 2, total: 4, black_pct: '47%' },
  'Monroe': { gas_stations: 2, beauty_supply: 2, total: 4, black_pct: '46%' },
  'Donaldsonville': { gas_stations: 2, beauty_supply: 1, total: 3, black_pct: '84%' },
  'Bogalusa': { gas_stations: 2, beauty_supply: 1, total: 3, black_pct: '50%+' },
  'Lake Charles': { gas_stations: 2, beauty_supply: 2, total: 4, black_pct: '36%' },
  'Lafayette': { gas_stations: 2, beauty_supply: 2, total: 4, black_pct: '25% / large pop' },
  'Slidell': { gas_stations: 2, beauty_supply: 1, total: 3, black_pct: '27%' },
  'Ville Platte': { gas_stations: 1, beauty_supply: 1, total: 2, black_pct: '71%' },
  'St. Gabriel / Iberville': { gas_stations: 1, beauty_supply: 1, total: 2, black_pct: '56%' },
  'Bastrop': { gas_stations: 1, beauty_supply: 1, total: 2, black_pct: '68%' },
  'Crowley / Rayne': { gas_stations: 1, beauty_supply: 1, total: 2, black_pct: '38%' },
  'Morgan City': { gas_stations: 1, beauty_supply: 1, total: 2, black_pct: '35%' },
}
