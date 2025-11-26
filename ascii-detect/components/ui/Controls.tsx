
import React from 'react';

export const Label = ({ children }: { children?: React.ReactNode }) => (
  <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1 mt-3">
    {children}
  </label>
);

export const Slider = ({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  label?: string;
}) => (
  <div className="mb-2">
    {label && <div className="flex justify-between text-xs text-gray-900 font-semibold mb-1"><span>{label}</span><span className="font-bold">{value}</span></div>}
    <input
      type="range"
      className="w-full h-1.5 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-gray-900"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

export const Select = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) => (
  <select
    className="w-full bg-white border-2 border-gray-500 text-gray-900 text-xs rounded p-2 focus:border-gray-900 focus:outline-none font-semibold"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    {options.map((opt) => (
      <option key={opt} value={opt}>
        {opt.toUpperCase()}
      </option>
    ))}
  </select>
);

export const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs text-gray-900 font-semibold">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`w-8 h-4 rounded-full relative transition-colors ${
        checked ? 'bg-gray-900' : 'bg-gray-400'
      }`}
    >
      <div
        className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
          checked ? 'left-4.5 translate-x-1' : 'left-0.5'
        }`}
      />
    </button>
  </div>
);

export const ColorPicker = ({
  value,
  onChange,
  label
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
}) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs text-gray-900 font-semibold">{label}</span>
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
    />
  </div>
);

export const TextInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => (
  <input
    type="text"
    className="w-full bg-white border-2 border-gray-500 text-gray-900 text-xs rounded p-2 focus:border-gray-900 focus:outline-none font-semibold"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

export const Button = ({
  onClick,
  children,
  variant = 'primary',
  className = ''
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}) => {
  const baseStyle = "w-full py-2 px-4 rounded text-xs font-bold transition-all active:scale-95";
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white shadow-lg border-2 border-gray-900",
    secondary: "bg-gray-300 hover:bg-gray-400 text-gray-900 border-2 border-gray-500",
    danger: "bg-red-200 hover:bg-red-300 text-red-900 border-2 border-red-500"
  };
  
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};
