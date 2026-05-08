import type { Category, TransactionDirection } from '~/types'

interface Rule {
  pattern: RegExp
  category: Category
}

const DEBIT_RULES: Rule[] = [
  {
    pattern: /jow|u express|romdis|boulangerie|fromagerie|bento|relay|pizza|carrefour|leclerc|super u|auchan|monoprix|franprix|lidl|aldi|biocoop|traiteur|epicerie|supermarche|marche|intermarche|picard|metro cash/i,
    category: 'alimentation'
  },
  {
    pattern: /tcl|fulli|sncf|ratp|uber|taxi|bolt|parking|peage|autoroute|essence|total.*station|shell|bp |transdev|keolis|blablacar|cityscoot|bird |lime /i,
    category: 'transport'
  },
  {
    pattern: /free mobile|free telecom|canal\+?|apple\.com\/bill|claude\.ai|netflix|spotify|disney|amazon prime|youtube|deezer|wombat|suno|supercell|playstation|xbox|steam|twitch|hulu|paramount|molotov/i,
    category: 'abonnements'
  },
  {
    pattern: /macif|predica|caae|matmut|axa|allianz|maif|maaf|groupama|covea|generali|assurance|garantie/i,
    category: 'assurance'
  },
  {
    pattern: /kraken|coinbase|binance|bitpanda|crypto|bitstamp/i,
    category: 'crypto'
  },
  {
    pattern: /cpam|pharmacie|phcie|medecin|docteur|dentiste|optique|ophtalmo|kiné|kinesitherapie|laboratoire|clinique|hopital|radiologie|sante/i,
    category: 'sante'
  },
  {
    pattern: /remboursement de pret|echeance.*pret|pret.*echeance|credit immobilier/i,
    category: 'loyer-credit'
  },
  {
    pattern: /cotisation|offre globe|offre essentiel|offre zen|reglement assu|frais tenue|frais de compte/i,
    category: 'frais-bancaires'
  },
  {
    pattern: /uniqlo|zara|h&m|primark|decathlon|fnac|boulanger|darty|ikea|amazon|cdiscount|laredoute|asos|shein/i,
    category: 'shopping'
  },
  {
    pattern: /restaurant|traquenard|brasserie|cafe |bar |bistro|pizzeria|sushi|kebab|mcdonald|burger|kfc|gl lyon|deliss|wombat gambetta|terrasse|taverne|auberge|buron|bougaci/i,
    category: 'sorties'
  },
  {
    pattern: /appartement|loyer|charges/i,
    category: 'loyer-credit'
  }
]

const CREDIT_RULES: Rule[] = [
  {
    pattern: /avoir/i,
    category: 'remboursements'
  },
  {
    pattern: /cpam|ameli|securite sociale/i,
    category: 'remboursements'
  }
]

export function autoCategory(label: string, direction: TransactionDirection): Category {
  const rules = direction === 'debit' ? DEBIT_RULES : CREDIT_RULES

  for (const rule of rules) {
    if (rule.pattern.test(label)) return rule.category
  }

  return direction === 'credit' ? 'revenus' : 'non-categorise'
}
