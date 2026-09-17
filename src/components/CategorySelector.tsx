import { forwardRef } from 'react';
import { SUPPLY_CATEGORIES } from '../data/categories';
import { SupplyCategoryId } from '../types/user';
import { Check } from 'lucide-react';

interface CategorySelectorProps {
  selectedCategories: SupplyCategoryId[];
  onChange: (categories: SupplyCategoryId[]) => void;
  error?: string;
}

export const CategorySelector = forwardRef<HTMLButtonElement, CategorySelectorProps>(
  ({ selectedCategories, onChange, error }, ref) => {
    const toggleCategory = (id: SupplyCategoryId) => {
      if (selectedCategories.includes(id)) {
        onChange(selectedCategories.filter((c) => c !== id));
      } else {
        onChange([...selectedCategories, id]);
      }
    };

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <label id="categories-label" className="block text-sm font-medium text-slate-700">
            Categorias de Insumos Fornecidas <span className="text-red-600 font-semibold" aria-hidden="true">*</span>
          </label>
          <span className="text-xs text-slate-500">Selecione ao menos 1</span>
        </div>

        <div
          role="group"
          aria-labelledby="categories-label"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          {SUPPLY_CATEGORIES.map((cat, index) => {
            const isSelected = selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                ref={index === 0 ? ref : undefined}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => toggleCategory(cat.id)}
                className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-agro-500 focus:ring-offset-1 ${
                  isSelected
                    ? 'bg-agro-50/80 border-agro-600 shadow-sm ring-1 ring-agro-600'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="text-2xl" role="img" aria-label={cat.name}>
                    {cat.icon}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-agro-600 text-white'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <span className="font-semibold text-sm text-slate-900 leading-tight">
                  {cat.name}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 leading-tight line-clamp-2">
                  {cat.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p
            id="categories-error"
            role="alert"
            className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1 animate-fade-in"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

CategorySelector.displayName = 'CategorySelector';
