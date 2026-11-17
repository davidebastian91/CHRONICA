import type { CityDistrict, DistrictAlertLevel, DistrictLandmark } from '../types';

interface EraPreset {
  districts: Array<{
    name: string;
    subtitle: string;
    description: string;
    faction: string;
    factionColor: string;
    defaultAlert: DistrictAlertLevel;
    iconName: string;
    landmarks: DistrictLandmark[];
  }>;
}

const DISTRICT_POLYGONS: Array<{
  polyPoints: [number, number][];
  centerPoint: [number, number];
}> = [
  // 0: Nord-Ovest
  {
    polyPoints: [
      [4, 4],
      [48, 4],
      [44, 42],
      [4, 40],
    ],
    centerPoint: [24, 22],
  },
  // 1: Nord-Est
  {
    polyPoints: [
      [52, 4],
      [96, 4],
      [96, 42],
      [56, 44],
    ],
    centerPoint: [76, 22],
  },
  // 2: Cuore Centrale / Arteria
  {
    polyPoints: [
      [4, 42],
      [44, 44],
      [56, 46],
      [96, 44],
      [96, 68],
      [58, 66],
      [42, 68],
      [4, 66],
    ],
    centerPoint: [50, 55],
  },
  // 3: Sud-Ovest
  {
    polyPoints: [
      [4, 68],
      [46, 70],
      [44, 96],
      [4, 96],
    ],
    centerPoint: [24, 82],
  },
  // 4: Sud-Est
  {
    polyPoints: [
      [54, 68],
      [96, 70],
      [96, 96],
      [52, 96],
    ],
    centerPoint: [75, 82],
  },
];

const PRESETS: Record<string, EraPreset> = {
  wild_west: {
    districts: [
      {
        name: 'Main Street & Distretto Giudiziario',
        subtitle: 'Cuore istituzionale e commerciale',
        description: 'La spina dorsale della frontiera: portici in legno polverosi, la banca cittadina e la stella di latta dello sceriffo.',
        faction: 'Ufficio dello Sceriffo & Cittadini',
        factionColor: '#3b82f6',
        defaultAlert: 'patrolled',
        iconName: 'Shield',
        landmarks: [
          { id: 'ww_1', name: 'Ufficio dello Sceriffo & Prigione', desc: 'Sbarre rinforzate e fuciliera sotto chiave.', type: 'elysium' },
          { id: 'ww_2', name: 'Banca di Frontiera & Cassaforte Wells', desc: 'Obiettivo primario di ogni banda di fuorilegge.', type: 'point' },
          { id: 'ww_3', name: 'Emporio Generale & Farmacia', desc: 'Rifornimenti di cartucce, provviste e bende.', type: 'haven' },
        ],
      },
      {
        name: 'Scalo Merci & Ferrovia Union',
        subtitle: 'Fonderia e linea d’acciaio',
        description: 'Rotaie infuocate dal sole, vagoni merci piantonati e il fragore incessante delle locomotive a vapore.',
        faction: 'Magnati della Ferrovia & Pinkerton',
        factionColor: '#f59e0b',
        defaultAlert: 'safe',
        iconName: 'Train',
        landmarks: [
          { id: 'ww_4', name: 'Deposito Bagagli & Telegrafo', desc: 'Linee telegrafiche per comunicare con la capitale.', type: 'point' },
          { id: 'ww_5', name: 'Hangar Locomotive & Magazzini Merci', desc: 'Casse di piombo, esplosivi e whisky da contrabbando.', type: 'crime' },
        ],
      },
      {
        name: 'Biscotti di Fango & Saloon Fuorilegge',
        subtitle: 'Zona franca del vizio e del gioco d’azzardo',
        description: 'Musica scordata di pianola, fumo acre di sigaro e revolver carichi sotto ogni tavolo da poker.',
        faction: 'Banda Locale & Contrabbandieri',
        factionColor: '#ef4444',
        defaultAlert: 'lockdown',
        iconName: 'Wine',
        landmarks: [
          { id: 'ww_6', name: 'The Broken Spur Saloon', desc: 'La bisca più pericolosa e frequentata della contea.', type: 'crime' },
          { id: 'ww_7', name: 'Stalle di Cambio & Fabbro Ferraio', desc: 'Cavalli freschi per fughe rapide a notte fonda.', type: 'haven' },
        ],
      },
      {
        name: 'Gola del Coyote & Miniera Abbandonata',
        subtitle: 'Terre aride e nascondigli rocciosi',
        description: 'Pareti di roccia rossa a strapiombo, pozzi minerari abbandonati e caverne scavate nella roccia viva.',
        faction: 'Banditi della Gola & Eremiti',
        factionColor: '#dc2626',
        defaultAlert: 'lockdown',
        iconName: 'Mountain',
        landmarks: [
          { id: 'ww_8', name: 'Ingresso Miniera Shaft #4', desc: 'Gallerie sotterranee scavate nel granito, piene di crolli.', type: 'crime' },
          { id: 'ww_9', name: 'Cimitero di Boot Hill', desc: 'Croci di legno per chi è stato troppo lento a estrarre.', type: 'point' },
        ],
      },
      {
        name: 'Ranch della Vallata & Terre Aperte',
        subtitle: 'Coltivazioni e pascoli di bestiame',
        description: 'Staccionate che si perdono all’orizzonte, mulini a vento e cieli sconfinati solcati da avvoltoi.',
        faction: 'Famiglie di Coloni & Bovari',
        factionColor: '#10b981',
        defaultAlert: 'safe',
        iconName: 'Wheat',
        landmarks: [
          { id: 'ww_10', name: 'Fattoria Fortificata Miller', desc: 'Rifugio sicuro con acqua fresca e fienile riparato.', type: 'haven' },
          { id: 'ww_11', name: 'Guado del Fiume Secco', desc: 'Unico passaggio obbligato per le carovane.', type: 'point' },
        ],
      },
    ],
  },

  imperial_china: {
    districts: [
      {
        name: 'Città Imperiale & Palazzo Daming',
        subtitle: 'Bastione del Trono del Drago',
        description: 'Mura vermiglie colossali, padiglioni con tetti a pagoda dorati e guardie d’élite in armature lamellari con alabarde Ji.',
        faction: 'Guardia Imperiale del Drago & Concilio dei Mandarini',
        factionColor: '#eab308',
        defaultAlert: 'patrolled',
        iconName: 'Crown',
        landmarks: [
          { id: 'cn_1', name: 'Sala del Trono del Drago', desc: 'Dove si emanano gli editti imperiali e si ricevono i tributi.', type: 'elysium' },
          { id: 'cn_2', name: 'Armeria Imperiale & Padiglione delle Guardie', desc: 'Arsenale di balestre a ripetizione Zhuge e lame d’acciaio piegato.', type: 'point' },
        ],
      },
      {
        name: 'Mercato Orientale & Botteghe della Seta',
        subtitle: 'Il grande centro commerciale e di giada',
        description: 'Insegne in legno dorato, banchi di giada preziosa, rotoli di seta finissima, case da tè eleganti e profumo d’incenso.',
        faction: 'Gilda dei Mercanti della Seta & Funzionari delle Tasse',
        factionColor: '#06b6d4',
        defaultAlert: 'safe',
        iconName: 'Building',
        landmarks: [
          { id: 'cn_3', name: 'Emporio Centrale della Giada', desc: 'Pietre intagliate, talismani e scambi commerciali di alto livello.', type: 'point' },
          { id: 'cn_4', name: 'Casa da Tè del Loto Bianco', desc: 'Salette appartate per poeti, nobili e informatori discreti.', type: 'haven' },
        ],
      },
      {
        name: 'Grande Pagoda & Distretto dei Templi',
        subtitle: 'Santuari buddisti, monasteri e giardini sacri',
        description: 'Grandi campane di bronzo riecheggianti, fumo d’incenso, padiglioni di meditazione e monaci guerrieri wuxia.',
        faction: 'Monaci Guerrieri & Ordini Filosofici',
        factionColor: '#10b981',
        defaultAlert: 'safe',
        iconName: 'Mountain',
        landmarks: [
          { id: 'cn_5', name: 'Grande Pagoda dell’Oca Selvatica', desc: 'Luogo sacro dove sono custoditi rotoli e sutra millenari.', type: 'elysium' },
          { id: 'cn_6', name: 'Cortile del Bastone Spezzato', desc: 'Spiazzo di pietra dove si perfezionano le arti marziali e l’alchimia del Qi.', type: 'haven' },
        ],
      },
      {
        name: 'Mercato Occidentale & Quartiere delle Carovane',
        subtitle: 'Capolinea leggendario della Via della Seta',
        description: 'Bazar caotico di carovane giunte dal deserto: mercanti persiani, cammelli carichi di spezie, vetri e vino d’occidente.',
        faction: 'Carovanieri della Via della Seta & Interpreti Esteri',
        factionColor: '#f59e0b',
        defaultAlert: 'patrolled',
        iconName: 'Compass',
        landmarks: [
          { id: 'cn_7', name: 'Bazar delle Spezie & Scuderie dei Cavalli Celesti', desc: 'Punto di ristoro per viaggiatori transcontinentali.', type: 'point' },
          { id: 'cn_8', name: 'Locanda del Falcone del Deserto', desc: 'Bicchieri di vino d’uva, danze esotiche e incontri tra stranieri.', type: 'haven' },
        ],
      },
      {
        name: 'Città Bassa & Vicoli delle Lanterne Rosse',
        subtitle: 'Labirinto di canali, bische e società segrete',
        description: 'Foschia che sale dai canali, lanterne rosse oscillanti, fumerie d’oppio ed erbe, bische di mahjong e cospiratori.',
        faction: 'Società Segreta del Loto Bianco & Barcaioli',
        factionColor: '#ef4444',
        defaultAlert: 'lockdown',
        iconName: 'Flame',
        landmarks: [
          { id: 'cn_9', name: 'Bisca della Luna Nuova', desc: 'Tavoli da gioco clandestini dove si scommette la vita e l’oro.', type: 'crime' },
          { id: 'cn_10', name: 'Molo Segreto del Canale Sud', desc: 'Chiatte coperte usate per fuggire oltre le mura della città di notte.', type: 'haven' },
        ],
      },
    ],
  },

  feudal_japan: {
    districts: [
      {
        name: 'Castello del Daimyo & Tenshu',
        subtitle: 'Fortezza centrale e residenza del Signore',
        description: 'Fossati d’acqua limpidi, mura ciclopiche in pietra bianca, porte rinforzate in ferro e guardie d’onore con kabuto e katana.',
        faction: 'Guardia del Clan del Daimyo & Hatamoto',
        factionColor: '#eab308',
        defaultAlert: 'patrolled',
        iconName: 'Castle',
        landmarks: [
          { id: 'jp_1', name: 'Torre del Mastio (Tenshu)', desc: 'Il cuore strategico dove il signore della guerra impartisce gli ordini.', type: 'elysium' },
          { id: 'jp_2', name: 'Dojo dei Samurai di Corte', desc: 'Tatami dove si allenano i maestri di spada del clan.', type: 'point' },
        ],
      },
      {
        name: 'Borgo degli Artigiani & Fucine dei Fabbri',
        subtitle: 'Maestri forgiatori di lame e setaioli',
        description: 'Suono ritmico dei martelli sulle lame piegate, odore di carbone dolce e botteghe di armature e ceramica laccata.',
        faction: 'Gilda dei Maestri Spadari & Artigiani',
        factionColor: '#f59e0b',
        defaultAlert: 'safe',
        iconName: 'Flame',
        landmarks: [
          { id: 'jp_3', name: 'Forgia del Maestro Muramasa', desc: 'Lame leggendarie temperate con maestria e rituali shintoisti.', type: 'point' },
          { id: 'jp_4', name: 'Magazzino della Seta e Lacche', desc: 'Rotoli di stoffa pregiata e armature decorate.', type: 'haven' },
        ],
      },
      {
        name: 'Santuario dei Torii & Bosco degli Spiriti',
        subtitle: 'Santuari scintoisti, sacerdoti e alberi millenari',
        description: 'Portali Torii rossi vermigli che si inoltrano nella foresta di bambù, lanterne di pietra coperte di muschio e spiriti Kami.',
        faction: 'Sacerdoti Kannushi & Monaci Sohei',
        factionColor: '#10b981',
        defaultAlert: 'safe',
        iconName: 'Mountain',
        landmarks: [
          { id: 'jp_5', name: 'Santuario Maggiore dei Kami Celesti', desc: 'Offerte di sake, riso e preghiere di protezione per i guerrieri.', type: 'elysium' },
          { id: 'jp_6', name: 'Grotta delle Acque Sacre', desc: 'Sorgente purificatrice immersa nel silenzio dei bambù.', type: 'haven' },
        ],
      },
      {
        name: 'Distretto dei Piaceri di Ukiyo & Sale da Tè',
        subtitle: 'Il Mondo Fluttuante: lanterne, teatri e musica di shamisen',
        description: 'Melodie di shamisen nell’aria serale, geishe, attori di kabuki, sale da tè illuminate e banchi di street food tradizionale.',
        faction: 'Locandieri & Maestri del Mondo Fluttuante',
        factionColor: '#ec4899',
        defaultAlert: 'patrolled',
        iconName: 'Wine',
        landmarks: [
          { id: 'jp_7', name: 'Casa da Tè dei Ciliegi Notturni', desc: 'Ambiente raffinato dove si negoziano alleanze e tregue segrete.', type: 'haven' },
          { id: 'jp_8', name: 'Teatro Kabuki delle Maschere', desc: 'Rappresentazioni drammatiche con passaggi nascosti dietro le quinte.', type: 'point' },
        ],
      },
      {
        name: 'Porto dei Pescatori & Baia degli Shinobi',
        subtitle: 'Banchine nella nebbia, chiatte di contrabbando e mercenari',
        description: 'Reti da pesca stese ad asciugare al tramonto, moli scricchiolanti nella nebbia marina e ombre furtive sui tetti.',
        faction: 'Clan Ninja Ombra & Contrabbandieri Portuali',
        factionColor: '#ef4444',
        defaultAlert: 'lockdown',
        iconName: 'Anchor',
        landmarks: [
          { id: 'jp_9', name: 'Taverna del Pesce Salato', desc: 'Locanda malfamata frequentata da ronin senza padrone e mercenari.', type: 'crime' },
          { id: 'jp_10', name: 'Cantiere dei Barcaioli della Notte', desc: 'Imbarcazioni a fondo piatto per sbarchi stealth lungo la costa.', type: 'crime' },
        ],
      },
    ],
  },

  fantasy_realms: {
    districts: [
      {
        name: 'Rocca Sovrana & Mura Alte',
        subtitle: 'Bastione del potere nobiliare',
        description: 'Torri merlate in pietra viva, stendardi imperiali al vento e guardie in armatura a piastre tirate a lucido.',
        faction: 'Corona Reale & Guardie Scelte',
        factionColor: '#3b82f6',
        defaultAlert: 'patrolled',
        iconName: 'Castle',
        landmarks: [
          { id: 'fa_1', name: 'Sala del Trono & Concilio Supremo', desc: 'Dove si decidono i destini e le taglie del regno.', type: 'elysium' },
          { id: 'fa_2', name: 'Armeria Reale & Torre delle Balestre', desc: 'Arsenale d’acciaio e scudi torre della guarnigione.', type: 'point' },
        ],
      },
      {
        name: 'Distretto della Cattedrale & Cripte',
        subtitle: 'Potere clericale e misteri occulti',
        description: 'Vetrate colorate altissime, incenso pesante nell’aria e catacombe millenarie sepolte sotto le navate.',
        faction: 'Ordine Sacro dei Chierici',
        factionColor: '#a855f7',
        defaultAlert: 'safe',
        iconName: 'Church',
        landmarks: [
          { id: 'fa_3', name: 'Santuario della Fiamma Eterna', desc: 'Luogo consacrato dove la magia oscura non può penetrare.', type: 'haven' },
          { id: 'fa_4', name: 'Ingresso alle Catacombe Sepolte', desc: 'Sarcofagi sigillati con rune arcaiche di protezione.', type: 'crime' },
        ],
      },
      {
        name: 'Città Bassa & Mercato del Pesce',
        subtitle: 'Vicolo stretto, banchine e fumo',
        description: 'Tetti spioventi che quasi si toccano, odore di spezie e pesce salato, ladri di borse e locande gremite.',
        faction: 'Gilda dei Ladri & Popolani',
        factionColor: '#ef4444',
        defaultAlert: 'patrolled',
        iconName: 'Beer',
        landmarks: [
          { id: 'fa_5', name: 'Locanda del Cinghiale Cieco', desc: 'Bicchieri di idromele, voci sussurrate e tavoli sul retro per contratti.', type: 'haven' },
          { id: 'fa_6', name: 'Piazza della Gogna & Mercato Nero', desc: 'Banchi ambulanti che vendono veleni e pozioni clandestine.', type: 'crime' },
        ],
      },
      {
        name: 'Borgo dei Forgiatori & Alchimia',
        subtitle: 'Magli ardenti e forni di fusione',
        description: 'Ciminiere di pietra che sputano scintille, forgiatori di lame naniche e laboratori di polvere pirica.',
        faction: 'Gilda degli Artigiani & Maestri Fabbri',
        factionColor: '#f59e0b',
        defaultAlert: 'safe',
        iconName: 'Flame',
        landmarks: [
          { id: 'fa_7', name: 'La Grande Forgia di Damasco', desc: 'Lame temprate capaci di intaccare le scaglie di mostro.', type: 'point' },
          { id: 'fa_8', name: 'Laboratorio Alchemico di Mastro Vael', desc: 'Reagenti infiammabili, solventi e olii magici.', type: 'point' },
        ],
      },
      {
        name: 'Banchine del Fiume & Porto Fluviale',
        subtitle: 'Galeoni mercantili e moli di carico',
        description: 'Chiatte pesanti ormeggiate a pali d’olmo, marinai rudi provenienti dalle isole e magazzini del dazio.',
        faction: 'Consorzio dei Capitani & Contrabbandieri',
        factionColor: '#06b6d4',
        defaultAlert: 'patrolled',
        iconName: 'Anchor',
        landmarks: [
          { id: 'fa_9', name: 'Molo dei Velieri Stranieri', desc: 'Imbarcazioni pronte a salpare verso rotte proibite.', type: 'point' },
          { id: 'fa_10', name: 'Magazzino del Sale Abbandonato', desc: 'Covo segreto usato per nascondere fuggiaschi e reperti.', type: 'haven' },
        ],
      },
    ],
  },

  cyberpunk: {
    districts: [
      {
        name: 'Torri Corporative & Sky-Deck',
        subtitle: 'Centro di potere e megastrutture olografiche',
        description: 'Monoliti di vetro fumé, torrette laser automatizzate, droni di sorveglianza e dirigibili pubblicitari.',
        faction: 'Sicurezza Privata Megacorp',
        factionColor: '#06b6d4',
        defaultAlert: 'lockdown',
        iconName: 'Building',
        landmarks: [
          { id: 'cy_1', name: 'OmniCorp Global Plaza', desc: 'Accesso consentito solo con chip biometrico autorizzato.', type: 'elysium' },
          { id: 'cy_2', name: 'Piattaforma di Atterraggio AV', desc: 'Navette blindate pronte all’evacuazione esecutiva.', type: 'point' },
        ],
      },
      {
        name: 'Vicoli al Neon & Mercato Notturno',
        subtitle: 'Quartiere commerciale ribollente',
        description: 'Cavi ottici penzolanti tra le facciate gocciolanti di pioggia acida, chioschi di ramen sintetico e banchi clandestini.',
        faction: 'Sotto-Mondo & Fixer Indipendenti',
        factionColor: '#a855f7',
        defaultAlert: 'patrolled',
        iconName: 'Cpu',
        landmarks: [
          { id: 'cy_3', name: 'Clinica del Ripperdoc Chrome-Doc', desc: 'Innesti cibernetici illegali e cure sottobanco.', type: 'haven' },
          { id: 'cy_4', name: 'Night Club Sub-Zero', desc: 'Musica techno distorta, droghe sintetiche e banchi per scambi dati.', type: 'crime' },
        ],
      },
      {
        name: 'Piattaforma Industriale & Server Farm',
        subtitle: 'Raffinerie automatizzate e depositi chimici',
        description: 'Fumi tossici arancioni, robot da carico pesanti e cluster di raffreddamento a idrogeno per il ciberspazio.',
        faction: 'Sindacato Booster & Meccanici',
        factionColor: '#f59e0b',
        defaultAlert: 'patrolled',
        iconName: 'Factory',
        landmarks: [
          { id: 'cy_5', name: 'Nodo Rete Clandestino Black-Ice', desc: 'Terminale di pirateria per sfondare i firewall corporativi.', type: 'point' },
          { id: 'cy_6', name: 'Officina Potenziamento Veicoli', desc: 'Moto con blindatura reattiva e auto a reazione.', type: 'haven' },
        ],
      },
      {
        name: 'Baraccopoli Acid Rain & Fogne Ciberspazio',
        subtitle: 'Terra di nessuno per gli scartati dal sistema',
        description: 'Lamiere arrugginite, container abitativi sovrapposti e bande nomadi pesantemente armate di fucili a pompa.',
        faction: 'Banda dei Gutter-Wolves',
        factionColor: '#ef4444',
        defaultAlert: 'lockdown',
        iconName: 'Skull',
        landmarks: [
          { id: 'cy_7', name: 'Accampamento Container #9', desc: 'Labirinto di rifugi precari dove la polizia non mette mai piede.', type: 'haven' },
          { id: 'cy_8', name: 'Sbocco Condotte Fognarie', desc: 'Via d’infiltrazione alternativa sotto il perimetro di sicurezza.', type: 'crime' },
        ],
      },
      {
        name: 'Snodo Monorotaia & Posto di Blocco',
        subtitle: 'Linea di demarcazione e controllo biometrico',
        description: 'Scanner retinici alle stazioni sopraelevate, barriere laser e pattuglie con cani cyborg d’assalto.',
        faction: 'Polizia Metropolitana Corrotta',
        factionColor: '#3b82f6',
        defaultAlert: 'patrolled',
        iconName: 'Shield',
        landmarks: [
          { id: 'cy_9', name: 'Check-Point Alpha Scanner', desc: 'Sbarramento blindato per filtrare chi entra nei distretti alti.', type: 'point' },
          { id: 'cy_10', name: 'Tunnel Manutenzione Metro', desc: 'Binari morti dove viaggiano i contrabbandieri di reperti biologici.', type: 'crime' },
        ],
      },
    ],
  },

  victorian: {
    districts: [
      {
        name: 'Quartiere Alto & Club dei Pari',
        subtitle: 'Residenze dell’alta aristocrazia',
        description: 'Magioni georgiane con cancelli in ferro battuto, lampioni a gas lucidati e carrozze a cavalli.',
        faction: 'Nobiltà Britannica & Ordini Segreti',
        factionColor: '#3b82f6',
        defaultAlert: 'patrolled',
        iconName: 'Crown',
        landmarks: [
          { id: 'vi_1', name: 'Club dei Gentiluomini di Pall Mall', desc: 'Salotti di velluto rosso dove si tramano complotti politici.', type: 'elysium' },
          { id: 'vi_2', name: 'Magione di Lord Ravenscroft', desc: 'Palazzo con biblioteca di testi occulti e reliquie proibite.', type: 'haven' },
        ],
      },
      {
        name: 'Moli della Nebbia & Magazzini Portuali',
        subtitle: 'Il fiume e i traffici marittimi clandestini',
        description: 'Banchi di nebbia densa e giallastra, banchine viscide di fango e marinai che scaricano casse sigillate.',
        faction: 'Contrabbandieri del Tamigi & Scaricatori',
        factionColor: '#ef4444',
        defaultAlert: 'patrolled',
        iconName: 'Anchor',
        landmarks: [
          { id: 'vi_3', name: 'Magazzino Doganale #17', desc: 'Cassaforme piene di spezie, laudano e reperti mummificati.', type: 'crime' },
          { id: 'vi_4', name: 'Taverna The Rusty Anchor', desc: 'Fumo di oppio, birra scura e accordi tra assassini prezzolati.', type: 'haven' },
        ],
      },
      {
        name: 'Sobborghi di Fumo & Ciminiere di Carbone',
        subtitle: 'Il cuore industriale della rivoluzione a vapore',
        description: 'Fumo acre che oscura il sole a mezzogiorno, officine meccaniche e operai in rivolta.',
        faction: 'Lega degli Operai & Padroni delle Fabbriche',
        factionColor: '#f59e0b',
        defaultAlert: 'safe',
        iconName: 'Factory',
        landmarks: [
          { id: 'vi_5', name: 'Fonderie a Vapore di Whitechapel', desc: 'Forni colossali e caldaie che ruggiscono giorno e notte.', type: 'point' },
          { id: 'vi_6', name: 'Deposito Carrozze & Fucine', desc: 'Riparazione di pistole a percussione e lame da taschino.', type: 'haven' },
        ],
      },
      {
        name: 'Vecchio Manicomio & Cimitero Monumentale',
        subtitle: 'Mura austere e segreti sepolti',
        description: 'Mura gotiche ricoperte di edera, lapidi spezzate nella brughiera e laboratori di anatomia clandestina.',
        faction: 'Medici Occulti & Resurrezionisti',
        factionColor: '#a855f7',
        defaultAlert: 'lockdown',
        iconName: 'Ghost',
        landmarks: [
          { id: 'vi_7', name: 'Manicomio di St. Jude', desc: 'Celle imbottite sotterranee dove si tengono creature sotto studio.', type: 'crime' },
          { id: 'vi_8', name: 'Cripta dei Baroni Estinti', desc: 'Mausoleo di marmo nero con passaggi verso le fogne.', type: 'point' },
        ],
      },
      {
        name: 'Vicolo dei Teatri & Quartiere dei Piaceri',
        subtitle: 'Spettacoli d’illusione e ombre notturne',
        description: 'Locande illuminate a gas, teatri dell’opera e vicoli ciechi dove il sangue si mescola alla pioggia.',
        faction: 'Artisti di Strada, Usurai & Meretrici',
        factionColor: '#dc2626',
        defaultAlert: 'patrolled',
        iconName: 'Mask',
        landmarks: [
          { id: 'vi_9', name: 'Teatro Imperiale dell’Illusione', desc: 'Spettacoli di mesmerismo ed escapologia.', type: 'point' },
          { id: 'vi_10', name: 'Rifugio Soffitta di Miller', desc: 'Stanza anonima con uscita sul tetto per seminare Scotland Yard.', type: 'haven' },
        ],
      },
    ],
  },
};

export function generateThematicDistricts(era: string, cityName: string): CityDistrict[] {
  const normEra = era.toLowerCase().trim();
  let presetKey = 'fantasy_realms';

  if (normEra.includes('west') || normEra.includes('frontier') || normEra.includes('cowboy')) {
    presetKey = 'wild_west';
  } else if (normEra.includes('cyber') || normEra.includes('futur') || normEra.includes('sci-fi')) {
    presetKey = 'cyberpunk';
  } else if (normEra.includes('victor') || normEra.includes('noir') || normEra.includes('gothic') || normEra.includes('modern')) {
    presetKey = 'victorian';
  } else if (normEra.includes('china') || normEra.includes('tang') || normEra.includes('ming') || normEra.includes('wuxia')) {
    presetKey = 'imperial_china';
  } else if (normEra.includes('japan') || normEra.includes('samurai') || normEra.includes('sengoku') || normEra.includes('edo') || normEra.includes('feudal')) {
    presetKey = 'feudal_japan';
  }

  const selectedPreset = PRESETS[presetKey] || PRESETS.fantasy_realms;

  return selectedPreset.districts.map((d, idx) => {
    const poly = DISTRICT_POLYGONS[idx] || DISTRICT_POLYGONS[0];
    return {
      id: `district_${idx + 1}_${cityName.toLowerCase().replace(/[^a-z]/g, '')}`,
      name: d.name,
      subtitle: d.subtitle,
      description: d.description,
      faction: d.faction,
      factionColor: d.factionColor,
      alertLevel: d.defaultAlert,
      polyPoints: poly.polyPoints,
      centerPoint: poly.centerPoint,
      landmarks: d.landmarks,
      iconName: d.iconName,
    };
  });
}

/**
 * Controlla se i distretti salvati in memoria appartengono a un'altra epoca
 * (ad esempio un preset fantasy generato prima dell'upgrade su una cronaca in Cina o nel West).
 */
export function isDistrictsMismatchingEra(districts: CityDistrict[], era: string): boolean {
  if (!districts || districts.length === 0) return true;
  const normEra = (era || '').toLowerCase().trim();
  const names = districts.map((d) => d.name.toLowerCase()).join(' ');

  // Se la cronaca è cinese ma ha nomi medievali europei o del West
  if (
    (normEra.includes('china') || normEra.includes('tang') || normEra.includes('ming') || normEra.includes('wuxia')) &&
    (names.includes('cattedrale') || names.includes('rocca sovrana') || names.includes('saloon') || names.includes('whitechapel'))
  ) {
    return true;
  }

  // Se la cronaca è giapponese ma ha cattedrali o saloon
  if (
    (normEra.includes('japan') || normEra.includes('samurai') || normEra.includes('feudal')) &&
    (names.includes('cattedrale') || names.includes('rocca sovrana') || names.includes('saloon'))
  ) {
    return true;
  }

  // Se la cronaca è del West ma ha cattedrali o torri corporative
  if (normEra.includes('west') && (names.includes('cattedrale') || names.includes('sky-deck') || names.includes('daming'))) {
    return true;
  }

  // Se la cronaca è cyberpunk ma ha saloon o cattedrali
  if (normEra.includes('cyber') && (names.includes('saloon') || names.includes('cattedrale') || names.includes('forgiatori'))) {
    return true;
  }

  return false;
}
