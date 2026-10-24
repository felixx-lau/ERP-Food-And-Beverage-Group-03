"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "gold" | "sage" | "success" | "warning" | "danger" | "default";
  badgeText?: string;
  badgeVariant?: "success" | "warning" | "danger" | "default" | "gold" | "sage";
  trend?: {
    label: string;
    positive?: boolean;
    neutral?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "primary",
  badgeText,
  badgeVariant = "default",
  trend,
  onClick,
  className = "",
}: KPICardProps) {
  const iconVariants = {
    primary: "bg-aruna-50 text-aruna-600 border border-aruna-200/50",
    gold: "bg-gold-50 text-gold-600 border border-gold-200/50",
    sage: "bg-sage-100 text-aruna-700 border border-sage-300/50",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/50",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/50",
    default: "bg-charcoal-100 text-charcoal-700 border border-charcoal-200/50",
  }[variant];

  const badgeVariants = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    gold: "bg-gold-50 text-gold-800 border-gold-200",
    sage: "bg-sage-100 text-aruna-800 border-sage-300",
    default: "bg-charcoal-100 text-charcoal-700 border-charcoal-200",
  }[badgeVariant];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-charcoal-200/70 p-5 shadow-xs transition-all duration-200 ${
        onClick ? "hover:border-aruna-300 hover:shadow-card cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <p className="text-xs font-semibold text-charcoal-400 tracking-wide uppercase">
              {title}
            </p>
            {badgeText && (
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border ${badgeVariants}`}
              >
                {badgeText}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold tracking-tight text-charcoal-800">
            {value}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${iconVariants} flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 pt-3 border-t border-charcoal-100 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-charcoal-400 font-medium truncate">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                trend.neutral
                  ? "bg-charcoal-100 text-charcoal-600"
                  : trend.positive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
