import Property from "../models/Property.js";

const DEFAULT_LIMIT = 10;

const normalizeArrayFilter = (value) => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
};

const buildSortCriteria = (sort, order) => {
  const sortOrder = order === 'asc' ? 1 : -1;

  switch (sort) {
    case 'price':
      return { priorityScore: -1, price: sortOrder };
    case 'createdAt':
      return { priorityScore: -1, createdAt: sortOrder };
    case 'surface':
      return { priorityScore: -1, surface: sortOrder };
    case 'views':
      return { priorityScore: -1, viewsCount: sortOrder };
    default:
      return { priorityScore: -1, createdAt: -1 };
  }
};

const searchProperties = async (filters = {}, currentUser = null) => {
  const {
    keyword,
    location,
    radius, // in kilometers
    minPrice,
    maxPrice,
    transactionType,
    minSurface,
    maxSurface,
    rooms,
    bathrooms,
    amenities,
    status,
    sort = 'priority',
    order = 'desc',
    page = 1,
    limit = DEFAULT_LIMIT,
    includeOwn = false,
    ownerId,
    availableFrom,
    availableTo,
    minPriority,
  } = filters;

  const includeOwnFlag =
    includeOwn === true ||
    includeOwn === 'true' ||
    includeOwn === 1 ||
    includeOwn === '1';

  const conditions = [];
  const desiredStatus = status || 'published';

  const keywordConditions = [];
  if (keyword) {
    const regex = new RegExp(keyword, 'i');
    keywordConditions.push({ title: regex }, { description: regex }, { address: regex });
  }
  if (keywordConditions.length) {
    conditions.push({ $or: keywordConditions });
  }

  if (transactionType) {
    conditions.push({ transactionType });
  }

  if (minPrice || maxPrice) {
    const priceQuery = {};
    if (minPrice) priceQuery.$gte = Number(minPrice);
    if (maxPrice) priceQuery.$lte = Number(maxPrice);
    conditions.push({ price: priceQuery });
  }

  if (minSurface || maxSurface) {
    const surfaceQuery = {};
    if (minSurface) surfaceQuery.$gte = Number(minSurface);
    if (maxSurface) surfaceQuery.$lte = Number(maxSurface);
    conditions.push({ surface: surfaceQuery });
  }

  if (rooms) {
    conditions.push({ rooms: { $gte: Number(rooms) } });
  }

  if (bathrooms) {
    conditions.push({ bathrooms: { $gte: Number(bathrooms) } });
  }

  if (ownerId) {
    conditions.push({ ownerId });
  }

  if (availableFrom) {
    conditions.push({ 'availability.from': { $lte: new Date(availableFrom) } });
  }

  if (availableTo) {
    conditions.push({ 'availability.to': { $gte: new Date(availableTo) } });
  }

  const normalizedAmenities = normalizeArrayFilter(amenities);
  if (normalizedAmenities?.length) {
    conditions.push({ amenities: { $all: normalizedAmenities } });
  }

  if (minPriority) {
    conditions.push({ priorityScore: { $gte: Number(minPriority) } });
  }

  if (location && radius) {
    const [longitude, latitude] = location.split(',').map(Number);
    if (!Number.isNaN(longitude) && !Number.isNaN(latitude)) {
      conditions.push({
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: Number(radius) * 1000,
          },
        },
      });
    }
  }

  if (includeOwnFlag && currentUser?.userId) {
    const ownerCondition = { ownerId: currentUser.userId };

    if (desiredStatus && desiredStatus !== 'all') {
      conditions.push({ ...ownerCondition, status: desiredStatus });
    } else {
      conditions.push(ownerCondition);
    }
  } else {
    const statusFilter =
      desiredStatus && desiredStatus !== 'all' ? desiredStatus : 'published';
    conditions.push({ status: statusFilter });
  }

  const query = conditions.length ? { $and: conditions } : {};

  const safeLimit = Math.min(Number(limit) || DEFAULT_LIMIT, 50);
  const currentPage = Math.max(Number(page) || 1, 1);
  const skip = (currentPage - 1) * safeLimit;
  const sortCriteria = buildSortCriteria(sort, order);

  const [properties, total] = await Promise.all([
    Property.find(query)
      .populate({
        path: 'ownerId',
        select: 'subscription accountType companyInfo firstName lastName',
      })
      .sort(sortCriteria)
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Property.countDocuments(query),
  ]);

  return {
    count: properties.length,
    total,
    page: currentPage,
    pages: Math.ceil(total / safeLimit) || 1,
    properties,
  };
};

export default searchProperties;
