import prisma from '../config/database';

/**
 * Ensures that a role with the given name exists in the database.
 * Never falls back to a random role (e.g. Tenant).
 */
export async function ensureRole(roleName: string) {
  const normalized = roleName.trim();
  let role = await prisma.role.findFirst({
    where: { name: normalized }
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: normalized,
        description: `${normalized} system role`,
        isCustom: false,
      }
    });
  }

  return role;
}
