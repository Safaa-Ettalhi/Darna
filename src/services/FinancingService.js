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
      throw new Error('TIRELIRE_BASE_URL non défini');
    }

    if (!token) {
      throw new Error('Token Tirelire requis');
    }

    const payload = {
      name,
      amount,
      frequency,
      members: participants,
      description,
    };

    const response = await axios.post(
      `${process.env.TIRELIRE_BASE_URL}/api/groups`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }
}

export default FinancingService;

