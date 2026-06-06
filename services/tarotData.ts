import { TarotCardData } from '../types';
import { MAJOR_ARCANA, RWS_BASE_URL } from '../constants';

export const getDeck = (): TarotCardData[] => {
  return MAJOR_ARCANA.map(card => ({
    id: card.id,
    name: card.name,
    name_short: card.name_short,
    image: `${RWS_BASE_URL}${card.urlSuffix}`,
    meaningUpright: "New beginnings, optimism, trust in life.", // Placeholder, usually we'd have a big DB
    meaningReversed: "Recklessness, being taken advantage of, inconsideration."
  }));
};

export const getRandomCard = (deck: TarotCardData[]): { card: TarotCardData, isReversed: boolean, remainingDeck: TarotCardData[] } | null => {
  if (deck.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * deck.length);
  const card = deck[randomIndex];
  const isReversed = Math.random() < 0.5;
  
  const remainingDeck = [...deck];
  remainingDeck.splice(randomIndex, 1);
  
  return { card, isReversed, remainingDeck };
};