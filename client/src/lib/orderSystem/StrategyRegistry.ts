export type StrategyId =
  | 'NORMAL'
  | 'TWAP'
  | 'VWAP'
  | 'POV'
  | 'STOP'
  | 'STOP_LIMIT'
  | 'TRAILING_STOP'
  | 'TRAILING_STOP_LIMIT'
  | 'OCO'
  | 'PEG'
  | 'ICEBERG';

export interface StrategyDefinition {
  id: StrategyId;
  label: string;
  intent: string;
  description: string;
  // 1. 対応アセット・市場制約
  supportedAssets: ('STOCK' | 'ETF' | 'OPTION')[];
  supportedMarkets: ('US' | 'JP' | 'HK')[];
  // 2. 注文パラメータ定義 (スキーマ)
  params: {
    id: string;
    label: string;
    type: 'number' | 'time' | 'select' | 'percent';
    required: boolean;
    min?: number;
    max?: number;
    tooltip: string;
  }[];
  // 3. 執行・有効期間制約
  supportedTIF: ('DAY' | 'GTC' | 'GTD' | 'IOC' | 'FOK')[];
  allowPrePostMarket: boolean;
  // 4. 安全装置・リスク定義
  risks: {
    level: 'info' | 'warning' | 'critical';
    text: string;
  }[];
  // 5. 機能フラグ
  canDryRun: boolean;
  isCancelableAfterStart: boolean; // 執行開始後の取消可否
}

export const STRATEGIES: Record<StrategyId, StrategyDefinition> = {
  NORMAL: {
    id: 'NORMAL',
    label: '通常注文',
    intent: 'すぐに・指定価格で買いたい',
    description: '成行または指値で即座に発注します。',
    supportedAssets: ['STOCK', 'ETF', 'OPTION'],
    supportedMarkets: ['US', 'JP', 'HK'],
    params: [
      { id: 'qty', label: '数量', type: 'number', required: true, tooltip: '発注したい株数' },
      { id: 'price', label: '指値価格', type: 'number', required: false, tooltip: '指値注文の場合のみ入力' },
    ],
    supportedTIF: ['DAY', 'GTC'],
    allowPrePostMarket: true,
    risks: [
      { level: 'info', text: '市場急変時に想定外の価格で約定する可能性があります。' }
    ],
    canDryRun: false,
    isCancelableAfterStart: true,
  },
  TWAP: {
    id: 'TWAP',
    label: 'TWAP (時間分割)',
    intent: '時間を分散して目立たず買いたい',
    description: '指定した時間枠内で均等に分割して発注します。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US', 'JP'],
    params: [
      { id: 'qty', label: '合計数量', type: 'number', required: true, tooltip: '合計で発注したい株数' },
      { id: 'sliceCount', label: '分割回数', type: 'number', required: true, tooltip: '何回に分けて発注するか' },
      { id: 'intervalMinutes', label: '実行間隔 (分)', type: 'number', required: true, tooltip: '何分おきに発注するか' },
    ],
    supportedTIF: ['DAY'],
    allowPrePostMarket: false,
    risks: [
      { level: 'warning', text: '指定時間内に全数量が約定しない可能性があります。' },
      { level: 'critical', text: '執行開始の10秒前以降は、その回の取消・訂正はできません。' }
    ],
    canDryRun: true,
    isCancelableAfterStart: true,
  },
  VWAP: {
    id: 'VWAP',
    label: 'VWAP (出来高追随)',
    intent: '出来高に合わせて入りたい',
    description: '市場の出来高配分に合わせて発注し、市場平均価格に近似させます。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US', 'JP'],
    params: [
      { id: 'qty', label: '合計数量', type: 'number', required: true, tooltip: '合計で発注したい株数' },
      { id: 'sliceCount', label: '分割回数', type: 'number', required: true, tooltip: '何回に分けて発注するか' },
      { id: 'intervalMinutes', label: '実行間隔 (分)', type: 'number', required: true, tooltip: '何分おきに発注するか' },
    ],
    supportedTIF: ['DAY'],
    allowPrePostMarket: false,
    risks: [
      { level: 'warning', text: '出来高が極端に少ない場合、注文が完了しない可能性があります。' },
      { level: 'critical', text: '市場インパクトを抑えるため、執行速度が制限される場合があります。' }
    ],
    canDryRun: true,
    isCancelableAfterStart: true,
  },
  TRAILING_STOP: {
    id: 'TRAILING_STOP',
    label: 'トレールストップ',
    intent: '上昇に追随しながら守りたい',
    description: '価格上昇に追随して逆指値価格を引き上げ、反転時に成行で決済します。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US'],
    params: [
      { id: 'qty', label: '数量', type: 'number', required: true, tooltip: '決済したい株数' },
      { id: 'trailAmount', label: 'トレール幅', type: 'number', required: true, tooltip: '現在値からの追随幅' },
    ],
    supportedTIF: ['DAY', 'GTC'],
    allowPrePostMarket: false,
    risks: [
      { level: 'critical', text: '急落時にトレール価格が更新されず、想定より下で約定する可能性があります。' }
    ],
    canDryRun: true,
    isCancelableAfterStart: true,
  },
  OCO: {
    id: 'OCO',
    label: 'OCO (利確・損切同時)',
    intent: '条件分岐で自動決済したい',
    description: '利確の指値と損切りの逆指値を同時に出し、一方が約定したら他方をキャンセルします。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US', 'JP'],
    params: [
      { id: 'qty', label: '数量', type: 'number', required: true, tooltip: '決済したい株数' },
      { id: 'price', label: '利確指値', type: 'number', required: true, tooltip: '利益確定の価格' },
      { id: 'triggerPrice', label: '損切逆指値', type: 'number', required: true, tooltip: '損切りのトリガー価格' },
    ],
    supportedTIF: ['DAY', 'GTC'],
    allowPrePostMarket: false,
    risks: [
      { level: 'warning', text: '両方の条件が同時に満たされた場合、稀に二重約定が発生する可能性があります。' }
    ],
    canDryRun: true,
    isCancelableAfterStart: true,
  },
  ICEBERG: {
    id: 'ICEBERG',
    label: 'Iceberg (氷山注文)',
    intent: '板に見えにくく出したい',
    description: '大きな注文を小さな断片に分け、板には一部の数量のみを表示させます。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US', 'JP', 'HK'],
    params: [
      { id: 'qty', label: '合計数量', type: 'number', required: true, tooltip: '合計で発注したい株数' },
      { id: 'price', label: '指値価格', type: 'number', required: true, tooltip: '指値の価格' },
      { id: 'sliceCount', label: '表示分割数', type: 'number', required: true, tooltip: '一度に板に出す数量の分割単位' },
    ],
    supportedTIF: ['DAY'],
    allowPrePostMarket: false,
    risks: [
      { level: 'info', text: '表示数量が約定するたびに再発注されるため、約定優先順位が低くなります。' }
    ],
    canDryRun: true,
    isCancelableAfterStart: true,
  },
  POV: {
    id: 'POV',
    label: 'POV (出来高比率)',
    intent: '市場への影響を抑えて買いたい',
    description: '市場出来高の一定割合を超えないように発注します。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US'],
    params: [
      { id: 'qty', label: '合計数量', type: 'number', required: true, tooltip: '合計で発注したい株数' },
      { id: 'volumeRatio', label: '参加比率(%)', type: 'percent', required: true, tooltip: '市場出来高に対する自注文の最大比率' },
    ],
    supportedTIF: ['DAY'],
    allowPrePostMarket: false,
    risks: [
      { level: 'warning', text: '市場出来高が少ない場合、発注が大幅に遅れる可能性があります。' }
    ],
    canDryRun: true,
    isCancelableAfterStart: true,
  },
  STOP: {
    id: 'STOP',
    label: '逆指値 (成行)',
    intent: '損切りを自動化したい',
    description: 'トリガー価格に達したら成行注文を発行します。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US', 'JP'],
    params: [
      { id: 'qty', label: '数量', type: 'number', required: true, tooltip: '発注したい株数' },
      { id: 'triggerPrice', label: 'トリガー価格', type: 'number', required: true, tooltip: '発動する価格' },
    ],
    supportedTIF: ['DAY', 'GTC'],
    allowPrePostMarket: false,
    risks: [
      { level: 'critical', text: '価格が飛んだ場合、トリガー価格から大きく離れて約定する可能性があります。' }
    ],
    canDryRun: false,
    isCancelableAfterStart: true,
  },
  STOP_LIMIT: {
    id: 'STOP_LIMIT',
    label: '逆指値 (指値)',
    intent: '価格到達後に指値で買いたい',
    description: 'トリガー価格に達したら指値注文を発行します。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US', 'JP'],
    params: [
      { id: 'qty', label: '数量', type: 'number', required: true, tooltip: '発注したい株数' },
      { id: 'triggerPrice', label: 'トリガー価格', type: 'number', required: true, tooltip: '発動する価格' },
      { id: 'price', label: '指値価格', type: 'number', required: true, tooltip: '発動後の指値価格' },
    ],
    supportedTIF: ['DAY', 'GTC'],
    allowPrePostMarket: false,
    risks: [
      { level: 'warning', text: '価格が急変して指値を飛び越えた場合、約定しない可能性があります。' }
    ],
    canDryRun: false,
    isCancelableAfterStart: true,
  },
  TRAILING_STOP_LIMIT: {
    id: 'TRAILING_STOP_LIMIT',
    label: 'トレールストップ (指値)',
    intent: '上昇に追随しつつ指値で守りたい',
    description: '価格上昇に追随して逆指値価格を引き上げ、反転時に指値で決済します。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US'],
    params: [
      { id: 'qty', label: '数量', type: 'number', required: true, tooltip: '決済したい株数' },
      { id: 'trailAmount', label: 'トレール幅', type: 'number', required: true, tooltip: '現在値からの追随幅' },
      { id: 'limitOffset', label: '指値オフセット', type: 'number', required: true, tooltip: 'トリガーからの指値の乖離幅' },
    ],
    supportedTIF: ['DAY', 'GTC'],
    allowPrePostMarket: false,
    risks: [
      { level: 'critical', text: '反転後の下落が速い場合、指値に届かず約定しない可能性があります。' }
    ],
    canDryRun: true,
    isCancelableAfterStart: true,
  },
  PEG: {
    id: 'PEG',
    label: 'Peg (最良気配追随)',
    intent: '常に板の先頭に並びたい',
    description: '常に最良気配（Best Bid/Ask）に合わせて指値価格を自動更新します。',
    supportedAssets: ['STOCK', 'ETF'],
    supportedMarkets: ['US'],
    params: [
      { id: 'qty', label: '数量', type: 'number', required: true, tooltip: '発注したい株数' },
      { id: 'limitOffset', label: 'オフセット', type: 'number', required: false, tooltip: '最良気配からの乖離幅' },
    ],
    supportedTIF: ['DAY'],
    allowPrePostMarket: false,
    risks: [
      { level: 'warning', text: '気配が激しく動く場合、注文の訂正が頻発し、約定順位が下がる可能性があります。' }
    ],
    canDryRun: true,
    isCancelableAfterStart: true,
  },
};
