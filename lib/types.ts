export interface Switch {
  slug: string
  name: string
  vendor: string
  type: 'Linear' | 'Tactile' | 'Clicky' | 'Unknown'
  force: {
    actuation: number
    bottom_out: number
  }
  travel: {
    actuation: number
    total: number
  }
  sound?: string
  color?: string
  mount?: string
  image: string
  images: string[]
  curve?: string
  hasForceCurveData: boolean
}

export interface SwitchDetail extends Switch {
  bodyHtml: string
  forceCurveData?: ForceCurvePoint[]
}

export interface ForceCurvePoint {
  force: number
  displacement: number
}
