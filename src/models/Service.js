const { prisma } = require('../database/connection');

const orderBy = [{ sortOrder: 'asc' }, { id: 'asc' }];

function listCategories() {
  return prisma.category.findMany({ orderBy });
}

async function listActive() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy,
    include: { doctors: { where: { isActive: true }, select: { id: true } } },
  });
  return services.map(toPublic);
}

function listAll() {
  return prisma.service.findMany({
    orderBy,
    include: { category: true, doctors: { select: { id: true, fullName: true } } },
  });
}

function findById(id) {
  return prisma.service.findUnique({ where: { id }, include: { doctors: { select: { id: true } } } });
}

function toPublic(service) {
  return {
    id: service.id,
    categoryId: service.categoryId,
    nameUz: service.nameUz,
    nameRu: service.nameRu,
    descriptionUz: service.descriptionUz,
    descriptionRu: service.descriptionRu,
    price: service.price,
    oldPrice: service.oldPrice,
    priceFrom: service.priceFrom,
    durationMin: service.durationMin,
    imageUrl: service.imageUrl,
    isPopular: service.isPopular,
    doctorIds: (service.doctors || []).map((d) => d.id),
  };
}

module.exports = { listCategories, listActive, listAll, findById, toPublic };
