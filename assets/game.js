(() => {
  'use strict';

  // =========================================================================
  // 1. 定数・セーブキー・1画面固定ワールド座標 (VIEW_W=420, VIEW_H=660, WORLD_H=660)
  // =========================================================================
  const STORAGE_KEY_HISCORE = 'hazumu_omoitsuki_hiscore_v1';
  const STORAGE_KEY_CLEARED = 'hazumu_omoitsuki_cleared_v1';
  const STORAGE_KEY_FISH_ZUKAN = 'hazumu_omoitsuki_fish_zukan_v1'; // 新規図鑑セーブキー（既存セーブを壊さない）
  const STORAGE_KEY_FUSION_ZUKAN = 'hazumu_omoitsuki_fusion_zukan_v1'; // 合成発見記録用セーブキー

  const NORMAS = [3000, 6000, 10000, 16000, 24000, 35000, 50000, 75000];
  const VIEW_W = 420;
  const VIEW_H = 660;
  const WORLD_H = 660;
  const LANE_X = 374;
  const BALL_R = 9;
  const GRAVITY = 520;

  // 10か所の配置スロット座標（指示書_1画面化.md 準拠）
  const SLOT_POSITIONS = [
    { id: 0, x: 112, y: 140, label: '浅層・左' },
    { id: 1, x: 262, y: 140, label: '浅層・右' },
    { id: 2, x: 187, y: 215, label: '中上・中央' },
    { id: 3, x: 102, y: 295, label: '中層・左' },
    { id: 4, x: 272, y: 295, label: '中層・右' },
    { id: 5, x: 187, y: 370, label: '深層・中央' },
    { id: 6, x: 115, y: 445, label: '深層・左' },
    { id: 7, x: 260, y: 445, label: '深層・右' },
    { id: 8, x: 102, y: 515, label: '海溝・左' },
    { id: 9, x: 272, y: 515, label: '海溝・右' }
  ];

  // 最上部の発光プランクトンの溜まり場3か所（ロールオーバー: y=64, x=112/187/262）
  const TOP_ROLLOVERS = [
    { id: 0, x: 112, y: 64, label: 'プランクトンA', lit: false },
    { id: 1, x: 187, y: 64, label: 'プランクトンB', lit: false },
    { id: 2, x: 262, y: 64, label: 'プランクトンC', lit: false }
  ];

  // 左右壁の4つのイソギンチャク（旧燭台ターゲット: y=250 と y=470）
  const WALL_TARGETS = [
    { id: 0, x: 16, y: 250, y1: 233, y2: 267, lit: false, normalX: 1 },
    { id: 1, x: LANE_X - 4, y: 250, y1: 233, y2: 267, lit: false, normalX: -1 },
    { id: 2, x: 16, y: 470, y1: 453, y2: 487, lit: false, normalX: 1 },
    { id: 3, x: LANE_X - 4, y: 470, y1: 453, y2: 487, lit: false, normalX: -1 }
  ];

  // 壁際の発光クラゲ装飾（旧松明: y=150/330/510）
  const JELLYFISH_POSITIONS = [
    { x: 28, y: 150, phase: 0.2, color: '#70f5ff' },
    { x: 356, y: 150, phase: 1.8, color: '#70f5ff' },
    { x: 28, y: 330, phase: 3.1, color: '#20e3b2' },
    { x: 356, y: 330, phase: 4.5, color: '#20e3b2' },
    { x: 28, y: 510, phase: 5.4, color: '#df88ff' },
    { x: 356, y: 510, phase: 2.6, color: '#df88ff' }
  ];

  // =========================================================================
  // 1.5 画像アセット（外部WebPファイル）とプリロード管理
  // =========================================================================
  const ASSET_PATHS = {
    'anemone': 'assets/img/anemone.webp',
    'boss': 'assets/img/boss.webp',
    'chochin_ankou': 'assets/img/chochin_ankou.webp',
    'coelacanth': 'assets/img/coelacanth.webp',
    'daiouika': 'assets/img/daiouika.webp',
    'demenigisu': 'assets/img/demenigisu.webp',
    'fukurounagi': 'assets/img/fukurounagi.webp',
    'hadakaiwashi': 'assets/img/hadakaiwashi.webp',
    'hakofugu': 'assets/img/hakofugu.webp',
    'iwashi_school': 'assets/img/iwashi_school.webp',
    'jellyfish': 'assets/img/jellyfish.webp',
    'kinmedai': 'assets/img/kinmedai.webp',
    'manbou': 'assets/img/manbou.webp',
    'mitsukurizame': 'assets/img/mitsukurizame.webp',
    'nautilus': 'assets/img/nautilus.webp',
    'part_battery': 'assets/img/part_battery.webp',
    'part_bumper_circle': 'assets/img/part_bumper_circle.webp',
    'part_bumper_tri': 'assets/img/part_bumper_tri.webp',
    'part_detonator': 'assets/img/part_detonator.webp',
    'part_kicker': 'assets/img/part_kicker.webp',
    'part_rebound_wall': 'assets/img/part_rebound_wall.webp',
    'part_spinner': 'assets/img/part_spinner.webp',
    'part_split': 'assets/img/part_split.webp',
    'part_warp_gate': 'assets/img/part_warp_gate.webp',
    'ryugu_no_tsukai': 'assets/img/ryugu_no_tsukai.webp'
  };
  const ASSET_IMAGES = {};
  function initAssetImages() {
    if (typeof ASSET_PATHS === 'undefined') return;
    Object.keys(ASSET_PATHS).forEach(key => {
      const img = new Image();
      img.src = ASSET_PATHS[key];
      ASSET_IMAGES[key] = img;
    });
  }
  initAssetImages();
  function getAssetImage(key) {
    const img = ASSET_IMAGES[key];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
  }

  // 魚パッシブ効果グループ（5系統・ラン中のみ有効・同系統は重複しない）
  const FISH_GROUPS = {
    luminescent: {
      id: 'luminescent',
      name: '発光',
      icon: '💡',
      shortText: '発光(+10%)',
      effectDesc: '全パーツの基礎スコア +10%'
    },
    school: {
      id: 'school',
      name: '群れ',
      icon: '🐟',
      shortText: '群れ(渦+25%)',
      effectDesc: '海流の渦（スピナー）の加点 +25%'
    },
    guard: {
      id: 'guard',
      name: '守り',
      icon: '🛡️',
      shortText: '守り(ｾｰﾊﾞｰ+1)',
      effectDesc: 'ボールセーバーの発動回数 +1（ラン中）'
    },
    giant: {
      id: 'giant',
      name: '大物',
      icon: '👑',
      shortText: '大物(上限+0.5)',
      effectDesc: 'コンボ倍率の上限が +0.5倍（最大×3.50）'
    },
    agile: {
      id: 'agile',
      name: '俊敏',
      icon: '⚡',
      shortText: '俊敏(反発UP)',
      effectDesc: 'フリッパーの反発が少し強くなる'
    }
  };

  // 全12種の深海魚カタログ（通常5種・レア4種・激レア3種）
  const FISH_CATALOG = [
    // 通常 (100pt)
    {
      id: 'kinmedai',
      name: 'キンメダイ',
      rarity: 'normal',
      rarityLabel: '通常',
      points: 100,
      weight: 22,
      r: 15,
      speed: 52,
      bandY: [155, 240],
      bandHint: '上層〜中上層（水深200m付近）を泳ぐ',
      color: '#ff4d6d',
      subColor: '#ffd166',
      group: 'school',
      shape: 'round_fish',
      desc: '金色に輝く大きな目を持つ深海の赤い宝石。'
    },
    {
      id: 'hakofugu',
      name: 'ハコフグ',
      rarity: 'normal',
      rarityLabel: '通常',
      points: 100,
      weight: 20,
      r: 15,
      speed: 44,
      bandY: [120, 210],
      bandHint: '光が届く上層エリアをのんびり泳ぐ',
      color: '#ffd166',
      subColor: '#fff3b0',
      group: 'guard',
      shape: 'box_fish',
      desc: '硬い甲羅のような皮膚で身を守る四角い働き者。'
    },
    {
      id: 'manbou',
      name: 'マンボウ',
      rarity: 'normal',
      rarityLabel: '通常',
      points: 100,
      weight: 18,
      r: 18,
      speed: 36,
      bandY: [175, 290],
      bandHint: '上層〜中層をゆったりと漂う',
      color: '#90e0ef',
      subColor: '#caf0f8',
      group: 'guard',
      shape: 'sunfish',
      desc: '巨大な体で海流に身を任せる温厚な深海散歩者。'
    },
    {
      id: 'iwashi_school',
      name: 'イワシの群れ',
      rarity: 'normal',
      rarityLabel: '通常',
      points: 100,
      weight: 22,
      r: 16,
      speed: 60,
      bandY: [105, 195],
      bandHint: '最上層〜上層を群れで素早く横切る',
      color: '#48cae4',
      subColor: '#ade8f4',
      group: 'school',
      shape: 'school',
      desc: '一糸乱れぬ動きで一つの巨大な生き物のように泳ぐ群れ。'
    },
    {
      id: 'hadakaiwashi',
      name: 'ハダカイワシ',
      rarity: 'normal',
      rarityLabel: '通常',
      points: 100,
      weight: 20,
      r: 13,
      speed: 64,
      bandY: [220, 340],
      bandHint: '中層の薄暗い水域を群れずに泳ぐ',
      color: '#56cfe1',
      subColor: '#72efdd',
      group: 'luminescent',
      shape: 'slim_fish',
      desc: 'お腹の発光器で星空のように明滅する深海の常連。'
    },
    // レア (300pt)
    {
      id: 'chochin_ankou',
      name: 'チョウチンアンコウ',
      rarity: 'rare',
      rarityLabel: '★レア',
      points: 300,
      weight: 10,
      r: 13,
      speed: 74,
      bandY: [320, 440],
      bandHint: '中層〜深層（水深400m付近）の暗闇を泳ぐ',
      color: '#9d4edd',
      subColor: '#70f5ff',
      group: 'luminescent',
      shape: 'angler',
      desc: '頭上の発光ルアーで獲物を誘い込む深海の狩人。'
    },
    {
      id: 'demenigisu',
      name: 'デメニギス',
      rarity: 'rare',
      rarityLabel: '★レア',
      points: 300,
      weight: 9,
      r: 12,
      speed: 78,
      bandY: [280, 400],
      bandHint: '中層の静かな水域を水平に滑るように泳ぐ',
      color: '#38b000',
      subColor: '#70e000',
      group: 'luminescent',
      shape: 'barreleye',
      desc: '透明なドーム状の頭部の中に緑色の管状眼を持つ神秘の魚。'
    },
    {
      id: 'fukurounagi',
      name: 'フクロウナギ',
      rarity: 'rare',
      rarityLabel: '★レア',
      points: 300,
      weight: 9,
      r: 12,
      speed: 86,
      bandY: [370, 485],
      bandHint: '深層エリアをくねりながら高速で横切る',
      color: '#f72585',
      subColor: '#b5179e',
      group: 'agile',
      shape: 'eel',
      desc: '自分の体よりも大きな獲物を丸呑みする巨大な口を持つ深海ウナギ。'
    },
    {
      id: 'mitsukurizame',
      name: 'ミツクリザメ',
      rarity: 'rare',
      rarityLabel: '★レア',
      points: 300,
      weight: 8,
      r: 13,
      speed: 92,
      bandY: [350, 470],
      bandHint: '深層エリアを鋭く一直線に突っ切る',
      color: '#ff758f',
      subColor: '#ffb3c1',
      group: 'agile',
      shape: 'shark',
      desc: '長く突き出た吻と飛び出す顎を持つ「生きた化石」ゴブリンシャーク。'
    },
    // 激レア (1000pt)
    {
      id: 'ryugu_no_tsukai',
      name: 'リュウグウノツカイ',
      rarity: 'ssr',
      rarityLabel: '★★激レア',
      points: 1000,
      weight: 3.5,
      r: 11,
      speed: 112,
      bandY: [180, 360],
      bandHint: '中上層〜中層を銀色の閃光のように高速通過する',
      color: '#e0fbfc',
      subColor: '#ff2a85',
      group: 'giant',
      shape: 'oarfish',
      desc: '赤い背びれの冠と白銀の長い体を持つ、竜宮城からの神秘の使者。'
    },
    {
      id: 'coelacanth',
      name: 'シーラカンス',
      rarity: 'ssr',
      rarityLabel: '★★激レア',
      points: 1000,
      weight: 3.2,
      r: 11,
      speed: 105,
      bandY: [410, 505],
      bandHint: '深層〜海溝の底近くを力強く泳ぐ',
      color: '#3a86ff',
      subColor: '#a2d2ff',
      group: 'giant',
      shape: 'coelacanth',
      desc: '古生代から姿を変えずに深海を生き抜いてきた伝説の古代魚。'
    },
    {
      id: 'daiouika',
      name: 'ダイオウイカ',
      rarity: 'ssr',
      rarityLabel: '★★激レア',
      points: 1000,
      weight: 3.0,
      r: 11,
      speed: 118,
      bandY: [290, 460],
      bandHint: '中層〜深層をジェット推進で超高速移動する',
      color: '#ff4d4d',
      subColor: '#ffd166',
      group: 'giant',
      shape: 'squid',
      desc: '深海の闇を統べる巨大頭足類。驚異的な推進力で海溝を駆ける。'
    }
  ];

  // カード一覧（v1の10種：効果と数値は一切変更せず、深海の世界観へリスキン）
  const CARD_CATALOG = [
    {
      id: 'bumper_circle',
      name: '真珠貝（丸バンパー）',
      shortName: '真珠貝',
      category: 'part',
      icon: '🦪',
      color: '#ff5c8a',
      weight: 16,
      basePt: 100,
      desc: 'ヒットで 100×Lv 点。開閉する二枚貝が真珠光を放ち全方向に強く跳ね返す。'
    },
    {
      id: 'bumper_tri',
      name: '枝珊瑚（三角バンパー）',
      shortName: '枝珊瑚',
      category: 'part',
      icon: '🪸',
      color: '#ff9e00',
      weight: 14,
      basePt: 150,
      desc: 'ヒットで 150×Lv 点。硬い枝サンゴの稜角がボールを斜めに強く跳ね返す。'
    },
    {
      id: 'kicker',
      name: '熱水噴出孔（キッカー）',
      shortName: '熱水噴出孔',
      category: 'part',
      icon: '🌋',
      color: '#20e3b2',
      weight: 14,
      basePt: 150,
      desc: 'ヒットで 150×Lv 点。海底から噴き上がる熱水ジェットでボールを上層へ強く打ち上げる！'
    },
    {
      id: 'spinner',
      name: '海流の渦（スピナー）',
      shortName: '海流の渦',
      category: 'part',
      icon: '🌀',
      color: '#00e5ff',
      weight: 13,
      basePt: 30,
      desc: '通過で 30×Lv 点を連続加算し、渦巻き水流でボールを少し加速する。'
    },
    {
      id: 'rebound_wall',
      name: '岩礁（リバウンド壁）',
      shortName: '岩礁',
      category: 'part',
      icon: '🪨',
      color: '#ffd97d',
      weight: 12,
      basePt: 50,
      desc: '小型の斜め海底岩礁。ヒットで 50×Lv 点。海流とボールの軌道を変える。'
    },
    {
      id: 'warp_gate',
      name: '渦潮（ワープゲート）',
      shortName: '渦潮',
      category: 'part',
      icon: '🌊',
      color: '#a855f7',
      weight: 11,
      basePt: 300,
      desc: '2スロットを使う連結渦潮。片方に入るともう片方から同じ速度で出現し 300×Lv 点！'
    },
    {
      id: 'detonator',
      name: '起爆ウニ（連鎖起爆）',
      shortName: '起爆ウニ',
      category: 'part',
      icon: '💥',
      color: '#ff4d6d',
      weight: 14,
      basePt: 80,
      desc: 'ヒットで 80×Lv 点＆カウント+1。3回目のヒットで起爆し、周囲（140px以内）の全パーツを強制起動して連鎖させる！'
    },
    {
      id: 'battery',
      name: '蓄電クラゲ（充電放出）',
      shortName: '蓄電クラゲ',
      category: 'part',
      icon: '⚡',
      color: '#00f5d4',
      weight: 14,
      basePt: 25,
      desc: '他のパーツが当たるたびに充電+1（最大10）。ヒットまたは強制起動で全放出し 25×充電数（充電0なら25点）×Lv 点！'
    },
    {
      id: 'split',
      name: '分裂クラゲ（ミニボール生成）',
      shortName: '分裂クラゲ',
      category: 'part',
      icon: '🪼',
      color: '#72efdd',
      weight: 14,
      basePt: 100,
      desc: 'ヒットで 100×Lv 点＆ミニボール2個（12秒持続・最大4個）に分裂！（クールダウン10秒／強制起動でも分裂可）'
    },
    {
      id: 'upgrade_chip',
      name: '深海結晶（強化チップ）',
      shortName: '深海結晶',
      category: 'instant_target',
      icon: '💠',
      color: '#20e3b2',
      weight: 10,
      basePt: 0,
      desc: '既存パーツ1つのレベルを +1 する（配置フェーズで対象を選ぶ・最大Lv3）。'
    },
    {
      id: 'extra_ball',
      name: '追加真珠（追加ボール）',
      shortName: '追加真珠',
      category: 'instant',
      icon: '⚪',
      color: '#ffffff',
      weight: 7,
      basePt: 0,
      desc: 'このランの毎ラウンド残りボール +1（最大で+2回まで取得可）。'
    },
    {
      id: 'score_booster',
      name: '海神の祝福（スコアブースター）',
      shortName: '海神の祝福',
      category: 'instant',
      icon: '🔱',
      color: '#ffd97d',
      weight: 10,
      basePt: 0,
      desc: 'このランの全獲得スコアに +10%（重ね掛け可）。'
    },
    {
      id: 'flipper_up',
      name: '海流フィン強化（フリッパー強化）',
      shortName: '海流フィン強化',
      category: 'instant',
      icon: '🐬',
      color: '#00e5ff',
      weight: 9,
      basePt: 0,
      desc: 'フリッパーが長く・強くなる（最大3回まで）。'
    },
    {
      id: 'ball_heavy',
      name: '重真珠（ボールカード）',
      shortName: '重真珠',
      category: 'ball',
      ballType: 'heavy',
      icon: '⚫',
      color: '#ffd166',
      weight: 7,
      basePt: 0,
      desc: '【ボール変化】半径 9→11 に大型化！当てたときのパーツ・魚のスコア +25%。発射の最大パワーは少し下がる。'
    },
    {
      id: 'ball_bubble',
      name: '泡玉（ボールカード）',
      shortName: '泡玉',
      category: 'ball',
      ballType: 'bubble',
      icon: '🫧',
      color: '#70f5ff',
      weight: 7,
      basePt: 0,
      desc: '【ボール変化】半径 9→8。重力 ×0.9 でふわりと舞い、フリッパーの反発 +10%！'
    },
    {
      id: 'ball_glow',
      name: '発光玉（ボールカード）',
      shortName: '発光玉',
      category: 'ball',
      ballType: 'glow',
      icon: '🌟',
      color: '#38f9d7',
      weight: 7,
      basePt: 0,
      desc: '【ボール変化】強い生物発光で深海魚の取得範囲 +40%、さらに魚の獲得スコア +25%！'
    },
    {
      id: 'ball_split',
      name: '分裂真珠（ボールカード）',
      shortName: '分裂真珠',
      category: 'ball',
      ballType: 'split_pearl',
      icon: '🔮',
      color: '#f472b6',
      weight: 6,
      basePt: 0,
      desc: '【ボール変化】パーツに4回当たるたびに自動でミニボールを1球分裂生成！マルチボール祭り！'
    },
    {
      id: 'ball_magnet',
      name: '磁石真珠（ボールカード）',
      shortName: '磁石真珠',
      category: 'ball',
      ballType: 'magnet_pearl',
      icon: '🧲',
      color: '#ff9e00',
      weight: 6,
      basePt: 0,
      desc: '【ボール変化】近くの深海魚・封印大貝・ジャックポットへカーブして吸い寄せられる！'
    }
  ];

  // ボール種別スペック定義（ラン中のみ保持・同時に有効なのは1種のみ）
  const BALL_SPECS = {
    normal: {
      id: 'normal',
      name: '通常真珠',
      shortBadge: '⚪真珠',
      r: 9,
      gravityMult: 1.0,
      flipperRestBonus: 0,
      launchMaxMult: 1.0,
      partScoreMult: 1.0,
      fishScoreMult: 1.0,
      fishRangeMult: 1.0,
      color: '#e6f6ff',
      glowColor: '#70f5ff',
      trailRgb: '112, 245, 255',
      desc: '標準の真珠ボール（半径9）'
    },
    heavy: {
      id: 'heavy',
      name: '重真珠',
      shortBadge: '⚫重真珠',
      r: 11,
      gravityMult: 1.0,
      flipperRestBonus: 0,
      launchMaxMult: 0.88,
      partScoreMult: 1.25,
      fishScoreMult: 1.25,
      fishRangeMult: 1.0,
      color: '#ffd166',
      glowColor: '#ff9e00',
      trailRgb: '255, 209, 102',
      desc: '半径11 / パーツ・魚スコア+25% / 発射最大パワー微減'
    },
    bubble: {
      id: 'bubble',
      name: '泡玉',
      shortBadge: '🫧泡玉',
      r: 8,
      gravityMult: 0.90,
      flipperRestBonus: 0.10,
      launchMaxMult: 1.0,
      partScoreMult: 1.0,
      fishScoreMult: 1.0,
      fishRangeMult: 1.0,
      color: '#90e0ef',
      glowColor: '#00f5d4',
      trailRgb: '112, 245, 255',
      desc: '半径8 / 重力×0.9 / フリッパー反発+10%'
    },
    glow: {
      id: 'glow',
      name: '発光玉',
      shortBadge: '🌟発光玉',
      r: 9,
      gravityMult: 1.0,
      flipperRestBonus: 0,
      launchMaxMult: 1.0,
      partScoreMult: 1.0,
      fishScoreMult: 1.25,
      fishRangeMult: 1.40,
      color: '#72efdd',
      glowColor: '#38f9d7',
      trailRgb: '56, 249, 215',
      desc: '魚の取得範囲+40% / 魚スコア+25%'
    },
    split_pearl: {
      id: 'split_pearl',
      name: '分裂真珠',
      shortBadge: '🔮分裂真珠',
      r: 9,
      gravityMult: 1.0,
      flipperRestBonus: 0,
      launchMaxMult: 1.0,
      partScoreMult: 1.0,
      fishScoreMult: 1.0,
      fishRangeMult: 1.0,
      color: '#f9a8d4',
      glowColor: '#f472b6',
      trailRgb: '244, 114, 182',
      desc: 'パーツ4ヒットごとにミニボール自動分裂'
    },
    magnet_pearl: {
      id: 'magnet_pearl',
      name: '磁石真珠',
      shortBadge: '🧲磁石真珠',
      r: 9,
      gravityMult: 1.0,
      flipperRestBonus: 0.04,
      launchMaxMult: 1.0,
      partScoreMult: 1.05,
      fishScoreMult: 1.15,
      fishRangeMult: 1.15,
      color: '#fde68a',
      glowColor: '#ff9e00',
      trailRgb: '255, 158, 0',
      desc: '魚・封印大貝・ジャックポットへ磁力吸引'
    }
  };

  // パーツ合成進化（化学反応）：別種パーツを重ねると変異パーツへ進化！
  const MUTATED_PARTS = {
    blast_jelly: {
      id: 'blast_jelly',
      name: '爆裂クラゲ',
      shortName: '爆裂クラゲ',
      icon: '💥',
      color: '#ff4d94',
      subColor: '#72efdd',
      baseImg: 'part_detonator',
      basePt: 220,
      desc: 'ヒットで周囲パーツを起爆しつつミニボールを四方に射出！'
    },
    gravity_pearl: {
      id: 'gravity_pearl',
      name: '重力真珠',
      shortName: '重力真珠',
      icon: '🌀',
      color: '#c084fc',
      subColor: '#70f5ff',
      baseImg: 'part_bumper_circle',
      basePt: 200,
      desc: '近くのボールを重力で引き寄せ、連続ヒット後に高反発で弾く！'
    },
    plasma_vent: {
      id: 'plasma_vent',
      name: '雷流噴出孔',
      shortName: '雷流噴出孔',
      icon: '⚡',
      color: '#fde047',
      subColor: '#20e3b2',
      baseImg: 'part_kicker',
      basePt: 210,
      desc: '高速打ち上げ＋2ヒットごとにランダムな他パーツ2個へ雷撃連鎖！'
    },
    vortex_reef: {
      id: 'vortex_reef',
      name: '竜巻珊瑚',
      shortName: '竜巻珊瑚',
      icon: '🌪️',
      color: '#fb923c',
      subColor: '#00e5ff',
      baseImg: 'part_bumper_tri',
      basePt: 180,
      desc: '高速回転して周囲の深海魚を引き寄せ、ヒットでコンボ+2！'
    },
    mirror_mine: {
      id: 'mirror_mine',
      name: '鏡面機雷',
      shortName: '鏡面機雷',
      icon: '💎',
      color: '#f43f5e',
      subColor: '#ffd97d',
      baseImg: 'part_rebound_wall',
      basePt: 160,
      desc: '鋭い反射で隣接起爆＋6秒間スコア+20%オーラ（最大3重）！'
    },
    electro_prism: {
      id: 'electro_prism',
      name: '放電プリズム',
      shortName: '放電プリズム',
      icon: '✨',
      color: '#38bdf8',
      subColor: '#f472b6',
      baseImg: 'part_battery',
      basePt: 190,
      desc: '他パーツ発動で充電し、解放時にミニボール生成＋周囲感電起動！'
    }
  };

  const FUSION_RECIPES = [
    { a: 'detonator', b: 'split', result: 'blast_jelly' },
    { a: 'bumper_circle', b: 'warp_gate', result: 'gravity_pearl' },
    { a: 'battery', b: 'kicker', result: 'plasma_vent' },
    { a: 'bumper_tri', b: 'spinner', result: 'vortex_reef' },
    { a: 'rebound_wall', b: 'detonator', result: 'mirror_mine' },
    { a: 'battery', b: 'split', result: 'electro_prism' }
  ];

  function findFusionRecipe(typeA, typeB) {
    if (!typeA || !typeB || typeA === typeB) return null;
    for (let i = 0; i < FUSION_RECIPES.length; i++) {
      const r = FUSION_RECIPES[i];
      if ((r.a === typeA && r.b === typeB) || (r.a === typeB && r.b === typeA)) {
        return MUTATED_PARTS[r.result] || null;
      }
    }
    return null;
  }

  function getPartDisplayInfo(type) {
    if (MUTATED_PARTS[type]) return MUTATED_PARTS[type];
    return CARD_CATALOG.find(c => c.id === type) || null;
  }

  // 封印された大貝（Mystery Shell）を割ったときの深海ハプニング5種
  const HAPPENING_DEFS = [
    { id: 'pearl_storm',   name: 'マルチボール暴走!!', badge: '🫧暴走',     color: '#f472b6', duration: 0,    desc: 'ミニボール4球が一気に放出！盤面が大騒ぎ！' },
    { id: 'anti_gravity',  name: '深海重力反転!!',     badge: '🙃重力反転', color: '#c084fc', duration: 8.0,  desc: '8秒間、重力が上向きに反転！上部パーツを連打せよ！' },
    { id: 'all_overdrive', name: '全パーツ一斉起爆!!', badge: '⚡一斉起爆', color: '#fde047', duration: 0,    desc: '盤面の全パーツが連鎖起動！' },
    { id: 'fish_rush',     name: '深海魚大群ラッシュ!!', badge: '🐟大群',   color: '#20e3b2', duration: 0,    desc: '深海魚5匹が一斉に出現！大量回収のチャンス！' },
    { id: 'giant_pearl',   name: '巨大真珠タイム!!',   badge: '🧲巨大化',   color: '#ffd97d', duration: 10.0, desc: '10秒間、ボールが1.65倍に巨大化＆スコア×1.5！' }
  ];

  // ラウンドモディファイア定義（R1〜R8固定順、そのラウンド限り有効）
  const ROUND_MODIFIERS = {
    1: { id: 'none',         name: '通常海域',   badge: '',             desc: '特殊ルールなし（通常）', color: '#70f5ff' },
    2: { id: 'current',      name: '海流',       badge: '🌊海流',       desc: '約6秒ごとに1.5秒間、横向きの海流がボールを押す（矢印で方向予告）', color: '#00e5ff' },
    3: { id: 'fish_school',  name: '魚群',       badge: '🐟魚群',       desc: '魚の出現間隔が半分になり、同時出現の上限が4匹になる', color: '#20e3b2' },
    4: { id: 'high_tide',    name: '満潮',       badge: '🌕満潮',       desc: 'このラウンド中、全パーツのスコアが ×1.25', color: '#ffd97d' },
    5: { id: 'low_gravity',  name: '低重力',     badge: '🫧低重力',     desc: '重力が ×0.85（ボールがふわりと落ちる）', color: '#72efdd' },
    6: { id: 'combo_keep',   name: 'コンボ持続', badge: '🔗コンボ持続', desc: 'ドレイン（落下）してもラウンド中はコンボがリセットされない', color: '#a855f7' },
    7: { id: 'big_catch',    name: '大漁',       badge: '🎣大漁',       desc: 'このラウンド中、魚の取得スコアが ×2', color: '#ff9e00' },
    8: { id: 'boss_current', name: '深海の主＋海流', badge: '👑ボス＋🌊海流', desc: '深海の主が出現 ＆ 約6秒ごとに横向きの海流が発生！', color: '#ff5c8a' }
  };

  function getRoundModifier(roundNum) {
    if (ROUND_MODIFIERS[roundNum]) return ROUND_MODIFIERS[roundNum];
    const cycleIdx = ((roundNum - 2) % 7) + 2;
    return ROUND_MODIFIERS[cycleIdx] || ROUND_MODIFIERS[1];
  }

  // デッキ構築シナジー定義（効果・数値はそのまま、名称を深海テーマに）
  const SYNERGY_DEFINITIONS = [
    {
      id: 'bumper_kingdom',
      name: '珊瑚礁の楽園',
      condText: '真珠貝＋枝珊瑚 合計3個以上',
      effectText: '全バンパー（真珠貝・枝珊瑚）の基礎スコア +35% ＆ 水圧リング演出',
      check: (slots) => slots.filter(s => s && (s.type === 'bumper_circle' || s.type === 'bumper_tri')).length >= 3
    },
    {
      id: 'perpetual_engine',
      name: '湧昇流サイクル',
      condText: '熱水噴出孔1個以上 ＋ 海流の渦1個以上',
      effectText: '熱水噴出孔と海流の渦の基礎スコア +40% ＆ 加速ブースト強化',
      check: (slots) => slots.some(s => s && s.type === 'kicker') && slots.some(s => s && s.type === 'spinner')
    },
    {
      id: 'dimensional_accel',
      name: '深海大循環',
      condText: '渦潮設置済 ＋ 海流の渦または岩礁',
      effectText: '渦潮通過時にコンボ +3 ＆ 3秒間全スコア1.25倍オーラ',
      check: (slots) => slots.some(s => s && s.type === 'warp_gate') && slots.some(s => s && (s.type === 'spinner' || s.type === 'rebound_wall'))
    },
    {
      id: 'labyrinth_reflect',
      name: '海底の迷宮礁',
      condText: '岩礁 ＋ 枝珊瑚 合計3個以上',
      effectText: '岩礁と枝珊瑚のヒット時にコンボが +2 ずつ上昇',
      check: (slots) => slots.filter(s => s && (s.type === 'rebound_wall' || s.type === 'bumper_tri')).length >= 3
    },
    {
      id: 'master_craft',
      name: '深淵の熟成',
      condText: 'Lv2以上のパーツが盤面に2個以上',
      effectText: 'Lv2以上のパーツすべての獲得スコア +25%',
      check: (slots) => slots.filter(s => s && s.level >= 2).length >= 2
    },
    {
      id: 'full_spark',
      name: '豊かなる生態系',
      condText: '盤面に異なる4種類以上のパーツを設置',
      effectText: '全獲得スコアに +20% 乗算ボーナス',
      check: (slots) => new Set(slots.filter(Boolean).map(s => s.type)).size >= 4
    }
  ];

  // =========================================================================
  // 2. Web Audio シンセサイザー効果音 ＆ 深海アンビエントBGM
  // =========================================================================
  class SoundSynth {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.bgmEnabled = true;
      this.bgmStep = 0;
      this.bgmTimer = null;
    }
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.startBgmLoop();
    }
    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    }
    toggleBgm() {
      this.bgmEnabled = !this.bgmEnabled;
      return this.bgmEnabled;
    }
    startBgmLoop() {
      if (this.bgmTimer) return;
      // 深海の神秘的な水琴・マリンバ風アルペジオ
      const patternNormal = [196.00, 246.94, 293.66, 369.99, 392.00, 369.99, 293.66, 246.94];
      const patternFever  = [261.63, 329.63, 392.00, 493.88, 523.25, 493.88, 392.00, 329.63];
      const patternBoss   = [130.81, 146.83, 155.56, 196.00, 185.00, 155.56, 146.83, 123.47];

      this.bgmTimer = setInterval(() => {
        if (this.muted || !this.bgmEnabled || !this.ctx) return;
        if (typeof state === 'undefined' || state.phase !== 'PLAY') return;

        const isBoss = state.round >= 8;
        const pat = isBoss ? patternBoss : (state.feverTimer > 0 ? patternFever : patternNormal);
        const freq = pat[this.bgmStep % pat.length];
        this.bgmStep++;

        this.playTone(freq, 'sine', 0.22, 0.036, freq * 1.003);
        if (this.bgmStep % 4 === 1) {
          this.playTone(freq * 0.5, 'triangle', 0.32, 0.032, freq * 0.5);
        }
      }, 190);
    }
    playTone(freq, type, duration, vol = 0.14, slideFreq = null) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), now);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideFreq), now + duration);
      }
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    }
    bumper(combo = 1) {
      const base = 300 + Math.min(combo, 35) * 16;
      this.playTone(base, 'sine', 0.12, 0.19, base * 1.45);
    }
    kicker() {
      this.playTone(180, 'triangle', 0.19, 0.18, 690);
    }
    spinner() {
      this.playTone(680 + Math.random() * 200, 'sine', 0.06, 0.09, 960);
    }
    fishCatch(rarity) {
      if (rarity === 'ssr') {
        const notes = [587.33, 783.99, 987.77, 1174.66, 1567.98];
        notes.forEach((n, i) => setTimeout(() => this.playTone(n, 'triangle', 0.18, 0.19), i * 45));
      } else if (rarity === 'rare') {
        const notes = [523.25, 659.25, 987.77];
        notes.forEach((n, i) => setTimeout(() => this.playTone(n, 'triangle', 0.14, 0.17), i * 45));
      } else {
        this.playTone(480, 'sine', 0.12, 0.16, 860);
      }
    }
    wall() {
      this.playTone(155, 'sine', 0.05, 0.07, 105);
    }
    targetLit() {
      this.playTone(587.33, 'sine', 0.12, 0.15, 880);
    }
    skillShot() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => setTimeout(() => this.playTone(n, 'triangle', 0.15, 0.18), i * 55));
    }
    jackpot() {
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((n, i) => setTimeout(() => this.playTone(n, 'triangle', 0.17, 0.17), i * 55));
    }
    ballSave() {
      this.playTone(280, 'sine', 0.2, 0.18, 720);
      setTimeout(() => this.playTone(720, 'triangle', 0.2, 0.16, 960), 90);
    }
    nudge() {
      this.playTone(105, 'sawtooth', 0.12, 0.2, 52);
    }
    tilt() {
      this.playTone(140, 'sawtooth', 0.4, 0.22, 60);
    }
    warp() {
      this.playTone(300, 'sine', 0.24, 0.19, 1080);
      setTimeout(() => this.playTone(600, 'triangle', 0.16, 0.14, 1360), 55);
    }
    flipper() {
      this.playTone(145, 'triangle', 0.07, 0.15, 290);
    }
    launch(power) {
      this.playTone(140, 'triangle', 0.24, 0.19, 300 + power * 460);
    }
    place() {
      this.playTone(440, 'sine', 0.11, 0.16, 660);
      setTimeout(() => this.playTone(660, 'triangle', 0.13, 0.16, 880), 65);
    }
    ballLost() {
      this.playTone(230, 'sawtooth', 0.36, 0.17, 65);
    }
    roundClear() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => setTimeout(() => this.playTone(n, 'triangle', 0.2, 0.18), i * 80));
    }
    gameOver() {
      const notes = [349.23, 329.63, 293.66, 220];
      notes.forEach((n, i) => setTimeout(() => this.playTone(n, 'sawtooth', 0.25, 0.16), i * 125));
    }
    gameClear() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      notes.forEach((n, i) => setTimeout(() => this.playTone(n, 'triangle', 0.24, 0.2), i * 90));
    }
  }

  const sfx = new SoundSynth();

  // =========================================================================
  // 3. 1画面固定の深海盤面ジオメトリ (VIEW_W=420, VIEW_H=660)
  // =========================================================================
  function buildBoardWalls() {
    const walls = [];
    const addSeg = (x1, y1, x2, y2, rest = 0.74, color = '#1e6091', oneWayLeft = false, isSlingshot = false) => {
      walls.push({ x1, y1, x2, y2, rest, color, oneWayLeft, isSlingshot, pulse: 0 });
    };

    // 上部アーチ
    const archPts = [
      [408, 120],
      [404, 72],
      [386, 36],
      [345, 16],
      [210, 12],
      [75,  16],
      [34,  36],
      [14,  72],
      [12,  120]
    ];
    for (let i = 0; i < archPts.length - 1; i++) {
      addSeg(archPts[i][0], archPts[i][1], archPts[i + 1][0], archPts[i + 1][1], 0.78, '#00b4d8');
    }

    // 左外壁（溝つぶし：スリングショット上端との間に挟まらないよう斜めガイドで滑らかに接続）
    addSeg(12, 120, 12, 438, 0.74, '#1e6091');
    addSeg(12, 438, 20, 488, 0.76, '#1e6091');
    addSeg(20, 488, 34, 535, 0.74, '#1e6091');

    // 右外壁（プランジャーレーン外側）
    addSeg(408, 120, 408, 632, 0.72, '#1e6091');
    addSeg(LANE_X, 632, 408, 632, 0.4, '#ff5c8a');

    // 発射レーン内壁
    addSeg(LANE_X, 115, LANE_X, 632, 0.74, '#1e6091');

    // 発射レーン最上部の逆流防止ワンウェイゲート
    addSeg(LANE_X, 34, LANE_X, 115, 0.76, '#00e5ff', true);

    // フィールド右側の下部ガイド壁（溝つぶし：スリングショット上端付近のポケットをなくし滑らかに接続）
    addSeg(LANE_X, 438, 366, 488, 0.76, '#1e6091');
    addSeg(366, 488, 352, 535, 0.74, '#1e6091');

    // 左スリングショット（溝つぶし：上端を斜めキャップ化し、ボール直径18pxが挟まる死角を解消）
    addSeg(44, 474, 54, 456, 0.85, '#1e6091');
    addSeg(44, 474, 48, 518, 0.78, '#1e6091');
    addSeg(48, 518, 88, 546, 0.75, '#1e6091');
    addSeg(54, 456, 88, 546, 1.22, '#ff5c8a', false, true);

    // 右スリングショット（溝つぶし：上端を斜めキャップ化し、ボール直径18pxが挟まる死角を解消）
    addSeg(342, 474, 332, 456, 0.85, '#1e6091');
    addSeg(342, 474, 338, 518, 0.78, '#1e6091');
    addSeg(338, 518, 298, 546, 0.75, '#1e6091');
    addSeg(332, 456, 298, 546, 1.22, '#ff5c8a', false, true);

    // フリッパー（y=588）へと続くインレーン斜壁（上端の角を滑らかに接続）
    addSeg(34, 535, 108, 588, 0.68, '#00b4d8');
    addSeg(352, 535, 278, 588, 0.68, '#00b4d8');

    // 最上部3レーンディバイダー
    addSeg(148, 42, 148, 78, 0.8, '#20e3b2');
    addSeg(226, 42, 226, 78, 0.8, '#20e3b2');

    return walls;
  }

  // =========================================================================
  // 4. ゲーム状態・深海魚図鑑・環境パーティクル管理
  // =========================================================================
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  let hiScore = parseInt(localStorage.getItem(STORAGE_KEY_HISCORE) || '0', 10) || 0;
  let hasClearedEver = localStorage.getItem(STORAGE_KEY_CLEARED) === '1';

  // 永続図鑑データの読み込み
  let unlockedFishMap = {};
  try {
    const rawZukan = localStorage.getItem(STORAGE_KEY_FISH_ZUKAN);
    if (rawZukan) unlockedFishMap = JSON.parse(rawZukan) || {};
  } catch (e) {
    unlockedFishMap = {};
  }

  function saveFishToZukan(fishId) {
    const isFirstTime = !unlockedFishMap[fishId];
    unlockedFishMap[fishId] = (unlockedFishMap[fishId] || 0) + 1;
    try {
      localStorage.setItem(STORAGE_KEY_FISH_ZUKAN, JSON.stringify(unlockedFishMap));
    } catch (e) {}
    return isFirstTime;
  }

  function getUnlockedFishCount() {
    return FISH_CATALOG.filter(f => unlockedFishMap[f.id] > 0).length;
  }

  let unlockedFusionsMap = {};
  try {
    const rawFusions = localStorage.getItem(STORAGE_KEY_FUSION_ZUKAN);
    if (rawFusions) unlockedFusionsMap = JSON.parse(rawFusions) || {};
  } catch (e) {
    unlockedFusionsMap = {};
  }
  function saveFusionDiscovery(mutatedId) {
    const isFirstTime = !unlockedFusionsMap[mutatedId];
    unlockedFusionsMap[mutatedId] = (unlockedFusionsMap[mutatedId] || 0) + 1;
    try {
      localStorage.setItem(STORAGE_KEY_FUSION_ZUKAN, JSON.stringify(unlockedFusionsMap));
    } catch (e) {}
    return isFirstTime;
  }

  const walls = buildBoardWalls();

  // マリンスノー（常時ゆっくり漂う白い粒子 85個に増量）と上昇する泡
  const marineSnow = Array.from({ length: 85 }, () => ({
    x: 16 + Math.random() * (LANE_X - 24),
    y: Math.random() * WORLD_H,
    r: 0.8 + Math.random() * 1.7,
    vy: 8 + Math.random() * 16,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.18 + Math.random() * 0.42
  }));
  const seaBubbles = [];

  // 海底からゆらゆら揺れる海藻（7本）
  const SEAWEEDS = [
    { x: 38,  baseY: 642, h: 92,  seg: 7, phase: 0.3, color: 'rgba(18, 120, 105, 0.38)', stroke: 'rgba(32, 227, 178, 0.32)', w: 7 },
    { x: 64,  baseY: 648, h: 74,  seg: 6, phase: 1.4, color: 'rgba(15, 95, 110, 0.34)',  stroke: 'rgba(112, 245, 255, 0.25)', w: 6 },
    { x: 118, baseY: 655, h: 64,  seg: 6, phase: 2.6, color: 'rgba(20, 130, 100, 0.3)',  stroke: 'rgba(32, 227, 178, 0.24)', w: 5.5 },
    { x: 164, baseY: 656, h: 56,  seg: 5, phase: 3.8, color: 'rgba(16, 105, 95, 0.26)',  stroke: 'rgba(32, 227, 178, 0.2)',  w: 5 },
    { x: 224, baseY: 656, h: 60,  seg: 5, phase: 0.9, color: 'rgba(16, 105, 95, 0.26)',  stroke: 'rgba(32, 227, 178, 0.2)',  w: 5 },
    { x: 314, baseY: 648, h: 78,  seg: 6, phase: 2.1, color: 'rgba(15, 95, 110, 0.34)',  stroke: 'rgba(112, 245, 255, 0.25)', w: 6 },
    { x: 344, baseY: 642, h: 96,  seg: 7, phase: 4.5, color: 'rgba(18, 120, 105, 0.38)', stroke: 'rgba(32, 227, 178, 0.32)', w: 7 }
  ];

  const state = {
    phase: 'TITLE',
    prevPhaseBeforePause: 'PLAY',
    prevPhaseBeforeZukan: 'TITLE',
    round: 1,
    endlessMode: false,
    roundScore: 0,
    totalScore: 0,
    norma: NORMAS[0],
    maxBallsPerRound: 3,
    extraBallPurchases: 0,
    ballsLeft: 3,
    combo: 0,
    maxComboThisRun: 0,
    scoreBoosterCount: 0,
    flipperLevel: 0,
    rerollsLeft: 1,

    // 10か所のスロット
    slots: new Array(10).fill(null),
    activeSynergies: [],

    // 泳ぐ深海魚とラン中パッシブ効果（5系統）
    activeFishes: [], // 最大3匹
    fishSpawnTimer: 1.2,
    caughtFishThisRun: [], // このランで回収した魚ID履歴
    activeFishGroups: new Set(), // 'luminescent' | 'school' | 'guard' | 'giant' | 'agile'
    guardExtraSavesLeft: 0, // 守りグループによる追加ボールセーバー残り回数

    // 配置フェーズ用
    pendingCard: null,
    warpFirstSlot: null,
    hoverSlotId: -1,

    // ギミック状態
    skillShotTimer: 0,
    skillShotSlotId: 0,
    ballSaverTimer: 0,
    centerPostTimer: 0,
    warpAuraTimer: 0,
    feverTimer: 0,
    leftKickbackReady: true,
    rightKickbackReady: true,
    nudgeHeat: 0,
    tiltPenalty: false,
    stuckTimer: 0,
    ballPosHistory: [],
    posSampleTimer: 0,

    // 連鎖カウンター＆ミニボール状態
    chainCount: 0,
    chainTimer: 0,
    chainLinks: [],
    miniBalls: [],

    // ボール種別（ラン中のみ有効・同時に1種のみ）＆ラウンドモディファイア・海流状態
    ballType: 'normal', // 'normal' | 'heavy' | 'bubble' | 'glow'
    roundModifier: ROUND_MODIFIERS[1],
    currentState: {
      enabled: false,
      timer: 4.5, // 6秒サイクル（うち残り2秒から矢印予告→1.5秒間発生）
      activeDuration: 0,
      dir: 1 // 1: 右向き(→), -1: 左向き(←)
    },

    // 移動ジャックポット（黄金オウムガイ） ＆ R8ボス（深海の主: 187, 315）
    jackpotDrone: {
      active: false,
      x: 187,
      y: 98,
      vx: 76,
      r: 14
    },
    bossCore: {
      active: false,
      x: 187,
      y: 315,
      baseY: 315,
      vx: 46,
      r: 22,
      hpHits: 0,
      pulse: 1,
      cooldown: 0,
      swimPhase: 0
    },

    // ボール状態（光る真珠: 初期位置 y=610）
    ball: {
      x: 391,
      y: 610,
      vx: 0,
      vy: 0,
      inLane: true,
      waitingLaunch: true,
      warpCooldown: 0,
      trail: []
    },

    // プランジャー
    plunger: {
      charging: false,
      power: 0
    },

    // 左右フリッパー（y=588）
    leftFlipper: {
      pivotX: 108,
      pivotY: 588,
      restAngle: 0.45,
      activeAngle: -0.52,
      angle: 0.45,
      angVel: 0,
      pressed: false
    },
    rightFlipper: {
      pivotX: 278,
      pivotY: 588,
      restAngle: Math.PI - 0.45,
      activeAngle: Math.PI + 0.52,
      angle: Math.PI - 0.45,
      angVel: 0,
      pressed: false
    },

    // 演出エフェクト
    runToken: 0,
    popups: [],
    particles: [],
    shockwaves: [],
    hitStopTimer: 0,
    bannerText: null,
    shakeTimer: 0,
    shakeIntensity: 0,

    // 封印された大貝（Mystery Shell）＆深海ハプニング
    mysteryShell: {
      active: false,
      x: 187,
      y: 138,
      r: 20,
      hp: 3,
      maxHp: 3,
      pulse: 1,
      cooldown: 0,
      respawnTimer: 0,
      spawnsThisRound: 0
    },
    activeHappening: null, // { id, name, badge, color, timer, maxTimer }
    lastHappeningId: null,

    // 変異パーツ・特殊ボール・オーバーキル用状態
    mirrorAuraTimer: 0,
    mirrorAuraStacks: 0,
    splitPearlHits: 0,
    overkillActive: false,
    overkillTimer: 0,
    overkillRerollGranted: false,
    bonusRerollsNextDraft: 0
  };

  function hasFishBuff(groupId) {
    return state.activeFishGroups.has(groupId);
  }

  function getBallSpec() {
    return BALL_SPECS[state.ballType] || BALL_SPECS.normal;
  }
  function getBallRadius() {
    let r = getBallSpec().r;
    if (state.activeHappening && state.activeHappening.id === 'giant_pearl' && state.activeHappening.timer > 0) {
      r = Math.round(r * 1.65);
    }
    return r;
  }
  function hasRoundMod(modId) {
    if (!state.roundModifier) return false;
    if (modId === 'current') {
      return state.roundModifier.id === 'current' || state.roundModifier.id === 'boss_current';
    }
    return state.roundModifier.id === modId;
  }
  function getEffectiveGravity() {
    let g = GRAVITY * getBallSpec().gravityMult;
    if (hasRoundMod('low_gravity')) g *= 0.85;
    if (state.activeHappening && state.activeHappening.id === 'anti_gravity' && state.activeHappening.timer > 0) {
      return -Math.abs(g) * 0.55;
    }
    return g;
  }
  function getMaxActiveFishes() {
    return hasRoundMod('fish_school') ? 4 : 3;
  }

  function getFlipperLength() {
    return 66 + state.flipperLevel * 7;
  }
  function getFlipperSpeed() {
    return 18 + state.flipperLevel * 2.2 + (hasFishBuff('agile') ? 1.8 : 0);
  }
  function getComboMultiplier() {
    // 通常は最大×3.00（50コンボ）、大物グループ発動時は上限+0.5倍（最大×3.50 / 62.5コンボ相当）
    const maxBonus = hasFishBuff('giant') ? 2.5 : 2.0;
    return 1 + Math.min(state.combo * 0.04, maxBonus);
  }
  function getBoosterMultiplier() {
    let mult = 1 + state.scoreBoosterCount * 0.10;
    if (hasSynergy('full_spark')) mult *= 1.20;
    if (state.warpAuraTimer > 0) mult *= 1.25;
    if (state.feverTimer > 0) mult *= 1.25;
    if (state.mirrorAuraTimer > 0 && state.mirrorAuraStacks > 0) mult *= (1 + state.mirrorAuraStacks * 0.20);
    if (state.activeHappening && state.activeHappening.id === 'giant_pearl' && state.activeHappening.timer > 0) mult *= 1.50;
    if (state.overkillActive) mult *= 1.50;
    return mult;
  }

  function hasSynergy(synId) {
    return state.activeSynergies.some(s => s.id === synId);
  }

  function refreshSynergies() {
    const prevIds = new Set(state.activeSynergies.map(s => s.id));
    state.activeSynergies = SYNERGY_DEFINITIONS.filter(def => def.check(state.slots));
    state.activeSynergies.forEach(s => {
      if (!prevIds.has(s.id) && state.phase !== 'TITLE') {
        spawnPopup(VIEW_W / 2, 220, `✨海流シナジー【${s.name}】!`, '#ffd97d', 15);
      }
    });
  }

  function getNormaForRound(r) {
    if (r <= NORMAS.length) return NORMAS[r - 1];
    return Math.round(75000 * Math.pow(1.42, r - 8));
  }

  // =========================================================================
  // 5. 深海魚スポーン・移動・回収処理
  // =========================================================================
  function pickRandomFishSpec() {
    const totalW = FISH_CATALOG.reduce((acc, f) => acc + f.weight, 0);
    let r = Math.random() * totalW;
    for (let i = 0; i < FISH_CATALOG.length; i++) {
      r -= FISH_CATALOG[i].weight;
      if (r <= 0) return FISH_CATALOG[i];
    }
    return FISH_CATALOG[0];
  }

  function spawnOneFish() {
    if (state.activeFishes.length >= getMaxActiveFishes()) return;
    const spec = pickRandomFishSpec();
    const fromLeft = Math.random() < 0.5;
    const dir = fromLeft ? 1 : -1;
    const yMin = spec.bandY[0];
    const yMax = spec.bandY[1];
    const baseY = yMin + Math.random() * (yMax - yMin);

    state.activeFishes.push({
      spec,
      x: fromLeft ? 20 : (LANE_X - 18),
      y: baseY,
      baseY,
      dir,
      vx: dir * spec.speed * (0.9 + Math.random() * 0.2),
      swimPhase: Math.random() * Math.PI * 2,
      ampY: 5 + Math.random() * 6
    });
  }

  function updateFishes(dt) {
    // 補充スポーンタイマー（通常は最大3匹、R3「魚群」時は出現間隔半分＆最大4匹）
    const maxFishes = getMaxActiveFishes();
    if (state.activeFishes.length < maxFishes) {
      state.fishSpawnTimer -= dt;
      if (state.fishSpawnTimer <= 0) {
        spawnOneFish();
        const intervalMult = hasRoundMod('fish_school') ? 0.5 : 1.0;
        state.fishSpawnTimer = (2.4 + Math.random() * 1.6) * intervalMult;
      }
    }

    for (let i = state.activeFishes.length - 1; i >= 0; i--) {
      const f = state.activeFishes[i];
      f.x += f.vx * dt;
      f.swimPhase += dt * (3.5 + f.spec.speed * 0.04);
      f.y = f.baseY + Math.sin(f.swimPhase) * f.ampY;

      // 盤面の反対側の壁まで泳ぎ切ったら消えて次が補充される
      if ((f.dir > 0 && f.x > LANE_X - 14) || (f.dir < 0 && f.x < 16)) {
        state.activeFishes.splice(i, 1);
      }
    }
  }

  function collideFishes() {
    const b = state.ball;
    const bSpec = getBallSpec();
    const ballR = bSpec.r;
    const rangeMult = bSpec.fishRangeMult || 1.0;

    for (let i = state.activeFishes.length - 1; i >= 0; i--) {
      const f = state.activeFishes[i];
      const dx = b.x - f.x;
      const dy = b.y - f.y;
      const dist = Math.hypot(dx, dy);
      const minDist = (f.spec.r + ballR) * rangeMult;

      if (dist < minDist && dist > 0.0001) {
        // 1. 実体のある的としてボールを跳ね返す
        const nx = dx / dist;
        const ny = dy / dist;
        const physDist = f.spec.r + ballR;
        if (dist < physDist) {
          b.x = f.x + nx * physDist;
          b.y = f.y + ny * physDist;
        }
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= 1.85 * dot * nx;
          b.vy -= 1.85 * dot * ny;
        }
        b.vx += nx * 135;
        b.vy += ny * 135;

        // 2. 魚を回収（発光バースト＋図鑑登録＋パッシブ発動＋スコア加算）
        onCatchFish(f, i);
        break;
      }
    }
  }

  function onCatchFish(fishObj, indexInActive) {
    const spec = fishObj.spec;
    state.activeFishes.splice(indexInActive, 1);

    const isNewZukan = saveFishToZukan(spec.id);
    state.caughtFishThisRun.push(spec.id);

    // パッシブグループ効果の有効化（未発動グループなら新規発動！）
    let newlyActivatedGroup = null;
    if (!state.activeFishGroups.has(spec.group)) {
      state.activeFishGroups.add(spec.group);
      newlyActivatedGroup = FISH_GROUPS[spec.group];
      if (spec.group === 'guard') {
        state.guardExtraSavesLeft++;
      }
    }

    sfx.fishCatch(spec.rarity);
    if (spec.rarity === 'ssr') {
      state.hitStopTimer = 0.055;
      triggerShake(0.18, 4.5);
    } else if (spec.rarity === 'rare') {
      triggerShake(0.11, 3);
    }

    // 発光バースト演出
    spawnParticles(fishObj.x, fishObj.y, spec.color, spec.rarity === 'ssr' ? 28 : 16, 180);
    spawnParticles(fishObj.x, fishObj.y, spec.subColor, 10, 140);
    spawnShockwave(fishObj.x, fishObj.y, spec.color, spec.rarity === 'ssr' ? 78 : 50);

    // ボール特性（重真珠・発光玉: 魚スコア+25%）および R7「大漁」（魚スコア×2）の反映
    let fishPoints = spec.points * (getBallSpec().fishScoreMult || 1.0);
    if (hasRoundMod('big_catch')) {
      fishPoints *= 2.0;
    }

    const tag = isNewZukan ? `🐟NEW! ${spec.name}` : (hasRoundMod('big_catch') ? `🎣大漁! ${spec.name}` : `🐟${spec.name}`);
    addScore(fishPoints, fishObj.x, fishObj.y, spec.color, spec.rarity === 'ssr' ? 3 : (spec.rarity === 'rare' ? 2 : 1), -1, tag);

    if (newlyActivatedGroup) {
      spawnPopup(
        fishObj.x,
        fishObj.y - 18,
        `${newlyActivatedGroup.icon}【${newlyActivatedGroup.name}】発動: ${newlyActivatedGroup.effectDesc}`,
        '#ffd97d',
        12.5
      );
    }
    updateHUD();
    updateTitleRecords();
  }

  // =========================================================================
  // 6. 初期化・ラウンド進行・スコア加算
  // =========================================================================
  function initNewRun(startEndless = false) {
    state.round = startEndless ? 9 : 1;
    state.endlessMode = startEndless;
    state.roundScore = 0;
    state.totalScore = 0;
    state.norma = getNormaForRound(state.round);
    state.maxBallsPerRound = 3;
    state.extraBallPurchases = 0;
    state.ballsLeft = 3;
    state.combo = 0;
    state.maxComboThisRun = 0;
    state.scoreBoosterCount = 0;
    state.flipperLevel = 0;
    state.slots = new Array(10).fill(null);
    state.popups = [];
    state.particles = [];
    state.shockwaves = [];

    // ラン中魚コレクション・パッシブ・ボール種別のリセット
    state.activeFishes = [];
    state.caughtFishThisRun = [];
    state.activeFishGroups = new Set();
    state.guardExtraSavesLeft = 0;
    state.fishSpawnTimer = 0.8;
    state.chainCount = 0;
    state.chainTimer = 0;
    state.chainLinks = [];
    state.miniBalls = [];
    state.ballType = 'normal';

    // 初期盤面（4個配置）：真珠貝（丸バンパー）×2 ＋ 海流の渦（スピナー） ＋ 枝珊瑚（三角バンパー）
    // 盤面中央が空っぽに見えないよう、中上・中央(#3: index 2)と深層・中央(#6: index 5)に配置
    placePartInSlot(0, 'bumper_circle', 1);
    placePartInSlot(1, 'bumper_circle', 1);
    placePartInSlot(2, 'spinner', 1);
    placePartInSlot(5, 'bumper_tri', 1);

    if (startEndless) {
      placePartInSlot(2, 'spinner', 2);
      placePartInSlot(5, 'bumper_tri', 2);
      placePartInSlot(6, 'kicker', 2);
      placePartInSlot(7, 'detonator', 2);
      state.flipperLevel = 2;
      state.scoreBoosterCount = 3;
    }

    refreshSynergies();
    startRound(state.round);
  }

  function placePartInSlot(slotId, type, level = 1, pairSlotId = null) {
    state.slots[slotId] = {
      type,
      level,
      pairSlotId,
      pulse: 1.0,
      angle: 0,
      spinVel: 0,
      cooldown: 0,
      detCount: 0,
      charge: 0,
      splitCooldown: 0,
      totalEarned: 0,
      hits: 0,
      dir: (slotId % 2 === 0) ? 1 : -1
    };
    refreshSynergies();
  }

  function spawnMysteryShell() {
    // 盤面上部〜中層の空きスペース（パーツやボスと重なりにくい候補座標）から選択
    const candidates = [
      { x: 187, y: 136 },
      { x: 187, y: 290 },
      { x: 112, y: 215 },
      { x: 262, y: 215 },
      { x: 187, y: 445 }
    ];
    let best = candidates[0];
    let bestMinDist = -1;
    for (let c = 0; c < candidates.length; c++) {
      const pt = candidates[c];
      if (state.bossCore.active && Math.hypot(pt.x - state.bossCore.x, pt.y - state.bossCore.y) < 55) continue;
      let minD = 999;
      for (let i = 0; i < state.slots.length; i++) {
        if (!state.slots[i]) continue;
        const d = Math.hypot(pt.x - SLOT_POSITIONS[i].x, pt.y - SLOT_POSITIONS[i].y);
        if (d < minD) minD = d;
      }
      if (minD > bestMinDist) {
        bestMinDist = minD;
        best = pt;
      }
    }
    const ms = state.mysteryShell;
    ms.active = true;
    ms.x = best.x;
    ms.y = best.y;
    ms.hp = 3;
    ms.maxHp = 3;
    ms.pulse = 1.35;
    ms.cooldown = 0;
    ms.respawnTimer = 0;
    ms.spawnsThisRound++;
    spawnShockwave(ms.x, ms.y, '#c084fc', 55);
  }

  function startRound(roundNum) {
    state.runToken++;
    state.round = roundNum;
    state.roundScore = 0;
    state.norma = getNormaForRound(roundNum);
    state.ballsLeft = state.maxBallsPerRound;
    state.combo = 0;
    state.rerollsLeft = 1 + (state.bonusRerollsNextDraft || 0);
    state.bonusRerollsNextDraft = 0;
    state.hoverSlotId = -1;
    state.phase = 'PLAY';

    // ラウンド固有モディファイアの設定（R1〜R8固定順）
    const mod = getRoundModifier(roundNum);
    state.roundModifier = mod;
    state.currentState.enabled = (mod.id === 'current' || mod.id === 'boss_current');
    state.currentState.timer = 4.5;
    state.currentState.activeDuration = 0;
    state.currentState.dir = Math.random() < 0.5 ? 1 : -1;

    TOP_ROLLOVERS.forEach(r => { r.lit = false; });
    WALL_TARGETS.forEach(t => { t.lit = false; });
    state.jackpotDrone.active = false;
    state.centerPostTimer = 0;
    state.feverTimer = 0;
    state.chainCount = 0;
    state.chainTimer = 0;
    state.chainLinks = [];
    state.miniBalls = [];

    // 新ギミック・オーバーキル・オーラのリセット
    state.activeHappening = null;
    state.mirrorAuraTimer = 0;
    state.mirrorAuraStacks = 0;
    state.splitPearlHits = 0;
    state.overkillActive = false;
    state.overkillTimer = 0;
    state.overkillRerollGranted = false;
    state.mysteryShell.spawnsThisRound = 0;
    state.mysteryShell.respawnTimer = 0;
    const okBar = document.getElementById('overkill-bar');
    if (okBar) okBar.classList.remove('show');

    // ラウンド開始時に魚を泳がせておく（R3「魚群」なら3匹、通常は2匹）
    const initFishes = hasRoundMod('fish_school') ? 3 : 2;
    while (state.activeFishes.length < initFishes) {
      spawnOneFish();
    }

    // R8以降：深海の主（ボス）出現
    state.bossCore.active = (roundNum >= 8);
    state.bossCore.x = 187;
    state.bossCore.y = 315;
    state.bossCore.baseY = 315;
    state.bossCore.hpHits = 0;
    state.bossCore.swimPhase = 0;

    // 封印された大貝（Mystery Shell）を盤面に配置
    spawnMysteryShell();

    hideAllOverlays();
    document.getElementById('place-banner').classList.remove('show');
    resetBallToPlunger(false);

    const modTitleSuffix = mod.id !== 'none' ? ` 【${mod.name}】` : '';
    const baseTitle = roundNum === 8 ? 'FINAL ROUND 8' : (roundNum > 8 ? `TRENCH ROUND ${roundNum}` : `ROUND ${roundNum}`);
    const titleText = `${baseTitle}${modTitleSuffix}`;
    const subText = mod.id !== 'none'
      ? `${mod.desc} (目標: ${state.norma.toLocaleString()})`
      : `目標ノルマ: ${state.norma.toLocaleString()} PTS`;

    showCenterBanner(
      titleText,
      subText,
      mod.id !== 'none' ? mod.color : (roundNum >= 8 ? '#ff5c8a' : '#70f5ff'),
      2.1
    );
    updateHUD();
  }

  function resetBallToPlunger(keepCombo = false) {
    state.ball.x = (LANE_X + 408) / 2;
    state.ball.y = 610;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.ball.inLane = true;
    state.ball.waitingLaunch = true;
    state.ball.warpCooldown = 0;
    state.ball.trail = [];
    state.plunger.charging = false;
    state.plunger.power = 0;
    if (!keepCombo) {
      state.combo = 0;
    }
    state.nudgeHeat = 0;
    state.tiltPenalty = false;
    state.ballSaverTimer = 0;
    state.skillShotTimer = 0;
    state.stuckTimer = 0;
    state.ballPosHistory = [];
    state.posSampleTimer = 0;
    state.chainCount = 0;
    state.chainTimer = 0;
    state.leftKickbackReady = true;
    state.rightKickbackReady = true;

    const filledIndices = state.slots.map((s, idx) => s ? idx : -1).filter(idx => idx !== -1);
    state.skillShotSlotId = filledIndices.length > 0
      ? filledIndices[Math.floor(Math.random() * filledIndices.length)]
      : 0;

    updateHUD();
  }

  function spawnPopup(x, y, text, color = '#70f5ff', size = 13) {
    state.popups.push({
      x: Math.max(55, Math.min(VIEW_W - 55, x)),
      y: y - 10,
      text,
      color,
      size,
      alpha: 1,
      vy: -40
    });
  }

  function spawnShockwave(x, y, color, maxRadius = 44) {
    state.shockwaves.push({
      x,
      y,
      r: 8,
      maxR: maxRadius,
      color,
      alpha: 0.9
    });
  }

  function triggerShake(duration = 0.14, intensity = 3.5) {
    state.shakeTimer = Math.max(state.shakeTimer, duration);
    state.shakeIntensity = Math.max(state.shakeIntensity, intensity);
  }

  function addScore(basePoints, x, y, color = '#70f5ff', comboGain = 1, slotId = -1, labelPrefix = '', chainBonusMult = 1.0) {
    if (state.phase !== 'PLAY') return;

    if (comboGain > 0) {
      const prevBucket = Math.floor(state.combo / 10);
      state.combo += comboGain;
      if (state.combo > state.maxComboThisRun) {
        state.maxComboThisRun = state.combo;
      }
      const newBucket = Math.floor(state.combo / 10);
      if (newBucket > prevBucket && state.combo <= 70) {
        spawnShockwave(x, y, '#70f5ff', 72);
        spawnPopup(VIEW_W / 2, 165, `🌊 ${newBucket * 10} COMBO!! (×${getComboMultiplier().toFixed(2)})`, '#70f5ff', 15);
      }
    }

    let modifiedBase = basePoints;
    if (slotId >= 0 && state.slots[slotId]) {
      const p = state.slots[slotId];
      // ボール特性（重真珠: パーツのスコア +25%）
      modifiedBase *= (getBallSpec().partScoreMult || 1.0);
      // ラウンドモディファイア R4「満潮」：全パーツのスコア ×1.25
      if (hasRoundMod('high_tide')) {
        modifiedBase *= 1.25;
      }
      // 魚パッシブ【発光グループ】：全パーツの基礎スコア +10%
      if (hasFishBuff('luminescent')) {
        modifiedBase *= 1.10;
      }
      // 魚パッシブ【群れグループ】：スピナー・竜巻珊瑚の加点 +25%
      if ((p.type === 'spinner' || p.type === 'vortex_reef') && hasFishBuff('school')) {
        modifiedBase *= 1.25;
      }
      if ((p.type === 'bumper_circle' || p.type === 'bumper_tri' || p.type === 'gravity_pearl' || p.type === 'vortex_reef') && hasSynergy('bumper_kingdom')) {
        modifiedBase *= 1.35;
      }
      if ((p.type === 'kicker' || p.type === 'spinner' || p.type === 'plasma_vent' || p.type === 'vortex_reef') && hasSynergy('perpetual_engine')) {
        modifiedBase *= 1.40;
      }
      if (p.level >= 2 && hasSynergy('master_craft')) {
        modifiedBase *= 1.25;
      }
    }

    let isSkillShot = false;
    if (state.skillShotTimer > 0 && slotId === state.skillShotSlotId) {
      state.skillShotTimer = 0;
      modifiedBase += 600;
      state.combo += 3;
      isSkillShot = true;
      state.hitStopTimer = 0.045;
      sfx.skillShot();
      spawnShockwave(x, y, '#ffd97d', 68);
    }

    const comboMult = getComboMultiplier();
    const boostMult = getBoosterMultiplier();
    const gained = Math.round(modifiedBase * comboMult * boostMult * chainBonusMult);

    state.roundScore += gained;
    state.totalScore += gained;

    if (slotId >= 0 && state.slots[slotId]) {
      state.slots[slotId].totalEarned += gained;
      state.slots[slotId].hits++;
    }

    const popText = isSkillShot
      ? `🎯SKILL SHOT! +${gained.toLocaleString()}`
      : (labelPrefix ? `${labelPrefix} +${gained.toLocaleString()}` : `+${gained.toLocaleString()}`);
    spawnPopup(x, y, popText, isSkillShot ? '#ffd97d' : color, isSkillShot ? 15 : 13);

    updateHUD();

    if (state.roundScore >= state.norma && state.phase === 'PLAY') {
      if (!state.overkillActive) {
        onNormaAchieved();
      } else if (!state.overkillRerollGranted && state.roundScore >= Math.round(state.norma * 1.5)) {
        state.overkillRerollGranted = true;
        state.bonusRerollsNextDraft++;
        sfx.jackpot();
        spawnShockwave(VIEW_W / 2, 220, '#ffd97d', 110);
        spawnPopup(VIEW_W / 2, 200, '🎲 OVERKILL 150%! リロール+1!!', '#ffd97d', 16);
      }
    }
  }

  function spawnParticles(x, y, color, count = 12, speed = 135) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.3 + Math.random() * 0.7) * speed;
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6
      });
    }
  }

  function showCenterBanner(text, sub, color = '#70f5ff', duration = 1.5) {
    state.bannerText = { text, sub, color, timer: duration, maxTimer: duration };
  }

  function onNormaAchieved() {
    // R8クリア（初回制覇）時はそのまま華々しくクリア演出へ、それ以外は6秒間のOVERKILL（欲張りタイム）突入！
    if (state.round === 8 && !state.endlessMode) {
      finishOverkillRound();
      return;
    }
    state.overkillActive = true;
    state.overkillTimer = 6.0;
    state.overkillRerollGranted = state.roundScore >= Math.round(state.norma * 1.5);
    if (state.overkillRerollGranted) {
      state.bonusRerollsNextDraft++;
    }
    sfx.roundClear();
    spawnParticles(state.ball.x, state.ball.y, '#ffd97d', 28, 220);
    spawnShockwave(state.ball.x, state.ball.y, '#ffd97d', 95);
    showCenterBanner('NORMA CLEAR! 🔥OVERKILL!', '6秒間スコア×1.5！150%達成で次ドラフト🎲リロール+1', '#ffd97d', 1.6);
    const okBar = document.getElementById('overkill-bar');
    if (okBar) okBar.classList.add('show');
    updateOverkillBarUI();
  }

  function updateOverkillBarUI() {
    const titleEl = document.getElementById('overkill-title');
    const subEl = document.getElementById('overkill-sub');
    if (!titleEl || !subEl) return;
    titleEl.textContent = `🔥 OVERKILL ×1.5 (${Math.max(0, state.overkillTimer).toFixed(1)}s)`;
    if (state.overkillRerollGranted) {
      subEl.textContent = '✨ 150%達成！次ドラフトの🎲リロール+1獲得済！';
    } else {
      const target = Math.round(state.norma * 1.5);
      const rem = Math.max(0, target - state.roundScore);
      subEl.textContent = `あと ${rem.toLocaleString()} PTS で次ドラフト🎲リロール+1！`;
    }
  }

  function finishOverkillRound() {
    if (state.phase !== 'PLAY') return;
    state.overkillActive = false;
    state.overkillTimer = 0;
    const okBar = document.getElementById('overkill-bar');
    if (okBar) okBar.classList.remove('show');

    state.phase = 'CLEAR_ANIM';
    setFlippersPressed(true, false);
    setFlippersPressed(false, false);
    sfx.roundClear();
    spawnParticles(state.ball.x, state.ball.y, '#20e3b2', 30, 230);
    spawnShockwave(state.ball.x, state.ball.y, '#20e3b2', 95);

    const unusedBalls = Math.max(0, state.ballsLeft - 1);
    const ballBonus = unusedBalls * (400 * state.round);
    if (ballBonus > 0) {
      state.totalScore += ballBonus;
      spawnPopup(VIEW_W / 2, 260, `PEARL BONUS +${ballBonus.toLocaleString()}`, '#20e3b2', 15);
    }

    const token = state.runToken;
    if (state.round === 8 && !state.endlessMode) {
      showCenterBanner('ALL ROUNDS CLEAR!!', '見事！深海の全8ラウンドを制覇！', '#ffd97d', 2.2);
      setTimeout(() => {
        if (state.runToken === token && state.phase === 'CLEAR_ANIM') {
          showResultScreen(true);
        }
      }, 2100);
    } else {
      const subMsg = ballBonus > 0
        ? `残り真珠ボーナス +${ballBonus.toLocaleString()} PTS！ドラフトへ`
        : 'ノルマ達成！深海カードドラフトへ';
      showCenterBanner(`ROUND ${state.round} CLEAR!`, subMsg, '#20e3b2', 1.4);
      setTimeout(() => {
        if (state.runToken === token && state.phase === 'CLEAR_ANIM') {
          openDraftModal(ballBonus);
        }
      }, 1350);
    }
  }

  function onBallLost() {
    if (state.phase !== 'PLAY') return;

    // オーバーキル中にボールが落ちた場合は残機を減らさずそのままクリア遷移
    if (state.overkillActive) {
      finishOverkillRound();
      return;
    }

    // 1. 時間制ボールセーバー有効時
    if (state.ballSaverTimer > 0) {
      state.ballSaverTimer = 0;
      sfx.ballSave();
      showCenterBanner('PEARL SAVED!', '海流バリア発動！コンボ継続で再射出', '#20e3b2', 1.2);
      relaunchSavedBall();
      return;
    }

    // 2. 魚パッシブ【守りグループ】による追加ボールセーバー発動回数がある場合
    if (state.guardExtraSavesLeft > 0) {
      state.guardExtraSavesLeft--;
      sfx.ballSave();
      showCenterBanner('🛡️魚効果: 守り発動!', 'マンボウ/ハコフグの加護で真珠を救出！', '#ffd97d', 1.3);
      updateHUD();
      relaunchSavedBall();
      return;
    }

    sfx.ballLost();
    state.ballsLeft--;
    // R6「コンボ持続」モディファイア有効時はドレインしてもコンボをリセットしない
    const keepComboOnDrain = hasRoundMod('combo_keep');
    if (!keepComboOnDrain) {
      state.combo = 0;
    }
    state.chainCount = 0;
    state.chainTimer = 0;
    state.miniBalls = [];
    updateHUD();

    if (state.ballsLeft <= 0) {
      state.phase = 'CLEAR_ANIM';
      const token = state.runToken;
      showCenterBanner('PEARL LOST...', 'ノルマ未達成', '#ff5c8a', 1.8);
      setTimeout(() => {
        if (state.runToken === token && state.phase === 'CLEAR_ANIM') {
          showResultScreen(false);
        }
      }, 1700);
    } else {
      const subLostMsg = keepComboOnDrain
        ? `残り真珠 ${state.ballsLeft}個（🔗コンボ持続中: ${state.combo} HIT!）`
        : `残り真珠 ${state.ballsLeft}個`;
      showCenterBanner('PEARL LOST', subLostMsg, '#ff5c8a', 1.1);
      resetBallToPlunger(keepComboOnDrain);
    }
  }

  function relaunchSavedBall() {
    state.ball.x = (LANE_X + 408) / 2;
    state.ball.y = 590;
    state.ball.inLane = true;
    state.ball.waitingLaunch = false;
    state.ball.vx = 0;
    state.ball.vy = -900;
    state.ball.trail = [];
  }

  function showResultScreen(isClear) {
    state.phase = 'RESULT';
    hideAllOverlays();
    if (isClear) {
      sfx.gameClear();
      hasClearedEver = true;
      localStorage.setItem(STORAGE_KEY_CLEARED, '1');
    } else {
      sfx.gameOver();
    }

    let isNewRecord = false;
    if (state.totalScore > hiScore) {
      hiScore = state.totalScore;
      localStorage.setItem(STORAGE_KEY_HISCORE, String(hiScore));
      isNewRecord = true;
    }

    const resTitle = document.getElementById('res-title');
    const resSub = document.getElementById('res-sub');
    if (isClear) {
      resTitle.textContent = 'GAME CLEAR!';
      resTitle.style.color = '#20e3b2';
      resSub.textContent = '全8ラウンドのノルマを達成しました！';
    } else {
      resTitle.textContent = state.endlessMode ? `TRENCH R${state.round} FINISH` : 'GAME OVER';
      resTitle.style.color = state.endlessMode ? '#ffd97d' : '#ff5c8a';
      resSub.textContent = `ROUND ${state.round} ノルマ達成率 ${Math.floor((state.roundScore / state.norma) * 100)}%`;
    }
    document.getElementById('res-total').textContent = state.totalScore.toLocaleString();
    document.getElementById('res-hiscore').textContent = hiScore.toLocaleString();
    document.getElementById('res-newrecord').style.display = isNewRecord ? 'block' : 'none';

    let mvpText = 'なし';
    let bestScore = 0;
    state.slots.forEach((s, idx) => {
      if (s && s.totalEarned > bestScore) {
        bestScore = s.totalEarned;
        const c = CARD_CATALOG.find(item => item.id === s.type);
        mvpText = `${c ? c.shortName : s.type} Lv${s.level} (#${idx + 1})`;
      }
    });

    const statsGrid = document.getElementById('res-stats-grid');
    statsGrid.innerHTML = `
      <div class="stat-cell">
        <div class="s-lbl">到達ラウンド</div>
        <div class="s-val">ROUND ${state.round}</div>
      </div>
      <div class="stat-cell">
        <div class="s-lbl">今回回収した深海魚</div>
        <div class="s-val" style="color:var(--pearl-gold);">${state.caughtFishThisRun.length} 匹 (図鑑 ${getUnlockedFishCount()}/12)</div>
      </div>
      <div class="stat-cell">
        <div class="s-lbl">最大コンボ</div>
        <div class="s-val">${state.maxComboThisRun} HIT</div>
      </div>
      <div class="stat-cell">
        <div class="s-lbl">MVPパーツ</div>
        <div class="s-val" style="color:var(--aqua-bright); font-size:11.5px;">${mvpText}</div>
      </div>
    `;

    document.getElementById('btn-endless').style.display = isClear ? 'block' : 'none';
    document.getElementById('ov-result').classList.add('show');
    updateTitleRecords();
  }

  // =========================================================================
  // 7. 深海魚図鑑（永続コレクション画面）と魚画像描画
  // =========================================================================
  function drawImageCentered(c, img, cx, cy, maxW, maxH, flipX = false, rotation = 0) {
    if (!img) return;
    const iw = img.naturalWidth || 100;
    const ih = img.naturalHeight || 100;
    const ratio = Math.min(maxW / iw, maxH / ih);
    const dw = iw * ratio;
    const dh = ih * ratio;
    c.save();
    c.translate(cx, cy);
    if (rotation !== 0) c.rotate(rotation);
    if (flipX) c.scale(-1, 1);
    c.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    c.restore();
  }

  function drawFishSpriteOnContext(c, spec, x, y, r, dir, swimPhase) {
    const img = getAssetImage(spec.id);
    if (!img) return;
    c.save();
    const bob = Math.sin(swimPhase) * 1.5;
    const tilt = Math.sin(swimPhase) * 0.04;
    if (spec.rarity === 'ssr') {
      c.shadowColor = spec.color;
      c.shadowBlur = 14;
    } else if (spec.rarity === 'rare') {
      c.shadowColor = spec.color;
      c.shadowBlur = 8;
    }
    // すべての魚PNG素材は左向き（頭が左）のため、右へ泳ぐとき(dir === 1)に左右反転する
    const maxW = spec.shape === 'oarfish' ? r * 4.4 : (spec.shape === 'eel' || spec.shape === 'squid' ? r * 3.8 : r * 3.3);
    const maxH = spec.shape === 'sunfish' ? r * 3.2 : r * 2.5;
    drawImageCentered(c, img, x, y + bob, maxW, maxH, dir === 1, tilt);
    c.restore();
  }

  function openZukanModal(fromPhase) {
    state.prevPhaseBeforeZukan = fromPhase;
    hideAllOverlays();

    const count = getUnlockedFishCount();
    document.getElementById('zukan-subtitle').textContent = `回収した深海生物の記録 (${count} / 12種)`;

    const grid = document.getElementById('zukan-grid');
    grid.innerHTML = '';

    FISH_CATALOG.forEach(spec => {
      const caughtCount = unlockedFishMap[spec.id] || 0;
      const unlocked = caughtCount > 0;
      const grp = FISH_GROUPS[spec.group];

      const card = document.createElement('div');
      card.className = `zukan-card ${unlocked ? 'unlocked ' + spec.rarity : 'locked'}`;

      const imgWrap = document.createElement('div');
      imgWrap.className = 'zk-img-wrap';
      const imgEl = document.createElement('img');
      imgEl.className = `zk-img ${unlocked ? '' : 'silhouette'}`;
      if (typeof ASSET_PATHS !== 'undefined' && ASSET_PATHS[spec.id]) {
        imgEl.src = ASSET_PATHS[spec.id];
      }
      imgEl.alt = unlocked ? spec.name : '？？？';
      imgWrap.appendChild(imgEl);

      const topDiv = document.createElement('div');
      topDiv.className = 'zk-top';
      topDiv.appendChild(imgWrap);

      const titleWrap = document.createElement('div');
      titleWrap.className = 'zk-title-wrap';
      titleWrap.innerHTML = `
        <span class="zk-rarity" style="color:${unlocked ? spec.color : '#7fa6c4'};">${spec.rarityLabel} (${spec.points}pt)</span>
        <span class="zk-name">${unlocked ? spec.name : '？？？'}</span>
      `;
      topDiv.appendChild(titleWrap);
      card.appendChild(topDiv);

      const descDiv = document.createElement('div');
      descDiv.className = 'zk-desc';
      descDiv.textContent = unlocked ? spec.desc : `ヒント: ${spec.bandHint}`;
      card.appendChild(descDiv);

      const buffDiv = document.createElement('div');
      buffDiv.className = 'zk-buff';
      buffDiv.textContent = unlocked
        ? `${grp.icon}【${grp.name}】${grp.effectDesc} (回収:${caughtCount}回)`
        : `${grp.icon}【${grp.name}グループ】`;
      card.appendChild(buffDiv);

      grid.appendChild(card);
    });

    document.getElementById('ov-zukan').classList.add('show');
  }

  // =========================================================================
  // 8. ドラフト＆配置フェーズ
  // =========================================================================
  function canCardBeUsed(card) {
    const emptyCount = state.slots.filter(s => s === null).length;
    if (card.category === 'ball') {
      return state.ballType !== card.ballType;
    }
    if (card.id === 'warp_gate') {
      const canUpgrade = state.slots.some(s => s && s.type === 'warp_gate' && s.level < 3);
      return emptyCount >= 2 || canUpgrade;
    }
    if (card.category === 'part') {
      const canUpgrade = state.slots.some(s => s && s.type === card.id && s.level < 3);
      return emptyCount >= 1 || canUpgrade;
    }
    if (card.id === 'upgrade_chip') {
      return state.slots.some(s => s && s.level < 3);
    }
    if (card.id === 'extra_ball') {
      return state.extraBallPurchases < 2;
    }
    if (card.id === 'flipper_up') {
      return state.flipperLevel < 3;
    }
    return true;
  }

  function getCardStatusHint(card) {
    if (card.category === 'ball') {
      const curSpec = getBallSpec();
      return `現在ボール: ${curSpec.shortBadge} → ${BALL_SPECS[card.ballType].shortBadge} に入れ替え（ラン中常時有効）`;
    }
    if (card.category === 'part') {
      const existing = state.slots.filter(s => s && s.type === card.id);
      const upgradable = existing.filter(s => s.level < 3).length;
      if (card.id === 'warp_gate') {
        const pairs = Math.floor(existing.length / 2);
        return pairs > 0 ? `現在 ${pairs}組設置中（同スロット選択でLvUP）` : '空きスロット2か所に連結設置';
      }
      return existing.length > 0
        ? `現在 ${existing.length}個設置中（${upgradable > 0 ? '重ねてLvUP可' : 'すべて最大Lv'}）`
        : '空きスロット1か所に新規設置';
    }
    if (card.id === 'upgrade_chip') {
      const count = state.slots.filter(s => s && s.level < 3).length;
      return `強化可能な既存パーツ: ${count}個`;
    }
    if (card.id === 'extra_ball') {
      return `毎ラウンド真珠数: ${state.maxBallsPerRound} → ${state.maxBallsPerRound + 1}個（残り枠 ${2 - state.extraBallPurchases}回）`;
    }
    if (card.id === 'score_booster') {
      return `スコアボーナス: +${state.scoreBoosterCount * 10}% → +${(state.scoreBoosterCount + 1) * 10}%`;
    }
    if (card.id === 'flipper_up') {
      return `フリッパー強化: Lv${state.flipperLevel} → Lv${state.flipperLevel + 1} (最大Lv3)`;
    }
    return '';
  }

  function predictNewSynergyForCard(card) {
    if (card.category !== 'part' && card.id !== 'upgrade_chip') return null;
    const currentIds = new Set(state.activeSynergies.map(s => s.id));
    const simSlots = state.slots.map(s => s ? { ...s } : null);

    if (card.id === 'upgrade_chip') {
      const target = simSlots.find(s => s && s.level < 3);
      if (target) target.level++;
    } else {
      const emptyIdx = simSlots.findIndex(s => s === null);
      if (emptyIdx !== -1) {
        simSlots[emptyIdx] = { type: card.id, level: 1 };
      } else {
        const upg = simSlots.find(s => s && s.type === card.id && s.level < 3);
        if (upg) upg.level++;
      }
    }

    const newlyActive = SYNERGY_DEFINITIONS.filter(def => !currentIds.has(def.id) && def.check(simSlots));
    if (newlyActive.length > 0) {
      return `✨選択でシナジー【${newlyActive.map(s => s.name).join('・')}】発動可能！`;
    }
    return null;
  }

  function pickDraftCards() {
    const pool = CARD_CATALOG.filter(canCardBeUsed);
    const chosen = [];
    const available = [...pool];

    // ラン最初のドラフト（R1クリア後）では、選択肢3つのうち最低1つを連鎖パーツ（起爆ウニ・蓄電クラゲ・分裂クラゲのいずれか）にする
    if (state.round === 1 && !state.endlessMode) {
      const chainPartIds = ['detonator', 'battery', 'split'];
      const chainCandidates = available.filter(c => chainPartIds.includes(c.id));
      if (chainCandidates.length > 0) {
        const totalW = chainCandidates.reduce((acc, c) => acc + c.weight, 0);
        let r = Math.random() * totalW;
        let picked = chainCandidates[0];
        for (let i = 0; i < chainCandidates.length; i++) {
          r -= chainCandidates[i].weight;
          if (r <= 0) {
            picked = chainCandidates[i];
            break;
          }
        }
        chosen.push(picked);
        const removeIdx = available.findIndex(c => c.id === picked.id);
        if (removeIdx !== -1) available.splice(removeIdx, 1);
      }
    }

    while (chosen.length < 3 && available.length > 0) {
      const totalWeight = available.reduce((acc, c) => acc + c.weight, 0);
      let r = Math.random() * totalWeight;
      let idx = 0;
      for (let i = 0; i < available.length; i++) {
        r -= available[i].weight;
        if (r <= 0) {
          idx = i;
          break;
        }
      }
      chosen.push(available[idx]);
      available.splice(idx, 1);
    }
    return chosen;
  }

  function predictFusionForCard(card) {
    if (card.category !== 'part') return null;
    for (let i = 0; i < state.slots.length; i++) {
      const s = state.slots[i];
      if (!s) continue;
      const fused = findFusionRecipe(card.id, s.type);
      if (fused) {
        const partnerInfo = getPartDisplayInfo(s.type);
        const pName = partnerInfo ? partnerInfo.shortName : s.type;
        const known = unlockedFusionsMap[fused.id] > 0;
        return known
          ? `⚗ 盤面の【${pName}】に重ねて合成 → ${fused.icon}${fused.name}`
          : `⚗ 盤面の【${pName}】に重ねて未発見の合成進化！ (???)`;
      }
    }
    return null;
  }

  function renderDraftCards() {
    const listEl = document.getElementById('cards-list');
    listEl.innerHTML = '';

    const cards = pickDraftCards();
    cards.forEach(card => {
      const item = document.createElement('div');
      item.className = `card-item ${card.category !== 'part' ? 'instant' : ''}`;
      const badgeLabel = card.category === 'part'
        ? 'パーツ配置'
        : (card.category === 'ball' ? 'ボール変化' : (card.id === 'upgrade_chip' ? 'パーツ強化' : '即時発動'));
      const synAlert = predictNewSynergyForCard(card);
      const fusionAlert = predictFusionForCard(card);
      const partUri = (card.category === 'part' && typeof ASSET_PATHS !== 'undefined') ? ASSET_PATHS['part_' + card.id] : null;
      const iconHtml = partUri
        ? `<img src="${partUri}" alt="${card.shortName}" style="max-width:34px; max-height:34px; object-fit:contain;">`
        : card.icon;

      item.innerHTML = `
        <div class="card-icon" style="border-color:${card.color}; box-shadow:0 0 10px ${card.color}33;">${iconHtml}</div>
        <div class="card-body">
          <div class="card-top">
            <span class="card-name" style="color:${card.color};">${card.name}</span>
            <span class="card-type">${badgeLabel}</span>
          </div>
          <div class="card-desc">${card.desc}</div>
          <div class="card-hint">${getCardStatusHint(card)}</div>
          ${fusionAlert ? `<div class="card-fusion-alert">${fusionAlert}</div>` : ''}
          ${synAlert ? `<div class="card-syn-alert">${synAlert}</div>` : ''}
        </div>
      `;
      item.addEventListener('click', () => onSelectDraftCard(card));
      listEl.appendChild(item);
    });

    const rerollBtn = document.getElementById('btn-reroll');
    rerollBtn.textContent = `🎲 リロール (残り${state.rerollsLeft}回)`;
    rerollBtn.disabled = state.rerollsLeft <= 0;
  }

  function openDraftModal(ballBonus = 0) {
    state.phase = 'DRAFT';
    hideAllOverlays();
    const ov = document.getElementById('ov-draft');
    ov.classList.remove('peek-mode');
    document.getElementById('btn-peek-board').textContent = '👁 盤面を確認';
    document.getElementById('draft-header').textContent = `ROUND ${state.round} CLEAR!`;
    const nextMod = getRoundModifier(state.round + 1);
    const nextModNotice = nextMod && nextMod.id !== 'none' ? ` ／ 次R${state.round + 1}: 【${nextMod.name}】` : '';
    document.getElementById('draft-bonus-info').textContent = ballBonus > 0
      ? `残り真珠ボーナス +${ballBonus.toLocaleString()} PTS 獲得！報酬カードを1枚選択${nextModNotice}`
      : `報酬カードを1枚選んで深海の盤面を構築しよう${nextModNotice}`;

    const fishBuffsEl = document.getElementById('draft-fish-buffs');
    const bSpec = getBallSpec();
    const ballText = `現在ボール: ${bSpec.shortBadge} (${bSpec.desc})`;
    if (state.activeFishGroups.size > 0) {
      const list = Array.from(state.activeFishGroups).map(gid => `${FISH_GROUPS[gid].icon}${FISH_GROUPS[gid].name}`).join(' / ');
      fishBuffsEl.textContent = `${ballText} ｜ 🐟魚効果: ${list}`;
    } else {
      fishBuffsEl.textContent = `${ballText} ｜ 🐟魚に当てるとパッシブ発動`;
    }

    renderDraftCards();
    ov.classList.add('show');
  }

  function onSelectDraftCard(card) {
    sfx.place();
    document.getElementById('ov-draft').classList.remove('show');

    if (card.category === 'ball' && card.ballType) {
      state.ballType = card.ballType;
      startRound(state.round + 1);
      return;
    }
    if (card.id === 'extra_ball') {
      state.extraBallPurchases++;
      state.maxBallsPerRound++;
      startRound(state.round + 1);
      return;
    }
    if (card.id === 'score_booster') {
      state.scoreBoosterCount++;
      startRound(state.round + 1);
      return;
    }
    if (card.id === 'flipper_up') {
      state.flipperLevel = Math.min(3, state.flipperLevel + 1);
      startRound(state.round + 1);
      return;
    }

    state.phase = 'PLACE';
    state.pendingCard = card;
    state.warpFirstSlot = null;
    updatePlaceBanner();
    document.getElementById('place-banner').classList.add('show');
  }

  function updatePlaceBanner() {
    const card = state.pendingCard;
    if (!card) return;
    const titleEl = document.getElementById('place-title');
    const subEl = document.getElementById('place-sub');

    if (card.id === 'upgrade_chip') {
      titleEl.textContent = `【深海結晶】対象パーツを選択`;
      subEl.textContent = `黄枠の既存パーツをタップして Lv+1（最大Lv3）`;
    } else if (card.id === 'warp_gate') {
      if (state.warpFirstSlot === null) {
        titleEl.textContent = `【渦潮】1つ目のスロットを選択`;
        subEl.textContent = `緑＝新規2か所 / 黄＝LvUP / 桃＝⚗合成進化!`;
      } else {
        titleEl.textContent = `【渦潮】2つ目の空きスロットを選択`;
        subEl.textContent = `出口の空きスロットをタップ（1つ目を再タップで解除）`;
      }
    } else {
      titleEl.textContent = `【${card.shortName}】配置スロットを選択`;
      subEl.textContent = `緑＝新規 / 黄＝同種LvUP / 桃＝⚗合成進化!`;
    }
  }

  function getSlotActionType(slotId) {
    const card = state.pendingCard;
    if (!card) return null;
    const slot = state.slots[slotId];

    if (card.id === 'upgrade_chip') {
      if (slot && slot.level < 3) return 'upgrade';
      return null;
    }

    if (card.id === 'warp_gate') {
      if (state.warpFirstSlot !== null) {
        if (slotId === state.warpFirstSlot) return 'cancel_first';
        if (slot && slot.type === 'warp_gate' && slot.level < 3) return 'upgrade';
        if (slot === null) return 'new';
        return null;
      }
      if (slot && findFusionRecipe('warp_gate', slot.type)) return 'fuse';
      if (slot && slot.type === 'warp_gate' && slot.level < 3) return 'upgrade';
      const emptyCount = state.slots.filter(s => s === null).length;
      if (slot === null && emptyCount >= 2) return 'new';
      return null;
    }

    if (slot === null) return 'new';
    if (slot.type === card.id && slot.level < 3) return 'upgrade';
    if (findFusionRecipe(card.id, slot.type)) return 'fuse';
    return null;
  }

  function handleSlotClick(slotId) {
    if (state.phase !== 'PLACE' || !state.pendingCard) return;
    const action = getSlotActionType(slotId);
    if (!action) {
      sfx.wall();
      return;
    }
    const card = state.pendingCard;
    const pos = SLOT_POSITIONS[slotId];

    // パーツ合成進化（化学反応）
    if (action === 'fuse') {
      const existing = state.slots[slotId];
      const fused = findFusionRecipe(card.id, existing.type);
      if (fused) {
        // もし既存側がワープゲートだった場合、相方のペア参照を安全に解除（残った相方は通常真珠貝に変化して孤立を防ぐ）
        if (existing.type === 'warp_gate' && existing.pairSlotId !== null && state.slots[existing.pairSlotId]) {
          state.slots[existing.pairSlotId].pairSlotId = null;
          state.slots[existing.pairSlotId].type = 'bumper_circle';
        }
        const newLevel = Math.min(3, Math.max(1, existing.level) + 1);
        placePartInSlot(slotId, fused.id, newLevel);
        state.slots[slotId].pulse = 1.8;
        const isFirst = saveFusionDiscovery(fused.id);
        sfx.jackpot();
        triggerShake(0.18, 4.5);
        spawnShockwave(pos.x, pos.y, fused.color, 95);
        spawnParticles(pos.x, pos.y, fused.color, 26, 200);
        spawnPopup(
          pos.x,
          pos.y - 14,
          isFirst ? `⚗新発見!【${fused.name}】` : `⚗合成進化!【${fused.name}】`,
          fused.color,
          15
        );
        finishPlacementPhase();
        return;
      }
    }

    if (card.id === 'upgrade_chip') {
      const target = state.slots[slotId];
      target.level = Math.min(3, target.level + 1);
      target.pulse = 1.5;
      if (target.type === 'warp_gate' && target.pairSlotId !== null && state.slots[target.pairSlotId]) {
        state.slots[target.pairSlotId].level = target.level;
        state.slots[target.pairSlotId].pulse = 1.5;
      }
      refreshSynergies();
      sfx.place();
      spawnParticles(pos.x, pos.y, '#20e3b2', 18, 150);
      finishPlacementPhase();
      return;
    }

    if (card.id === 'warp_gate') {
      if (action === 'cancel_first') {
        state.warpFirstSlot = null;
        sfx.wall();
        updatePlaceBanner();
        return;
      }
      if (action === 'upgrade') {
        state.warpFirstSlot = null;
        const target = state.slots[slotId];
        target.level = Math.min(3, target.level + 1);
        target.pulse = 1.5;
        if (target.pairSlotId !== null && state.slots[target.pairSlotId]) {
          state.slots[target.pairSlotId].level = target.level;
          state.slots[target.pairSlotId].pulse = 1.5;
        }
        refreshSynergies();
        sfx.place();
        spawnParticles(pos.x, pos.y, '#a855f7', 18, 150);
        finishPlacementPhase();
        return;
      }
      if (state.warpFirstSlot === null) {
        state.warpFirstSlot = slotId;
        sfx.place();
        spawnParticles(pos.x, pos.y, '#a855f7', 12, 100);
        updatePlaceBanner();
        return;
      } else {
        const firstId = state.warpFirstSlot;
        placePartInSlot(firstId, 'warp_gate', 1, slotId);
        placePartInSlot(slotId, 'warp_gate', 1, firstId);
        sfx.warp();
        spawnParticles(pos.x, pos.y, '#a855f7', 22, 170);
        finishPlacementPhase();
        return;
      }
    }

    if (action === 'new') {
      placePartInSlot(slotId, card.id, 1);
    } else if (action === 'upgrade') {
      state.slots[slotId].level = Math.min(3, state.slots[slotId].level + 1);
      state.slots[slotId].pulse = 1.5;
      refreshSynergies();
    }
    sfx.place();
    spawnParticles(pos.x, pos.y, card.color, 18, 150);
    finishPlacementPhase();
  }

  function finishPlacementPhase() {
    state.pendingCard = null;
    state.warpFirstSlot = null;
    document.getElementById('place-banner').classList.remove('show');
    startRound(state.round + 1);
  }

  // =========================================================================
  // 9. 物理演算エンジン（1画面固定・深海魚衝突・魚パッシブ補正込み）
  // =========================================================================
  function closestPointOnSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: x1, y: y1, t: 0 };
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + t * dx, y: y1 + t * dy, t };
  }

  function updateFlipper(flipper, dt) {
    const active = flipper.pressed && !state.tiltPenalty;
    const target = active ? flipper.activeAngle : flipper.restAngle;
    const diff = target - flipper.angle;
    const maxStep = getFlipperSpeed() * dt;
    if (Math.abs(diff) <= maxStep) {
      flipper.angVel = diff / dt;
      flipper.angle = target;
    } else {
      const dir = Math.sign(diff);
      flipper.angVel = dir * getFlipperSpeed();
      flipper.angle += dir * maxStep;
    }
  }

  function collideFlipper(flipper, targetBall = state.ball, ballRadius = BALL_R) {
    const b = targetBall;
    const len = getFlipperLength();
    const x1 = flipper.pivotX;
    const y1 = flipper.pivotY;
    const x2 = x1 + Math.cos(flipper.angle) * len;
    const y2 = y1 + Math.sin(flipper.angle) * len;

    const cp = closestPointOnSegment(b.x, b.y, x1, y1, x2, y2);
    const dx = b.x - cp.x;
    const dy = b.y - cp.y;
    const dist = Math.hypot(dx, dy);
    const minDist = ballRadius + 5.5;

    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      b.x = cp.x + nx * minDist;
      b.y = cp.y + ny * minDist;

      const r = cp.t * len;
      const tx = -Math.sin(flipper.angle);
      const ty = Math.cos(flipper.angle);
      const fvx = tx * (flipper.angVel * r);
      const fvy = ty * (flipper.angVel * r);

      const relVx = b.vx - fvx;
      const relVy = b.vy - fvy;
      const relDot = relVx * nx + relVy * ny;

      if (relDot < 0) {
        const agileBonus = hasFishBuff('agile') ? 0.10 : 0;
        const ballFlipperBonus = (targetBall === state.ball) ? (getBallSpec().flipperRestBonus || 0) : 0;
        const restitution = 0.82 + state.flipperLevel * 0.06 + agileBonus + ballFlipperBonus;
        b.vx -= (1 + restitution) * relDot * nx;
        b.vy -= (1 + restitution) * relDot * ny;

        if (Math.abs(flipper.angVel) > 0.5) {
          const tipBoost = (0.45 + 0.78 * cp.t) * (1 + state.flipperLevel * 0.14 + (hasFishBuff('agile') ? 0.12 : 0) + ballFlipperBonus);
          b.vx += fvx * tipBoost;
          b.vy += fvy * tipBoost;
        }
      }
    }
  }

  function collideWalls(targetBall = state.ball, ballRadius = BALL_R, isMini = false) {
    const b = targetBall;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (!isMini && w.oneWayLeft && b.inLane && b.vx < 0) {
        continue;
      }

      const cp = closestPointOnSegment(b.x, b.y, w.x1, w.y1, w.x2, w.y2);
      const dx = b.x - cp.x;
      const dy = b.y - cp.y;
      const dist = Math.hypot(dx, dy);

      if (dist < ballRadius && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        b.x = cp.x + nx * ballRadius;
        b.y = cp.y + ny * ballRadius;

        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= (1 + w.rest) * dot * nx;
          b.vy -= (1 + w.rest) * dot * ny;
          if (w.isSlingshot && Math.hypot(b.vx, b.vy) > 110) {
            w.pulse = 1.0;
            sfx.bumper(state.combo);
            addScore(35, cp.x, cp.y, '#ff5c8a', 1, -1);
            spawnParticles(cp.x, cp.y, '#ff5c8a', 6, 95);
          }
        }
      }
    }

    // センターセーフティピラー（発光プランクトン3か所達成でフリッパー間に出現する海流柱）
    if (state.centerPostTimer > 0) {
      const px = 193;
      const py = 605;
      const pr = 9;
      const dx = b.x - px;
      const dy = b.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist < ballRadius + pr && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        b.x = px + nx * (ballRadius + pr);
        b.y = py + ny * (ballRadius + pr);
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= 1.85 * dot * nx;
          b.vy -= 1.85 * dot * ny;
          b.vy -= 110;
          sfx.bumper(state.combo);
          spawnParticles(px, py, '#20e3b2', 8, 110);
        }
      }
    }

    if (!isMini && b.inLane && b.x < LANE_X - ballRadius) {
      b.inLane = false;
      state.ballSaverTimer = 4.5;
      state.skillShotTimer = 4.5;
    }
  }

  function checkBoardGimmicks(subDt) {
    const b = state.ball;
    const ballR = getBallRadius();

    // 1. 最上部・発光プランクトンの溜まり場3か所 (y=64)
    for (let i = 0; i < TOP_ROLLOVERS.length; i++) {
      const ro = TOP_ROLLOVERS[i];
      if (!ro.lit && Math.hypot(b.x - ro.x, b.y - ro.y) < 6 + ballR) {
        ro.lit = true;
        sfx.targetLit();
        addScore(120, ro.x, ro.y, '#70f5ff', 1, -1, `PLANKTON`);
        spawnParticles(ro.x, ro.y, '#70f5ff', 8, 100);

        if (TOP_ROLLOVERS.every(r => r.lit)) {
          const token = state.runToken;
          setTimeout(() => {
            if (state.runToken === token) {
              TOP_ROLLOVERS.forEach(r => { r.lit = false; });
            }
          }, 450);
          state.centerPostTimer = 15.0;
          state.jackpotDrone.active = true;
          sfx.skillShot();
          addScore(500, 187, 80, '#ffd97d', 2, -1, '★PLANKTON BLOOM! 黄金オウムガイ出現');
          spawnShockwave(187, 80, '#ffd97d', 75);
        }
      }
    }

    // 2. 左右壁の4つのイソギンチャク (y=250, y=470)（溝つぶし：常時内側へも少し弾いて壁際の滞留を防止）
    for (let i = 0; i < WALL_TARGETS.length; i++) {
      const wt = WALL_TARGETS[i];
      if (Math.abs(b.x - wt.x) < ballR + 5 && b.y >= wt.y1 && b.y <= wt.y2) {
        if (b.vx * wt.normalX < 80) {
          b.vx = wt.normalX * Math.max(135, Math.abs(b.vx));
        }
        if (!wt.lit) {
          wt.lit = true;
          b.vx += wt.normalX * 145;
          sfx.targetLit();
          addScore(140, wt.x + wt.normalX * 16, wt.y, '#ff5c8a', 1, -1, 'ANEMONE');
          spawnParticles(wt.x, wt.y, '#ff5c8a', 9, 110);

          if (WALL_TARGETS.every(t => t.lit)) {
            const token = state.runToken;
            setTimeout(() => {
              if (state.runToken === token) {
                WALL_TARGETS.forEach(t => { t.lit = false; });
              }
            }, 500);
            state.feverTimer = 10.0;
            state.ballSaverTimer = Math.max(state.ballSaverTimer, 8.0);
            sfx.jackpot();
            addScore(800, VIEW_W / 2, 260, '#20e3b2', 3, -1, '🌊BIOLUMINESCENCE FEVER 10s (×1.25)');
            spawnShockwave(VIEW_W / 2, 260, '#20e3b2', 90);
          }
        }
      }
    }

    // 3. 移動ジャックポット（黄金オウムガイ）
    if (state.jackpotDrone.active) {
      const jd = state.jackpotDrone;
      const dx = b.x - jd.x;
      const dy = b.y - jd.y;
      const dist = Math.hypot(dx, dy);
      if (dist < jd.r + ballR) {
        jd.active = false;
        state.hitStopTimer = 0.055;
        sfx.jackpot();
        triggerShake(0.22, 5);
        addScore(1000, jd.x, jd.y, '#ffd97d', 4, -1, '🐚GOLDEN NAUTILUS JACKPOT!!');
        spawnParticles(jd.x, jd.y, '#ffd97d', 26, 210);
        spawnShockwave(jd.x, jd.y, '#ffd97d', 85);
      }
    }

    // 4. R8ボス：大型の深海魚「深海の主」 (ゆっくり泳ぎ回り、当てるたびにダメージ表示＋得点)
    if (state.bossCore.active) {
      const bc = state.bossCore;
      if (bc.cooldown > 0) bc.cooldown = Math.max(0, bc.cooldown - subDt);
      collideBossWithBall(b, ballR);
    }

    // 5. 左右サイドレーン・キックバック
    if (state.leftKickbackReady && b.x > 12 && b.x < 46 && b.y > 505 && b.y < 535 && b.vy > 0) {
      state.leftKickbackReady = false;
      b.vy = -650;
      b.vx = 95;
      sfx.kicker();
      triggerShake(0.12, 3);
      addScore(200, 29, 510, '#70f5ff', 1, -1, '🌊JET KICKBACK!');
      spawnShockwave(29, 515, '#70f5ff', 42);
      spawnParticles(29, 515, '#70f5ff', 14, 160);
    }
    if (state.rightKickbackReady && b.x > 338 && b.x < 373 && b.y > 505 && b.y < 535 && b.vy > 0) {
      state.rightKickbackReady = false;
      b.vy = -650;
      b.vx = -95;
      sfx.kicker();
      triggerShake(0.12, 3);
      addScore(200, 357, 510, '#70f5ff', 1, -1, '🌊JET KICKBACK!');
      spawnShockwave(357, 515, '#70f5ff', 42);
      spawnParticles(357, 515, '#70f5ff', 14, 160);
    }
  }

  function collideBossWithBall(b, ballRadius) {
    if (!state.bossCore.active) return;
    const bc = state.bossCore;
    const dx = b.x - bc.x;
    const dy = b.y - bc.y;
    const dist = Math.hypot(dx, dy);
    const minDist = bc.r + ballRadius;
    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      b.x = bc.x + nx * minDist;
      b.y = bc.y + ny * minDist;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx -= 2.0 * dot * nx;
        b.vy -= 2.0 * dot * ny;
      }
      b.vx += nx * 210;
      b.vy += ny * 210;

      if (bc.cooldown <= 0) {
        bc.cooldown = 0.08;
        bc.hpHits++;
        bc.pulse = 1.5;
        triggerShake(0.14, 4);
        if (bc.hpHits % 5 === 0) {
          state.hitStopTimer = 0.06;
          sfx.jackpot();
          addScore(1200, bc.x, bc.y, '#ffd97d', 3, -1, '💥深海の主 CRITICAL DAMAGE!');
          spawnShockwave(bc.x, bc.y, '#ffd97d', 85);
          spawnParticles(bc.x, bc.y, '#ffd97d', 24, 200);
        } else {
          sfx.bumper(state.combo);
          addScore(350, bc.x, bc.y, '#ff5c8a', 2, -1, '⚔️深海の主 DAMAGE!');
          spawnShockwave(bc.x, bc.y, '#ff5c8a', 50);
          spawnParticles(bc.x, bc.y, '#ff5c8a', 14, 150);
        }
      }
    }
  }

  function getTriangleVertices(cx, cy, r, dir) {
    const rot = dir > 0 ? -0.15 : 0.15;
    return [
      { x: cx + Math.cos(-Math.PI / 2 + rot) * r, y: cy + Math.sin(-Math.PI / 2 + rot) * r },
      { x: cx + Math.cos(Math.PI / 6 + rot) * r,  y: cy + Math.sin(Math.PI / 6 + rot) * r },
      { x: cx + Math.cos(5 * Math.PI / 6 + rot) * r, y: cy + Math.sin(5 * Math.PI / 6 + rot) * r }
    ];
  }

  // =========================================================================
  // 9.5 連鎖・トリガー系パーツ（起爆ウニ・蓄電クラゲ・分裂クラゲ）＆ミニボール処理
  // =========================================================================
  function notifyOtherBatteriesCharged(sourceSlotId) {
    for (let j = 0; j < state.slots.length; j++) {
      if (j === sourceSlotId) continue;
      const p = state.slots[j];
      if (p && (p.type === 'battery' || p.type === 'electro_prism')) {
        if ((p.charge || 0) < 10) {
          p.charge = Math.min(10, (p.charge || 0) + 1);
          p.pulse = Math.max(p.pulse || 1, 1.24);
        }
      }
    }
  }

  function spawnMiniBalls(x, y, baseVx, baseVy, count = 2, maxLimit = 4) {
    const MINI_R = 6;
    if (state.miniBalls.length >= maxLimit) return 0;

    let spd = Math.hypot(baseVx, baseVy);
    let baseAngle = Math.atan2(baseVy, baseVx);
    if (spd < 240) {
      spd = 350;
      baseAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    }

    const angles = [];
    if (count === 1) {
      angles.push(baseAngle + (Math.random() < 0.5 ? 0.35 : -0.35));
    } else if (count === 2) {
      angles.push(baseAngle + (25 * Math.PI) / 180, baseAngle - (25 * Math.PI) / 180);
    } else {
      for (let k = 0; k < count; k++) {
        angles.push(baseAngle + (Math.PI * 2 * k) / count + (Math.random() - 0.5) * 0.25);
      }
    }
    let spawned = 0;
    for (let k = 0; k < angles.length; k++) {
      if (state.miniBalls.length >= maxLimit) break;
      const a = angles[k];
      state.miniBalls.push({
        x: x + Math.cos(a) * 10,
        y: y + Math.sin(a) * 10,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: MINI_R,
        life: 12.0,
        maxLife: 12.0,
        warpCooldown: 0.25,
        trail: []
      });
      spawned++;
    }
    return spawned;
  }

  function triggerDetonation(detSlotId, chainDepth = 0) {
    const srcPos = SLOT_POSITIONS[detSlotId];
    const srcPart = state.slots[detSlotId];
    if (!srcPos || !srcPart) return;

    srcPart.detCount = 0;
    srcPart.pulse = 1.75;
    sfx.jackpot();
    triggerShake(0.16, 4.2);
    spawnShockwave(srcPos.x, srcPos.y, '#ff4d6d', 140);
    spawnParticles(srcPos.x, srcPos.y, '#ff4d6d', 24, 210);
    spawnPopup(srcPos.x, srcPos.y - 16, '💥起爆!!', '#ff4d6d', 15);

    // 隣接スロット（距離140px以内）の全パーツを強制起動
    for (let j = 0; j < state.slots.length; j++) {
      if (j === detSlotId) continue;
      const targetPart = state.slots[j];
      if (!targetPart) continue;
      const targetPos = SLOT_POSITIONS[j];
      const dist = Math.hypot(srcPos.x - targetPos.x, srcPos.y - targetPos.y);
      if (dist <= 140) {
        forceActivateSlot(j, detSlotId, chainDepth);
      }
    }
  }

  function forceActivateSlot(targetSlotId, fromSlotId, chainDepth = 0) {
    const part = state.slots[targetSlotId];
    if (!part) return;
    const pos = SLOT_POSITIONS[targetSlotId];
    const fromPos = SLOT_POSITIONS[fromSlotId];

    // 連鎖カウンター +1（3秒間継続、1カウントあたり強制起動スコア +10%）
    state.chainCount++;
    state.chainTimer = 3.0;
    const chainBonusMult = 1 + state.chainCount * 0.10;
    const chainTag = `⚡連鎖×${state.chainCount}`;

    if (fromPos && pos) {
      state.chainLinks.push({
        x1: fromPos.x,
        y1: fromPos.y,
        x2: pos.x,
        y2: pos.y,
        color: '#ff4d6d',
        timer: 0.42,
        maxTimer: 0.42
      });
    }

    part.pulse = 1.55;
    // 他パーツが発動したため蓄電クラゲを充電
    notifyOtherBatteriesCharged(targetSlotId);

    const comboGainReflect = hasSynergy('labyrinth_reflect') ? 2 : 1;

    if (part.type === 'bumper_circle') {
      sfx.bumper(state.combo);
      addScore(100 * part.level, pos.x, pos.y, '#ff5c8a', 1, targetSlotId, chainTag, chainBonusMult);
      spawnParticles(pos.x, pos.y, '#ff5c8a', 10, 140);
      spawnShockwave(pos.x, pos.y, '#ff5c8a', 42);
    } else if (part.type === 'bumper_tri') {
      sfx.bumper(state.combo);
      addScore(150 * part.level, pos.x, pos.y, '#ff9e00', comboGainReflect, targetSlotId, chainTag, chainBonusMult);
      spawnParticles(pos.x, pos.y, '#ff9e00', 11, 150);
      spawnShockwave(pos.x, pos.y, '#ff9e00', 44);
    } else if (part.type === 'kicker') {
      sfx.kicker();
      addScore(150 * part.level, pos.x, pos.y, '#20e3b2', 1, targetSlotId, chainTag, chainBonusMult);
      spawnParticles(pos.x, pos.y - 10, '#20e3b2', 14, 175);
      spawnShockwave(pos.x, pos.y, '#20e3b2', 44);
    } else if (part.type === 'spinner') {
      part.spinVel = 32;
      sfx.spinner();
      addScore(30 * part.level, pos.x, pos.y, '#00e5ff', 1, targetSlotId, chainTag, chainBonusMult);
      spawnParticles(pos.x, pos.y, '#00e5ff', 8, 110);
    } else if (part.type === 'rebound_wall') {
      sfx.bumper(state.combo);
      addScore(50 * part.level, pos.x, pos.y, '#ffd97d', comboGainReflect, targetSlotId, chainTag, chainBonusMult);
      spawnParticles(pos.x, pos.y, '#ffd97d', 8, 120);
    } else if (part.type === 'warp_gate') {
      sfx.warp();
      let warpCombo = 1;
      if (hasSynergy('dimensional_accel')) {
        warpCombo = 3;
        state.warpAuraTimer = 3.0;
      }
      addScore(300 * part.level, pos.x, pos.y, '#a855f7', warpCombo, targetSlotId, `${chainTag} 🌊渦潮`, chainBonusMult);
      spawnShockwave(pos.x, pos.y, '#a855f7', 48);
      spawnParticles(pos.x, pos.y, '#a855f7', 14, 150);
    } else if (part.type === 'battery') {
      const chg = part.charge || 0;
      const dischargeBase = 25 * Math.max(1, chg) * part.level;
      part.charge = 0;
      sfx.skillShot();
      addScore(dischargeBase, pos.x, pos.y, '#00f5d4', 1 + Math.floor(chg / 4), targetSlotId, `${chainTag} ⚡放出(${chg})`, chainBonusMult);
      spawnShockwave(pos.x, pos.y, '#00f5d4', 45 + chg * 3.5);
      spawnParticles(pos.x, pos.y, '#00f5d4', 12 + chg, 160);
    } else if (part.type === 'split') {
      sfx.bumper(state.combo);
      let label = chainTag;
      if ((part.splitCooldown || 0) <= 0) {
        const spawned = spawnMiniBalls(pos.x, pos.y, state.ball.vx, state.ball.vy);
        if (spawned > 0) {
          part.splitCooldown = 10.0;
          label = `${chainTag} 🪼分裂+${spawned}`;
          sfx.warp();
        }
      }
      addScore(100 * part.level, pos.x, pos.y, '#72efdd', 1, targetSlotId, label, chainBonusMult);
      spawnShockwave(pos.x, pos.y, '#72efdd', 46);
      spawnParticles(pos.x, pos.y, '#72efdd', 12, 150);
    } else if (part.type === 'detonator') {
      // 強制起動は起爆ウニ自身のカウントは増やさない（無限連鎖防止）
      // ただし強制起動された別の起爆ウニが起爆直前（カウント2以上）で、かつ連鎖1段階目(chainDepth === 0)なら誘爆（連鎖の連鎖は1段階まで）
      sfx.bumper(state.combo);
      addScore(80 * part.level, pos.x, pos.y, '#ff4d6d', 1, targetSlotId, chainTag, chainBonusMult);
      spawnParticles(pos.x, pos.y, '#ff4d6d', 10, 140);
      if (chainDepth === 0 && (part.detCount || 0) >= 2) {
        triggerDetonation(targetSlotId, 1);
      }
    } else if (MUTATED_PARTS[part.type]) {
      // 変異パーツ（6種）の強制連鎖起動
      const mp = MUTATED_PARTS[part.type];
      sfx.skillShot();
      addScore(mp.basePt * part.level, pos.x, pos.y, mp.color, 2, targetSlotId, `${mp.icon}${chainTag}`, chainBonusMult);
      spawnParticles(pos.x, pos.y, mp.color, 14, 175);
      spawnShockwave(pos.x, pos.y, mp.color, 54);
      if (part.type === 'blast_jelly' && (part.splitCooldown || 0) <= 0) {
        const sp = spawnMiniBalls(pos.x, pos.y, (Math.random() - 0.5) * 400, -320, 2, 6);
        if (sp > 0) part.splitCooldown = 5.0;
      } else if (part.type === 'vortex_reef') {
        part.spinVel = 42;
      } else if (part.type === 'mirror_mine') {
        state.mirrorAuraStacks = Math.min(3, (state.mirrorAuraStacks || 0) + 1);
        state.mirrorAuraTimer = 6.0;
      } else if (part.type === 'electro_prism') {
        const sp = spawnMiniBalls(pos.x, pos.y, 0, -340, 1, 6);
        if (sp > 0) spawnPopup(pos.x, pos.y - 16, '✨プリズム分裂!', mp.color, 12);
      }
    }
  }

  function collidePartsForBall(b, ballRadius, subDt, isPrimaryBall = false) {
    if (b.warpCooldown > 0) {
      b.warpCooldown = Math.max(0, b.warpCooldown - subDt);
    }

    const comboGainReflect = hasSynergy('labyrinth_reflect') ? 2 : 1;

    for (let i = 0; i < state.slots.length; i++) {
      const part = state.slots[i];
      if (!part) continue;
      if (isPrimaryBall && part.cooldown > 0) {
        part.cooldown = Math.max(0, part.cooldown - subDt);
      }

      const pos = SLOT_POSITIONS[i];
      const dx = b.x - pos.x;
      const dy = b.y - pos.y;
      const dist = Math.hypot(dx, dy);

      // 1. 真珠貝（丸バンパー）
      if (part.type === 'bumper_circle') {
        const r = 18;
        const minDist = r + ballRadius;
        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = pos.x + nx * minDist;
          b.y = pos.y + ny * minDist;
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx -= 1.9 * dot * nx;
            b.vy -= 1.9 * dot * ny;
          }
          const impulse = 155 + part.level * 28;
          b.vx += nx * impulse;
          b.vy += ny * impulse;

          if (part.cooldown <= 0) {
            part.cooldown = 0.06;
            part.pulse = 1.45;
            sfx.bumper(state.combo);
            triggerShake(0.08, 2.2);
            notifyOtherBatteriesCharged(i);
            addScore(100 * part.level, pos.x, pos.y, '#ff5c8a', 1, i);
            spawnParticles(pos.x + nx * r, pos.y + ny * r, '#ff5c8a', 10, 140);
            if (hasSynergy('bumper_kingdom')) {
              spawnShockwave(pos.x, pos.y, '#ff5c8a', 44);
            }
          }
        }
      }

      // 2. 枝珊瑚（三角バンパー）
      else if (part.type === 'bumper_tri') {
        const verts = getTriangleVertices(pos.x, pos.y, 21, part.dir);
        for (let e = 0; e < 3; e++) {
          const v1 = verts[e];
          const v2 = verts[(e + 1) % 3];
          const cp = closestPointOnSegment(b.x, b.y, v1.x, v1.y, v2.x, v2.y);
          const edx = b.x - cp.x;
          const edy = b.y - cp.y;
          const edist = Math.hypot(edx, edy);
          if (edist < ballRadius + 2 && edist > 0.0001) {
            const nx = edx / edist;
            const ny = edy / edist;
            b.x = cp.x + nx * (ballRadius + 2);
            b.y = cp.y + ny * (ballRadius + 2);
            const dot = b.vx * nx + b.vy * ny;
            if (dot < 0) {
              b.vx -= 1.95 * dot * nx;
              b.vy -= 1.95 * dot * ny;
            }
            const impulse = 190 + part.level * 30;
            b.vx += nx * impulse;
            b.vy += ny * impulse;

            if (part.cooldown <= 0) {
              part.cooldown = 0.07;
              part.pulse = 1.45;
              sfx.bumper(state.combo);
              triggerShake(0.09, 2.5);
              notifyOtherBatteriesCharged(i);
              addScore(150 * part.level, pos.x, pos.y, '#ff9e00', comboGainReflect, i);
              spawnParticles(cp.x, cp.y, '#ff9e00', 11, 155);
              if (hasSynergy('bumper_kingdom')) {
                spawnShockwave(pos.x, pos.y, '#ff9e00', 46);
              }
            }
            break;
          }
        }
      }

      // 3. 熱水噴出孔（キッカー）
      else if (part.type === 'kicker') {
        const r = 17;
        const minDist = r + ballRadius;
        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = pos.x + nx * minDist;
          b.y = pos.y + ny * minDist;

          const kickVy = -(530 + part.level * 55 + (hasSynergy('perpetual_engine') ? 45 : 0));
          b.vy = Math.min(b.vy, kickVy);
          b.vx = b.vx * 0.6 + nx * 170;

          if (part.cooldown <= 0) {
            part.cooldown = 0.09;
            part.pulse = 1.5;
            sfx.kicker();
            triggerShake(0.1, 2.8);
            notifyOtherBatteriesCharged(i);
            addScore(150 * part.level, pos.x, pos.y, '#20e3b2', 1, i);
            spawnParticles(pos.x, pos.y - 10, '#20e3b2', 14, 180);
            spawnShockwave(pos.x, pos.y, '#20e3b2', 44);
          }
        }
      }

      // 4. 海流の渦（スピナー）
      else if (part.type === 'spinner') {
        const r = 20;
        if (dist < r + ballRadius && part.cooldown <= 0) {
          part.cooldown = 0.072;
          part.spinVel = 30;
          part.pulse = 1.25;
          const spd = Math.hypot(b.vx, b.vy);
          const accelBoost = hasSynergy('perpetual_engine') ? 1.11 : 1.07;
          if (spd > 15) {
            const newSpd = Math.min(840, spd * accelBoost + 30);
            b.vx = (b.vx / spd) * newSpd;
            b.vy = (b.vy / spd) * newSpd;
          } else {
            b.vy -= 95;
          }
          sfx.spinner();
          notifyOtherBatteriesCharged(i);
          addScore(30 * part.level, pos.x, pos.y, '#00e5ff', 1, i);
          spawnParticles(b.x, b.y, '#00e5ff', 5, 85);
        }
      }

      // 5. 岩礁（リバウンド壁）
      else if (part.type === 'rebound_wall') {
        const angle = part.dir > 0 ? 0.52 : -0.52;
        const halfLen = 23;
        const x1 = pos.x - Math.cos(angle) * halfLen;
        const y1 = pos.y - Math.sin(angle) * halfLen;
        const x2 = pos.x + Math.cos(angle) * halfLen;
        const y2 = pos.y + Math.sin(angle) * halfLen;

        const cp = closestPointOnSegment(b.x, b.y, x1, y1, x2, y2);
        const wdx = b.x - cp.x;
        const wdy = b.y - cp.y;
        const wdist = Math.hypot(wdx, wdy);
        const minDist = ballRadius + 4;

        if (wdist < minDist && wdist > 0.0001) {
          const nx = wdx / wdist;
          const ny = wdy / wdist;
          b.x = cp.x + nx * minDist;
          b.y = cp.y + ny * minDist;
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx -= 1.85 * dot * nx;
            b.vy -= 1.85 * dot * ny;
          }
          const pushPower = 95 + part.level * 18;
          b.vx += nx * pushPower;
          b.vy += (ny < 0 ? ny * pushPower : ny * pushPower * 0.2 - 35);

          if (part.cooldown <= 0) {
            part.cooldown = 0.07;
            part.pulse = 1.4;
            sfx.bumper(state.combo);
            notifyOtherBatteriesCharged(i);
            addScore(50 * part.level, pos.x, pos.y, '#ffd97d', comboGainReflect, i);
            spawnParticles(cp.x, cp.y, '#ffd97d', 8, 120);
          }
        }
      }

      // 6. 渦潮（ワープゲート）
      else if (part.type === 'warp_gate') {
        const r = 16;
        if (dist < r && b.warpCooldown <= 0 && part.pairSlotId !== null) {
          const destPos = SLOT_POSITIONS[part.pairSlotId];
          const destPart = state.slots[part.pairSlotId];
          if (destPos && destPart) {
            b.x = destPos.x;
            b.y = destPos.y;
            const spd = Math.hypot(b.vx, b.vy);
            if (spd < 190) {
              const a = Math.atan2(b.vy || -1, b.vx || 0.2);
              b.vx = Math.cos(a) * 250;
              b.vy = Math.sin(a) * 250;
            }
            b.warpCooldown = 0.45;
            b.trail = [];
            part.pulse = 1.6;
            destPart.pulse = 1.6;
            sfx.warp();
            notifyOtherBatteriesCharged(i);

            let warpCombo = 1;
            if (hasSynergy('dimensional_accel')) {
              warpCombo = 3;
              state.warpAuraTimer = 3.0;
            }
            addScore(300 * part.level, destPos.x, destPos.y, '#a855f7', warpCombo, i, '🌊MAELSTROM');
            spawnShockwave(pos.x, pos.y, '#a855f7', 48);
            spawnShockwave(destPos.x, destPos.y, '#00e5ff', 58);
            spawnParticles(pos.x, pos.y, '#a855f7', 14, 150);
            spawnParticles(destPos.x, destPos.y, '#00e5ff', 18, 190);
            break;
          }
        }
      }

      // 7. 起爆ウニ（3回ヒットで隣接140px以内の全パーツを強制起動）
      else if (part.type === 'detonator') {
        const r = 18;
        const minDist = r + ballRadius;
        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = pos.x + nx * minDist;
          b.y = pos.y + ny * minDist;
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx -= 1.9 * dot * nx;
            b.vy -= 1.9 * dot * ny;
          }
          const impulse = 155 + part.level * 26;
          b.vx += nx * impulse;
          b.vy += ny * impulse;

          if (part.cooldown <= 0) {
            part.cooldown = 0.07;
            part.pulse = 1.45;
            part.detCount = (part.detCount || 0) + 1;
            sfx.bumper(state.combo);
            triggerShake(0.08, 2.3);
            notifyOtherBatteriesCharged(i);
            addScore(80 * part.level, pos.x, pos.y, '#ff4d6d', 1, i, `💥起爆ウニ(${part.detCount}/3)`);
            spawnParticles(pos.x + nx * r, pos.y + ny * r, '#ff4d6d', 10, 145);

            if (part.detCount >= 3) {
              triggerDetonation(i, 0);
            }
          }
        }
      }

      // 8. 蓄電クラゲ（他パーツヒットで最大10まで充電、ヒット時に25×充電数×Lv点を放出）
      else if (part.type === 'battery') {
        const r = 18;
        const minDist = r + ballRadius;
        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = pos.x + nx * minDist;
          b.y = pos.y + ny * minDist;
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx -= 1.88 * dot * nx;
            b.vy -= 1.88 * dot * ny;
          }
          const impulse = 150 + part.level * 24;
          b.vx += nx * impulse;
          b.vy += ny * impulse;

          if (part.cooldown <= 0) {
            part.cooldown = 0.07;
            part.pulse = 1.55;
            const chg = part.charge || 0;
            const dischargePts = 25 * Math.max(1, chg) * part.level;
            part.charge = 0;
            if (chg >= 5) {
              sfx.skillShot();
              triggerShake(0.12, 3.2);
            } else {
              sfx.bumper(state.combo);
            }
            notifyOtherBatteriesCharged(i);
            addScore(
              dischargePts,
              pos.x,
              pos.y,
              '#00f5d4',
              1 + Math.floor(chg / 4),
              i,
              chg > 0 ? `⚡放電×${chg}!` : '⚡蓄電クラゲ'
            );
            spawnShockwave(pos.x, pos.y, '#00f5d4', 40 + chg * 4);
            spawnParticles(pos.x, pos.y, '#00f5d4', 10 + chg * 2, 165);
          }
        }
      }

      // 9. 分裂クラゲ（ヒットで±25度のミニボール2個を生成、クールダウン10秒、最大4個）
      else if (part.type === 'split') {
        const r = 18;
        const minDist = r + ballRadius;
        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = pos.x + nx * minDist;
          b.y = pos.y + ny * minDist;
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx -= 1.88 * dot * nx;
            b.vy -= 1.88 * dot * ny;
          }
          const impulse = 150 + part.level * 25;
          b.vx += nx * impulse;
          b.vy += ny * impulse;

          if (part.cooldown <= 0) {
            part.cooldown = 0.07;
            part.pulse = 1.5;
            notifyOtherBatteriesCharged(i);

            let label = '';
            if ((part.splitCooldown || 0) <= 0) {
              const spawned = spawnMiniBalls(b.x, b.y, b.vx, b.vy);
              if (spawned > 0) {
                part.splitCooldown = 10.0;
                label = `🪼分裂! (+${spawned}球)`;
                sfx.warp();
                triggerShake(0.1, 2.6);
                spawnShockwave(pos.x, pos.y, '#72efdd', 56);
              } else {
                sfx.bumper(state.combo);
              }
            } else {
              sfx.bumper(state.combo);
            }
            addScore(100 * part.level, pos.x, pos.y, '#72efdd', 1, i, label);
            spawnParticles(pos.x + nx * r, pos.y + ny * r, '#72efdd', 12, 150);
          }
        }
      }

      // 10. 変異パーツ（化学反応6種）の衝突・固有挙動
      else if (MUTATED_PARTS[part.type]) {
        const mp = MUTATED_PARTS[part.type];
        const r = 20;
        const minDist = r + ballRadius;
        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = pos.x + nx * minDist;
          b.y = pos.y + ny * minDist;
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx -= 1.92 * dot * nx;
            b.vy -= 1.92 * dot * ny;
          }

          if (part.type === 'plasma_vent') {
            b.vx = (b.vx * 0.45) + (Math.random() - 0.5) * 140;
            b.vy = -(560 + part.level * 55);
          } else {
            const impulse = 175 + part.level * 30;
            b.vx += nx * impulse;
            b.vy += ny * impulse;
          }

          if (part.cooldown <= 0) {
            part.cooldown = 0.07;
            part.pulse = 1.65;
            notifyOtherBatteriesCharged(i);

            if (part.type === 'blast_jelly') {
              // 爆裂クラゲ：2ヒットごとに隣接起爆＋ミニボール3発四方射出！
              part.detCount = (part.detCount || 0) + 1;
              if (part.detCount >= 2) {
                part.detCount = 0;
                triggerDetonation(i, 0);
                const sp = spawnMiniBalls(pos.x, pos.y, b.vx, b.vy, 3, 6);
                addScore(mp.basePt * part.level, pos.x, pos.y, mp.color, 2, i, sp > 0 ? `💥爆裂+${sp}球!` : '💥爆裂!');
              } else {
                sfx.bumper(state.combo);
                addScore(150 * part.level, pos.x, pos.y, mp.color, 1, i, `💥爆裂 (${part.detCount}/2)`);
              }
            } else if (part.type === 'gravity_pearl') {
              // 重力真珠：吸引→高反発＋周囲衝撃波
              sfx.warp();
              addScore(mp.basePt * part.level, pos.x, pos.y, mp.color, 2, i, '🌀重力真珠');
              spawnShockwave(pos.x, pos.y, mp.color, 64);
            } else if (part.type === 'plasma_vent') {
              // 雷流噴出孔：高速打ち上げ＋2ヒットごとにランダム他パーツ2個へ雷撃連鎖！
              part.detCount = (part.detCount || 0) + 1;
              sfx.kicker();
              addScore(mp.basePt * part.level, pos.x, pos.y, mp.color, 2, i, '⚡雷流噴出!');
              if (part.detCount >= 2) {
                part.detCount = 0;
                const others = [];
                for (let j = 0; j < state.slots.length; j++) {
                  if (j !== i && state.slots[j]) others.push(j);
                }
                for (let k = 0; k < 2 && others.length > 0; k++) {
                  const pickIdx = Math.floor(Math.random() * others.length);
                  const targetId = others.splice(pickIdx, 1)[0];
                  forceActivateSlot(targetId, i, 0);
                }
              }
            } else if (part.type === 'vortex_reef') {
              // 竜巻珊瑚：高速スピン開始（周囲の魚を吸引）＋コンボ+2
              part.spinVel = 45;
              sfx.spinner();
              addScore(mp.basePt * part.level, pos.x, pos.y, mp.color, 2, i, '🌪️竜巻珊瑚');
            } else if (part.type === 'mirror_mine') {
              // 鏡面機雷：スコア+20%オーラ（最大3重）＋隣接1パーツ強制起動
              state.mirrorAuraStacks = Math.min(3, (state.mirrorAuraStacks || 0) + 1);
              state.mirrorAuraTimer = 6.0;
              sfx.skillShot();
              addScore(mp.basePt * part.level, pos.x, pos.y, mp.color, 2, i, `💎鏡面オーラ×${state.mirrorAuraStacks}`);
              let nearestId = -1, nearestDist = 155;
              for (let j = 0; j < state.slots.length; j++) {
                if (j === i || !state.slots[j]) continue;
                const d2 = Math.hypot(pos.x - SLOT_POSITIONS[j].x, pos.y - SLOT_POSITIONS[j].y);
                if (d2 < nearestDist) { nearestDist = d2; nearestId = j; }
              }
              if (nearestId !== -1) forceActivateSlot(nearestId, i, 0);
            } else if (part.type === 'electro_prism') {
              // 放電プリズム：充電解放でミニボール2球＋隣接起爆
              const chg = part.charge || 0;
              part.charge = 0;
              const pts = (mp.basePt + chg * 35) * part.level;
              sfx.skillShot();
              let lbl = chg >= 3 ? `✨放電×${chg}!` : '✨プリズム';
              if (chg >= 3) {
                const sp = spawnMiniBalls(pos.x, pos.y, b.vx, b.vy, 2, 6);
                if (sp > 0) lbl = `✨放電+${sp}球!`;
                triggerDetonation(i, 0);
              }
              addScore(pts, pos.x, pos.y, mp.color, 2, i, lbl);
            }
            spawnParticles(pos.x, pos.y, mp.color, 16, 175);
          }
        }
      }

      // 分裂真珠（ボールカード）：メインボールがパーツに4回当たるたびにミニボール自動分裂
      if (isPrimaryBall && state.ballType === 'split_pearl' && part.cooldown === 0.07) {
        state.splitPearlHits = (state.splitPearlHits || 0) + 1;
        if (state.splitPearlHits >= 4) {
          state.splitPearlHits = 0;
          const sp = spawnMiniBalls(b.x, b.y, b.vx, b.vy, 1, 6);
          if (sp > 0) {
            sfx.warp();
            spawnPopup(b.x, b.y - 12, '🔮真珠分裂!', '#f472b6', 13);
            spawnShockwave(b.x, b.y, '#f472b6', 44);
          }
        }
      }
    }
  }

  function triggerMysteryHappening(cx, cy) {
    // 直前と同じハプニングを避けてランダム選出
    const candidates = HAPPENING_DEFS.filter(h => h.id !== state.lastHappeningId);
    const picked = candidates[Math.floor(Math.random() * candidates.length)] || HAPPENING_DEFS[0];
    state.lastHappeningId = picked.id;

    sfx.jackpot();
    state.hitStopTimer = 0.06;
    triggerShake(0.24, 5.5);
    spawnShockwave(cx, cy, picked.color, 130);
    spawnParticles(cx, cy, picked.color, 34, 240);
    showCenterBanner(`🐚 封印解放! ${picked.name}`, picked.desc, picked.color, 2.2);

    if (picked.duration > 0) {
      state.activeHappening = {
        id: picked.id,
        name: picked.name,
        badge: picked.badge,
        color: picked.color,
        timer: picked.duration,
        maxTimer: picked.duration
      };
    }

    if (picked.id === 'pearl_storm') {
      spawnMiniBalls(cx, cy, 0, -380, 4, 6);
    } else if (picked.id === 'all_overdrive') {
      for (let j = 0; j < state.slots.length; j++) {
        if (state.slots[j]) {
          forceActivateSlot(j, j, 1);
        }
      }
    } else if (picked.id === 'fish_rush') {
      for (let k = 0; k < 5; k++) {
        spawnOneFish();
      }
    }
    updateHUD();
  }

  function collideMysteryShell(b, ballRadius) {
    const ms = state.mysteryShell;
    if (!ms.active) return;
    const dx = b.x - ms.x;
    const dy = b.y - ms.y;
    const dist = Math.hypot(dx, dy);
    const minDist = ms.r + ballRadius;
    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      b.x = ms.x + nx * minDist;
      b.y = ms.y + ny * minDist;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx -= 1.88 * dot * nx;
        b.vy -= 1.88 * dot * ny;
      }
      b.vx += nx * 165;
      b.vy += ny * 165;

      if (ms.cooldown <= 0) {
        ms.cooldown = 0.14;
        ms.hp--;
        ms.pulse = 1.55;
        if (ms.hp > 0) {
          sfx.skillShot();
          spawnShockwave(ms.x, ms.y, '#c084fc', 55);
          spawnParticles(ms.x, ms.y, '#ffd97d', 14, 160);
          addScore(250, ms.x, ms.y, '#c084fc', 2, -1, `🐚封印ひび! (残り${ms.hp})`);
        } else {
          ms.active = false;
          ms.respawnTimer = 14.0;
          addScore(600, ms.x, ms.y, '#ffd97d', 3, -1, '🐚大貝開封!!');
          triggerMysteryHappening(ms.x, ms.y);
        }
      }
    }
  }

  function collideMiniBallWithFishes(mb) {
    // ミニボールは魚に当たると跳ね返るが、魚は回収しない（指示書_連鎖パーツ.md 準拠）
    for (let i = 0; i < state.activeFishes.length; i++) {
      const f = state.activeFishes[i];
      const dx = mb.x - f.x;
      const dy = mb.y - f.y;
      const dist = Math.hypot(dx, dy);
      const minDist = f.spec.r + mb.r;
      if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        mb.x = f.x + nx * minDist;
        mb.y = f.y + ny * minDist;
        const dot = mb.vx * nx + mb.vy * ny;
        if (dot < 0) {
          mb.vx -= 1.85 * dot * nx;
          mb.vy -= 1.85 * dot * ny;
        }
        mb.vx += nx * 115;
        mb.vy += ny * 115;
        spawnParticles(mb.x, mb.y, '#72efdd', 5, 90);
        break;
      }
    }
  }

  function triggerNudge(dirX = 0) {
    if (state.phase !== 'PLAY' || state.ball.waitingLaunch || state.ball.inLane || state.tiltPenalty) return;
    state.nudgeHeat += 0.42;
    const vxAdd = (dirX !== 0 ? dirX : (Math.random() < 0.5 ? -1 : 1)) * 125;
    state.ball.vx += vxAdd;
    state.ball.vy -= 85;
    triggerShake(0.15, 4.5);
    sfx.nudge();

    if (state.nudgeHeat >= 1.0) {
      state.tiltPenalty = true;
      setFlippersPressed(true, false);
      setFlippersPressed(false, false);
      sfx.tilt();
      showCenterBanner('PRESSURE TILT!!', '揺らしすぎ警告！フリッパーが一時ロック', '#ff5c8a', 1.4);
      updateHUD();
    } else if (state.nudgeHeat >= 0.7) {
      spawnPopup(state.ball.x, state.ball.y, '⚠ DANGER (水圧TILT注意)', '#ffd97d', 12);
    }
  }

  function updateMarineEnvironment(dt) {
    // マリンスノー更新
    for (let i = 0; i < marineSnow.length; i++) {
      const ms = marineSnow[i];
      ms.y += ms.vy * dt;
      ms.phase += dt * 1.4;
      ms.x += Math.sin(ms.phase) * 6 * dt;
      if (ms.y > WORLD_H) {
        ms.y = -4;
        ms.x = 16 + Math.random() * (LANE_X - 24);
      }
    }

    // 泡（下から上へ昇る量を増量）
    if (Math.random() < dt * 4.5 && seaBubbles.length < 34) {
      seaBubbles.push({
        x: 20 + Math.random() * (LANE_X - 36),
        y: WORLD_H + 6,
        r: 1.5 + Math.random() * 3.8,
        vy: -(42 + Math.random() * 52),
        wobble: Math.random() * Math.PI * 2
      });
    }
    for (let i = seaBubbles.length - 1; i >= 0; i--) {
      const bb = seaBubbles[i];
      bb.y += bb.vy * dt;
      bb.wobble += dt * 4;
      bb.x += Math.sin(bb.wobble) * 14 * dt;
      if (bb.y < -10) seaBubbles.splice(i, 1);
    }
  }

  function stepPhysics(dt) {
    updateMarineEnvironment(dt);

    if (state.hitStopTimer > 0) {
      state.hitStopTimer = Math.max(0, state.hitStopTimer - dt);
      return;
    }

    if (state.shakeTimer > 0) {
      state.shakeTimer = Math.max(0, state.shakeTimer - dt);
    }

    if (state.skillShotTimer > 0) state.skillShotTimer = Math.max(0, state.skillShotTimer - dt);
    if (state.ballSaverTimer > 0) state.ballSaverTimer = Math.max(0, state.ballSaverTimer - dt);
    if (state.centerPostTimer > 0) state.centerPostTimer = Math.max(0, state.centerPostTimer - dt);
    if (state.warpAuraTimer > 0) state.warpAuraTimer = Math.max(0, state.warpAuraTimer - dt);
    if (state.feverTimer > 0) {
      state.feverTimer = Math.max(0, state.feverTimer - dt);
      if (state.feverTimer === 0) updateHUD();
    }
    if (state.nudgeHeat > 0 && !state.tiltPenalty) {
      state.nudgeHeat = Math.max(0, state.nudgeHeat - dt * 0.25);
    }

    // 連鎖カウンターの3秒減衰タイマー
    if (state.chainTimer > 0) {
      state.chainTimer = Math.max(0, state.chainTimer - dt);
      if (state.chainTimer === 0) {
        state.chainCount = 0;
      }
    }
    for (let i = state.chainLinks.length - 1; i >= 0; i--) {
      state.chainLinks[i].timer -= dt;
      if (state.chainLinks[i].timer <= 0) {
        state.chainLinks.splice(i, 1);
      }
    }

    if (state.phase === 'PLAY') {
      updateFishes(dt);

      // R2「海流」＆ R8「ボス＋海流」モディファイア：約6秒ごとに1.5秒間、横向きの海流がボールを押す（事前に矢印予告）
      if (state.currentState.enabled && !state.ball.waitingLaunch) {
        const cs = state.currentState;
        if (cs.activeDuration > 0) {
          cs.activeDuration -= dt;
          if (Math.random() < dt * 18) {
            state.particles.push({
              x: cs.dir > 0 ? 18 : (LANE_X - 18),
              y: 110 + Math.random() * 440,
              vx: cs.dir * (210 + Math.random() * 90),
              vy: (Math.random() - 0.5) * 24,
              color: '#00e5ff',
              life: 0.45,
              maxLife: 0.55
            });
          }
          if (cs.activeDuration <= 0) {
            cs.activeDuration = 0;
            cs.timer = 4.5;
            cs.dir = Math.random() < 0.5 ? 1 : -1;
          }
        } else {
          cs.timer -= dt;
          if (cs.timer <= 0) {
            cs.activeDuration = 1.5;
            sfx.kicker();
          }
        }
      }
    }

    if (state.jackpotDrone.active) {
      const jd = state.jackpotDrone;
      jd.x += jd.vx * dt;
      if (jd.x < 75) { jd.x = 75; jd.vx = Math.abs(jd.vx); }
      if (jd.x > 298) { jd.x = 298; jd.vx = -Math.abs(jd.vx); }
    }

    // R8以降：深海の主（大型深海魚ボス）のゆっくり回遊
    if (state.bossCore.active) {
      const bc = state.bossCore;
      bc.x += bc.vx * dt;
      bc.swimPhase += dt * 2.4;
      bc.y = bc.baseY + Math.sin(bc.swimPhase) * 14;
      if (bc.x < 105) { bc.x = 105; bc.vx = Math.abs(bc.vx); }
      if (bc.x > 268) { bc.x = 268; bc.vx = -Math.abs(bc.vx); }
      if (bc.pulse > 1) bc.pulse = Math.max(1, bc.pulse - dt * 2.5);
    }

    if (state.phase === 'PLAY' && state.ball.waitingLaunch) {
      if (state.plunger.charging) {
        state.plunger.power = Math.min(1, state.plunger.power + dt * 1.15);
        state.ball.y = 610 + state.plunger.power * 14;
      }
    }

    // 封印された大貝（Mystery Shell）・深海ハプニング・鏡面オーラ・オーバーキルのタイマー更新
    const ms = state.mysteryShell;
    if (ms.cooldown > 0) ms.cooldown = Math.max(0, ms.cooldown - dt);
    if (ms.pulse > 1) ms.pulse = Math.max(1, ms.pulse - dt * 2.8);
    if (!ms.active && state.phase === 'PLAY' && ms.spawnsThisRound < 2) {
      ms.respawnTimer -= dt;
      if (ms.respawnTimer <= 0) {
        spawnMysteryShell();
      }
    }
    if (state.activeHappening) {
      state.activeHappening.timer -= dt;
      if (state.activeHappening.timer <= 0) {
        state.activeHappening = null;
        updateHUD();
      }
    }
    if (state.mirrorAuraTimer > 0) {
      state.mirrorAuraTimer = Math.max(0, state.mirrorAuraTimer - dt);
      if (state.mirrorAuraTimer <= 0) state.mirrorAuraStacks = 0;
    }
    if (state.overkillActive && state.phase === 'PLAY') {
      state.overkillTimer -= dt;
      updateOverkillBarUI();
      if (state.overkillTimer <= 0) {
        finishOverkillRound();
        return;
      }
    }

    for (let i = 0; i < state.slots.length; i++) {
      const p = state.slots[i];
      if (!p) continue;
      if (p.pulse > 1) p.pulse = Math.max(1, p.pulse - dt * 2.5);
      if (p.splitCooldown > 0) p.splitCooldown = Math.max(0, p.splitCooldown - dt);
      if (p.spinVel > 0) {
        p.angle += p.spinVel * dt;
        p.spinVel = Math.max(0, p.spinVel - dt * 18);
        // 竜巻珊瑚：回転中は周囲の深海魚を引き寄せる
        if (p.type === 'vortex_reef') {
          const vp = SLOT_POSITIONS[i];
          for (let fIdx = 0; fIdx < state.activeFishes.length; fIdx++) {
            const f = state.activeFishes[fIdx];
            const fdx = vp.x - f.x;
            const fdy = vp.y - f.y;
            const fd = Math.hypot(fdx, fdy);
            if (fd > 18 && fd < 150) {
              f.x += (fdx / fd) * 55 * dt;
              f.y += (fdy / fd) * 45 * dt;
            }
          }
        }
      } else if (p.type === 'warp_gate' || p.type === 'spinner' || p.type === 'vortex_reef' || p.type === 'gravity_pearl') {
        p.angle += dt * (p.type === 'warp_gate' || p.type === 'gravity_pearl' ? 2.2 : 0.9);
      }
    }
    for (let i = 0; i < walls.length; i++) {
      if (walls[i].pulse > 0) walls[i].pulse = Math.max(0, walls[i].pulse - dt * 4);
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      const sw = state.shockwaves[i];
      sw.r += (sw.maxR - sw.r) * dt * 9;
      sw.alpha -= dt * 2.2;
      if (sw.alpha <= 0) state.shockwaves.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pp = state.popups[i];
      pp.y += pp.vy * dt;
      pp.alpha -= dt * 1.12;
      if (pp.alpha <= 0) state.popups.splice(i, 1);
    }
    if (state.bannerText) {
      state.bannerText.timer -= dt;
      if (state.bannerText.timer <= 0) state.bannerText = null;
    }

    if (state.phase !== 'PLAY') return;

    if (state.ball.waitingLaunch) {
      updateFlipper(state.leftFlipper, dt);
      updateFlipper(state.rightFlipper, dt);
      return;
    }

    const b = state.ball;
    const speed = Math.hypot(b.vx, b.vy);

    // 溝つぶし＆レスキュー改善（🌊海流アシスト）
    // 1. 静止判定を2.5秒→1.2秒に短縮
    // 2. 同じ場所での低速往復（3秒間40px四方以内から出ない状態）も検出
    // 3. 発動時は盤面中央（x=187）＋上方向へ強く弾き出す
    if (!b.inLane) {
      state.posSampleTimer += dt;
      if (state.posSampleTimer >= 0.1) {
        state.posSampleTimer = 0;
        state.ballPosHistory.push({ x: b.x, y: b.y });
        if (state.ballPosHistory.length > 30) {
          state.ballPosHistory.shift();
        }
      }

      let triggerRescue = false;
      if (speed < 22) {
        state.stuckTimer += dt;
        if (state.stuckTimer >= 1.2) {
          triggerRescue = true;
        }
      } else {
        state.stuckTimer = Math.max(0, state.stuckTimer - dt * 0.5);
      }

      if (!triggerRescue && state.ballPosHistory.length >= 30) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < state.ballPosHistory.length; i++) {
          const hp = state.ballPosHistory[i];
          if (hp.x < minX) minX = hp.x;
          if (hp.x > maxX) maxX = hp.x;
          if (hp.y < minY) minY = hp.y;
          if (hp.y > maxY) maxY = hp.y;
        }
        if ((maxX - minX) <= 40 && (maxY - minY) <= 40) {
          triggerRescue = true;
        }
      }

      if (triggerRescue) {
        state.stuckTimer = 0;
        state.ballPosHistory = [];
        const dxCenter = 187 - b.x;
        const dirToCenter = Math.abs(dxCenter) < 12 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dxCenter);
        b.x += dirToCenter * 5;
        b.y -= 5;
        b.vx = dirToCenter * (200 + Math.random() * 45);
        b.vy = -340;
        spawnShockwave(b.x, b.y, '#70f5ff', 38);
        spawnParticles(b.x, b.y, '#70f5ff', 10, 140);
        spawnPopup(b.x, b.y, '🌊海流アシスト', '#70f5ff', 11.5);
      }
    } else {
      state.stuckTimer = 0;
      state.ballPosHistory = [];
    }

    const ballR = getBallRadius();
    const effGravity = getEffectiveGravity();
    const isAntiGrav = !!(state.activeHappening && state.activeHappening.id === 'anti_gravity' && state.activeHappening.timer > 0);
    const miniGravity = (isAntiGrav ? -GRAVITY * 0.55 : GRAVITY) * (hasRoundMod('low_gravity') ? 0.85 : 1.0);
    const currentPushAx = (state.currentState.enabled && state.currentState.activeDuration > 0)
      ? state.currentState.dir * 260
      : 0;

    const subSteps = Math.max(6, Math.min(20, Math.ceil((speed * dt) / (ballR * 0.35))));
    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      updateFlipper(state.leftFlipper, subDt);
      updateFlipper(state.rightFlipper, subDt);

      b.vy += effGravity * subDt;
      if (!b.inLane && currentPushAx !== 0) {
        b.vx += currentPushAx * subDt;
      }

      // 重力真珠（変異パーツ）の重力吸引
      if (!b.inLane) {
        for (let gi = 0; gi < state.slots.length; gi++) {
          const gp = state.slots[gi];
          if (gp && gp.type === 'gravity_pearl') {
            const gpos = SLOT_POSITIONS[gi];
            const gdx = gpos.x - b.x;
            const gdy = gpos.y - b.y;
            const gd = Math.hypot(gdx, gdy);
            if (gd > 24 && gd < 92) {
              const pull = (340 + gp.level * 60) * (1 - gd / 92);
              b.vx += (gdx / gd) * pull * subDt;
              b.vy += (gdy / gd) * pull * subDt;
            }
          }
        }

        // 磁石真珠（ボールカード）：近くの魚・封印大貝・ジャックポットへ磁力カーブ
        if (state.ballType === 'magnet_pearl') {
          let target = null;
          let bestDist = 145;
          if (state.mysteryShell.active) {
            const d = Math.hypot(state.mysteryShell.x - b.x, state.mysteryShell.y - b.y);
            if (d < bestDist) { bestDist = d; target = state.mysteryShell; }
          }
          if (state.jackpotDrone.active) {
            const d = Math.hypot(state.jackpotDrone.x - b.x, state.jackpotDrone.y - b.y);
            if (d < bestDist) { bestDist = d; target = state.jackpotDrone; }
          }
          for (let fi = 0; fi < state.activeFishes.length; fi++) {
            const f = state.activeFishes[fi];
            const d = Math.hypot(f.x - b.x, f.y - b.y);
            if (d < bestDist) { bestDist = d; target = f; }
          }
          if (target && bestDist > 14) {
            const mdx = target.x - b.x;
            const mdy = target.y - b.y;
            const mPull = 380 * (1 - bestDist / 145);
            b.vx += (mdx / bestDist) * mPull * subDt;
            b.vy += (mdy / bestDist) * mPull * subDt;
          }
        }
      }

      const curSpd = Math.hypot(b.vx, b.vy);
      const maxSpd = 980;
      if (curSpd > maxSpd) {
        b.vx = (b.vx / curSpd) * maxSpd;
        b.vy = (b.vy / curSpd) * maxSpd;
      }

      b.x += b.vx * subDt;
      b.y += b.vy * subDt;

      collideFlipper(state.leftFlipper, b, ballR);
      collideFlipper(state.rightFlipper, b, ballR);
      collideWalls(b, ballR, false);
      checkBoardGimmicks(subDt);
      collideMysteryShell(b, ballR);
      collidePartsForBall(b, ballR, subDt, true);
      collideFishes();

      // ミニボール（分裂クラゲ・爆裂クラゲ・分裂真珠から生成）の物理ステップ更新
      for (let m = 0; m < state.miniBalls.length; m++) {
        const mb = state.miniBalls[m];
        mb.vy += miniGravity * subDt;
        if (currentPushAx !== 0) {
          mb.vx += currentPushAx * 0.85 * subDt;
        }
        const mSpd = Math.hypot(mb.vx, mb.vy);
        if (mSpd > maxSpd) {
          mb.vx = (mb.vx / mSpd) * maxSpd;
          mb.vy = (mb.vy / mSpd) * maxSpd;
        }
        mb.x += mb.vx * subDt;
        mb.y += mb.vy * subDt;
        if (mb.x > LANE_X - mb.r) {
          mb.x = LANE_X - mb.r;
          mb.vx = -Math.abs(mb.vx) * 0.78;
        }

        collideFlipper(state.leftFlipper, mb, mb.r);
        collideFlipper(state.rightFlipper, mb, mb.r);
        collideWalls(mb, mb.r, true);
        collideBossWithBall(mb, mb.r);
        collideMysteryShell(mb, mb.r);
        collidePartsForBall(mb, mb.r, subDt, false);
        collideMiniBallWithFishes(mb);
      }

      if (b.inLane && b.y > 612 && b.vy >= 0) {
        b.y = 610;
        b.vx = 0;
        b.vy = 0;
        b.waitingLaunch = true;
        updateHUD();
        break;
      }
    }

    // ミニボールの寿命（12秒）＆画面下落下による消滅判定（残機には影響しない）
    for (let m = state.miniBalls.length - 1; m >= 0; m--) {
      const mb = state.miniBalls[m];
      mb.life -= dt;
      mb.trail.push({ x: mb.x, y: mb.y });
      if (mb.trail.length > 7) mb.trail.shift();

      if (mb.life <= 0 || mb.y > WORLD_H + mb.r * 2) {
        if (mb.life <= 0 && mb.y <= WORLD_H) {
          spawnParticles(mb.x, mb.y, '#72efdd', 6, 80);
        }
        state.miniBalls.splice(m, 1);
      }
    }

    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 11) b.trail.shift();

    if (!b.inLane && b.y > WORLD_H + ballR * 2) {
      onBallLost();
    }
  }

  // =========================================================================
  // 10. Canvas 描画処理（深海グラデーション・魚・発光生物・真珠ボール）
  // =========================================================================
  function drawBoard() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    if (state.shakeTimer > 0) {
      const mag = state.shakeIntensity * (state.shakeTimer / 0.16);
      ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
    }

    drawDeepSeaBackground();
    drawPinballGimmicks();

    // 渦潮（ワープゲート）のペア連結ライン
    ctx.save();
    let warpPairIndex = 0;
    const warpPairColors = ['rgba(168, 85, 247, 0.5)', 'rgba(0, 229, 255, 0.5)', 'rgba(255, 217, 125, 0.5)'];
    for (let i = 0; i < state.slots.length; i++) {
      const p = state.slots[i];
      if (p && p.type === 'warp_gate' && p.pairSlotId !== null && i < p.pairSlotId) {
        const p1 = SLOT_POSITIONS[i];
        const p2 = SLOT_POSITIONS[p.pairSlotId];
        ctx.strokeStyle = warpPairColors[warpPairIndex % warpPairColors.length];
        warpPairIndex++;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    ctx.restore();

    drawSlotsAndParts();
    drawMysteryShell();

    // 重力反転ハプニング中の上向きエネルギー矢印演出
    if (state.activeHappening && state.activeHappening.id === 'anti_gravity' && state.activeHappening.timer > 0) {
      ctx.save();
      const t = performance.now() * 0.004;
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.36)';
      ctx.lineWidth = 2;
      for (let ax = 68; ax <= 310; ax += 60) {
        const ay = 540 - ((t * 110 + ax * 2) % 440);
        ctx.beginPath();
        ctx.moveTo(ax - 8, ay + 8);
        ctx.lineTo(ax, ay);
        ctx.lineTo(ax + 8, ay + 8);
        ctx.stroke();
      }
      ctx.restore();
    }

    // オーバーキル中の黄金オーラ枠
    if (state.overkillActive) {
      ctx.save();
      const pulse = 0.25 + Math.sin(performance.now() * 0.014) * 0.14;
      ctx.strokeStyle = `rgba(255, 217, 125, ${pulse})`;
      ctx.lineWidth = 5;
      ctx.strokeRect(4, 4, VIEW_W - 8, VIEW_H - 8);
      ctx.restore();
    }

    // 起爆ウニの連鎖強制起動電撃ライン描画
    if (state.chainLinks.length > 0) {
      ctx.save();
      for (let i = 0; i < state.chainLinks.length; i++) {
        const cl = state.chainLinks[i];
        const alpha = Math.max(0, cl.timer / cl.maxTimer);
        ctx.strokeStyle = cl.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2.8;
        ctx.shadowColor = cl.color;
        ctx.shadowBlur = 12;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(cl.x1, cl.y1);
        ctx.lineTo(cl.x2, cl.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawSwimmingFishes();

    ctx.save();
    for (let i = 0; i < state.shockwaves.length; i++) {
      const sw = state.shockwaves[i];
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.lineWidth = 2.5;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 海底洞窟フレーム壁の描画
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      ctx.strokeStyle = w.pulse > 0 ? '#ffffff' : w.color;
      ctx.lineWidth = w.oneWayLeft ? 2.5 : (3.5 + w.pulse * 2.5);
      ctx.shadowColor = w.isSlingshot ? '#ff5c8a' : '#00b4d8';
      ctx.shadowBlur = w.isSlingshot ? 12 : 6;
      if (w.oneWayLeft) {
        ctx.setLineDash([5, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
    }
    ctx.restore();

    drawPlunger();
    drawLaunchPreview();

    drawFlipper(state.leftFlipper);
    drawFlipper(state.rightFlipper);

    drawBall();

    ctx.save();
    for (let i = 0; i < state.particles.length; i++) {
      const pt = state.particles[i];
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < state.popups.length; i++) {
      const pp = state.popups[i];
      ctx.font = `800 ${pp.size || 13}px sans-serif`;
      ctx.globalAlpha = Math.max(0, pp.alpha);
      ctx.fillStyle = pp.color;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 5;
      ctx.fillText(pp.text, pp.x, pp.y);
    }
    ctx.restore();

    drawSlotTooltip();

    if (state.bannerText) {
      const bt = state.bannerText;
      const alpha = Math.min(1, bt.timer * 3);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(4, 15, 32, 0.92)';
      ctx.strokeStyle = bt.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = bt.color;
      ctx.shadowBlur = 16;
      ctx.fillRect(26, 275, VIEW_W - 52, 82);
      ctx.strokeRect(26, 275, VIEW_W - 52, 82);

      ctx.fillStyle = bt.color;
      ctx.font = '900 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bt.text, VIEW_W / 2, 311);

      ctx.fillStyle = '#e6f6ff';
      ctx.font = '700 12.5px sans-serif';
      ctx.fillText(bt.sub, VIEW_W / 2, 338);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawDeepSeaBackground() {
    ctx.save();

    // 1. 深海グラデーション（上部に光の差し込み、下部ほど濃い紺）
    const seaGrad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    seaGrad.addColorStop(0, '#0f3b6e');
    seaGrad.addColorStop(0.26, '#082246');
    seaGrad.addColorStop(0.62, '#041229');
    seaGrad.addColorStop(1, '#01050e');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, VIEW_W, WORLD_H);

    // 2. 海面からの光の差し込み（ゴッドレイを強化し、中層まで届くよう密度アップ）
    const now = performance.now() * 0.001;
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const rx = 55 + i * 56 + Math.sin(now * 0.65 + i * 1.1) * 16;
      const rayLen = 360 + (i % 2) * 70;
      const rayGrad = ctx.createLinearGradient(rx, 0, rx + 28, rayLen);
      rayGrad.addColorStop(0, 'rgba(112, 245, 255, 0.17)');
      rayGrad.addColorStop(0.5, 'rgba(32, 227, 178, 0.07)');
      rayGrad.addColorStop(1, 'rgba(112, 245, 255, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(rx - 22, 10);
      ctx.lineTo(rx + 22, 10);
      ctx.lineTo(rx + 66, rayLen);
      ctx.lineTo(rx - 40, rayLen);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 2.5 背景中層〜下層の海底岩礁シルエット＆海溝アーチ（中央のスカスカ感を解消）
    ctx.save();
    // 遠景の海底山脈シルエット
    ctx.fillStyle = 'rgba(4, 15, 34, 0.72)';
    ctx.beginPath();
    ctx.moveTo(12, 660);
    ctx.lineTo(12, 470);
    ctx.lineTo(52, 435);
    ctx.lineTo(95, 490);
    ctx.lineTo(148, 455);
    ctx.lineTo(192, 505);
    ctx.lineTo(245, 448);
    ctx.lineTo(298, 495);
    ctx.lineTo(340, 442);
    ctx.lineTo(LANE_X, 480);
    ctx.lineTo(LANE_X, 660);
    ctx.closePath();
    ctx.fill();

    // 近景の盘面下部岩礁シルエット
    ctx.fillStyle = 'rgba(2, 9, 22, 0.85)';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(12, 660);
    ctx.lineTo(12, 545);
    ctx.lineTo(44, 525);
    ctx.lineTo(82, 565);
    ctx.lineTo(128, 548);
    ctx.lineTo(168, 595);
    ctx.lineTo(218, 595);
    ctx.lineTo(262, 545);
    ctx.lineTo(306, 565);
    ctx.lineTo(344, 525);
    ctx.lineTo(LANE_X, 550);
    ctx.lineTo(LANE_X, 660);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ゆらゆら揺れる海藻（7本）
    SEAWEEDS.forEach((sw) => {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sw.x, sw.baseY);
      for (let s = 1; s <= sw.seg; s++) {
        const t = s / sw.seg;
        const py = sw.baseY - sw.h * t;
        const sway = Math.sin(now * 2.1 + sw.phase + s * 0.65) * (10 * t);
        ctx.lineTo(sw.x + sway, py);
      }
      ctx.stroke();

      // 海藻の発光エッジ
      ctx.strokeStyle = sw.stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();

    // 3. マリンスノー（白い粒子がゆっくり漂う・増量）
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < marineSnow.length; i++) {
      const ms = marineSnow[i];
      ctx.globalAlpha = ms.alpha;
      ctx.beginPath();
      ctx.arc(ms.x, ms.y, ms.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 4. 下から上へ昇る泡（増量）
    ctx.strokeStyle = 'rgba(112, 245, 255, 0.48)';
    ctx.fillStyle = 'rgba(112, 245, 255, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i < seaBubbles.length; i++) {
      const bb = seaBubbles[i];
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 5. 壁際の発光クラゲ装飾（jellyfish.png 画像で描画）
    const jellyImg = getAssetImage('jellyfish');
    JELLYFISH_POSITIONS.forEach((jf) => {
      const bobY = jf.y + Math.sin(now * 2.2 + jf.phase) * 5;
      const swayRot = Math.sin(now * 1.6 + jf.phase) * 0.08;
      ctx.save();
      ctx.translate(jf.x, bobY);

      const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 36);
      halo.addColorStop(0, jf.color + '2e');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();

      if (jellyImg) {
        drawImageCentered(ctx, jellyImg, 0, 0, 34, 34, jf.x > 200, swayRot);
      }
      ctx.restore();
    });

    // コンボ倍率＆連鎖カウンターウォーターマーク
    ctx.textAlign = 'center';
    ctx.fillStyle = state.feverTimer > 0 ? 'rgba(32, 227, 178, 0.2)' : 'rgba(0, 229, 255, 0.09)';
    ctx.font = '900 28px sans-serif';
    ctx.fillText(`×${getComboMultiplier().toFixed(2)}`, 187, 562);
    if (state.chainCount > 0 && state.chainTimer > 0) {
      ctx.font = '900 12.5px sans-serif';
      ctx.fillStyle = 'rgba(255, 77, 109, 0.88)';
      ctx.fillText(`⚡連鎖×${state.chainCount} (+${state.chainCount * 10}% BONUS / ${state.chainTimer.toFixed(1)}s)`, 187, 540);
    }
    if (state.feverTimer > 0) {
      ctx.font = '800 12px sans-serif';
      ctx.fillStyle = 'rgba(32, 227, 178, 0.65)';
      ctx.fillText(`BIOLUMINESCENCE FEVER ${state.feverTimer.toFixed(1)}s`, 187, 580);
    } else if (state.warpAuraTimer > 0) {
      ctx.font = '800 11.5px sans-serif';
      ctx.fillStyle = 'rgba(168, 85, 247, 0.65)';
      ctx.fillText(`MAELSTROM AURA ×1.25 (${state.warpAuraTimer.toFixed(1)}s)`, 187, 580);
    }

    // R2「海流」・R8「深海の主＋海流」の方向矢印予告と発生中の水流エフェクト描画
    if (state.currentState.enabled && state.phase === 'PLAY') {
      const cs = state.currentState;
      const isRight = cs.dir > 0;
      const arrowStr = isRight ? '▶▶▶' : '◀◀◀';
      if (cs.activeDuration > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 229, 255, 0.24)';
        ctx.strokeStyle = 'rgba(112, 245, 255, 0.55)';
        ctx.lineWidth = 1.5;
        for (let row = 0; row < 3; row++) {
          const cy = 185 + row * 125;
          const shift = ((performance.now() * 0.22) % 60) * cs.dir;
          ctx.beginPath();
          ctx.moveTo(65 + shift, cy);
          ctx.lineTo(315 + shift, cy);
          ctx.stroke();
        }
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 5;
        ctx.font = '900 13.5px sans-serif';
        ctx.fillText(`🌊 ${arrowStr} 横海流 発生中! (${cs.activeDuration.toFixed(1)}s) ${arrowStr}`, 187, 108);
        ctx.restore();
      } else if (cs.timer <= 2.2) {
        const blink = Math.sin(performance.now() * 0.018) > -0.2;
        if (blink) {
          ctx.save();
          ctx.fillStyle = '#ffd97d';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 5;
          ctx.font = '900 12px sans-serif';
          ctx.fillText(`⚠ 海流予告: ${arrowStr} ${isRight ? '右向き' : '左向き'} (あと${cs.timer.toFixed(1)}s) ${arrowStr}`, 187, 108);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  function drawSwimmingFishes() {
    const now = performance.now() * 0.003;
    for (let i = 0; i < state.activeFishes.length; i++) {
      const f = state.activeFishes[i];
      ctx.save();

      if (f.spec.rarity !== 'normal') {
        ctx.strokeStyle = f.spec.rarity === 'ssr' ? 'rgba(255, 217, 125, 0.6)' : 'rgba(112, 245, 255, 0.38)';
        ctx.lineWidth = f.spec.rarity === 'ssr' ? 2 : 1.2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.spec.r + 6 + Math.sin(now * 3 + i) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      drawFishSpriteOnContext(ctx, f.spec, f.x, f.y, f.spec.r, f.dir, f.swimPhase);

      ctx.fillStyle = f.spec.rarity === 'ssr' ? '#ffd97d' : (f.spec.rarity === 'rare' ? '#70f5ff' : 'rgba(230, 246, 255, 0.8)');
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.font = '700 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.spec.name, f.x, f.y + f.spec.r + 12);
      ctx.restore();
    }
  }

  function drawPinballGimmicks() {
    ctx.save();
    const now = performance.now() * 0.004;

    // 1. 最上部・発光プランクトンの溜まり場3か所 (y=64)
    TOP_ROLLOVERS.forEach((ro, idx) => {
      ctx.save();
      ctx.translate(ro.x, ro.y);
      ctx.strokeStyle = ro.lit ? '#20e3b2' : 'rgba(0, 229, 255, 0.35)';
      ctx.fillStyle = ro.lit ? 'rgba(32, 227, 178, 0.3)' : 'rgba(5, 20, 40, 0.6)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#20e3b2';
      ctx.shadowBlur = ro.lit ? 14 : 4;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // プランクトンの発光粒子群
      ctx.fillStyle = ro.lit ? '#ffffff' : '#70f5ff';
      for (let p = 0; p < 5; p++) {
        const a = now + p * 1.25 + idx;
        const pr = 4.5 * Math.sin(now * 0.8 + p);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * pr, Math.sin(a) * pr, ro.lit ? 2 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 2. 左右壁の4つのイソギンチャク（anemone.png 画像で描画、触れると発光）
    const anemoneImg = getAssetImage('anemone');
    WALL_TARGETS.forEach((wt) => {
      const col = wt.lit ? '#ffd97d' : '#ff5c8a';
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = wt.lit ? 18 : 6;
      if (anemoneImg) {
        // 壁から内側へ向くように90度回転して配置
        const rot = wt.normalX > 0 ? Math.PI / 2 : -Math.PI / 2;
        const size = wt.lit ? 38 : 33;
        drawImageCentered(ctx, anemoneImg, wt.x + wt.normalX * 8, wt.y, size, size, false, rot);
      }
      if (wt.lit) {
        ctx.strokeStyle = '#ffd97d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wt.x + wt.normalX * 8, wt.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 3. 移動ジャックポット（黄金オウムガイ: nautilus.png）
    if (state.jackpotDrone.active) {
      const jd = state.jackpotDrone;
      const nautilusImg = getAssetImage('nautilus');
      ctx.save();
      ctx.translate(jd.x, jd.y);
      ctx.shadowColor = '#ffd97d';
      ctx.shadowBlur = 16;
      if (nautilusImg) {
        drawImageCentered(ctx, nautilusImg, 0, 0, 42, 42, jd.vx > 0, 0);
      }
      ctx.fillStyle = '#ffd97d';
      ctx.font = '900 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JACKPOT', 0, 21);
      ctx.restore();
    }

    // 4. R8ボス：大型の深海魚「深海の主」（boss.png 画像で描画）
    if (state.bossCore.active) {
      const bc = state.bossCore;
      const bossImg = getAssetImage('boss');
      ctx.save();
      ctx.translate(bc.x, bc.y);
      ctx.scale(bc.pulse, bc.pulse);

      ctx.shadowColor = bc.pulse > 1.05 ? '#ffd97d' : '#00e5ff';
      ctx.shadowBlur = bc.pulse > 1.05 ? 24 : 16;

      const dir = bc.vx >= 0 ? 1 : -1;
      const tilt = Math.sin(bc.swimPhase * 2) * 0.05;
      if (bossImg) {
        drawImageCentered(ctx, bossImg, 0, 0, 74, 58, dir === 1, tilt);
      }

      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#ffd97d';
      ctx.font = '900 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`深海の主 (あと${5 - (bc.hpHits % 5)}HIT)`, 0, 30);
      ctx.restore();
    }

    // 5. 海流バリア（ボールセイバー）＆ 魚効果【守り】インジケーター
    if (state.ballSaverTimer > 0 || state.guardExtraSavesLeft > 0) {
      const blink = (state.ballSaverTimer > 0 && state.ballSaverTimer < 1.5) ? (Math.sin(performance.now() * 0.025) > 0) : true;
      if (blink) {
        const col = state.ballSaverTimer > 0 ? '#20e3b2' : '#ffd97d';
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = col;
        ctx.shadowBlur = 10;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(118, 624);
        ctx.lineTo(268, 624);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = col;
        ctx.font = '800 9.5px sans-serif';
        ctx.textAlign = 'center';
        const label = state.ballSaverTimer > 0
          ? `🌊 PEARL SAVE ${state.ballSaverTimer.toFixed(1)}s${state.guardExtraSavesLeft > 0 ? ` (+🛡️×${state.guardExtraSavesLeft})` : ''}`
          : `🛡️ 魚の守りバリア待機中 (残り${state.guardExtraSavesLeft}回)`;
        ctx.fillText(label, 193, 638);
      }
    }

    // 6. センターセーフティピラー
    if (state.centerPostTimer > 0) {
      ctx.fillStyle = 'rgba(32, 227, 178, 0.35)';
      ctx.strokeStyle = '#20e3b2';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#20e3b2';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(193, 605, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 7. スリングショット内部の珊瑚発光装飾（溝つぶし後の座標に合わせる）
    ctx.fillStyle = 'rgba(255, 92, 138, 0.15)';
    ctx.beginPath();
    ctx.moveTo(54, 456);
    ctx.lineTo(44, 474);
    ctx.lineTo(48, 518);
    ctx.lineTo(88, 546);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(332, 456);
    ctx.lineTo(342, 474);
    ctx.lineTo(338, 518);
    ctx.lineTo(298, 546);
    ctx.closePath();
    ctx.fill();

    // 8. サイドアウトレーン・水流キックバック
    if (state.leftKickbackReady) {
      ctx.strokeStyle = '#70f5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 518);
      ctx.lineTo(44, 518);
      ctx.stroke();
      ctx.fillStyle = '#70f5ff';
      ctx.font = '800 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JET', 29, 512);
    }
    if (state.rightKickbackReady) {
      ctx.strokeStyle = '#70f5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(342, 518);
      ctx.lineTo(372, 518);
      ctx.stroke();
      ctx.fillStyle = '#70f5ff';
      ctx.font = '800 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JET', 357, 512);
    }

    ctx.restore();
  }

  function drawMysteryShell() {
    const ms = state.mysteryShell;
    if (!ms.active) return;
    const now = performance.now() * 0.005;
    const pulse = (ms.pulse || 1) + Math.sin(now * 2.2) * 0.04;

    ctx.save();
    ctx.translate(ms.x, ms.y);
    ctx.scale(pulse, pulse);

    // 神秘的なオーラリング
    const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, ms.r + 14);
    aura.addColorStop(0, 'rgba(255, 217, 125, 0.52)');
    aura.addColorStop(0.55, 'rgba(192, 132, 252, 0.30)');
    aura.addColorStop(1, 'rgba(192, 132, 252, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, ms.r + 14, 0, Math.PI * 2);
    ctx.fill();

    // 回転する封印の魔法輪
    ctx.save();
    ctx.rotate(now * 0.6);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, ms.r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 大貝本体（深海パールシェル）
    const bodyGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, ms.r);
    bodyGrad.addColorStop(0, '#fff7d6');
    bodyGrad.addColorStop(0.45, '#c084fc');
    bodyGrad.addColorStop(1, '#3b1566');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#ffd97d';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#ffd97d';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, ms.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ひび割れ線（HPが減るほど増える）
    if (ms.hp < 3) {
      ctx.strokeStyle = '#fff7d6';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-7, -9); ctx.lineTo(-1, -1); ctx.lineTo(6, 5);
      if (ms.hp === 1) {
        ctx.moveTo(8, -8); ctx.lineTo(1, 0); ctx.lineTo(-8, 8);
      }
      ctx.stroke();
    }

    // 中央の ??? ラベル
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('???', 0, 0);

    ctx.scale(1 / pulse, 1 / pulse);

    // 残り封印ドット（3個）
    for (let k = 0; k < ms.maxHp; k++) {
      const px = (k - 1) * 9;
      const py = ms.r + 9;
      ctx.fillStyle = k < ms.hp ? '#ffd97d' : 'rgba(127, 166, 196, 0.28)';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawSlotsAndParts() {
    const isPlacePhase = state.phase === 'PLACE';
    const showSkillTarget = state.phase === 'PLAY' && (state.ball.waitingLaunch || state.skillShotTimer > 0);
    const now = performance.now() * 0.004;

    for (let i = 0; i < SLOT_POSITIONS.length; i++) {
      const pos = SLOT_POSITIONS[i];
      const part = state.slots[i];
      const action = isPlacePhase ? getSlotActionType(i) : null;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      if (showSkillTarget && i === state.skillShotSlotId && part) {
        const pulseR = 26 + Math.sin(performance.now() * 0.012) * 3;
        ctx.strokeStyle = '#ffd97d';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.shadowColor = '#ffd97d';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffd97d';
        ctx.font = '800 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎯SKILL', 0, -28);
      }

      if (isPlacePhase) {
        if (state.warpFirstSlot === i) {
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, 28, 0, Math.PI * 2);
          ctx.stroke();
        } else if (action === 'fuse') {
          const fp = 28 + Math.sin(now * 3.5) * 2.5;
          ctx.strokeStyle = '#f472b6';
          ctx.fillStyle = 'rgba(244, 114, 182, 0.22)';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#f472b6';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(0, 0, fp, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fde047';
          ctx.font = '900 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚗合成!', 0, -31);
        } else if (action === 'new') {
          ctx.strokeStyle = '#20e3b2';
          ctx.fillStyle = 'rgba(32, 227, 178, 0.16)';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#20e3b2';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (action === 'upgrade') {
          ctx.strokeStyle = '#ffd97d';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#ffd97d';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(0, 0, 28, 0, Math.PI * 2);
          ctx.stroke();
        } else if (part) {
          ctx.globalAlpha = 0.45;
        }
      }

      // 7. 空きスロットの表示改善：点線の丸＋番号をやめ、薄く光る円だけにする
      if (!part) {
        const emptyGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
        if (isPlacePhase && action === 'new') {
          emptyGlow.addColorStop(0, 'rgba(32, 227, 178, 0.35)');
          emptyGlow.addColorStop(1, 'rgba(32, 227, 178, 0.04)');
          ctx.strokeStyle = 'rgba(32, 227, 178, 0.65)';
        } else {
          emptyGlow.addColorStop(0, 'rgba(112, 245, 255, 0.14)');
          emptyGlow.addColorStop(1, 'rgba(112, 245, 255, 0.01)');
          ctx.strokeStyle = 'rgba(112, 245, 255, 0.16)';
        }
        ctx.fillStyle = emptyGlow;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        continue;
      }

      const scale = part.pulse || 1;
      ctx.scale(scale, scale);

      // 通常パーツ9種＋変異パーツ6種の画像・オーラ描画
      const mutatedInfo = MUTATED_PARTS[part.type];
      const partImg = mutatedInfo ? getAssetImage(mutatedInfo.baseImg) : getAssetImage('part_' + part.type);
      const cardInfo = mutatedInfo || CARD_CATALOG.find(c => c.id === part.type);
      ctx.shadowColor = cardInfo ? cardInfo.color : '#70f5ff';
      let baseBlur = part.pulse > 1.05 ? 18 : 10;

      // 変異パーツ専用の二重発光オーラ＆回転リング
      if (mutatedInfo) {
        baseBlur = Math.max(baseBlur, 16);
        const mHalo = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
        mHalo.addColorStop(0, mutatedInfo.color + '88');
        mHalo.addColorStop(0.6, mutatedInfo.subColor + '33');
        mHalo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mHalo;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(now * 0.9);
        ctx.strokeStyle = mutatedInfo.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 起爆ウニ：カウントが進むほど光が強まる（0, 1, 2）
      if (part.type === 'detonator') {
        const dc = part.detCount || 0;
        baseBlur = Math.max(baseBlur, 8 + dc * 10);
        if (dc > 0) {
          const haloR = 22 + dc * 4 + Math.sin(now * 3) * 2;
          const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, haloR);
          halo.addColorStop(0, dc >= 2 ? 'rgba(255, 77, 109, 0.52)' : 'rgba(255, 77, 109, 0.28)');
          halo.addColorStop(1, 'rgba(255, 77, 109, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(0, 0, haloR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 蓄電クラゲ・放電プリズム：充電が溜まるほど画像が明るく光る（0〜10）
      else if (part.type === 'battery' || part.type === 'electro_prism') {
        const chg = part.charge || 0;
        baseBlur = Math.max(baseBlur, 8 + chg * 2.2);
        if (chg > 0) {
          const haloR = 20 + chg * 1.4;
          const alpha = Math.min(0.65, 0.12 + chg * 0.05);
          const halo = ctx.createRadialGradient(0, 0, 3, 0, 0, haloR);
          halo.addColorStop(0, `rgba(0, 245, 212, ${alpha})`);
          halo.addColorStop(1, 'rgba(0, 245, 212, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(0, 0, haloR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.shadowBlur = baseBlur;

      if (part.type === 'spinner' || part.type === 'warp_gate' || part.type === 'vortex_reef' || part.type === 'gravity_pearl') {
        drawImageCentered(ctx, partImg, 0, 0, 42, 42, false, part.angle);
      } else if (part.type === 'rebound_wall' || part.type === 'mirror_mine') {
        const rot = part.dir > 0 ? 0.35 : -0.35;
        drawImageCentered(ctx, partImg, 0, 0, 48, 42, part.dir < 0, rot);
      } else if (part.type === 'bumper_tri') {
        drawImageCentered(ctx, partImg, 0, 0, 46, 46, part.dir < 0, 0);
      } else {
        // bumper_circle, kicker, detonator, battery, split, blast_jelly, plasma_vent, electro_prism
        drawImageCentered(ctx, partImg, 0, 0, 44, 44, false, 0);
      }

      ctx.scale(1 / scale, 1 / scale);

      // 変異パーツの進化バッジ描画
      if (mutatedInfo) {
        ctx.save();
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillStyle = mutatedInfo.color;
        ctx.font = '900 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`★${mutatedInfo.icon}${mutatedInfo.shortName}`, 0, -26);
        ctx.restore();
      }

      // 連鎖パーツの個別ステータスバッジ描画
      if (part.type === 'detonator') {
        const dc = part.detCount || 0;
        ctx.save();
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillStyle = dc >= 2 ? '#ffd166' : '#ff8fa3';
        ctx.font = '900 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dc >= 2 ? '💥2/3(次起爆!)' : `💥${dc}/3`, 0, -24);
        ctx.restore();
      } else if (part.type === 'battery') {
        const chg = part.charge || 0;
        ctx.save();
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillStyle = chg >= 10 ? '#ffd166' : '#00f5d4';
        ctx.font = '900 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⚡${chg}`, 0, -24);
        ctx.restore();
      } else if (part.type === 'split') {
        const cd = part.splitCooldown || 0;
        ctx.save();
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillStyle = cd > 0 ? '#7fa6c4' : '#72efdd';
        ctx.font = '800 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cd > 0 ? `⏳${Math.ceil(cd)}s` : '🪼READY', 0, -24);
        ctx.restore();
      }
      if (part.level >= 2) {
        ctx.strokeStyle = part.level === 3 ? 'rgba(255, 217, 125, 0.65)' : 'rgba(32, 227, 178, 0.45)';
        ctx.lineWidth = part.level === 3 ? 2 : 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#000';
      ctx.fillStyle = part.level === 3 ? '#ffd97d' : (part.level === 2 ? '#20e3b2' : '#e6f6ff');
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(part.level === 3 ? '★MAX' : `Lv${part.level}`, 0, 25);

      if (isPlacePhase && action === 'upgrade') {
        ctx.fillStyle = '#ffd97d';
        ctx.font = '800 10px sans-serif';
        ctx.fillText('▲LvUP!', 0, -25);
      }

      ctx.restore();
    }
  }

  function drawSlotTooltip() {
    if (state.hoverSlotId < 0) return;
    const part = state.slots[state.hoverSlotId];
    if (!part) return;
    const card = CARD_CATALOG.find(c => c.id === part.type);
    if (!card) return;
    const pos = SLOT_POSITIONS[state.hoverSlotId];

    const tx = Math.max(85, Math.min(VIEW_W - 85, pos.x));
    const ty = pos.y > 110 ? pos.y - 44 : pos.y + 42;

    ctx.save();
    ctx.fillStyle = 'rgba(5, 18, 38, 0.94)';
    ctx.strokeStyle = card.color;
    ctx.lineWidth = 1.5;
    ctx.fillRect(tx - 82, ty - 18, 164, 34);
    ctx.strokeRect(tx - 82, ty - 18, 164, 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${card.shortName} Lv${part.level} (${card.basePt * part.level}pt)`, tx, ty - 4);
    ctx.fillStyle = '#7fa6c4';
    ctx.font = '600 9.5px sans-serif';
    ctx.fillText(`累計獲得: ${part.totalEarned.toLocaleString()} PTS (${part.hits}回)`, tx, ty + 10);
    ctx.restore();
  }

  function drawLaunchPreview() {
    if (state.phase !== 'PLAY' || !state.ball.waitingLaunch) return;

    const p = Math.max(0.18, state.plunger.power);
    ctx.save();
    ctx.strokeStyle = state.plunger.charging ? 'rgba(255, 217, 125, 0.6)' : 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = state.plunger.charging ? 2.5 : 1.5;
    ctx.setLineDash([6, 5]);
    ctx.shadowColor = '#70f5ff';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(391, 600);
    ctx.lineTo(391, 115);

    const archSteps = Math.floor(2 + p * 6);
    const previewPts = [
      [391, 75],
      [370, 38],
      [325, 22],
      [262, 19],
      [187, 19],
      [112, 22],
      [55,  38],
      [30,  85]
    ];
    for (let i = 0; i < Math.min(archSteps, previewPts.length); i++) {
      ctx.lineTo(previewPts[i][0], previewPts[i][1]);
    }
    ctx.stroke();

    const lastPt = previewPts[Math.min(archSteps, previewPts.length) - 1];
    if (lastPt && state.plunger.charging) {
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd97d';
      ctx.beginPath();
      ctx.arc(lastPt[0], lastPt[1], 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlunger() {
    const cx = (LANE_X + 408) / 2;
    const topY = 619 + state.plunger.power * 14;
    const botY = 632;

    ctx.save();
    ctx.strokeStyle = state.plunger.charging ? '#ffd97d' : '#ff5c8a';
    ctx.lineWidth = 3;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(LANE_X + 4, topY);
    ctx.lineTo(404, topY);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx, botY);
    ctx.stroke();

    if (state.ball.waitingLaunch && state.plunger.power > 0.01) {
      const h = 75 * state.plunger.power;
      ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.fillRect(LANE_X + 3, 610 - h, 408 - LANE_X - 6, h);
    }
    ctx.restore();
  }

  function drawFlipper(flipper) {
    const len = getFlipperLength();
    const x1 = flipper.pivotX;
    const y1 = flipper.pivotY;
    const x2 = x1 + Math.cos(flipper.angle) * len;
    const y2 = y1 + Math.sin(flipper.angle) * len;

    const color = state.tiltPenalty ? '#ff5c8a' : (state.flipperLevel > 0 ? '#20e3b2' : '#00e5ff');
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x1, y1, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBall() {
    const b = state.ball;
    const bSpec = getBallSpec();
    const ballR = bSpec.r;
    ctx.save();

    const trailColor = state.feverTimer > 0
      ? '32, 227, 178'
      : (state.warpAuraTimer > 0 ? '168, 85, 247' : bSpec.trailRgb);
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const ratio = (i + 1) / b.trail.length;
      ctx.fillStyle = `rgba(${trailColor}, ${ratio * 0.34})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ballR * ratio * 0.88, 0, Math.PI * 2);
      ctx.fill();
    }

    // ミニボール（分裂クラゲから生成・半径6px）の描画
    for (let m = 0; m < state.miniBalls.length; m++) {
      const mb = state.miniBalls[m];
      ctx.save();
      for (let i = 0; i < mb.trail.length; i++) {
        const t = mb.trail[i];
        const ratio = (i + 1) / mb.trail.length;
        ctx.fillStyle = `rgba(114, 239, 221, ${ratio * 0.28})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, mb.r * ratio * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
      const blinkAlpha = (mb.life < 2.5 && Math.sin(performance.now() * 0.03) < 0) ? 0.55 : 0.95;
      ctx.globalAlpha = blinkAlpha;
      const mGrad = ctx.createRadialGradient(mb.x - 2, mb.y - 2, 0.8, mb.x, mb.y, mb.r);
      mGrad.addColorStop(0, '#ffffff');
      mGrad.addColorStop(0.55, '#cbf3f0');
      mGrad.addColorStop(1, '#00f5d4');
      ctx.fillStyle = mGrad;
      ctx.shadowColor = '#72efdd';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(mb.x, mb.y, mb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ボール種別ごとの専用ビジュアル＆光り方
    if (state.ballType === 'glow') {
      // 発光玉：魚取得範囲(+40%)を示す生物発光オーラリングを常時脈動表示
      const pulseR = ballR * 1.65 + Math.sin(performance.now() * 0.01) * 2.5;
      const aura = ctx.createRadialGradient(b.x, b.y, ballR * 0.4, b.x, b.y, pulseR + 6);
      aura.addColorStop(0, 'rgba(56, 249, 215, 0.48)');
      aura.addColorStop(1, 'rgba(56, 249, 215, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(b.x, b.y, pulseR + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(114, 239, 221, 0.72)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, pulseR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const grad = ctx.createRadialGradient(b.x - ballR * 0.32, b.y - ballR * 0.32, 1, b.x, b.y, ballR);
    if (state.ballType === 'heavy') {
      // 重真珠（半径11・重厚な黄金黒真珠）
      grad.addColorStop(0, '#fff9db');
      grad.addColorStop(0.45, '#ffd166');
      grad.addColorStop(0.85, '#b07d12');
      grad.addColorStop(1, '#3d2c05');
      ctx.shadowColor = '#ff9e00';
      ctx.shadowBlur = 18;
    } else if (state.ballType === 'bubble') {
      // 泡玉（半径8・透明感のあるシャボン玉＆リムハイライト）
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.45, 'rgba(165, 243, 252, 0.55)');
      grad.addColorStop(0.85, 'rgba(0, 245, 212, 0.45)');
      grad.addColorStop(1, 'rgba(112, 245, 255, 0.92)');
      ctx.shadowColor = '#70f5ff';
      ctx.shadowBlur = 15;
    } else if (state.ballType === 'glow') {
      // 発光玉（半径9・強烈なネオンバイオルミネッセンス）
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, '#a8ffef');
      grad.addColorStop(1, '#00f5d4');
      ctx.shadowColor = '#38f9d7';
      ctx.shadowBlur = 24;
    } else {
      // 通常真珠（半径9）
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.55, '#fff6e5');
      grad.addColorStop(1, '#98e2ff');
      ctx.shadowColor = state.feverTimer > 0 ? '#20e3b2' : '#70f5ff';
      ctx.shadowBlur = 16;
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, ballR, 0, Math.PI * 2);
    ctx.fill();

    if (state.ballType === 'heavy') {
      ctx.strokeStyle = 'rgba(255, 217, 125, 0.85)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (state.ballType === 'bubble') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.restore();
  }

  // =========================================================================
  // 11. UI & HUD 更新・イベントハンドラ
  // =========================================================================
  function updateHUD() {
    const rBadge = document.getElementById('round-badge');
    const mod = state.roundModifier || ROUND_MODIFIERS[1];
    const modSuffix = (mod && mod.id !== 'none') ? ` [${mod.name}]` : '';
    if (state.round === 8 && !state.endlessMode) {
      rBadge.textContent = `R8 (${mod.name})`;
    } else if (state.round > 8 || state.endlessMode) {
      rBadge.textContent = `TRENCH R${state.round}${modSuffix}`;
    } else {
      rBadge.textContent = `ROUND ${state.round} / 8${modSuffix}`;
    }
    rBadge.classList.toggle('boss', state.round >= 8);

    // 現在のボール種別バッジとラウンドモディファイアバッジをHUDに表示
    const ballTag = document.getElementById('ball-type-tag');
    if (ballTag) {
      const bSpec = getBallSpec();
      ballTag.textContent = bSpec.shortBadge;
      ballTag.title = `【${bSpec.name}】${bSpec.desc}`;
      ballTag.style.borderColor = bSpec.glowColor;
      ballTag.style.color = bSpec.color;
    }
    const modTag = document.getElementById('mod-tag');
    if (modTag) {
      if (mod && mod.id !== 'none') {
        modTag.style.display = 'inline-block';
        modTag.textContent = mod.badge;
        modTag.title = `【R${state.round} ${mod.name}】${mod.desc}`;
        modTag.style.borderColor = mod.color;
        modTag.style.color = mod.color;
      } else {
        modTag.style.display = 'none';
      }
    }

    const stepperEl = document.getElementById('round-stepper');
    if (stepperEl) {
      stepperEl.innerHTML = '';
      for (let r = 1; r <= 8; r++) {
        const st = document.createElement('div');
        const isDone = r < state.round;
        const isCur = r === state.round || (r === 8 && state.round > 8);
        st.className = `r-step ${isDone ? 'done' : ''} ${isCur ? 'current' : ''} ${r === 8 ? 'boss' : ''}`;
        stepperEl.appendChild(st);
      }
    }

    const dotsWrap = document.getElementById('balls-dots');
    dotsWrap.innerHTML = '';
    for (let i = 0; i < state.maxBallsPerRound; i++) {
      const d = document.createElement('div');
      d.className = `ball-dot ${i < state.ballsLeft ? 'active' : ''}`;
      dotsWrap.appendChild(d);
    }

    document.getElementById('score-current').textContent = state.roundScore.toLocaleString();
    document.getElementById('score-norma').textContent = `/ ${state.norma.toLocaleString()}`;

    const mult = getComboMultiplier();
    const cBadge = document.getElementById('combo-badge');
    cBadge.textContent = `${state.combo} HIT (×${mult.toFixed(2)})`;
    cBadge.classList.toggle('fever', state.feverTimer > 0);

    // 発動中の魚パッシブ効果バッジ表示（HUDの端にアイコン＋名前で小さく表示）
    const fishBuffBar = document.getElementById('fish-buff-bar');
    fishBuffBar.innerHTML = '';
    state.activeFishGroups.forEach(gid => {
      const grp = FISH_GROUPS[gid];
      if (!grp) return;
      const pill = document.createElement('span');
      pill.className = 'fish-buff-pill';
      pill.title = `【${grp.name}】${grp.effectDesc}`;
      pill.textContent = `${grp.icon}${grp.name}`;
      fishBuffBar.appendChild(pill);
    });

    const synTag = document.getElementById('synergy-tag');
    if (state.activeSynergies.length > 0) {
      synTag.style.display = 'inline-block';
      synTag.textContent = `✨シナジー×${state.activeSynergies.length}`;
    } else {
      synTag.style.display = 'none';
    }

    const boostTag = document.getElementById('boost-tag');
    if (state.scoreBoosterCount > 0) {
      boostTag.style.display = 'inline-block';
      boostTag.textContent = `+${state.scoreBoosterCount * 10}%`;
    } else {
      boostTag.style.display = 'none';
    }

    const pct = Math.min(100, (state.roundScore / state.norma) * 100);
    const nBar = document.getElementById('norma-bar');
    nBar.style.width = `${pct}%`;
    nBar.classList.toggle('fever', state.feverTimer > 0);

    const launchBtn = document.getElementById('ctrl-launch');
    launchBtn.classList.toggle('disabled', !state.ball.waitingLaunch || state.phase !== 'PLAY');

    const nudgeBtn = document.getElementById('btn-nudge');
    nudgeBtn.classList.toggle('tilted', state.tiltPenalty);

    document.getElementById('ctrl-left').classList.toggle('disabled', state.tiltPenalty);
    document.getElementById('ctrl-right').classList.toggle('disabled', state.tiltPenalty);
  }

  function updateTitleRecords() {
    document.getElementById('title-hiscore').textContent = hiScore.toLocaleString();
    const clEl = document.getElementById('title-cleared');
    clEl.textContent = hasClearedEver ? '★ 制覇済' : '未クリア';
    clEl.style.color = hasClearedEver ? '#20e3b2' : '#7fa6c4';
    document.getElementById('title-zukan-count').textContent = `${getUnlockedFishCount()} / 12`;
    document.getElementById('btn-practice').style.display = hasClearedEver ? 'block' : 'none';
  }

  function hideAllOverlays() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('show'));
  }

  function setFlippersPressed(isLeft, pressed) {
    if (state.phase !== 'PLAY' || state.tiltPenalty) {
      if (!pressed) {
        if (isLeft) {
          state.leftFlipper.pressed = false;
          document.getElementById('ctrl-left').classList.remove('pressed');
        } else {
          state.rightFlipper.pressed = false;
          document.getElementById('ctrl-right').classList.remove('pressed');
        }
      }
      return;
    }
    if (isLeft) {
      if (pressed && !state.leftFlipper.pressed) sfx.flipper();
      state.leftFlipper.pressed = pressed;
      document.getElementById('ctrl-left').classList.toggle('pressed', pressed);
    } else {
      if (pressed && !state.rightFlipper.pressed) sfx.flipper();
      state.rightFlipper.pressed = pressed;
      document.getElementById('ctrl-right').classList.toggle('pressed', pressed);
    }
  }

  function startPlungerCharge() {
    if (state.phase !== 'PLAY' || !state.ball.waitingLaunch) return;
    state.plunger.charging = true;
    document.getElementById('ctrl-launch').classList.add('charging');
  }

  function releasePlunger() {
    if (!state.plunger.charging) return;
    state.plunger.charging = false;
    document.getElementById('ctrl-launch').classList.remove('charging');
    if (state.phase !== 'PLAY' || !state.ball.waitingLaunch) return;

    const p = Math.max(0.18, state.plunger.power);
    const launchMult = getBallSpec().launchMaxMult || 1.0;
    state.plunger.power = 0;
    state.ball.waitingLaunch = false;
    state.ball.y = 606;
    state.ball.vy = -(550 + p * 440 + (Math.random() * 20 - 10)) * launchMult;
    state.ball.vx = 0;
    sfx.launch(p);
    updateHUD();
  }

  window.addEventListener('keydown', (e) => {
    const isGameKey = (
      e.code === 'ArrowLeft' || e.code === 'KeyZ' || e.code === 'KeyA' ||
      e.code === 'ArrowRight' || e.code === 'Slash' || e.code === 'KeyD' ||
      e.code === 'Space' || e.code === 'ArrowDown' ||
      e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX' || e.code === 'ArrowUp'
    );
    if (isGameKey) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyZ' || e.code === 'KeyA') {
      setFlippersPressed(true, true);
    } else if (e.code === 'ArrowRight' || e.code === 'Slash' || e.code === 'KeyD') {
      setFlippersPressed(false, true);
    } else if (e.code === 'Space' || e.code === 'ArrowDown') {
      startPlungerCharge();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX' || e.code === 'ArrowUp') {
      triggerNudge(e.code === 'ShiftLeft' ? 1 : (e.code === 'ShiftRight' ? -1 : 0));
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyZ' || e.code === 'KeyA') {
      setFlippersPressed(true, false);
    } else if (e.code === 'ArrowRight' || e.code === 'Slash' || e.code === 'KeyD') {
      setFlippersPressed(false, false);
    } else if (e.code === 'Space' || e.code === 'ArrowDown') {
      releasePlunger();
    }
  });

  function bindHoldButton(el, onDown, onUp) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      onDown();
    });
    el.addEventListener('pointerup', (e) => {
      e.preventDefault();
      onUp();
    });
    el.addEventListener('pointercancel', (e) => {
      e.preventDefault();
      onUp();
    });
  }

  bindHoldButton(document.getElementById('ctrl-left'), () => setFlippersPressed(true, true), () => setFlippersPressed(true, false));
  bindHoldButton(document.getElementById('ctrl-right'), () => setFlippersPressed(false, true), () => setFlippersPressed(false, false));
  bindHoldButton(document.getElementById('ctrl-launch'), () => startPlungerCharge(), () => releasePlunger());

  document.getElementById('btn-nudge').addEventListener('click', () => triggerNudge(0));

  const activeCanvasTouches = new Map();

  function getCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H
    };
  }

  canvas.addEventListener('pointermove', (e) => {
    const pt = getCanvasCoords(e.clientX, e.clientY);
    let bestId = -1;
    let bestDist = 26;
    for (let i = 0; i < SLOT_POSITIONS.length; i++) {
      const d = Math.hypot(pt.x - SLOT_POSITIONS[i].x, pt.y - SLOT_POSITIONS[i].y);
      if (d < bestDist) {
        bestDist = d;
        bestId = i;
      }
    }
    state.hoverSlotId = bestId;
  });

  canvas.addEventListener('pointerleave', () => {
    state.hoverSlotId = -1;
  });

  canvas.addEventListener('pointerdown', (e) => {
    const pt = getCanvasCoords(e.clientX, e.clientY);

    let nearestSlotId = -1;
    let nearestDist = 36;
    for (let i = 0; i < SLOT_POSITIONS.length; i++) {
      const d = Math.hypot(pt.x - SLOT_POSITIONS[i].x, pt.y - SLOT_POSITIONS[i].y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestSlotId = i;
      }
    }

    if (state.phase === 'PLACE') {
      if (nearestSlotId !== -1) {
        state.hoverSlotId = nearestSlotId;
        handleSlotClick(nearestSlotId);
      }
      return;
    }

    if (state.phase === 'DRAFT') {
      state.hoverSlotId = nearestSlotId;
      return;
    }

    if (state.phase === 'PLAY') {
      if (nearestSlotId !== -1 && state.slots[nearestSlotId]) {
        state.hoverSlotId = nearestSlotId;
      }
      if (state.ball.waitingLaunch && pt.x > LANE_X - 20 && pt.y > 480) {
        activeCanvasTouches.set(e.pointerId, 'launch');
        startPlungerCharge();
      } else if (pt.x < VIEW_W / 2) {
        activeCanvasTouches.set(e.pointerId, 'left');
        setFlippersPressed(true, true);
      } else {
        activeCanvasTouches.set(e.pointerId, 'right');
        setFlippersPressed(false, true);
      }
    }
  });

  function endCanvasPointer(e) {
    const role = activeCanvasTouches.get(e.pointerId);
    if (!role) return;
    activeCanvasTouches.delete(e.pointerId);
    if (role === 'launch') releasePlunger();
    if (role === 'left') setFlippersPressed(true, false);
    if (role === 'right') setFlippersPressed(false, false);
  }
  canvas.addEventListener('pointerup', endCanvasPointer);
  canvas.addEventListener('pointercancel', endCanvasPointer);

  document.getElementById('btn-peek-board').addEventListener('click', () => {
    const ov = document.getElementById('ov-draft');
    const isPeek = ov.classList.toggle('peek-mode');
    document.getElementById('btn-peek-board').textContent = isPeek ? '🃏 カード選択に戻る' : '👁 盤面を確認';
  });

  document.getElementById('btn-reroll').addEventListener('click', () => {
    if (state.rerollsLeft <= 0) return;
    state.rerollsLeft--;
    sfx.place();
    renderDraftCards();
  });

  document.getElementById('btn-bgm').addEventListener('click', () => {
    const bgmOn = sfx.toggleBgm();
    const btn = document.getElementById('btn-bgm');
    btn.classList.toggle('bgm-off', !bgmOn);
  });

  document.getElementById('btn-mute').addEventListener('click', () => {
    const muted = sfx.toggleMute();
    const btn = document.getElementById('btn-mute');
    btn.textContent = muted ? '🔇' : '🔊';
    btn.classList.toggle('muted', muted);
  });

  function togglePause() {
    if (state.phase === 'PLAY' || state.phase === 'PLACE') {
      state.prevPhaseBeforePause = state.phase;
      state.phase = 'PAUSE';

      const fishHtml = state.activeFishGroups.size > 0
        ? Array.from(state.activeFishGroups).map(gid => {
            const g = FISH_GROUPS[gid];
            return `・<span class="syn-hl">${g.icon}【${g.name}】</span>: ${g.effectDesc}`;
          }).join('<br>')
        : '・まだ魚パッシブは発動していません（泳ぐ深海魚に当てて回収しよう！）';

      const synHtml = state.activeSynergies.length > 0
        ? state.activeSynergies.map(s => `・<span class="syn-hl">【${s.name}】</span>: ${s.effectText}`).join('<br>')
        : '・現在発動中の海流シナジーはありません';

      const partsHtml = state.slots
        .map((s, idx) => {
          if (!s) return null;
          const c = getPartDisplayInfo(s.type);
          const prefix = MUTATED_PARTS[s.type] ? '⚗' : '';
          return `#${idx + 1}(${SLOT_POSITIONS[idx].label}): <b>${prefix}${c ? c.shortName : s.type} Lv${s.level}</b> (${s.totalEarned.toLocaleString()}pt)`;
        })
        .filter(Boolean)
        .join('<br>');

      const discoveredFusionCount = Object.keys(unlockedFusionsMap).filter(k => unlockedFusionsMap[k] > 0).length;
      const bSpec = getBallSpec();
      const mod = state.roundModifier || ROUND_MODIFIERS[1];
      document.getElementById('pause-stats').innerHTML = `
        <b>現在ラウンド</b>: ROUND ${state.round} 【${mod.name}: ${mod.desc}】<br>
        <b>総スコア</b>: ${state.totalScore.toLocaleString()} PTS / <b>現在ボール</b>: <span class="syn-hl">${bSpec.shortBadge}</span> (${bSpec.desc})<br>
        <b>海神の祝福</b>: +${state.scoreBoosterCount * 10}% / <b>フィン強化</b>: Lv${state.flipperLevel} / <b>⚗合成発見</b>: ${discoveredFusionCount}/${FUSION_RECIPES.length}種<br><br>
        <b>【🐟発動中の深海魚パッシブ (${state.activeFishGroups.size}/5系統)】</b><br>
        ${fishHtml}<br><br>
        <b>【✨発動中の構築シナジー (${state.activeSynergies.length}個)】</b><br>
        ${synHtml}<br><br>
        <b>【設置パーツ一覧 (全10スロット)】</b><br>
        ${partsHtml || 'なし'}
      `;
      document.getElementById('ov-pause').classList.add('show');
    } else if (state.phase === 'PAUSE') {
      state.phase = state.prevPhaseBeforePause;
      document.getElementById('ov-pause').classList.remove('show');
    }
  }

  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('synergy-tag').addEventListener('click', () => {
    if (state.phase === 'PLAY' || state.phase === 'PLACE') togglePause();
  });
  document.getElementById('btn-resume').addEventListener('click', togglePause);
  document.getElementById('btn-retire').addEventListener('click', () => {
    state.runToken++;
    state.overkillActive = false;
    state.overkillTimer = 0;
    state.phase = 'TITLE';
    hideAllOverlays();
    document.getElementById('place-banner').classList.remove('show');
    const okBar = document.getElementById('overkill-bar');
    if (okBar) okBar.classList.remove('show');
    updateTitleRecords();
    document.getElementById('ov-title').classList.add('show');
  });

  document.getElementById('btn-place-skip').addEventListener('click', () => {
    if (state.phase === 'PLACE') {
      finishPlacementPhase();
    }
  });

  const btnOverkillNext = document.getElementById('btn-overkill-next');
  if (btnOverkillNext) {
    btnOverkillNext.addEventListener('click', () => {
      if (state.phase === 'PLAY' && state.overkillActive) {
        finishOverkillRound();
      }
    });
  }

  // 図鑑の開閉ボタン（タイトル画面＆リザルト画面から）
  document.getElementById('btn-open-zukan-title').addEventListener('click', () => {
    sfx.place();
    openZukanModal('TITLE');
  });
  document.getElementById('btn-open-zukan-result').addEventListener('click', () => {
    sfx.place();
    openZukanModal('RESULT');
  });
  document.getElementById('btn-close-zukan').addEventListener('click', () => {
    sfx.place();
    document.getElementById('ov-zukan').classList.remove('show');
    if (state.prevPhaseBeforeZukan === 'RESULT') {
      document.getElementById('ov-result').classList.add('show');
    } else {
      document.getElementById('ov-title').classList.add('show');
    }
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    sfx.init();
    sfx.place();
    initNewRun(false);
  });

  document.getElementById('btn-practice').addEventListener('click', () => {
    sfx.init();
    sfx.place();
    initNewRun(true);
  });

  document.getElementById('btn-endless').addEventListener('click', () => {
    sfx.place();
    state.endlessMode = true;
    hideAllOverlays();
    openDraftModal(0);
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    sfx.place();
    initNewRun(false);
  });

  document.getElementById('btn-to-title').addEventListener('click', () => {
    state.runToken++;
    state.phase = 'TITLE';
    hideAllOverlays();
    updateTitleRecords();
    document.getElementById('ov-title').classList.add('show');
  });

  // =========================================================================
  // 12. メインループ (60fps)
  // =========================================================================
  updateTitleRecords();
  placePartInSlot(0, 'bumper_circle', 1);
  placePartInSlot(1, 'bumper_circle', 1);
  placePartInSlot(2, 'spinner', 1);
  placePartInSlot(5, 'bumper_tri', 1);
  spawnOneFish();
  spawnOneFish();
  updateHUD();

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    stepPhysics(dt);
    drawBoard();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
