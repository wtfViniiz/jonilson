import type { Product } from '@/src/types';

const SEARCH_STOP_WORDS = ['de', 'do', 'da', 'dos', 'das', 'para', 'em'];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeProductName = (value: string) =>
  normalizeText(
    value
      .replace(/aÃƒâ€¡afrÃƒÆ’o|aÃƒâ€¡afrÃƒÂ£o|aÃƒâ€¡afrao|aÃ§afrao|acafrao/gi, 'acafrao')
      .replace(/grÃƒÆ’o|grÃ£o|grao/gi, 'grao')
      .replace(/moÃƒÂda|moida/gi, 'moida')
      .replace(/pÃƒÂprica|paprica/gi, 'paprica')
      .replace(/cravinho/gi, 'cravo')
      .replace(/lemon peppe/gi, 'lemon pepper')
  );

const compactText = (value: string) => value.replace(/\s+/g, '');

const levenshteinDistance = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const buildSearchTerms = (product: Product) => {
  const normalizedName = normalizeProductName(product.name);
  const tokens = normalizedName.split(' ').filter(Boolean);
  const trimmedTokens = tokens.filter(token => !SEARCH_STOP_WORDS.includes(token));
  const searchTerms = new Set<string>([
    normalizedName,
    trimmedTokens.join(' '),
    compactText(normalizedName),
  ]);

  if (normalizedName.includes('milho de pipoca')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`pipoca ${weight}`.trim());
    searchTerms.add(`milho pipoca ${weight}`.trim());
  }

  if (normalizedName.includes('pimenta do reino moida')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`pimenta moida ${weight}`.trim());
    searchTerms.add(`reino moida ${weight}`.trim());
  }

  if (normalizedName.includes('pimenta em grao')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`pimenta grao ${weight}`.trim());
  }

  if (normalizedName.includes('cominho em grao')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`cominho grao ${weight}`.trim());
  }

  if (normalizedName.includes('pimenta com cominho')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`pimenta com c ${weight}`.trim());
    searchTerms.add(`pimenta c cominho ${weight}`.trim());
  }

  if (normalizedName.includes('tempero ana maria braga')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`tempero ana ${weight}`.trim());
    searchTerms.add(`tempero da ana ${weight}`.trim());
    searchTerms.add(`ana maria ${weight}`.trim());
  }

  if (normalizedName.includes('tempero do chefe')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`tempero chef ${weight}`.trim());
    searchTerms.add(`chef ${weight}`.trim());
  }

  if (normalizedName.includes('confeito de chocolate')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`confeito ${weight}`.trim());
    searchTerms.add(`confeito ad ${weight}`.trim());
  }

  if (normalizedName.includes('canela em casca')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`canela ${weight}`.trim());
  }

  if (normalizedName.includes('lemon pepper')) {
    searchTerms.add('lemon peppe 20g');
  }

  if (normalizedName.includes('acafrao')) {
    searchTerms.add(normalizedName.replace(/acafrao/g, 'acafrao'));
  }

  return [...searchTerms].filter(Boolean);
};

export const getSearchScore = (product: Product, rawTerm: string) => {
  const term = normalizeProductName(rawTerm);
  if (!term) return 1;

  const compactTerm = compactText(term);
  const queryTokens = term.split(' ').filter(Boolean);
  const searchTerms = buildSearchTerms(product);
  let bestScore = 0;

  for (const candidate of searchTerms) {
    if (!candidate) continue;
    if (candidate === term) return 200;
    if (candidate.startsWith(term)) bestScore = Math.max(bestScore, 170);
    if (candidate.includes(term)) bestScore = Math.max(bestScore, 150);

    const compactCandidate = compactText(candidate);
    if (compactCandidate.includes(compactTerm)) {
      bestScore = Math.max(bestScore, 145);
    }

    const candidateTokens = candidate.split(' ').filter(Boolean);
    const matchedTokens = queryTokens.filter(token =>
      candidateTokens.some(candidateToken => candidateToken.includes(token) || token.includes(candidateToken))
    ).length;

    if (matchedTokens > 0) {
      bestScore = Math.max(bestScore, 90 + matchedTokens * 15);
    }

    if (compactTerm.length >= 4) {
      const distance = levenshteinDistance(compactTerm, compactCandidate.slice(0, compactTerm.length + 2));
      if (distance <= 2) {
        bestScore = Math.max(bestScore, 115 - distance * 10);
      }
    }
  }

  return bestScore;
};
