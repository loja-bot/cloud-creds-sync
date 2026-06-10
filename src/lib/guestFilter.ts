// Filters categories that look adult/+18 for guest accounts.
const ADULT_REGEX = /(adult|adulto|xxx|porn|er[óo]tic|hot\b|18\+|\+18|sex)/i;

export function isAdultCategoryName(name?: string | null): boolean {
  if (!name) return false;
  return ADULT_REGEX.test(name);
}

export function filterAdultCategories<T extends { category_name?: string }>(
  cats: T[], isGuest: boolean,
): T[] {
  if (!isGuest) return cats;
  return cats.filter((c) => !isAdultCategoryName(c.category_name));
}
