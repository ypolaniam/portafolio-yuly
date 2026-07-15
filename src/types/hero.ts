export interface HeroStat {
  label: string;
  value: number;
  prefix?: string;
}

export interface HeroCTA {
  label: string;
  href: string;
}

export interface Hero {
  overline: string;
  title: string[];
  titleFontSizes?: (number | undefined)[];
  subtitle: string;
  ctaPrimary: HeroCTA;
  ctaSecondary: HeroCTA;
  photo: string;
  stats: HeroStat[];
}
