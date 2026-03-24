import { characters, type Character } from "@/data/characters";

/**
 * Hand-written lore blurbs + generated fallback lore for every character.
 * This guarantees every character page has Elden Ring Lore + why smash/pass.
 */

export interface CharacterLore {
  lore: string[];
  whySmash?: string[];
  whyPass?: string[];
}

const TYPE_LABELS = {
  boss: "boss",
  npc: "character",
  mob: "creature",
  mc: "main character",
  merchant: "merchant",
  summon: "summon",
} as const;

function singularType(type: Character["type"]): string {
  return TYPE_LABELS[type] ?? "character";
}

function shortName(name: string): string {
  return name.split(",")[0].trim();
}

function cleanDescription(description: string): string {
  return description.replace(/\s+/g, " ").trim();
}

function startsWithArticle(text: string): boolean {
  return /^(a|an|the)\b/i.test(text.trim());
}

function buildLoreParagraphs(char: Character): string[] {
  const type = singularType(char.type);
  const desc = cleanDescription(char.description);

  const firstSentence = startsWithArticle(desc)
    ? `${char.name} is ${desc.charAt(0).toLowerCase()}${desc.slice(1)}`
    : `${char.name} is a ${type} in Elden Ring. ${desc}`;

  const secondSentenceByType: Record<Character["type"], string> = {
    boss: `${shortName(char.name)} stands out as one of the many boss encounters players remember for visual design, difficulty, spectacle, or lore significance across the Lands Between.`,
    npc: `${shortName(char.name)} is part of the wider cast of Elden Ring NPCs who help define the world's quests, factions, mysteries, and emotional storylines.`,
    mob: `${shortName(char.name)} is one of the many hostile creatures roaming the Lands Between, contributing to Elden Ring's worldbuilding through enemy design, region identity, and environmental storytelling.`,
    mc: `${shortName(char.name)} plays a central role in how players interpret Elden Ring's journey, themes, and major events throughout the Lands Between.`,
    merchant: `${shortName(char.name)} is one of Elden Ring's merchants, helping flesh out the world through trade, atmosphere, and the lonely lives of those who survive in the Lands Between.`,
    summon: `${shortName(char.name)} appears as a summon or spirit ally in Elden Ring, tying into the game's wider themes of companionship, memory, and fighting alongside fallen souls.`,
  };

  return [firstSentence, secondSentenceByType[char.type]];
}

function buildWhySmash(char: Character): string[] {
  const type = singularType(char.type);
  const sName = shortName(char.name);

  const byType: Record<Character["type"], string[]> = {
    boss: [
      `A striking ${type} design that makes ${sName} instantly memorable`,
      "Boss energy, spectacle, and intimidation can be weirdly attractive",
      "Iconic fights tend to make certain characters fan favorites",
    ],
    npc: [
      `${sName} has a memorable personality, look, or quest presence`,
      "NPCs with story relevance and strong vibes tend to attract fans",
      "Dialogue, mystery, and emotional attachment do a lot of work",
    ],
    mob: [
      `${sName} has a design players can find cool, creepy, or weirdly appealing`,
      "Enemy aesthetic and region vibe can make even minor creatures memorable",
      "Sometimes the attraction is pure meme energy and nothing more",
    ],
    mc: [
      `${sName} carries major narrative weight and strong visual identity`,
      "Main characters tend to benefit from screen time and fan attachment",
      "Lore importance plus design usually makes for a strong fan response",
    ],
    merchant: [
      `${sName} has a distinctive look and a memorable role in the world`,
      "Merchants often benefit from voice, vibe, and recurring player interaction",
      "A good outfit and mysterious backstory can carry a lot",
    ],
    summon: [
      `${sName} has the appeal of a loyal ally who literally fights beside you`,
      "Spirit summons and allies often get bonus points for usefulness and presence",
      "Supportive energy goes a long way in a brutal world like Elden Ring",
    ],
  };

  return byType[char.type];
}

function buildWhyPass(char: Character): string[] {
  const type = singularType(char.type);
  const sName = shortName(char.name);

  const byType: Record<Character["type"], string[]> = {
    boss: [
      `${sName} is still a deadly ${type}, which is a major red flag`,
      "Difficulty, violence, and catastrophic lore can kill the mood fast",
      "A lot of bosses are attractive right up until they start trying to murder you",
    ],
    npc: [
      "Questline baggage, bad endings, or suspicious motives can turn players away",
      "Some NPCs come with emotional damage, betrayal, or general instability",
      `${sName} may have the vibes, but not necessarily the green flags`,
    ],
    mob: [
      `${sName} is still an enemy creature trying to kill you on sight`,
      "Monster design can be cool without being dateable",
      "For some players, hostile wildlife and humanoids are an automatic pass",
    ],
    mc: [
      `${sName} comes with major plot baggage and world-ending stakes`,
      "Being central to Elden Ring's story usually means complicated emotional fallout",
      "Some characters are better admired from a safe narrative distance",
    ],
    merchant: [
      "Surviving in the Lands Between tends to leave merchants with some baggage",
      "Mystery is fun until it starts feeling unsettling",
      `${sName} may be charming, but not always in a trustworthy way`,
    ],
    summon: [
      `${sName} may be loyal, but the whole ghostly ally angle is complicated`,
      "Spiritual or puppet-like existence raises some uncomfortable questions",
      "Usefulness in combat does not always translate into romantic appeal",
    ],
  };

  return byType[char.type];
}

function buildGeneratedLore(char: Character): CharacterLore {
  return {
    lore: buildLoreParagraphs(char),
    whySmash: buildWhySmash(char),
    whyPass: buildWhyPass(char),
  };
}

const HAND_WRITTEN_LORE: Record<string, CharacterLore> = {
  /* ── Top smashed ── */

  er_nox_swordstress: {
    lore: [
      "The Nox Swordstresses are warriors from the Eternal City of Nokstella, an underground civilization that once rivaled the Golden Order. They are known for their fluid, dance-like combat style and their mastery of the Night Maiden's Mist sorcery.",
      "The Nox were banished underground for high treason — they attempted to create a Lord of Night who could challenge the Greater Will itself.",
    ],
    whySmash: [
      "Flowing armor and a dance-like fighting style that looks more like a performance than combat",
      "Mysterious underground warrior aesthetic from an ancient, banished civilization",
      "The strong, silent type who doesn't need words to make an impression",
    ],
    whyPass: [
      "Hostile on sight — every conversation starts with a sword combo",
      "Never says a single word throughout the entire game",
      "Lives in a pitch-black underground city with no sunlight",
    ],
  },

  er_finger_maiden_therolina_puppet: {
    lore: [
      "Therolina is a spirit ash summon — a puppet version of a Finger Maiden, crafted by the mysterious puppeteer Seluvis. In life, Finger Maidens guide Tarnished warriors, offering grace and purpose.",
      "Seluvis had a disturbing habit of turning people into puppets for his collection. Therolina's true identity and how she ended up in his possession remains one of the game's darker mysteries.",
    ],
    whySmash: [
      "The elegant, guiding Finger Maiden archetype every Tarnished dreams of",
      "Keeps all the grace and beauty of a maiden without any of the judgment",
      "One of the most popular spirit ash summons for a reason",
    ],
    whyPass: [
      "She's literally a puppet made by the creepiest NPC in the game",
      "The ethical implications of Seluvis's puppet collection are deeply disturbing",
      "Zero autonomy — raises serious consent questions",
    ],
  },

  er_st_trina: {
    lore: [
      "St. Trina is one of Elden Ring's most enigmatic figures — a saint associated with sleep, dreams, and a mysterious lily that induces slumber. Followers of St. Trina seek eternal rest and gentle oblivion.",
      "The Shadow of the Erdtree DLC reveals far more about St. Trina's true nature and connection to Miquella, challenging everything players assumed about this mysterious figure.",
    ],
    whySmash: [
      "Ethereal, androgynous beauty with an otherworldly charm",
      "The mystery factor is intoxicating — one of the game's most enigmatic figures",
      "Associated with dreams and gentle slumber, which is oddly romantic",
    ],
    whyPass: [
      "Getting involved means getting involved with sleep magic — you might never wake up",
      "The DLC reveals some uncomfortable truths about their identity",
      "Their followers literally seek eternal oblivion, which is a red flag",
    ],
  },

  er_millicent: {
    lore: [
      "Millicent is a young woman afflicted with Scarlet Rot who embarks on a journey to find her purpose. She was born from Malenia's Scarlet Rot bloom, making her one of Malenia's 'daughters' in a sense.",
      "Her questline is one of the longest in Elden Ring, taking players across the entire Lands Between as she grows from a sickly girl into a determined warrior. Her fate depends on the player's final choice.",
    ],
    whySmash: [
      "One of the most compelling character arcs — from barely surviving to fierce warrior",
      "Brave and determined, she fights alongside you against the toughest enemies",
      "Her growth throughout the questline is genuinely inspiring",
    ],
    whyPass: [
      "The Scarlet Rot affliction is a serious medical concern",
      "She might be Malenia's daughter, adding complicated family dynamics",
      "Her fate is tragic no matter what choice you make at the end",
    ],
  },

  er_ranni: {
    lore: [
      "Ranni the Witch is an Empyrean — chosen by the Two Fingers as a candidate to become the next god. She rejected this fate so thoroughly that she orchestrated the Night of the Black Knives, killed her own body, and now exists as a four-armed doll inhabiting a puppet body.",
      "Her questline is considered the 'true' ending path by many players, leading to the Age of Stars — an ending where she and the Tarnished leave the Lands Between to journey among the stars together.",
    ],
    whySmash: [
      "The internet's undisputed queen of Elden Ring — declared 'best girl' before launch",
      "Four arms, blue skin, witch hat, and an air of mystery that's irresistible",
      "She literally offers you a future together journeying among the stars",
    ],
    whyPass: [
      "Her real body is dead — she inhabits a puppet doll",
      "Orchestrated a massive assassination plot that killed demigods",
      "The red flags are as blue as her skin",
    ],
  },

  er_malenia: {
    lore: [
      "Malenia, Blade of Miquella, is widely considered the hardest boss in Elden Ring — and possibly in all of FromSoftware's history. She's an Empyrean afflicted with Scarlet Rot from birth, yet trained herself into the greatest swordswoman in the Lands Between.",
      "She fought General Radahn to a standstill in the Battle of Aeonia, choosing to unleash her Scarlet Rot bloom to end the stalemate — devastating an entire region in the process. She famously introduces herself: 'I am Malenia, Blade of Miquella. And I have never known defeat.'",
    ],
    whySmash: [
      "Impossibly skilled warrior with one of the most iconic designs in gaming",
      "The prosthetic arm, flowing red hair, and winged rot goddess form",
      "Being defeated by her 47 times only makes the attraction stronger",
      "Fiercely loyal to her brother — dedication is attractive",
    ],
    whyPass: [
      "She will kill you — repeatedly — and heal every time she hits you",
      "The Scarlet Rot will literally decompose your body on contact",
      "A public health hazard in humanoid form",
    ],
  },

  er_melina: {
    lore: [
      "Melina is the player's maiden and guide throughout Elden Ring, offering to act as your Finger Maiden despite not actually being one. She appears at the start of the game to forge a connection with the Tarnished through the Accord at the Site of Grace.",
      "Her true nature is one of the game's biggest mysteries. She has a closed eye that opens to reveal a dark mark, she can travel between Sites of Grace, and her relationship to Queen Marika is left deliberately ambiguous.",
    ],
    whySmash: [
      "Your companion from the very beginning — kind and supportive throughout",
      "The devoted maiden archetype with genuinely hidden depths",
      "That scene at the Forge of the Giants hits different",
    ],
    whyPass: [
      "She will hunt you down and kill you if you pursue the Frenzied Flame ending",
      "Possibly related to Marika, which makes things complicated",
      "Her true nature is never fully explained — too many unknowns",
    ],
  },

  er_rennala: {
    lore: [
      "Rennala, Queen of the Full Moon, leads the Academy of Raya Lucaria and was once one of the most powerful figures in the Lands Between. Her marriage to Radagon united the Carian royals with the Golden Order — until he left her to become Elden Lord.",
      "When you find her, she's been reduced to a weeping figure cradling an amber egg, endlessly attempting rebirth. Her students have turned on her. It's one of the saddest scenes in the game.",
    ],
    whySmash: [
      "A powerful moon sorceress and queen with regal, ethereal beauty",
      "Her second boss phase shows her at full terrifying power",
      "The Carian Royal aesthetic is peak fantasy elegance",
    ],
    whyPass: [
      "She's catatonic and heartbroken when you actually find her",
      "Sitting on a library floor crying over her ex-husband",
      "She clearly needs space and therapy, not a date",
    ],
  },

  er_fia: {
    lore: [
      "Fia is a Deathbed Companion — someone who lies with the recently deceased to grant them the warmth of life one final time. She seeks the power of the Rune of Death to create a world where Those Who Live in Death can exist peacefully.",
      "Her questline intersects with some of the game's deepest lore about the nature of death in the Lands Between and the Golden Order's suppression of Destined Death.",
    ],
    whySmash: [
      "She literally asks to hold you — warmth and comfort in a world of violence",
      "The deathbed companion fantasy is surprisingly popular",
      "One of the most emotionally intimate NPCs in the game",
    ],
    whyPass: [
      "She drains your HP every time she hugs you — love shouldn't hurt",
      "Her ideal partner is technically a corpse",
      "The vibes around death and dying are consistently off-putting",
    ],
  },

  er_messmer: {
    lore: [
      "Messmer the Impaler is a major figure introduced in the Shadow of the Erdtree DLC. He's Marika's hidden son, banished to the Shadow Realm to carry out a devastating campaign against the Hornsent people on his mother's orders.",
      "Despite being a conqueror, Messmer is a tragic figure — loyal to a mother who essentially exiled him, haunted by the atrocities he committed in her name. His serpentine fire powers and imposing design made him an instant fan favorite.",
    ],
    whySmash: [
      "Tall, brooding, and tragic — the DLC's poster boy for a reason",
      "Snake-themed fire powers and a voice that could melt steel",
      "Earned an instant thirst following from the first trailer",
    ],
    whyPass: [
      "He impales people — it's literally his name",
      "Set an entire civilization on fire because his mom told him to",
      "Mommy issues of the highest order",
    ],
  },

  er_blaidd: {
    lore: [
      "Blaidd is Ranni's half-wolf shadow, bound to protect her by the Two Fingers. He's a loyal knight who fights alongside the player multiple times and has one of the most beloved character designs in the game.",
      "His tragic fate is sealed by his nature — as Ranni's shadow, he's programmed to turn against her if she defies the Two Fingers. Despite his loyalty, the Golden Order's failsafe eventually drives him mad.",
    ],
    whySmash: [
      "Wolf knight with a deep voice and a cool greatsword",
      "Loyal protector who checks every 'dark mysterious knight' box",
      "The community was down bad for him from the very first trailer",
    ],
    whyPass: [
      "Goes insane at the end of his questline and tries to kill you",
      "He's half wolf, which raises questions some prefer not to answer",
      "Programmed by the Two Fingers — free will is questionable",
    ],
  },

  er_alexander: {
    lore: [
      "Iron Fist Alexander is a Living Jar — a sentient pot warrior filled with the remains of fallen champions. He aspires to become the mightiest warrior in all the Lands Between and travels the world seeking worthy opponents to absorb.",
      "His jolly personality and unshakeable optimism make him one of the most beloved NPCs in Elden Ring. His questline ends with a heartfelt duel where he asks you to fight him at full strength.",
    ],
    whySmash: [
      "A big, friendly, enthusiastic pot who just wants to be your friend",
      "Pure and wholesome energy — the emotional core of many players' runs",
      "Unshakeable optimism in a world full of misery",
    ],
    whyPass: [
      "He's a pot full of dead people's remains",
      "The logistics are genuinely impossible to work out",
      "He wants you to fight him to the death as a sign of friendship",
    ],
  },

  er_sellen: {
    lore: [
      "Sorceress Sellen is a brilliant but exiled sorcery teacher, known as the Graven Witch. She was expelled from the Academy of Raya Lucaria for her obsession with the primeval current — a form of sorcery considered heretical.",
      "Her questline delves into the dark side of sorcerous ambition, with a conclusion that's both tragic and deeply unsettling. She's one of the few NPCs who teaches the player sorceries directly.",
    ],
    whySmash: [
      "Ambitious, intelligent, and has a mysterious masked look",
      "The 'forbidden knowledge' fantasy — a brilliant outcast who believes in you",
      "One of the few NPCs who directly teaches you and invests in your growth",
    ],
    whyPass: [
      "Her questline ending is genuinely horrifying",
      "Some ambitions have costs that are very visible and very permanent",
      "The mask hides more than just her face",
    ],
  },

  er_radahn: {
    lore: [
      "Starscourge Radahn was the mightiest demigod in terms of raw strength — so powerful he learned gravity magic specifically so he could keep riding his beloved but tiny horse, Leonard, without crushing it.",
      "The Radahn Festival is one of Elden Ring's most epic moments: warriors from across the Lands Between gather to fight him in a massive battlefield, hoping to grant the once-great general an honorable death after Scarlet Rot reduced him to a mindless beast.",
    ],
    whySmash: [
      "So powerful he held back the literal stars",
      "Learned an entire school of magic just to keep riding his tiny horse",
      "The himbo energy is off the charts",
    ],
    whyPass: [
      "He's a rotting, mindless giant eating corpses in the desert when you find him",
      "The glory days are long gone by the time you meet",
      "He's the size of a building — logistics are a dealbreaker",
    ],
  },

  er_marika: {
    lore: [
      "Queen Marika the Eternal is the god-queen of the Lands Between and vessel of the Elden Ring. She shattered the Elden Ring itself, triggering the events of the entire game. Her motivations remain one of the deepest mysteries in Elden Ring's lore.",
      "The revelation that Marika and Radagon are the same person, or two aspects of one being, is one of the game's biggest twists, raising profound questions about identity, free will, and the nature of godhood.",
    ],
    whySmash: [
      "She's literally a god — the supreme deity of the entire world",
      "The all-powerful golden queen who shaped an entire civilization",
      "Peak 'powerful woman' energy",
    ],
    whyPass: [
      "Fused with her other half Radagon inside the Erdtree",
      "She shattered reality itself on purpose",
      "Every major conflict in the game is basically her fault",
    ],
  },

  er_d_hunter: {
    lore: [
      "D, Hunter of the Dead is a gold-masked warrior who hunts Those Who Live in Death on behalf of the Golden Order. He's one of the first NPCs many players encounter, standing near the Bestial Sanctum.",
      "D actually has a twin brother, also named D, whose existence adds tragic layers to an already complex questline involving Fia, the Roundtable Hold, and the nature of death itself.",
    ],
    whySmash: [
      "Strong silent type with a golden mask and unwavering convictions",
      "That mysterious knight energy that draws people in",
      "One of the first friendly faces you meet in the game",
    ],
    whyPass: [
      "Fanatically devoted to the Golden Order's doctrine",
      "Pretty closed-minded about the whole 'death' thing",
      "Not great at dinner conversation",
    ],
  },

  er_nepheli: {
    lore: [
      "Nepheli Loux is a fierce warrior adopted by Gideon Ofnir, one of the Tarnished at the Roundtable Hold. She fights with dual stormhawk axes and has a deep connection to the ancient storm powers.",
      "Her questline can lead to her becoming the ruler of Stormveil Castle — a fitting end for someone descended from the storm king lineage, reclaiming her birthright.",
    ],
    whySmash: [
      "Dual-wielding warrior princess who fights alongside you",
      "Strong, brave, and has one of the happiest endings in the game",
      "Can become ruler of an entire castle — ambitious and powerful",
    ],
    whyPass: [
      "Her adopted father Gideon is one of the most insufferable NPCs around",
      "The family dinners would be unbearable",
      "Storm powers mean the weather on dates is unpredictable",
    ],
  },

  er_roderika: {
    lore: [
      "Roderika starts as a terrified young woman hiding in Stormhill Shack, too afraid to continue her journey. Through the player's encouragement, she discovers a gift for spirit tuning — the ability to strengthen spirit ash summons.",
      "Her growth from a timid, despairing pilgrim into a confident spirit tuner at the Roundtable Hold is one of the game's most wholesome character arcs. Her relationship with the blacksmith Hewg is genuinely touching.",
    ],
    whySmash: [
      "The ultimate character development arc — from scared and lost to confident and essential",
      "Wholesome, supportive, and she makes your spirit ashes stronger",
      "Her relationship with Hewg shows she has a huge heart",
    ],
    whyPass: [
      "She has a jellyfish spirit she treats like her child",
      "The emotional baggage of the Stormhill pilgrims she couldn't save",
      "She needs a therapist before she needs a date",
    ],
  },

  er_promised_consort_radahn: {
    lore: [
      "Promised Consort Radahn appears in the Shadow of the Erdtree DLC as the final boss — Radahn reborn through Miquella's power as his 'promised consort.' This version of Radahn is restored to his full glory, wielding both his gravity magic and Miquella's golden power.",
      "The fight is widely considered one of the most spectacular and challenging in FromSoftware history, with Radahn wielding his massive swords alongside Miquella's holy magic in a breathtaking arena.",
    ],
    whySmash: [
      "Radahn at his absolute peak — no rot, full power, radiant and magnificent",
      "The DLC's final boss form is peak character design",
      "Restored to his former glory and more powerful than ever",
    ],
    whyPass: [
      "He's literally being mind-controlled by Miquella",
      "The 'promised consort' situation isn't exactly consensual",
      "Still the size of a building — nothing has changed there",
    ],
  },
};

export const CHARACTER_LORE: Record<string, CharacterLore> = Object.fromEntries(
  characters.map((char) => [
    char.id,
    HAND_WRITTEN_LORE[char.id] ?? buildGeneratedLore(char),
  ])
);