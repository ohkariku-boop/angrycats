type CatIconProps = {
  mood: "angry" | "happy";
  size?: number;
};

export function CatIcon({ mood, size = 40 }: CatIconProps) {
  if (mood === "happy") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Happy cat face */}
        <ellipse cx="50" cy="55" rx="35" ry="32" fill="#FFD56B" stroke="#E8B73E" strokeWidth="2" />
        {/* Ears */}
        <polygon points="20,30 28,15 35,32" fill="#FFD56B" stroke="#E8B73E" strokeWidth="2" />
        <polygon points="80,30 72,15 65,32" fill="#FFD56B" stroke="#E8B73E" strokeWidth="2" />
        <polygon points="24,28 28,20 31,28" fill="#FF9F43" />
        <polygon points="76,28 72,20 69,28" fill="#FF9F43" />
        {/* Happy eyes (closed/smiling) */}
        <path d="M32 48 Q38 42 44 48" stroke="#3D2B1F" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M56 48 Q62 42 68 48" stroke="#3D2B1F" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Blush */}
        <circle cx="28" cy="62" r="5" fill="#FF8FA3" opacity="0.6" />
        <circle cx="72" cy="62" r="5" fill="#FF8FA3" opacity="0.6" />
        {/* Happy mouth */}
        <path d="M40 68 Q50 78 60 68" stroke="#3D2B1F" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Whiskers */}
        <line x1="15" y1="60" x2="28" y2="62" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="65" x2="28" y2="66" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="85" y1="60" x2="72" y2="62" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="85" y1="65" x2="72" y2="66" stroke="#C4A35A" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Angry cat face */}
      <ellipse cx="50" cy="55" rx="35" ry="32" fill="#FF6B6B" stroke="#D94545" strokeWidth="2" />
      {/* Ears */}
      <polygon points="20,30 28,15 35,32" fill="#FF6B6B" stroke="#D94545" strokeWidth="2" />
      <polygon points="80,30 72,15 65,32" fill="#FF6B6B" stroke="#D94545" strokeWidth="2" />
      <polygon points="24,28 28,20 31,28" fill="#D94545" />
      <polygon points="76,28 72,20 69,28" fill="#D94545" />
      {/* Angry eyes (slanted down) */}
      <path d="M30 45 L44 50" stroke="#3D1F1F" strokeWidth="3" strokeLinecap="round" />
      <path d="M70 45 L56 50" stroke="#3D1F1F" strokeWidth="3" strokeLinecap="round" />
      <circle cx="38" cy="50" r="3" fill="#3D1F1F" />
      <circle cx="62" cy="50" r="3" fill="#3D1F1F" />
      {/* Angry mouth (frown) */}
      <path d="M40 72 Q50 62 60 72" stroke="#3D1F1F" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Angry steam */}
      <circle cx="18" cy="25" r="3" fill="#FF6B6B" opacity="0.4" />
      <circle cx="82" cy="25" r="3" fill="#FF6B6B" opacity="0.4" />
      {/* Whiskers */}
      <line x1="15" y1="60" x2="28" y2="62" stroke="#C44A4A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="65" x2="28" y2="66" stroke="#C44A4A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="85" y1="60" x2="72" y2="62" stroke="#C44A4A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="85" y1="65" x2="72" y2="66" stroke="#C44A4A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
