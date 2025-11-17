import axios from 'axios';
import BankOffer from '../models/BankOffer.js';
import LoanSimulation from '../models/LoanSimulation.js';
import Property from '../models/Property.js';

const calculateMonthlyPayment = ({ amount, rate, durationYears }) => {
  const durationMonths = durationYears * 12;
  const monthlyRate = rate / 100 / 12;

  if (monthlyRate === 0) {
    return amount / durationMonths;
  }

  const payment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -durationMonths));
  return payment;
};

class FinancingService {
  async listBankOffers() {
    return BankOffer.find().sort({ partner: -1, rate: 1 });
  }

  async createBankOffer(data) {
    return BankOffer.create(data);
  }

  async simulateLoan({ userId, propertyId, amount, downPayment = 0, rate, durationYears, bankOfferId }) {
    let baseAmount = amount;

    if (!baseAmount && propertyId) {
      const property = await Property.findById(propertyId);
      baseAmount = property?.price;
    }

    if (!baseAmount) {
      throw new Error('Montant non fourni');
    }

    const financedAmount = baseAmount - downPayment;
    if (financedAmount <= 0) {
      throw new Error('Le montant financé doit être positif');
    }

    const monthlyPayment = calculateMonthlyPayment({ amount: financedAmount, rate, durationYears });
    const totalPaid = monthlyPayment * durationYears * 12;
    const totalInterest = totalPaid - financedAmount;

    const simulation = await LoanSimulation.create({
      user: userId,
      property: propertyId ?? null,
      amount: financedAmount,
      downPayment,
      durationYears,
      rate,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      bankOffer: bankOfferId ?? null,
    });

    return simulation;
  }

  async listSimulations(userId) {
    return LoanSimulation.find({ user: userId })
      .populate('bankOffer')
      .populate('property', 'title price address');
  }

  async suggestTirelirePlan({ amount, participants = 5, durationMonths = 24 }) {
    const monthlyContribution = Math.round((amount / durationMonths / participants) * 100) / 100;

    return {
      suggestedParticipants: participants,
      durationMonths,
      monthlyContribution,
      message: 'Proposition de plan Tirelire pour constituer l’apport du projet immobilier.',
      tirelireIntegration: {
        recommendedGroupName: `Projet Immobilier ${new Date().getFullYear()}`,
        suggestedContribution: monthlyContribution,
        suggestedDuration: durationMonths,
      },
    };
  }

  async createTirelireGroup({ userId, token, name, participants, amount, frequency, description }) {
    if (!process.env.TIRELIRE_BASE_URL) {
      throw new Error('TIRELIRE_BASE_URL non défini dans les variables d\'environnement');
    }

    if (!token) {
      throw new Error('Token Tirelire requis');
    }
    const members = Array.isArray(participants) ? participants : [];
    
    const frequencyMap = {
      'weekly': 'hebdomadaire',
      'monthly': 'mensuel',
      'quarterly': 'mensuel',
      'hebdomadaire': 'hebdomadaire',
      'mensuel': 'mensuel',
    };
    
    const mappedFrequency = frequencyMap[frequency] || 'mensuel';
    
    const payload = {
      name,
      amount: Number(amount),
      frequency: mappedFrequency, 
      members: members,
      description: description || undefined,
    };

    try {
      console.log(' Appel à Tirelire:', {
        url: `${process.env.TIRELIRE_BASE_URL}/api/groups`,
        payload: { ...payload, members: `[${payload.members.length} membres]` },
      });

      const response = await axios.post(
        `${process.env.TIRELIRE_BASE_URL}/api/groups`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000, 
        }
      );

      console.log('Réponse Tirelire:', response.data);
      return response.data;
    } catch (error) {
      console.error(' Erreur lors de l\'appel à Tirelire:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers ? { ...error.config.headers, Authorization: 'Bearer ***' } : null,
        },
      });

      const statusCode = error.response?.status;
      const tirelireMessage = error.response?.data?.message || error.response?.data?.error || error.response?.data;
      const errorMessage = error.message;

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(`Impossible de se connecter à Tirelire. Vérifiez que le service est démarré sur ${process.env.TIRELIRE_BASE_URL}`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Timeout: Tirelire ne répond pas. Vérifiez que le service est accessible.');
      } else if (statusCode === 401) {
        throw new Error(`Authentification échouée (401). Le token Darna n'est peut-être pas accepté par Tirelire. Détails: ${tirelireMessage || errorMessage}`);
      } else if (statusCode === 403) {
        throw new Error(`Accès refusé (403). Vérifiez vos permissions. Détails: ${tirelireMessage || errorMessage}`);
      } else if (statusCode === 404) {
        throw new Error(`Endpoint introuvable (404). Vérifiez que TIRELIRE_BASE_URL est correct: ${process.env.TIRELIRE_BASE_URL}`);
      } else if (statusCode === 400) {
        throw new Error(`Requête invalide (400). ${tirelireMessage || errorMessage}`);
      } else if (statusCode === 500) {
        throw new Error(`Erreur serveur Tirelire (500). ${tirelireMessage || errorMessage}`);
      } else if (statusCode) {
        throw new Error(`Erreur HTTP ${statusCode}: ${tirelireMessage || errorMessage}`);
      } else {
        throw new Error(`Erreur de connexion: ${errorMessage}. Vérifiez que Tirelire est accessible.`);
      }
    }
  }
}

export default FinancingService;

