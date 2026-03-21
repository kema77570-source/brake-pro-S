export type StrategyId =
  | 'NORMAL'
  | 'DIVIDED'
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
  description: string;
  intent: string;
  steps: ('config' | 'preview' | 'risk')[];
  risks: string[];
  needsPrice: boolean;
  needsQty: boolean;
  needsTrigger?: boolean;
  needsTrail?: boolean;
  needsLimitOffset?: boolean;
  needsTimeRange?: boolean;
  needsVolumeRatio?: boolean;
  needsSliceCount?: boolean;
}

export const STRATEGIES: Record<StrategyId, StrategyDefinition> = {
  NORMAL: {
    id: 'NORMAL',
    label: '通常注文',
    description: '成行または指値で即座に発注します。',
    intent: 'すぐに・指定価格で買いたい',
    steps: ['config', 'preview'],
    risks: ['市場急変時に想定外の価格で約定する可能性があります。'],
    needsPrice: true,
    needsQty: true,
  },
  DIVIDED: {
    id: 'DIVIDED',
    label: '分割エントリー',
    description: '指定した回数に分けて発注し、平均単価を安定させます。',
    intent: '一定間隔で分けて入りたい',
    steps: ['config', 'preview', 'risk'],
    risks: ['分割中に価格が大きく動くと、後半の注文が約定しない場合があります。'],
    needsPrice: true,
    needsQty: true,
    needsSliceCount: true,
  },
  TWAP: {
    id: 'TWAP',
    label: 'TWAP (時間分割)',
    description: '指定した時間枠内で均等に分割して発注します。',
    intent: '時間を分散して目立たず買いたい',
    steps: ['config', 'preview', 'risk'],
    risks: [
      '指定時間内に全数量が約定しない可能性があります。',
      '流動性が低い銘柄ではマーケットインパクトが発生する場合があります。'
    ],
    needsPrice: false,
    needsQty: true,
    needsTimeRange: true,
  },
  VWAP: {
    id: 'VWAP',
    label: 'VWAP (出来高追随)',
    description: '市場の出来高配分に合わせて発注し、市場平均価格に近似させます。',
    intent: '出来高に合わせて入りたい',
    steps: ['config', 'preview', 'risk'],
    risks: ['出来高が極端に少ない場合、注文が完了しない可能性があります。'],
    needsPrice: false,
    needsQty: true,
    needsTimeRange: true,
  },
  POV: {
    id: 'POV',
    label: 'POV (出来高比率)',
    description: '市場出来高の一定割合を超えないように発注します。',
    intent: '市場への影響を抑えて買いたい',
    steps: ['config', 'preview', 'risk'],
    risks: ['市場出来高が少ない場合、発注が大幅に遅れる可能性があります。'],
    needsPrice: false,
    needsQty: true,
    needsVolumeRatio: true,
  },
  STOP: {
    id: 'STOP',
    label: '逆指値 (成行)',
    description: 'トリガー価格に達したら成行注文を発行します。',
    intent: '損切りを自動化したい',
    steps: ['config', 'preview', 'risk'],
    risks: ['価格が飛んだ場合、トリガー価格から大きく離れて約定する可能性があります。'],
    needsPrice: false,
    needsQty: true,
    needsTrigger: true,
  },
  STOP_LIMIT: {
    id: 'STOP_LIMIT',
    label: '逆指値 (指値)',
    description: 'トリガー価格に達したら指値注文を発行します。',
    intent: '価格到達後に指値で買いたい',
    steps: ['config', 'preview', 'risk'],
    risks: ['価格が急変して指値を飛び越えた場合、約定しない可能性があります。'],
    needsPrice: true,
    needsQty: true,
    needsTrigger: true,
  },
  TRAILING_STOP: {
    id: 'TRAILING_STOP',
    label: 'トレールストップ (成行)',
    description: '価格上昇に追随して逆指値価格を引き上げ、反転時に成行で決済します。',
    intent: '上昇に追随しながら守りたい',
    steps: ['config', 'preview', 'risk'],
    risks: ['急落時にトレール価格が更新されず、想定より下で約定する可能性があります。'],
    needsPrice: false,
    needsQty: true,
    needsTrail: true,
  },
  TRAILING_STOP_LIMIT: {
    id: 'TRAILING_STOP_LIMIT',
    label: 'トレールストップ (指値)',
    description: '価格上昇に追随して逆指値価格を引き上げ、反転時に指値で決済します。',
    intent: '上昇に追随しつつ指値で守りたい',
    steps: ['config', 'preview', 'risk'],
    risks: ['反転後の下落が速い場合、指値に届かず約定しない可能性があります。'],
    needsPrice: true,
    needsQty: true,
    needsTrail: true,
    needsLimitOffset: true,
  },
  OCO: {
    id: 'OCO',
    label: 'OCO (利確・損切同時)',
    description: '利確の指値と損切りの逆指値を同時に出し、一方が約定したら他方をキャンセルします。',
    intent: '条件分岐で自動決済したい',
    steps: ['config', 'preview', 'risk'],
    risks: ['両方の条件が同時に満たされた場合、稀に二重約定やエラーが発生する可能性があります。'],
    needsPrice: true,
    needsQty: true,
    needsTrigger: true,
  },
  PEG: {
    id: 'PEG',
    label: 'Peg (最良気配追随)',
    description: '常に最良気配（Best Bid/Ask）に合わせて指値価格を自動更新します。',
    intent: '常に板の先頭に並びたい',
    steps: ['config', 'preview', 'risk'],
    risks: ['気配が激しく動く場合、注文の訂正が頻発し、約定順位が下がる可能性があります。'],
    needsPrice: false,
    needsQty: true,
    needsLimitOffset: true,
  },
  ICEBERG: {
    id: 'ICEBERG',
    label: 'Iceberg (氷山注文)',
    description: '大きな注文を小さな断片に分け、板には一部の数量のみを表示させます。',
    intent: '板に見えにくく出したい',
    steps: ['config', 'preview', 'risk'],
    risks: ['表示数量が約定するたびに再発注されるため、約定優先順位が低くなります。'],
    needsPrice: true,
    needsQty: true,
    needsSliceCount: true,
  },
};
