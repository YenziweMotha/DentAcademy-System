export default function Button({ children, onClick, type = 'button', variant = 'primary', className = '', ...props }) {
  const baseStyle = "px-4 py-2 rounded font-medium focus:outline-none transition-colors";
  const variants = {
    primary: "bg-brand text-white hover:bg-brand-dark shadow-sm",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    accent: "bg-accent text-white hover:bg-accent-dark",
    danger: "bg-rose-600 text-white hover:bg-rose-700"
  };

  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
