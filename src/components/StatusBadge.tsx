"use client";

import React from "react";

export type StatusType =
  | "DRAFT"
  | "QUOTATION"
  | "CONFIRMED"
  | "SALE"
  | "DELIVERED"
  | "DONE"
  | "CANCELLED"
  | "PAID"
  | "PARTIAL"
  | "OVERDUE"
  | "WAITING"
  | "READY"
  | "INSPECTED"
  | "POSTED"
  | "OPEN"
  | "CLOSED"
  | "NEW"
  | "QUALIFIED"
  | "PROPOSITION"
  | "WON"
  | "LOST"
  | "SCRAP"
  | "APPROVED"
  | "PENDING"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

export default function StatusBadge({
  status,
  label,
  size = "md",
  dot = true,
}: StatusBadgeProps) {
  const norm = String(status || "").toUpperCase();
  const displayLabel = label || status;

  // Determine color scheme based on semantic meaning
  let bg = "bg-gray-100";
  let text = "text-charcoal-700";
  let border = "border-gray-200";
  let dotColor = "bg-gray-400";

  if (
    [
      "CONFIRMED",
      "DELIVERED",
      "DONE",
      "PAID",
      "POSTED",
      "WON",
      "OPEN",
      "APPROVED",
      "QUALIFIED",
      "VALIDATED",
    ].includes(norm)
  ) {
    bg = "bg-emerald-50";
    text = "text-emerald-800";
    border = "border-emerald-200";
    dotColor = "bg-emerald-500";
  } else if (
    [
      "WAITING",
      "PARTIAL",
      "IN_PROGRESS",
      "DRAFT",
      "QUOTATION",
      "TO_APPROVE",
      "READY",
      "PENDING",
      "INSPECTION",
    ].includes(norm)
  ) {
    bg = "bg-amber-50";
    text = "text-amber-800";
    border = "border-amber-200";
    dotColor = "bg-amber-500";
  } else if (
    [
      "CANCELLED",
      "REJECTED",
      "OVERDUE",
      "SCRAP",
      "DEFECTIVE",
      "CLOSED",
      "LOST",
    ].includes(norm)
  ) {
    bg = "bg-rose-50";
    text = "text-rose-800";
    border = "border-rose-200";
    dotColor = "bg-rose-500";
  } else if (
    ["NEW", "LEAD", "PROPOSITION", "TRANSFER", "INTERNAL"].includes(norm)
  ) {
    bg = "bg-blue-50";
    text = "text-blue-800";
    border = "border-blue-200";
    dotColor = "bg-blue-500";
  } else if (["ACTIVE", "PRIMARY", "OWNER"].includes(norm)) {
    bg = "bg-aruna-50";
    text = "text-aruna-700";
    border = "border-aruna-200";
    dotColor = "bg-aruna-600";
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-xs",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${bg} ${text} ${border} ${sizeClasses} gap-1.5`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`}
        />
      )}
      <span className="font-semibold">{displayLabel}</span>
    </span>
  );
}