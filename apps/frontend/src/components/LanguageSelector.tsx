import React from 'react'
import { Language, LANGUAGE_OPTIONS } from '@live-translation/shared'

interface LanguageSelectorProps {
  value: Language | Language[]
  onChange: (value: Language | Language[]) => void
  multiple?: boolean
  label?: string
  error?: string
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  multiple = false,
  label,
  error,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const options = e.target.selectedOptions
      const values = Array.from(options).map(option => option.value as Language)
      onChange(values)
    } else {
      onChange(e.target.value as Language)
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        value={multiple ? undefined : (value as Language)}
        onChange={handleChange}
        multiple={multiple}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${multiple ? 'h-40' : ''}`}
      >
        {!multiple && <option value="">Select a language</option>}
        {LANGUAGE_OPTIONS.map((lang) => (
          <option
            key={lang.code}
            value={lang.code}
            selected={multiple && Array.isArray(value) && value.includes(lang.code)}
          >
            {lang.name} ({lang.nativeName})
          </option>
        ))}
      </select>
      {multiple && (
        <p className="mt-1 text-xs text-gray-500">
          Hold Ctrl (Cmd on Mac) to select multiple languages
        </p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
