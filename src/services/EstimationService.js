import axios from 'axios';
import Property from '../models/Property.js';
import Estimation from '../models/Estimation.js';

const SALE_PRICE_PER_SQM = 1800;
const RENT_PRICE_PER_SQM = 35;

const computeHeuristicEstimate = (data) => {
  const {
    transactionType = 'sale',
    surface = 80,
    rooms = 3,
    bathrooms = 1,
    amenities = [],
    locationScore = 1,
    condition = 'standard',
  } = data;

  const basePerSqm = transactionType.includes('rent') ? RENT_PRICE_PER_SQM : SALE_PRICE_PER_SQM;
  let baseValue = surface * basePerSqm * locationScore;

  baseValue += rooms * (transactionType.includes('rent') ? 25 : 1500);
  baseValue += bathrooms * (transactionType.includes('rent') ? 20 : 2000);

  const amenityBoost = amenities.length * (transactionType.includes('rent') ? 15 : 800);
  baseValue += amenityBoost;

  const conditionMultiplier = {
    premium: 1.12,
    renovated: 1.08,
    standard: 1,
    needs_work: 0.88,
  }[condition] || 1;

  baseValue *= conditionMultiplier;

  const lowEstimate = Math.round(baseValue * 0.92);
  const highEstimate = Math.round(baseValue * 1.08);
  const recommendedPrice = Math.round((lowEstimate + highEstimate) / 2);

  return {
    recommendedPrice,
    lowEstimate,
    highEstimate,
    rationale: `Estimation basée sur ${surface} m², ${rooms} pièces, ${bathrooms} salles de bain et ${amenities.length} équipements.`,
    provider: 'heuristic',
  };
};

class EstimationService {
  async estimate({ userId, propertyId, payload }) {
    let property = null;
    if (propertyId) {
      property = await Property.findById(propertyId);
    }

    const input = {
      transactionType: property?.transactionType || payload.transactionType,
      surface: property?.surface || payload.surface,
      rooms: property?.rooms || payload.rooms,
      bathrooms: property?.bathrooms || payload.bathrooms,
      amenities: property?.amenities || payload.amenities || [],
      location: property?.location || payload.location,
      condition: payload.condition || 'standard',
      locationScore: payload.locationScore || 1,
    };

    if (!input.surface || !input.transactionType) {
      throw new Error('Les informations du bien sont incomplètes pour calculer une estimation.');
    }

    let result = computeHeuristicEstimate(input);

    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = `
Tu es un expert immobilier. Estime le prix ${input.transactionType === 'sale' ? 'de vente' : 'de location'} d'un bien en France avec les caractéristiques suivantes:
- Surface: ${input.surface} m²
- Pièces: ${input.rooms}
- Salles de bain: ${input.bathrooms}
- Équipements: ${(input.amenities || []).join(', ') || 'aucun équipement particulier'}
- État: ${input.condition}

Donne une fourchette basse et haute ainsi qu'un prix recommandé en euros.`;

        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Tu es un analyste immobilier expert.' },
              { role: 'user', content: prompt },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          }
        );

        const content = response.data.choices?.[0]?.message?.content;
        if (content) {
          result = {
            ...result,
            rationale: `${result.rationale}\nAnalyse LLM: ${content}`,
            provider: 'openai',
          };
        }
      } catch (error) {
        console.warn('Estimation LLM échouée, utilisation de la heuristique', error.message);
      }
    }

    const estimation = await Estimation.create({
      user: userId,
      property: propertyId ?? null,
      input,
      result,
    });

    return estimation;
  }

  async getHistory(userId) {
    return Estimation.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
  }
}

export default EstimationService;

