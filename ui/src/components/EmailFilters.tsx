import { CATEGORIES, type Category } from "../../../src/types.ts";

type Props = {
  categoryFilter: Category | "all";
  onCategoryFilterChange: (category: Category | "all") => void;
  onlyErrors: boolean;
  onOnlyErrorsChange: (value: boolean) => void;
};

export function EmailFilters({ categoryFilter, onCategoryFilterChange, onlyErrors, onOnlyErrorsChange }: Props) {
  return (
    <form className="emails-filters">
      <div className="emails-filter">
        <label htmlFor="category-filter">Category</label>
        <select
          id="category-filter"
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value as Category | "all")}
        >
          <option value="all">All</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <div className="emails-filter emails-filter-checkbox">
        <input
          id="only-errors"
          type="checkbox"
          checked={onlyErrors}
          onChange={(event) => onOnlyErrorsChange(event.target.checked)}
        />
        <label htmlFor="only-errors">Only emails a solution got wrong</label>
      </div>
    </form>
  );
}
