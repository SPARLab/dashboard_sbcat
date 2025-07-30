import React from "react";

interface PlaceholderProps {
  label: string;
}

export default function Placeholder({ label }: PlaceholderProps) {
  return (
    <div className="bg-gray-200 rounded-md p-4 my-2">
      <p className="text-gray-500">{label}</p>
    </div>
  );
} 