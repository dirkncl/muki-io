var reCommentContents = /\/\*!?(?:@preserve)?[ \t]*(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)[ \t]*\*\//;
var multiline = function multiline(fn) {
  if (typeof fn !== "function") {
    throw new TypeError("Expected a function");
  }
  var match = reCommentContents.exec(fn.toString());
  if (!match) {
    throw new TypeError("Multiline comment missing.");
  }
  return match[1];
};
multiline.stripIndent = function(fn) {
  return stripIndent(multiline(fn));
};

var stripIndent = function(str) {
  var match = str.match(/^[ \t]*(?=\S)/gm);
  if (!match) {
    return str;
  }
  // TODO: use spread operator when targeting Node.js 6
  var indent = Math.min.apply(
    Math,
    match.map(function(x) {
      return x.length;
    })
  ); // eslint-disable-line
  var re = new RegExp("^[ \\t]{" + indent + "}", "gm");

  return indent > 0 ? str.replace(re, "") : str;
};
/////////////////////////
function load_bank(mod) {

  mod['FS_createPath']('/', 'pat', true, true);
  // Module['FS_createPath']('/pat', 'MT32Drums', true, true);
  mod['FS_createPath']('/pat', 'BrushDrumKit', true, true);
  mod['FS_createPath']('/pat', 'ElectronicDrumKit', true, true);
  mod['FS_createPath']('/pat', 'JazzDrumKit', true, true);
  mod['FS_createPath']('/pat', 'MT-32DrumKit', true, true);
  mod['FS_createPath']('/pat', 'OrchestralDrumKit', true, true);
  mod['FS_createPath']('/pat', 'PowerDrumKit', true, true);
  mod['FS_createPath']('/pat', 'RoomDrumKit', true, true);
  mod['FS_createPath']('/pat', 'StandardDrumKit', true, true);
  mod['FS_createPath']('/pat', 'TR-808.909DrumKit', true, true);
  mod['FS_createDataFile']('/', 'timidity.cfg', get_config(), true, true);

  function get_config() {
    var str = multiline(function(){/*
dir ./pat

bank 0
  0 GrandPiano.pat  # stereo
  1 BrightPiano.pat # 6 velocity ranges, stereo
  2 RockPiano.pat # stereo
  3 Honky-TonkPiano.pat # stereo
  4 ElectricPiano.pat # stereo
  5 CrystalPiano.pat
  6 Harpsichord.pat
  7 Clavinet.pat
  8 Celesta.pat
  9 Glockenspiel.pat
  10 MusicBox.pat
  11 Vibraphone.pat
  12 Marimba.pat
  13 Xylophone.pat  # 3 velocity ranges
  14 TubularBells.pat
  15 Dulcimer-Santur.pat
  16 DrawBarOrgan.pat
  17 PercussiveOrgan.pat  # 2 velocity ranges, stereo
  18 RockOrgan.pat
  19 ChurchOrgan.pat
  20 ReedOrgan.pat
  21 Accordion.pat
  22 Harmonica.pat
  23 Bandoneon.pat
  24 NylonGuitar.pat
  25 SteelStringGuitar.pat  # 9 velocity ranges
  26 JazzGuitar.pat
  27 CleanGuitar.pat
  28 MutedGuitar.pat
  29 OverdriveGuitar.pat
  30 DistortionGuitar.pat
  31 GuitarHarmonics.pat
  32 AcousticBass.pat
  33 FingeredBass.pat
  34 PickedBass.pat
  35 FretlessBass.pat
  36 SlapBass1.pat
  37 SlapBass2.pat
  38 SynthBass1.pat
  39 SynthBass2.pat
  40 Violin.pat # 2 velocity ranges
  41 Viola.pat
  42 Cello.pat
  43 ContraBass.pat
  44 TremoloStrings.pat
  45 PizzicatoStrings.pat
  46 OrchestralHarp.pat # 5 velocity ranges
  47 Timpani.pat
  48 StringsEnsemble1.pat # stereo
  49 StringsEnsemble2.pat # stereo
  50 SynthStrings1.pat
  51 SynthStrings2.pat  # stereo
  52 ChoirAahs.pat
  53 VoiceOohs.pat  # stereo
  54 SynthVoice.pat # 10 velocity ranges
  55 OrchestraHit.pat
  56 Trumpet.pat
  57 Trombone.pat
  58 Tuba.pat # stereo
  59 MutedTrumpet.pat
  60 FrenchHorns.pat  # 9 velocity ranges, stereo
  61 BrassSection.pat
  62 SynthBrass1.pat  # stereo
  63 SynthBrass2.pat
  64 SopranoSax.pat # 9 velocity ranges, stereo
  65 AltoSax.pat
  66 TenorSax.pat
  67 BaritoneSax.pat
  68 Oboe.pat
  69 EnglishHorns.pat
  70 Bassoon.pat  # 9 velocity ranges, stereo
  71 Clarinet.pat
  72 Piccolo.pat
  73 Flute.pat  # 2 velocity ranges
  74 Recorder.pat
  75 PanFlute.pat
  76 BlownBottle.pat
  77 Shakuhachi.pat
  78 Whistle.pat
  79 Ocarina.pat
  80 SquareWave.pat
  81 SawWave.pat
  82 SynthCalliope.pat
  83 ChifferLead.pat
  84 Charang.pat
  85 SoloVoice.pat
  86 5thSawWave.pat
  87 BassLead.pat
  88 Fantasia-NewAge.pat
  89 WarmPad.pat
  90 PolySynth.pat
  91 SpaceVoice.pat
  92 BowedGlass.pat
  93 MetalPad.pat # stereo
  94 HaloPad.pat
  95 SweepPad.pat
  96 IceRain.pat
  97 SoundTrack.pat
  98 Crystal.pat
  99 Atmosphere.pat # 2 velocity ranges
  100 Brightness.pat
  101 Goblin.pat
  102 EchoDrops.pat # stereo
  103 StarTheme.pat
  104 Sitar.pat
  105 Banjo.pat
  106 Shamisen.pat
  107 Koto.pat
  108 Kalimba.pat
  109 BagPipe.pat
  110 Fiddle.pat
  111 Shannai.pat
  112 TinkleBell.pat
  113 Agogo.pat # stereo
  114 SteelDrums.pat
  115 WoodBlock.pat
  116 TaikoDrum.pat
  117 MelodicTom.pat
  118 SynthDrum.pat
  119 ReverseCymbal.pat
  120 GuitarFretNoise.pat
  121 BreathNoise.pat
  122 SeaShore.pat
  123 BirdTweets.pat
  124 Telephone.pat # 2 velocity ranges
  125 Helicopter.pat
  126 Applause.pat
  127 GunShot.pat

drumset 0 #N MT-32DrumKit
  26 MT-32DrumKit/{S}FingerSnap.pat
  27 MT-32DrumKit/{S}HighQ.pat
  28 MT-32DrumKit/{T}NoiseSlap.pat
  29 MT-32DrumKit/{T}ScratchPush.pat
  30 MT-32DrumKit/{T}ScratchPull.pat
  31 MT-32DrumKit/{T}Sticks.pat
  32 MT-32DrumKit/{S}SquareClick.pat
  33 MT-32DrumKit/{T}MetronomeClick.pat
  34 MT-32DrumKit/{T}Carillon.pat
  35 MT-32DrumKit/{M}BassDrum.pat
  36 MT-32DrumKit/{M}BassDrum.pat
  37 MT-32DrumKit/{M}RimShot.pat
  38 MT-32DrumKit/{M}AcousticSnare.pat
  39 MT-32DrumKit/{M}HandClap.pat
  40 MT-32DrumKit/{M}ElectricSnare.pat
  41 MT-32DrumKit/{M}LowTom.pat
  42 MT-32DrumKit/{M}ClosedHi-Hat.pat
  43 MT-32DrumKit/{M}LowTom.pat
  44 MT-32DrumKit/{M}PedalHi-Hat.pat
  45 MT-32DrumKit/{M}MediumTom.pat
  46 MT-32DrumKit/{M}OpenHi-Hat.pat
  47 MT-32DrumKit/{M}MediumTom.pat
  48 MT-32DrumKit/{M}HighTom.pat
  49 MT-32DrumKit/{M}CrashCymbal.pat
  50 MT-32DrumKit/{M}HighTom.pat
  51 MT-32DrumKit/{M}RideCymbal.pat
  52 MT-32DrumKit/{R}ChineseCrash.pat
  53 MT-32DrumKit/{S}RideBellCymbal.pat
  54 MT-32DrumKit/{M}Tambourine.pat
  55 MT-32DrumKit/{E}SplashCymbal.pat
  56 MT-32DrumKit/{M}CowBell.pat
  57 MT-32DrumKit/{P}CrashCymbal.pat
  58 MT-32DrumKit/{M}VibraSlap.Qui.pat
  59 MT-32DrumKit/{S}RideBellCymbal.pat
  60 MT-32DrumKit/{M}HighBongo.pat
  61 MT-32DrumKit/{M}LowBongo.pat
  62 MT-32DrumKit/{M}HighConga.pat
  63 MT-32DrumKit/{M}MediumConga.pat
  64 MT-32DrumKit/{M}LowConga.pat
  65 MT-32DrumKit/{M}HighTimbale.pat
  66 MT-32DrumKit/{M}LowTimbale.pat
  67 MT-32DrumKit/{M}HighAgogo.pat
  68 MT-32DrumKit/{M}LowAgogo.pat
  69 MT-32DrumKit/{M}Cabasa.pat
  70 MT-32DrumKit/{M}Maracas.pat
  71 MT-32DrumKit/{M}ShortWhistle.pat
  72 MT-32DrumKit/{M}LongWhistle.pat
  73 MT-32DrumKit/{M}VibraSlap.Qui.pat
  74 MT-32DrumKit/{S}LongGuiro.pat
  75 MT-32DrumKit/{M}Claves.pat
  76 MT-32DrumKit/{S}HighWoodBlock.pat
  77 MT-32DrumKit/{S}LowWoodBlock.pat
  78 MT-32DrumKit/{S}MuteCuica.pat
  79 MT-32DrumKit/{S}OpenCuica.pat
  80 MT-32DrumKit/{S}MuteTriangle.pat
  81 MT-32DrumKit/{S}OpenTriangle.pat
  82 MT-32DrumKit/{T}Shaker.pat
  83 MT-32DrumKit/{T}JingleBells.pat
  84 MT-32DrumKit/{T}BellTree.pat
  85 MT-32DrumKit/{T}Castanets.pat
  86 MT-32DrumKit/{S}MuteSurdo.pat
  87 MT-32DrumKit/{S}OpenSurdo.pat

drumset 48 #N OrchestralDrumKit
	26 OrchestralDrumKit/{S}FingerSnap.pat
	27 OrchestralDrumKit/{R}ClosedHi-Hat.pat	# 3 velocity ranges
	28 OrchestralDrumKit/{R}PedalHi-Hat.pat	# 2 velocity ranges
	29 OrchestralDrumKit/{P}OpenHi-Hat.pat
	30 OrchestralDrumKit/{P}RideCymbal.pat
	31 OrchestralDrumKit/{S}Sticks.pat
	32 OrchestralDrumKit/{S}SquareClick.pat
	33 OrchestralDrumKit/{E}MetronomeClick.pat
	34 OrchestralDrumKit/{O}MetronomeClick.pat
	35 OrchestralDrumKit/{O}Kick.pat
	36 OrchestralDrumKit/{O}Kick.pat
	37 MT-32DrumKit/{M}RimShot.pat
	38 OrchestralDrumKit/{O}Snare.pat	# 2 velocity ranges
	39 OrchestralDrumKit/{S}Castanets.pat
	40 OrchestralDrumKit/{O}Snare.pat	# 2 velocity ranges
	41 OrchestralDrumKit/{O}RolandTimpani.pat
	42 OrchestralDrumKit/{O}RolandTimpani.pat
	43 OrchestralDrumKit/{O}RolandTimpani.pat
	44 OrchestralDrumKit/{O}RolandTimpani.pat
	45 OrchestralDrumKit/{O}RolandTimpani.pat
	46 OrchestralDrumKit/{O}RolandTimpani.pat
	47 OrchestralDrumKit/{O}RolandTimpani.pat
	48 OrchestralDrumKit/{O}RolandTimpani.pat
	49 OrchestralDrumKit/{O}RolandTimpani.pat
	50 OrchestralDrumKit/{O}RolandTimpani.pat
	51 OrchestralDrumKit/{O}RolandTimpani.pat
	52 OrchestralDrumKit/{O}RolandTimpani.pat
	53 OrchestralDrumKit/{O}RolandTimpani.pat
	54 OrchestralDrumKit/{R}Tambourine.pat	# 2 velocity ranges
	55 OrchestralDrumKit/{P}SplashCymbal.pat
	56 OrchestralDrumKit/{P}CowBell.pat
	57 OrchestralDrumKit/{O}ConcertCymbal.pat
	58 OrchestralDrumKit/{P}VibraSlap.pat
	59 OrchestralDrumKit/{O}ConcertCymbal.pat
	60 OrchestralDrumKit/{P}HighBongo.pat
	61 OrchestralDrumKit/{P}LowBongo.pat
	62 OrchestralDrumKit/{P}MuteHighConga.pat
	63 OrchestralDrumKit/{P}OpenHighConga.pat
	64 OrchestralDrumKit/{P}LowConga.pat
	65 OrchestralDrumKit/{S}HighTimbale.pat
	66 OrchestralDrumKit/{S}LowTimbale.pat
	67 OrchestralDrumKit/{S}Agogo.pat
	68 OrchestralDrumKit/{S}Agogo.pat
	69 OrchestralDrumKit/{S}Cabasa.pat
	70 OrchestralDrumKit/{S}Maracas.pat
	71 OrchestralDrumKit/{S}Whistle.pat
	72 OrchestralDrumKit/{S}Whistle.pat
	73 OrchestralDrumKit/{S}ShortGuiro.pat
	74 OrchestralDrumKit/{S}LongGuiro.pat
	75 OrchestralDrumKit/{S}Claves.pat
	76 OrchestralDrumKit/{S}HighWoodBlock.pat
	77 OrchestralDrumKit/{S}LowWoodBlock.pat
	78 OrchestralDrumKit/{S}MuteCuica.pat
	79 OrchestralDrumKit/{S}OpenCuica.pat
	80 OrchestralDrumKit/{S}MuteTriangle.pat
	81 OrchestralDrumKit/{S}OpenTriangle.pat	# 2 velocity ranges
	82 MT-32DrumKit/{T}Shaker.pat
	83 OrchestralDrumKit/{P}JingleBells.pat
	84 OrchestralDrumKit/{S}BellTree.pat
	85 OrchestralDrumKit/{S}Castanets.pat
	86 OrchestralDrumKit/{S}MuteSurdo.pat
	87 OrchestralDrumKit/{S}OpenSurdo.pat

    */});

    return str;
  }
}

if (typeof module == 'object' && typeof module.exports == 'object') {
  module.exports = load_bank;
}
