import Lead from '../models/Lead.js';
import Property from '../models/Property.js';
import ChatThread from '../models/ChatThread.js';
import NotificationService from './NotificationService.js';
import { recalculatePropertyPriority } from './propertyPriorityService.js';

class LeadService {
  constructor(io) {
    this.io = io;
    this.notificationService = io ? new NotificationService(io) : null;
  }

  emitLeadEvent(event, lead, userIds = []) {
    if (!this.io || !lead) return;
    const payload = typeof lead.toObject === 'function' ? lead.toObject() : lead;
    userIds.forEach((userId) => {
      if (!userId) return;
      const idValue = userId?._id ? userId._id : userId;
      if (!idValue) return;
      this.io.to(idValue.toString()).emit(event, payload);
    });
  }

  async createLead({ propertyId, buyerId, message }) {
    const property = await Property.findById(propertyId).populate('ownerId', 'email subscription preferences');

    if (!property) {
      throw new Error('Property not found');
    }

    if (property.ownerId._id.toString() === buyerId.toString()) {
      throw new Error('Vous ne pouvez pas créer un lead sur votre propre bien');
    }

    let lead = await Lead.findOne({ property: propertyId, buyer: buyerId });

    if (lead) {
      lead.message = message || lead.message;
      lead.status = 'new';
      lead.lastInteractionAt = new Date();
      await lead.save();
      await lead.populate([
        { path: 'property' },
        { path: 'buyer', select: 'firstName lastName email' },
        { path: 'owner', select: 'firstName lastName email' },
        { path: 'thread' },
      ]);
      return lead;
    }

    lead = await Lead.create({
      property: propertyId,
      buyer: buyerId,
      owner: property.ownerId._id,
      message,
    });

    const roomId = `lead_${lead._id.toString()}`;
    const thread = await ChatThread.create({
      roomId,
      property: propertyId,
      participants: [buyerId, property.ownerId._id],
      lead: lead._id,
      lastMessageAt: new Date(),
    });

    lead.thread = thread._id;
    await lead.save();

    property.leadsCount = (property.leadsCount || 0) + 1;
    await property.save();
    await recalculatePropertyPriority(property._id);

    if (this.notificationService) {
      await this.notificationService.sendNotification({
        userId: property.ownerId._id,
        title: 'Nouveau lead',
        message: `Un nouvel intérêt a été exprimé pour votre bien "${property.title}"`,
        type: 'lead',
        email: property.ownerId.email,
      });
    }

    await lead.populate([
      { path: 'property' },
      { path: 'buyer', select: 'firstName lastName email' },
      { path: 'owner', select: 'firstName lastName email' },
      { path: 'thread' },
    ]);
    this.emitLeadEvent('lead_created', lead, [property.ownerId._id, buyerId]);
    return lead;
  }

  async getLeadsForBuyer(buyerId) {
    return Lead.find({ buyer: buyerId })
      .populate('property')
      .populate('owner', 'firstName lastName email')
      .populate('thread');
  }

  async getLeadsForOwner(ownerId) {
    return Lead.find({ owner: ownerId })
      .populate('property')
      .populate('buyer', 'firstName lastName email')
      .populate('thread');
  }

  async updateStatus({ leadId, ownerId, status }) {
    const allowedStatuses = ['new', 'contacted', 'converted', 'closed'];
    if (!allowedStatuses.includes(status)) {
      throw new Error('Statut de lead invalide');
    }

    const lead = await Lead.findOne({ _id: leadId, owner: ownerId });
    if (!lead) {
      throw new Error('Lead introuvable');
    }

    lead.status = status;
    lead.lastInteractionAt = new Date();
    await lead.save();

    await lead.populate([
      { path: 'property' },
      { path: 'buyer', select: 'firstName lastName email' },
      { path: 'owner', select: 'firstName lastName email' },
      { path: 'thread' },
    ]);
    this.emitLeadEvent('lead_updated', lead, [lead.owner, lead.buyer]);
    return lead;
  }
}

export default LeadService;

